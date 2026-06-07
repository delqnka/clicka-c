import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { ensurePlatformSubdomain } from '@/lib/vercel-domains';
import { deferRevalidateSalonPublicCache } from '@/lib/defer-revalidate-salon';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,18}[a-z0-9]$|^[a-z0-9]{2,20}$/;
const RESERVED = new Set([
  'www', 'mail', 'api', 'app', 'admin', 'blog', 'static', 'media',
  'clicka', 'support', 'help', 'login', 'signup', 'demo',
]);

export async function PATCH(request: NextRequest) {
  const currentSlug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, currentSlug);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as { newSlug?: string };
  const newSlug = (body.newSlug ?? '').trim().toLowerCase();

  if (!newSlug || !SLUG_RE.test(newSlug)) {
    return NextResponse.json(
      { error: 'Адресът трябва да е 2-30 символа, само малки букви, цифри и тирета.' },
      { status: 400 },
    );
  }

  if (RESERVED.has(newSlug)) {
    return NextResponse.json({ error: 'Този адрес е запазен.' }, { status: 400 });
  }

  if (newSlug === auth.salon.slug) {
    return NextResponse.json({ newSlug }, { status: 200 });
  }

  // Check uniqueness
  const existing = await sql`SELECT id FROM salons WHERE slug = ${newSlug} LIMIT 1`;
  if (existing.length > 0) {
    return NextResponse.json({ error: 'Този адрес вече е зает.' }, { status: 409 });
  }

  const oldSlug = auth.salon.slug;

  // Ensure redirect history table exists
  await sql`
    CREATE TABLE IF NOT EXISTS salon_slug_history (
      old_slug   text        PRIMARY KEY,
      salon_id   text        NOT NULL,
      changed_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  // Update slug in DB + record old slug for redirect
  await sql`UPDATE salons SET slug = ${newSlug} WHERE id = ${auth.salon.salonId}`;
  await sql`
    INSERT INTO salon_slug_history (old_slug, salon_id)
    VALUES (${oldSlug}, ${auth.salon.salonId})
    ON CONFLICT (old_slug) DO UPDATE SET salon_id = EXCLUDED.salon_id, changed_at = now()
  `;

  // Register new Vercel subdomain (best-effort)
  await ensurePlatformSubdomain(newSlug).catch((e) =>
    console.error('[slug-change] ensurePlatformSubdomain failed:', e),
  );

  // Revalidate public cache for new slug
  deferRevalidateSalonPublicCache({ slug: newSlug });

  return NextResponse.json({ newSlug });
}
