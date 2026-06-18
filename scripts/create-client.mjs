#!/usr/bin/env node
/**
 * Agency provisioning script — creates a new client salon in one command.
 *
 * Usage:
 *   node --env-file=.env.local scripts/create-client.mjs \
 *     --slug=salon-suhaib \
 *     --name="Салон Сухайб" \
 *     --email=owner@example.com \
 *     [--domain=salonsuhaib.com] \
 *     [--phone=+359876140020] \
 *     [--template=salon-suhaib]
 *
 * What it does:
 *   1. Creates the salon record in DB
 *   2. Creates owner account
 *   3. Generates first-login link (set-password)
 *   4. Prints next steps (Vercel domain, DNS)
 */

import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => {
      const [key, ...rest] = a.slice(2).split('=');
      return [key, rest.join('=')];
    })
);

const {
  slug,
  name,
  email,
  domain,
  phone = '',
  template = 'generic',
  help,
} = args;

if ('help' in args || !slug || !name || !email) {
  console.log(`
Usage:
  node --env-file=.env.local scripts/create-client.mjs \\
    --slug=salon-suhaib \\
    --name="Салон Сухайб" \\
    --email=owner@example.com \\
    [--domain=salonsuhaib.com] \\
    [--phone=+359876140020] \\
    [--template=salon-suhaib]
`);
  process.exit('help' in args ? 0 : 1);
}

// ── DB ───────────────────────────────────────────────────────────────────────

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌  DATABASE_URL не е зададена. Добави --env-file=.env.local');
  process.exit(1);
}

const sql = neon(dbUrl);

// ── Helpers ───────────────────────────────────────────────────────────────────

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function normalizeEmail(e) {
  return e.trim().toLowerCase();
}

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'clicka.bg';

function getPlatformSiteOrigin(salonSlug) {
  return `https://${salonSlug}.${ROOT_DOMAIN}`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const emailNorm = normalizeEmail(email);
  const safeSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

  console.log('\n── Clicka Agency Provisioning ─────────────────────────────');
  console.log(`  Slug    : ${safeSlug}`);
  console.log(`  Name    : ${name}`);
  console.log(`  Email   : ${email}`);
  console.log(`  Domain  : ${domain || '(не е зададен)'}`);
  console.log(`  Template: ${template}`);
  console.log('────────────────────────────────────────────────────────────\n');

  // 1. Check if slug already exists
  const existing = await sql`SELECT id FROM salons WHERE slug = ${safeSlug} LIMIT 1`;
  if (existing.length > 0) {
    console.error(`❌  Slug "${safeSlug}" вече съществува в базата данни.`);
    process.exit(1);
  }

  // 2. Create salon
  console.log('⏳  Създавам salon запис...');
  const defaultServices = JSON.stringify([]);
  const defaultHours = JSON.stringify({
    slot_interval_min: 30,
    booking_advance_days: 60,
    mon: { open: '10:00', close: '20:00' },
    tue: { open: '10:00', close: '20:00' },
    wed: { open: '10:00', close: '20:00' },
    thu: { open: '10:00', close: '20:00' },
    fri: { open: '10:00', close: '20:00' },
    sat: { open: '10:00', close: '20:00' },
    sun: { closed: true },
  });

  const salonRows = await sql`
    INSERT INTO salons (
      slug, name, email, phone, is_active, site_status,
      services, opening_hours,
      custom_domain, domain_status,
      created_at, updated_at
    )
    VALUES (
      ${safeSlug},
      ${name.trim()},
      ${emailNorm},
      ${phone || null},
      true,
      'active',
      ${defaultServices}::jsonb,
      ${defaultHours}::jsonb,
      ${domain ? domain.toLowerCase().trim() : null},
      ${domain ? 'pending' : null},
      now(),
      now()
    )
    RETURNING CAST(id AS text) AS salon_id
  `;

  const salonId = String(salonRows[0].salon_id);
  console.log(`✅  Salon created — ID: ${salonId}`);

  // 3. Create / upsert owner
  console.log('⏳  Създавам собственик...');
  const ownerRows = await sql`
    INSERT INTO site_owners (email, email_norm, created_at, updated_at)
    VALUES (${email.trim()}, ${emailNorm}, now(), now())
    ON CONFLICT (email_norm)
    DO UPDATE SET email = EXCLUDED.email, updated_at = now()
    RETURNING id
  `;
  const ownerId = String(ownerRows[0].id);
  console.log(`✅  Owner created — ID: ${ownerId}`);

  // 4. Membership
  await sql`
    INSERT INTO salon_owner_memberships (salon_id, owner_id, role, created_at)
    VALUES (${salonId}, ${ownerId}, 'owner', now())
    ON CONFLICT (salon_id, owner_id) DO NOTHING
  `;
  console.log('✅  Membership linked');

  // 5. Magic link (first-login set-password)
  console.log('⏳  Генерирам invite link...');
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72h

  await sql`
    DELETE FROM admin_login_tokens WHERE salon_id = ${salonId}
  `;
  await sql`
    INSERT INTO admin_login_tokens (salon_id, token_hash, email_norm, expires_at, created_at)
    VALUES (${salonId}, ${tokenHash}, ${emailNorm}, ${expiresAt.toISOString()}, now())
  `;

  const origin = domain
    ? `https://${domain.toLowerCase().trim()}`
    : getPlatformSiteOrigin(safeSlug);

  const inviteUrl = `${origin}/admin/set-password?token=${encodeURIComponent(token)}&slug=${encodeURIComponent(safeSlug)}`;

  // ── Output ───────────────────────────────────────────────────────────────

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  ГОТОВО — Изпрати тези инструкции на клиента');
  console.log('══════════════════════════════════════════════════════════════\n');

  console.log('📧  Invite link (валиден 72 часа):');
  console.log(`    ${inviteUrl}\n`);

  if (domain) {
    console.log('🌐  DNS инструкции за клиента:');
    console.log(`    Добавете CNAME запис:`);
    console.log(`    Name  : ${domain}`);
    console.log(`    Value : cname.vercel-dns.com`);
    console.log(`    TTL   : 3600\n`);

    console.log('⚙️   Vercel — добавете custom domain:');
    console.log(`    vercel domains add ${domain}`);
    console.log(`    (или от Vercel dashboard → Project → Settings → Domains)\n`);

    console.log('🗄️   След DNS активация — маркирай домейна като active:');
    console.log(`    UPDATE salons SET domain_status='active' WHERE slug='${safeSlug}';\n`);
  }

  console.log('🔗  Salon admin URL:');
  if (domain) {
    console.log(`    https://${domain}/admin`);
  }
  console.log(`    https://${safeSlug}.${ROOT_DOMAIN}/admin\n`);

  console.log('📋  Следващи стъпки:');
  console.log(`    1. Изпрати invite link на ${email}`);
  console.log(`    2. Добави услугите в admin → Услуги`);
  console.log(`    3. Провери работното време в admin → Настройки`);
  if (domain) {
    console.log(`    4. Клиентът насочва DNS-а`);
    console.log(`    5. Vercel потвърждава домейна (обичайно < 24ч)`);
    console.log(`    6. Маркирай domain_status='active' в DB`);
  }

  if (template !== 'generic') {
    console.log(`\n💡  Template "${template}" е избран.`);
    console.log(`    Сайтът е достъпен на: ${origin}/${template}`);
    if (domain) {
      console.log(`    За root routing добави в middleware:`);
      console.log(`    ${domain} → rewrite '/' → '/${template}'`);
    }
  }

  console.log('\n══════════════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('❌  Грешка:', err.message);
  process.exit(1);
});
