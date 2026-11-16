#!/usr/bin/env node
/**
 * READ-ONLY audit of credit DEDUCTION integrity for one salon.
 *   node --env-file=.env.local scripts/audit-credit-deductions.mjs [salonId]
 *
 * Checks:
 *  A. Orphan usages      — client_package_usages pointing at a booking that no
 *                          longer exists (credit consumed for a deleted booking).
 *  B. Cancelled+charged  — a usage row whose booking is cancelled (the credit
 *                          should have been restored on cancellation).
 *  C. Invariant breaks   — used_sessions != (#usage rows) + (sum adjustments).
 *  D. Over-deducted      — used_sessions > total_sessions.
 *  E. Under-charged      — #usage rows (live bookings) > used_sessions
 *                          (sessions taken but balance not reduced -> free visits).
 */
import { neon } from '@neondatabase/serverless';
const SALON = process.argv[2] || '7e3190ef-6f27-4192-8f74-53af9b39f7aa';
const sql = neon(process.env.DATABASE_URL);
const CANC = ['cancelled','canceled','отказана','анулирана'];

async function main(){
  // A. Orphan usages
  const orphans = await sql`
    SELECT u.id::text AS usage_id, u.booking_id::text AS booking_id, u.package_id::text AS package_id,
           u.used_at::text AS used_at, cp.client_name, cp.package_name
    FROM client_package_usages u
    LEFT JOIN bookings b ON b.id::text = u.booking_id::text AND b.salon_id = u.salon_id
    LEFT JOIN client_packages cp ON cp.id = u.package_id
    WHERE u.salon_id = ${SALON} AND b.id IS NULL
    ORDER BY u.used_at`;
  console.log(`\n==== A. Orphan usages (booking deleted, credit still consumed): ${orphans.length} ====`);
  for(const r of orphans) console.log(`   ${r.client_name} "${r.package_name}" booking=${r.booking_id} usedAt=${(r.used_at||'').slice(0,10)}`);

  // B. Usage rows on cancelled bookings
  const cancelled = await sql`
    SELECT u.booking_id::text AS booking_id, b.status, b.date, b.time, cp.client_name, cp.package_name
    FROM client_package_usages u
    JOIN bookings b ON b.id::text = u.booking_id::text AND b.salon_id = u.salon_id
    LEFT JOIN client_packages cp ON cp.id = u.package_id
    WHERE u.salon_id = ${SALON} AND lower(trim(coalesce(b.status,''))) = ANY(${CANC})
    ORDER BY b.date`;
  console.log(`\n==== B. Credit still held on CANCELLED bookings (should be restored): ${cancelled.length} ====`);
  for(const r of cancelled) console.log(`   ${r.client_name} "${r.package_name}" ${r.date} ${r.time} status=${r.status} booking=${r.booking_id}`);

  // C/D/E. Per-package reconciliation
  const pkgs = await sql`
    SELECT cp.id::text AS id, cp.client_name, cp.package_name, cp.total_sessions, cp.used_sessions,
      (SELECT COUNT(*)::int FROM client_package_usages u WHERE u.package_id = cp.id) AS usage_rows,
      (SELECT COUNT(*)::int FROM client_package_usages u
         JOIN bookings b ON b.id::text = u.booking_id::text AND b.salon_id = u.salon_id
        WHERE u.package_id = cp.id AND lower(trim(coalesce(b.status,''))) <> ALL(${CANC})) AS live_usage_rows,
      COALESCE((SELECT SUM(used_sessions_delta)::int FROM client_package_adjustments a WHERE a.package_id = cp.id),0) AS adj
    FROM client_packages cp
    WHERE cp.salon_id = ${SALON}
    ORDER BY cp.client_name`;

  const invariant=[], over=[], under=[];
  for(const p of pkgs){
    const expected = p.usage_rows + p.adj;        // intended: used == usageRows + adjustments
    if (Number(p.used_sessions) !== expected) invariant.push({p, expected});
    if (Number(p.used_sessions) > Number(p.total_sessions)) over.push(p);
    if (Number(p.live_usage_rows) > Number(p.used_sessions)) under.push(p);
  }
  console.log(`\n==== C. used_sessions != usageRows + adjustments: ${invariant.length} ====`);
  for(const {p,expected} of invariant)
    console.log(`   ${pad(p.client_name)} "${p.package_name}" used=${p.used_sessions} expected=${expected} (rows=${p.usage_rows} adj=${p.adj})`);

  console.log(`\n==== D. OVER-deducted (used > total): ${over.length} ====`);
  for(const p of over) console.log(`   ${pad(p.client_name)} "${p.package_name}" used=${p.used_sessions}/${p.total_sessions}`);

  console.log(`\n==== E. UNDER-charged (live usage rows > used_sessions = free visits): ${under.length} ====`);
  for(const p of under) console.log(`   ${pad(p.client_name)} "${p.package_name}" liveRows=${p.live_usage_rows} used=${p.used_sessions}/${p.total_sessions}`);

  console.log('\n==== SUMMARY ====');
  console.log(`A orphan usages:            ${orphans.length}`);
  console.log(`B credit on cancelled:      ${cancelled.length}`);
  console.log(`C ledger invariant breaks:  ${invariant.length}`);
  console.log(`D over-deducted packages:   ${over.length}`);
  console.log(`E under-charged packages:   ${under.length}`);
}
const pad = (s)=>(s??'').toString().padEnd(22);
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
