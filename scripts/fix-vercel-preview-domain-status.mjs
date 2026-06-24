#!/usr/bin/env node
/**
 * Backfill: mark every salon whose custom_domain is a Vercel preview URL
 * (*.vercel.app) as domain_status = 'active'. Vercel preview URLs do not
 * go through DNS verification — they are owned by Vercel and bound to the
 * project at deploy time — so the old `pending_dns` status they carried
 * was always wrong.
 *
 * Idempotent. Safe to re-run.
 *
 * Usage:
 *   # Dry run (shows which rows would change):
 *   node --env-file=.env.local scripts/fix-vercel-preview-domain-status.mjs
 *
 *   # Apply for real:
 *   node --env-file=.env.local scripts/fix-vercel-preview-domain-status.mjs --apply
 */

import { neon } from '@neondatabase/serverless';

const apply = process.argv.includes('--apply');
const sql = neon(process.env.DATABASE_URL);

const rows = await sql(
  `SELECT slug, name, custom_domain, domain_status
   FROM salons
   WHERE lower(custom_domain) LIKE '%.vercel.app'
     AND domain_status IS DISTINCT FROM 'active'`,
);

console.log('');
console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
console.log(`Found ${rows.length} salon(s) to fix:`);
for (const row of rows) {
  console.log(`  ${row.slug.padEnd(20)} ${row.custom_domain.padEnd(30)} ${row.domain_status ?? '(null)'} -> active`);
}
console.log('');

if (rows.length === 0) {
  console.log('Nothing to do.');
  process.exit(0);
}

if (!apply) {
  console.log('Re-run with --apply to update.');
  process.exit(0);
}

await sql('BEGIN');
try {
  const result = await sql(
    `UPDATE salons
        SET domain_status = 'active',
            domain_verified_at = COALESCE(domain_verified_at, now()),
            updated_at = now()
      WHERE lower(custom_domain) LIKE '%.vercel.app'
        AND domain_status IS DISTINCT FROM 'active'`,
  );
  await sql('COMMIT');
  console.log(`Done. Updated ${rows.length} row(s).`);
} catch (err) {
  await sql('ROLLBACK').catch(() => {});
  console.error('FAILED — rolled back.');
  console.error(err);
  process.exit(1);
}
