import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { isPlatformAdminRequest } from '@/lib/platform-admin-auth';
import { sql } from '@/lib/db';
import { ensureAdminAuthSchema, generateAdminMagicLink, normalizeEmail } from '@/lib/admin-auth';
import { sendSiteReadyEmail } from '@/lib/site-ready-email';

const TRANSLIT: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',
  и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',
  р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',
  ш:'sh',щ:'sht',ъ:'a',ь:'',ю:'yu',я:'ya',
};

function toSlug(name: string): string {
  return name.toLowerCase().split('').map(c => TRANSLIT[c] ?? c).join('')
    .replace(/[^a-z0-9]+/g, '').slice(0, 32) || 'salon';
}

async function generateUniqueSalonSlug(base: string): Promise<string> {
  const slug = toSlug(base);
  for (let attempt = 0; attempt < 100; attempt++) {
    const suffix = attempt === 0 ? '' : String(attempt + 1);
    const candidate = `${slug.slice(0, 32 - suffix.length)}${suffix}`;
    const rows = await sql`SELECT slug FROM salons WHERE slug = ${candidate} LIMIT 1`;
    if (rows.length === 0) return candidate;
  }
  throw new Error('Не успяхме да генерираме свободен адрес');
}

const DEFAULT_HOURS = {
  monday:    { open: '09:00', close: '18:00', closed: false },
  tuesday:   { open: '09:00', close: '18:00', closed: false },
  wednesday: { open: '09:00', close: '18:00', closed: false },
  thursday:  { open: '09:00', close: '18:00', closed: false },
  friday:    { open: '09:00', close: '18:00', closed: false },
  saturday:  { open: '10:00', close: '16:00', closed: false },
  sunday:    { open: '',      close: '',      closed: true  },
};

export async function GET(request: NextRequest) {
  if (!(await isPlatformAdminRequest(request))) {
    return NextResponse.json({ error: 'Нямате достъп' }, { status: 401 });
  }

  await ensureAdminAuthSchema();
  const salons = await sql`
    SELECT
      CAST(s.id AS text) AS salon_id,
      s.slug,
      s.name,
      s.email,
      s.is_active,
      s.site_status,
      s.custom_domain,
      s.created_at,
      s.updated_at,
      o.email AS owner_email,
      (SELECT COUNT(*) FROM bookings WHERE salon_id = CAST(s.id AS text)) AS booking_count
    FROM salons s
    LEFT JOIN salon_owner_memberships m ON m.salon_id = CAST(s.id AS text)
    LEFT JOIN site_owners o ON o.id = m.owner_id
    ORDER BY s.created_at DESC
  `;

  return NextResponse.json({ salons });
}

/**
 * POST /api/pa/salons — engine-style provisioning for a new salon.
 *
 * Body: { name, email, ownerName?, slug?, customDomain? }
 * Creates the salon, links the owner, and returns the slug + a fresh
 * admin magic link that the operator can send to the salon owner.
 */
