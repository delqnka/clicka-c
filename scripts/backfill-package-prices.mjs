#!/usr/bin/env node
/**
 * Backfill for Reset Body Lab package/credit data. DRY-RUN by default.
 *
 *   node --env-file=.env.local scripts/backfill-package-prices.mjs            # dry run
 *   node --env-file=.env.local scripts/backfill-package-prices.mjs --apply    # write
 *
 * Phase A: restore missing client_packages.price from the catalog definition
 *          (by link, else by name); "November Challenge" = total_sessions*10
 *          (the de-facto standard across every existing November Challenge row).
 *          "пакет комбо" (legacy/test, expired) is left untouched and reported.
 * Phase B: apply a package credit to the 3 confirmed-clean past visits, exactly
 *          as the admin "Приложи кредит" button would (same consume logic).
 *
 * A rollback file is written to ROLLBACK_OUT before anything is changed.
 */
import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

const SALON = '7e3190ef-6f27-4192-8f74-53af9b39f7aa';
const APPLY = process.argv.includes('--apply');
const ROLLBACK_OUT = process.env.ROLLBACK_OUT || '/tmp/rbl-backfill-rollback.json';
const sql = neon(process.env.DATABASE_URL);

// The 3 confirmed-clean past visits to receive a credit (owner-approved).
const CLEAN_BOOKINGS = [
  { id: 'b30ae2fc-0973-4b59-8591-a96dd94cc662', who: 'Мария Стоилова 2026-11-15' },
  { id: '981a80b6-fb5d-47f7-bf63-63c0b44038d6', who: 'Марияна Мадоян 2026-11-14' },
  { id: '15da9e73-3599-43b9-979d-92fb362dc1c1', who: 'Миглена Розова 2026-11-16' },
];

