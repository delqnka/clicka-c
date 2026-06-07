import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import crypto from 'crypto';
import { ensurePlatformSubdomain } from '@/lib/vercel-domains';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const TRANSLIT: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',
  и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',
  р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',
  ш:'sh',щ:'sht',ъ:'a',ь:'',ю:'yu',я:'ya',
};

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .split('')
    .map(c => TRANSLIT[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 32) || 'salon';
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

function planToMonths(planType: string): number {
  return planType.endsWith('_6m') ? 6 : 12;
}

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Липсва токен' }, { status: 400 });

  const rows = await sql`
    SELECT id, email, plan_type, used_at FROM plan_grants WHERE token = ${token} LIMIT 1
  `;
  if (rows.length === 0) return NextResponse.json({ error: 'Невалиден токен' }, { status: 404 });

  const grant = rows[0] as { id: string; email: string; plan_type: string; used_at: string | null };
  if (grant.used_at) return NextResponse.json({ error: 'Токенът вече е използван' }, { status: 409 });

  return NextResponse.json({ email: grant.email, planType: grant.plan_type });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit('grant-activate', ip, 3, 60 * 1000);
  if (rl.limited) return NextResponse.json({ error: 'Твърде много опити. Изчакай малко.' }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  const { token, ownerName: rawOwnerName, salonName: rawSalonName, slug: rawSlug } = body as { token?: string; ownerName?: string; salonName?: string; slug?: string };
  const ownerName = (rawOwnerName ?? '').trim().slice(0, 64);
  const salonName = (rawSalonName ?? '').trim().slice(0, 64);
  const desiredSlug = toSlug((rawSlug ?? '').trim());
  if (!token) return NextResponse.json({ error: 'Липсва токен' }, { status: 400 });

  const rows = await sql`
    SELECT id, email, plan_type, used_at FROM plan_grants WHERE token = ${token} LIMIT 1
  `;
  if (rows.length === 0) return NextResponse.json({ error: 'Невалиден токен' }, { status: 404 });

  const grant = rows[0] as { id: string; email: string; plan_type: string; used_at: string | null };
  if (grant.used_at) return NextResponse.json({ error: 'Токенът вече е използван' }, { status: 409 });

  // Check if salon already exists for this email
  const existing = await sql`SELECT slug FROM salons WHERE lower(email) = lower(${grant.email}) LIMIT 1`;
  if (existing.length > 0) {
    await sql`UPDATE plan_grants SET used_at = now(), salon_id = ${String(existing[0].slug)} WHERE id = ${grant.id}`;
    return NextResponse.json({ slug: String(existing[0].slug) });
  }

  const emailPrefix = grant.email.split('@')[0].replace(/[^a-z0-9]/gi, '').slice(0, 16) || 'salon';
  const slug = await generateUniqueSalonSlug(desiredSlug || salonName || emailPrefix);
  const salonId = crypto.randomUUID();
  const months = planToMonths(grant.plan_type);

  await sql`
    INSERT INTO salons (
      id, slug, name, category, phone, email,
      city, address, about,
      cover_image_url, logo_image_url, gallery_images,
      instagram_username, facebook_username, google_maps_url,
      working_hours, services,
      template_id, primary_color, primary_color_light,
      plan_type, plan, is_active, site_status,
      billing_period, plan_expires_at,
      onboarding_code, owner_name
    ) VALUES (
      ${salonId}, ${slug}, ${salonName}, ${''}, ${''}, ${grant.email},
      ${''}, ${''}, ${''},
      ${''}, ${''}, ${'[]'}::jsonb,
      ${''}, ${''}, ${''},
      ${JSON.stringify(DEFAULT_HOURS)}::jsonb, ${'[]'}::jsonb,
      ${1}, ${'#111111'}, ${'#f3f4f6'},
      ${grant.plan_type}, ${grant.plan_type.startsWith('team') ? 'team' : 'solo'}, true, ${'setup'},
      ${months === 6 ? '6m' : '12m'}, now() + (${String(months)} || ' months')::interval,
      ${crypto.randomBytes(4).toString('hex').toUpperCase()}, ${ownerName}
    )
  `;

  await sql`UPDATE plan_grants SET used_at = now(), salon_id = ${salonId} WHERE id = ${grant.id}`;
  await ensurePlatformSubdomain(slug).catch(() => {});

  return NextResponse.json({ slug });
}