export async function POST(request: NextRequest) {
  if (!(await isPlatformAdminRequest(request))) {
    return NextResponse.json({ error: 'Нямате достъп' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as {
    name?: string;
    email?: string;
    ownerName?: string;
    slug?: string;
    customDomain?: string;
    /** When true (default), sends an onboarding email with the magic link to the owner. */
    autoSendInvite?: boolean;
  };

  const name = (body.name ?? '').trim().slice(0, 64);
  const email = normalizeEmail(body.email ?? '');
  const ownerName = (body.ownerName ?? '').trim().slice(0, 64);
  const desiredSlug = toSlug((body.slug ?? '').trim());
  const customDomainRaw = (body.customDomain ?? '').trim().toLowerCase().slice(0, 64);
  const autoSendInvite = body.autoSendInvite !== false;
  // Basic hostname validation: labels separated by dots, no scheme/path/spaces.
  // Rejects bogus input like "https://x.com/", "foo bar", "x", "." etc.
  const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
  const customDomain = customDomainRaw && DOMAIN_RE.test(customDomainRaw) ? customDomainRaw : null;
  if (customDomainRaw && !customDomain) {
    return NextResponse.json({ error: 'Невалиден домейн' }, { status: 400 });
  }

  if (!name) return NextResponse.json({ error: 'Липсва име на салона' }, { status: 400 });
  if (!email) return NextResponse.json({ error: 'Невалиден имейл' }, { status: 400 });

  const existing = await sql`SELECT slug FROM salons WHERE lower(email) = lower(${email}) LIMIT 1`;
  if (existing.length > 0) {
    return NextResponse.json(
      { error: 'Вече има салон с този имейл', existingSlug: String((existing[0] as Record<string, unknown>).slug ?? '') },
      { status: 409 },
    );
  }

  const emailPrefix = email.split('@')[0].replace(/[^a-z0-9]/gi, '').slice(0, 16) || 'salon';
  const slug = await generateUniqueSalonSlug(desiredSlug || name || emailPrefix);
  const salonId = crypto.randomUUID();

  await sql`
    INSERT INTO salons (
      id, slug, name, category, phone, email,
      city, address, about,
      images,
      instagram_username, facebook_username, google_maps_url,
      working_hours, services,
      template_id, primary_color, primary_color_light,
      is_active, site_status,
      custom_domain,
      onboarding_code, owner_name
    ) VALUES (
      ${salonId}, ${slug}, ${name}, ${''}, ${''}, ${email},
      ${''}, ${''}, ${''},
      ${'[]'}::jsonb,
      ${''}, ${''}, ${''},
      ${JSON.stringify(DEFAULT_HOURS)}::jsonb, ${'[]'}::jsonb,
      ${1}, ${'#111111'}, ${'#f3f4f6'},
      true, ${'setup'},
      ${customDomain},
      ${crypto.randomBytes(4).toString('hex').toUpperCase()}, ${ownerName}
    )
  `;

  const magicLink = await generateAdminMagicLink({
    salonId,
    slug,
    email,
    customDomain,
    expiresMs: 72 * 60 * 60 * 1000,
  }).catch(() => null);

  let inviteSent = false;
  if (autoSendInvite) {
    try {
      await sendSiteReadyEmail({
        salonId,
        slug,
        email,
        name,
        ownerName,
      });
      inviteSent = true;
    } catch (err) {
      console.error('[pa/salons POST] sendSiteReadyEmail failed:', err);
    }
  }

  return NextResponse.json({ ok: true, salonId, slug, magicLink, inviteSent });
}

export async function PATCH(request: NextRequest) {
  if (!(await isPlatformAdminRequest(request))) {
    return NextResponse.json({ error: 'Нямате достъп' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { salonId, isActive, customDomain: rawCustomDomain } = body as {
    salonId?: string;
    isActive?: boolean;
    customDomain?: string;
  };

  if (!salonId) {
    return NextResponse.json({ error: 'Липсва salonId' }, { status: 400 });
  }

  // Domain update path
  if (rawCustomDomain !== undefined) {
    const domainInput = rawCustomDomain.trim().toLowerCase();
    const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
    if (domainInput && !DOMAIN_RE.test(domainInput)) {
      return NextResponse.json({ error: 'Невалиден домейн' }, { status: 400 });
    }
    const customDomain = domainInput || null;

    await sql`
      UPDATE salons
      SET custom_domain = ${customDomain},
          updated_at = now()
      WHERE CAST(id AS text) = ${salonId}
    `;

    return NextResponse.json({ ok: true, customDomain });
  }

  // isActive toggle path
  await sql`
    UPDATE salons
    SET is_active = ${isActive ?? false}, updated_at = now()
    WHERE CAST(id AS text) = ${salonId}
  `;

  return NextResponse.json({ ok: true });
}
