#!/usr/bin/env node
/**
 * One-off repair: remove the duplicate manual package for Ваня Александрова.
 *
 * Context (Reset Body Lab, salon 7e3190ef-…):
 *   Vanya bought an 8-session Reformer package online via Stripe on 2026-11-18
 *   (package 3d2a6e28-…, source=online, cs_live_agQX…). It registered correctly
 *   and holds the real usage rows + a +1 manual correction (used=4, 4 left).
 *   Because the online purchase was saved under a Latin-name / +359 phone
 *   identity, the owner did not recognise it and added a second, identical
 *   package by hand on 2026-11-24 (package 792c16e9-…, source=admin, no Stripe
 *   link, 0 usage rows, a single +4 "initial_balance" adjustment). That left the
 *   client with 16 sessions instead of 8.
 *
 * This script deletes ONLY the manual duplicate (792c16e9) and its adjustment
 * row, after re-verifying it is safe (source=admin, no Stripe session, zero
 * client_package_usages rows). The genuine online package is left untouched.
 *
 * Usage:
 *   node --env-file=.env.local scripts/repair-rbl-vanya-duplicate-package.mjs            # dry-run (default)
 *   node --env-file=.env.local scripts/repair-rbl-vanya-duplicate-package.mjs --apply    # perform deletion
 */
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const APPLY = process.argv.includes('--apply');

const SALON_ID = '7e3190ef-6f27-4192-8f74-53af9b39f7aa';
const DUPLICATE_ID = '792c16e9-748c-4a71-9654-deb86e9d95d4'; // manual duplicate to remove
const KEEP_ID = '3d2a6e28-946e-45d3-b4bd-6d26a917a548';      // genuine online package to keep

async function main() {
  const [dup] = await sql`
    SELECT id::text AS id, client_name, client_email, source, stripe_checkout_session_id,
           total_sessions, used_sessions
    FROM client_packages
    WHERE id = ${DUPLICATE_ID} AND salon_id = ${SALON_ID}
  `;
  const [keep] = await sql`
    SELECT id::text AS id, client_name, client_email, source, stripe_checkout_session_id,
           total_sessions, used_sessions
    FROM client_packages
    WHERE id = ${KEEP_ID} AND salon_id = ${SALON_ID}
  `;

  if (!keep) {
    console.error('ABORT: the genuine online package to keep was not found. No changes made.');
    process.exit(1);
  }
  if (!dup) {
    console.log('Duplicate package not found — already removed. Nothing to do.');
    console.log('Keep (online):', JSON.stringify(keep));
    return;
  }

  // Safety guards: never delete the wrong row.
  const [{ n: usageCount }] = await sql`
    SELECT count(*)::int AS n FROM client_package_usages WHERE package_id = ${DUPLICATE_ID}
  `;
  const adjustments = await sql`
    SELECT id::text AS id, used_sessions_delta, reason FROM client_package_adjustments WHERE package_id = ${DUPLICATE_ID}
  `;

  console.log('KEEP  (online, untouched):', JSON.stringify(keep));
  console.log('REMOVE (manual duplicate):', JSON.stringify(dup));
  console.log(`  usage rows on duplicate:  ${usageCount}`);
  console.log(`  adjustment rows on dup.:  ${adjustments.length} -> ${JSON.stringify(adjustments)}`);

  if (dup.source !== 'admin' || dup.stripe_checkout_session_id || usageCount !== 0) {
    console.error('\nABORT: duplicate failed safety guard (expected source=admin, no Stripe session, 0 usages). No changes made.');
    process.exit(1);
  }

  if (!APPLY) {
    console.log('\nDRY-RUN. Re-run with --apply to delete the duplicate package and its adjustment row.');
    return;
  }

  await sql`DELETE FROM client_package_adjustments WHERE package_id = ${DUPLICATE_ID}`;
  const deleted = await sql`DELETE FROM client_packages WHERE id = ${DUPLICATE_ID} AND salon_id = ${SALON_ID} RETURNING id::text AS id`;
  console.log(`\nAPPLIED. Deleted ${deleted.length} package row + ${adjustments.length} adjustment row(s).`);
  console.log('Vanya now holds one package: 8 sessions,', keep.used_sessions, 'used,', (keep.total_sessions - keep.used_sessions), 'remaining.');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