async function main() {
  const rollback = { salonId: SALON, at: new Date().toISOString(), priceRestores: [], creditsApplied: [] };

  // ───────────── Phase A: resolve missing prices ─────────────
  const nulls = await sql`
    SELECT cp.id::text AS id, cp.client_name, cp.package_name, cp.total_sessions,
           cp.package_definition_id::text AS def_id, dlink.price AS def_link_price,
           dname.price AS def_name_price
    FROM client_packages cp
    LEFT JOIN client_package_definitions dlink ON dlink.id = cp.package_definition_id
    LEFT JOIN client_package_definitions dname
      ON dname.salon_id = cp.salon_id AND lower(trim(dname.name)) = lower(trim(cp.package_name))
    WHERE cp.salon_id = ${SALON} AND cp.price IS NULL
    ORDER BY cp.client_name`;

  const plan = [];
  for (const r of nulls) {
    let newPrice = null, basis = '';
    if (r.def_link_price != null) { newPrice = Number(r.def_link_price); basis = 'catalog(link)'; }
    else if (r.def_name_price != null) { newPrice = Number(r.def_name_price); basis = 'catalog(name)'; }
    else if (lc(r.package_name) === 'november challenge') { newPrice = Number(r.total_sessions) * 10; basis = 'nov-challenge x10/sess'; }
    if (newPrice == null) { console.log(`  SKIP  ${pad(r.client_name)} "${r.package_name}" — no catalog match (leave for owner)`); continue; }
    plan.push({ id: r.id, client: r.client_name, name: r.package_name, newPrice, basis });
  }
  console.log('\n=== Phase A: price restores ===');
  for (const p of plan) console.log(`  ${APPLY ? 'SET ' : 'WOULD'} ${pad(p.client)} "${p.name}" price=NULL -> ${p.newPrice}  [${p.basis}]`);

  // ───────────── Phase B: preview the 3 clean credits ─────────────
  console.log('\n=== Phase B: apply package credit to 3 clean visits ===');
  for (const bk of CLEAN_BOOKINGS) {
    const [exist] = await sql`SELECT id FROM client_package_usages WHERE salon_id=${SALON} AND booking_id=${bk.id}::uuid LIMIT 1`;
    if (exist) { console.log(`  SKIP  ${bk.who} — credit already applied`); bk._skip = true; continue; }
    console.log(`  ${APPLY ? 'APPLY' : 'WOULD'} ${bk.who} (booking ${bk.id})`);
  }

  if (!APPLY) {
    console.log('\nDRY RUN — nothing written. Re-run with --apply to execute.');
    return;
  }

  // Write rollback BEFORE mutating.
  for (const p of plan) rollback.priceRestores.push({ packageId: p.id, from: null, to: p.newPrice });
  fs.writeFileSync(ROLLBACK_OUT, JSON.stringify(rollback, null, 2));

  // Apply Phase A.
  for (const p of plan) {
    await sql`UPDATE client_packages SET price=${p.newPrice}, updated_at=now()
              WHERE id=${p.id}::uuid AND salon_id=${SALON} AND price IS NULL`;
  }
  console.log(`\nPhase A done: ${plan.length} prices restored.`);

  // Apply Phase B — same consume logic as /api/bookings/package-credit (no explicit
  // packageId: match by email/phone/name, earliest expiry, remaining>0).
  for (const bk of CLEAN_BOOKINGS) {
    if (bk._skip) continue;
    const [b] = await sql`SELECT client_name, client_phone, client_email FROM bookings WHERE CAST(id AS text)=${bk.id} AND salon_id=${SALON}`;
    if (!b) { console.log(`  MISSING booking ${bk.id}`); continue; }
    const email = (b.client_email || '').trim().toLowerCase();
    const name = (b.client_name || '').trim();
    const pdigits = (b.client_phone || '').replace(/\D/g, '').replace(/^(00359|359|0)/, '');
    const rows = await sql`
      WITH pkg AS (
        SELECT cp.id FROM client_packages cp
        WHERE cp.salon_id=${SALON} AND cp.expires_at >= CURRENT_DATE AND cp.used_sessions < cp.total_sessions
          AND NOT EXISTS (SELECT 1 FROM client_package_usages u WHERE u.salon_id=${SALON} AND u.booking_id=${bk.id}::uuid)
          AND (
            (${email} <> '' AND lower(trim(coalesce(cp.client_email,'')))=${email})
            OR (${pdigits} <> '' AND regexp_replace(regexp_replace(coalesce(cp.client_phone,''),'\\D','','g'),'^(?:00359|359|0)','')=${pdigits})
            OR lower(trim(cp.client_name))=lower(trim(${name}))
          )
        ORDER BY cp.expires_at ASC, cp.created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED
      ), upd AS (
        UPDATE client_packages cp SET used_sessions=cp.used_sessions+1, updated_at=now()
        FROM pkg WHERE cp.id=pkg.id AND cp.used_sessions < cp.total_sessions
        RETURNING cp.id, cp.package_name, cp.total_sessions,
          COALESCE(cp.price,(SELECT d.price FROM client_package_definitions d WHERE d.id=cp.package_definition_id)) AS price
      ), usage AS (
        INSERT INTO client_package_usages (salon_id,package_id,booking_id,package_name_snapshot,package_price_snapshot,
           package_total_sessions_snapshot,credit_value_snapshot,trainer_payout_rate_snapshot,trainer_payout_snapshot)
        SELECT ${SALON}, upd.id, ${bk.id}::uuid, upd.package_name, upd.price, upd.total_sessions,
          CASE WHEN upd.price IS NOT NULL AND upd.price>=0 THEN upd.price/NULLIF(upd.total_sessions,0) ELSE NULL END,
          0.5,
          CASE WHEN upd.price IS NOT NULL AND upd.price>=0 THEN (upd.price/NULLIF(upd.total_sessions,0))*0.5 ELSE NULL END
        FROM upd ON CONFLICT (salon_id,booking_id) DO NOTHING
        RETURNING package_id, credit_value_snapshot
      )
      SELECT upd.id::text AS package_id, upd.package_name, usage.credit_value_snapshot
      FROM upd INNER JOIN usage ON usage.package_id = upd.id`;
    const row = rows[0];
    if (!row) { console.log(`  FAILED ${bk.who} — no free credit matched`); continue; }
    rollback.creditsApplied.push({ bookingId: bk.id, packageId: row.package_id });
    fs.writeFileSync(ROLLBACK_OUT, JSON.stringify(rollback, null, 2));
    console.log(`  OK ${bk.who} -> pkg "${row.package_name}" credit=${row.credit_value_snapshot}`);
  }
  console.log(`\nRollback saved to ${ROLLBACK_OUT}`);
}

const lc = (s) => (s ?? '').toString().trim().toLowerCase();
const pad = (s) => (s ?? '').toString().padEnd(22);
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
