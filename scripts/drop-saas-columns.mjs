#!/usr/bin/env node
/**
 * One-shot cleanup: drop SaaS-leftover columns from `salons`.
 *
 * Usage:
 *   # Dry run (safe — just shows what would happen):
 *   node --env-file=.env.local scripts/drop-saas-columns.mjs
 *
 *   # Apply for real (irreversible — data in these columns is lost):
 *   node --env-file=.env.local scripts/drop-saas-columns.mjs --apply
 *
 * Before --apply:
 *   - Take a Neon branch snapshot (one click in the Neon dashboard).
 *   - Confirm the DATABASE_URL printed below is the right database.
 */

import { neon } from '@neondatabase/serverless';

const COLUMNS_TO_DROP = [
  { name: 'plan',              reason: 'SaaS plan tier (solo/team) — gated staff count + AI features' },
  { name: 'plan_type',         reason: 'SaaS billing tier (solo_bonus_12m, sms_pack, …) — Bonus plans /pa' },
  { name: 'stripe_session_id', reason: 'Stripe Checkout session for plan purchase on Clicka account' },
  { name: 'stripe_customer_id',reason: 'Stripe Customer for recurring SaaS billing' },
];

function maskDbUrl(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.username}:***@${u.host}${u.pathname}`;
  } catch {
    return '(unparseable DATABASE_URL)';
  }
}

async function main() {
  const apply = process.argv.includes('--apply');
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set. Run with: node --env-file=.env.local scripts/drop-saas-columns.mjs');
    process.exit(1);
  }

  console.log('');
  console.log(`Target DB: ${maskDbUrl(dbUrl)}`);
  console.log(`Mode:      ${apply ? 'APPLY (will modify the database)' : 'DRY RUN (no changes)'}`);
  console.log('');

  const sql = neon(dbUrl);

  // Discover which of the target columns actually exist.
  const existing = await sql(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'salons'
        AND column_name = ANY($1::text[])`,
    [COLUMNS_TO_DROP.map((c) => c.name)],
  );
  const existingSet = new Set(existing.map((r) => r.column_name));

  console.log('Columns to drop:');
  for (const col of COLUMNS_TO_DROP) {
    const present = existingSet.has(col.name);
    console.log(`  ${present ? '✓' : '·'} salons.${col.name.padEnd(20)} ${present ? '(exists)  ' : '(already gone)'}  ${col.reason}`);
  }
  console.log('');

  const toDrop = COLUMNS_TO_DROP.filter((c) => existingSet.has(c.name));
  if (toDrop.length === 0) {
    console.log('Nothing to do. All target columns are already gone.');
    return;
  }

  if (!apply) {
    console.log(`Dry run complete. ${toDrop.length} column(s) would be dropped. Re-run with --apply to execute.`);
    return;
  }

  console.log(`Dropping ${toDrop.length} column(s) in a single transaction…`);
  await sql('BEGIN');
  try {
    for (const col of toDrop) {
      // Column name comes from a hardcoded allow-list above — no SQL injection.
      await sql(`ALTER TABLE salons DROP COLUMN IF EXISTS ${col.name}`);
      console.log(`  ✓ dropped salons.${col.name}`);
    }
    await sql('COMMIT');
    console.log('');
    console.log('Done. Columns dropped successfully.');
  } catch (err) {
    await sql('ROLLBACK').catch(() => {});
    console.error('FAILED — transaction rolled back. No changes applied.');
    console.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
