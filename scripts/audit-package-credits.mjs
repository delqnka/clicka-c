#!/usr/bin/env node
/**
 * READ-ONLY deep audit of the package / credit system for one salon.
 *
 * Usage:
 *   node --env-file=.env.local scripts/audit-package-credits.mjs [salonId]
 *
 * It mutates nothing. It reconstructs, per client, the chronology of bookings
 * vs. packages and flags:
 *   - MISSING_CREDIT: a non-cancelled, past/completed booking for a client who
 *     held a package whose validity window covers the booking date, but no
 *     client_package_usages row exists -> the trainer-revenue view pays the
 *     full service_price instead of the package credit value.
 *   - USED_SESSIONS mismatch: client_packages.used_sessions vs. (#usage rows +
 *     recorded initial_balance / manual adjustments).
 */
import { neon } from '@neondatabase/serverless';

const SALON_ID = process.argv[2] || '7e3190ef-6f27-4192-8f74-53af9b39f7aa';
const sql = neon(process.env.DATABASE_URL);

const norm = (s) => (s ?? '').toString();
const money = (n) => (n == null ? '—' : Number(n).toFixed(2));

async function main() {
  // 1) All packages for the salon.
  const packages = await sql`
    SELECT id::text AS id, client_name, client_phone, client_email, package_name,
           total_sessions, used_sessions, price,
           purchased_at::text AS purchased_at, expires_at::text AS expires_at,
           created_at::text AS created_at
    FROM client_packages
    WHERE salon_id = ${SALON_ID}
    ORDER BY lower(coalesce(client_name,'')), created_at
  `;

  // 2) Usage counts + adjustments per package.
  const usageCounts = await sql`
    SELECT package_id::text AS package_id, COUNT(*)::int AS n
    FROM client_package_usages WHERE salon_id = ${SALON_ID}
    GROUP BY package_id
  `;
  const adjSums = await sql`
    SELECT package_id::text AS package_id,
           SUM(used_sessions_delta)::int AS delta,
           string_agg(reason || ':' || used_sessions_delta, ', ') AS detail
    FROM client_package_adjustments
    GROUP BY package_id
  `;
  const usageByPkg = new Map(usageCounts.map((r) => [r.package_id, r.n]));
  const adjByPkg = new Map(adjSums.map((r) => [r.package_id, r]));

  // 3) Every non-cancelled booking with its usage link + matched package.
  //    Matched package = a package for the same salon, same identity
  //    (phone digits, else email, else name), whose window covers the date.
  const bookings = await sql`
    WITH b AS (
      SELECT
        bk.id::text AS id, bk.client_name, bk.client_phone, bk.client_email,
        bk.service_name, bk.service_price, COALESCE(bk.booking_quantity,1) AS qty,
        bk.date, bk.time, bk.status, bk.created_at::text AS created_at,
        sm.name AS staff_name, COALESCE(sm.trainer_payout_rate, 0.5) AS rate,
        sm.is_owner,
        regexp_replace(regexp_replace(coalesce(bk.client_phone,''),'\\D','','g'),'^(?:00359|359|0)','') AS pdigits,
        lower(trim(coalesce(bk.client_email,''))) AS emaillc,
        (bk.date ~ '^\\d{4}-\\d{2}-\\d{2}$') AS iso_date
      FROM bookings bk
      LEFT JOIN staff_members sm ON sm.id = bk.staff_member_id
      WHERE bk.salon_id = ${SALON_ID}
        AND lower(trim(coalesce(bk.status,''))) NOT IN ('cancelled','canceled','отказана','анулирана')
    )
    SELECT b.*,
      u.id::text AS usage_id, u.package_id::text AS usage_package_id,
      u.credit_value_snapshot,
      -- matched package (window covers the booking date), best = earliest expiry
      mp.id::text AS matched_pkg_id, mp.package_name AS matched_pkg_name,
      mp.price AS matched_pkg_price, mp.total_sessions AS matched_pkg_total,
      mp.purchased_at::text AS matched_pkg_from, mp.expires_at::text AS matched_pkg_to
    FROM b
    LEFT JOIN client_package_usages u
      ON u.salon_id = ${SALON_ID} AND u.booking_id::text = b.id
    LEFT JOIN LATERAL (
      SELECT cp.*
      FROM client_packages cp
      WHERE cp.salon_id = ${SALON_ID}
        AND b.iso_date
        AND b.date::date BETWEEN cp.purchased_at::date AND cp.expires_at
        AND (
          (b.pdigits <> '' AND regexp_replace(regexp_replace(coalesce(cp.client_phone,''),'\\D','','g'),'^(?:00359|359|0)','') = b.pdigits)
          OR (b.pdigits = '' AND b.emaillc <> '' AND lower(trim(coalesce(cp.client_email,''))) = b.emaillc)
          OR (b.pdigits = '' AND b.emaillc = '' AND lower(trim(coalesce(cp.client_name,''))) = lower(trim(coalesce(b.client_name,''))))
        )
      ORDER BY cp.expires_at ASC, cp.created_at ASC
      LIMIT 1
    ) mp ON true
    ORDER BY lower(coalesce(b.client_name,'')), b.date, b.time
  `;

  const today = new Date().toISOString().slice(0, 10);
  const isPast = (bk) => {
    if (!bk.iso_date) return false;
    if (norm(bk.status).trim().toLowerCase() === 'completed') return true;
    const t = (norm(bk.time).match(/^\d{1,2}:\d{2}/) || [''])[0];
    if (bk.date < today) return true;
    if (bk.date === today && t) {
      const now = new Date().toTimeString().slice(0, 5);
      return t <= now;
    }
    return false;
  };

  // ── Package integrity report ──────────────────────────────────────────────
  console.log('================ PACKAGE used_sessions INTEGRITY ================');
  let pkgMismatch = 0;
  for (const p of packages) {
    const usages = usageByPkg.get(p.id) || 0;
    const adj = adjByPkg.get(p.id);
    const adjDelta = adj?.delta || 0;
    // Expected used_sessions ≈ usage rows + initial_balance/manual adjustments
    // that are NOT themselves represented by a usage row.
    const expected = usages + adjDelta;
    const diff = Number(p.used_sessions) - expected;
    const flag = diff !== 0 ? ' <-- MISMATCH' : '';
    if (diff !== 0) pkgMismatch++;
    const perSession = p.price != null && p.total_sessions > 0 ? Number(p.price) / Number(p.total_sessions) : null;
    console.log(
      `${flag ? '* ' : '  '}${(p.client_name||'').padEnd(24)} ${p.package_name.padEnd(18)} ` +
      `used=${p.used_sessions}/${p.total_sessions} price=${money(p.price)} (/sess=${money(perSession)}) ` +
      `usageRows=${usages} adj=${adjDelta}${adj?` [${adj.detail}]`:''} valid ${p.purchased_at?.slice(0,10)}..${p.expires_at}${flag}`
    );
  }
  console.log(`\nPackages with used_sessions mismatch: ${pkgMismatch} / ${packages.length}`);

  // ── Missing-credit bookings (the owner's complaint) ───────────────────────
  console.log('\n================ MISPRICED / MISSING-CREDIT BOOKINGS ================');
  const missing = [];
  for (const bk of bookings) {
    const past = isPast(bk);
    const hasUsage = !!bk.usage_id;
    if (hasUsage) continue;                 // already priced as package visit
    if (!bk.matched_pkg_id) continue;       // no package covers this -> regular paid session
    // No usage but a package window covers this booking date -> candidate missing credit
    const perSession = bk.matched_pkg_price != null && bk.matched_pkg_total > 0
      ? Number(bk.matched_pkg_price) / Number(bk.matched_pkg_total) : null;
    const regular = (Number(bk.service_price) || 0) * Number(bk.qty);
    const rate = Number(bk.rate);
    const trainerNow = regular * rate;
    const trainerShould = perSession != null ? perSession * rate : null;
    const overpay = trainerShould != null ? trainerNow - trainerShould : null;
    missing.push({
      past, id: bk.id, client: bk.client_name, date: bk.date, time: bk.time,
      service: bk.service_name, status: bk.status, staff: bk.staff_name,
      servicePrice: bk.service_price, qty: bk.qty, regular,
      pkg: bk.matched_pkg_name, pkgId: bk.matched_pkg_id, perSession,
      trainerNow, trainerShould, overpay,
    });
  }
  // Only past/completed ones actually affect trainer pay now; future ones are reservations.
  const pastMissing = missing.filter((m) => m.past);
  const futureMissing = missing.filter((m) => !m.past);

  let totalOverpay = 0, totalRevenueOver = 0;
  for (const m of pastMissing) {
    totalOverpay += m.overpay || 0;
    totalRevenueOver += (m.regular - (m.perSession ?? m.regular));
    console.log(
      `${(m.client||'').padEnd(24)} ${m.date} ${String(m.time).padEnd(5)} ${String(m.service||'').slice(0,20).padEnd(20)} ` +
      `reg=${money(m.regular)} -> pkg/sess=${money(m.perSession)} | trainer ${money(m.trainerNow)}->${money(m.trainerShould)} (over ${money(m.overpay)}) ` +
      `[${m.staff||'?'}] pkg="${m.pkg}" bk=${m.id}`
    );
  }
  console.log(`\nPAST/completed missing-credit bookings: ${pastMissing.length}`);
  console.log(`Future reservations w/ package but no credit yet: ${futureMissing.length}`);
  console.log(`Trainer overpayment total across past bookings: ${money(totalOverpay)}`);
  console.log(`(Revenue overstated by: ${money(totalRevenueOver)})`);

  // Group missing by client for a per-client chronological view.
  const byClient = new Map();
  for (const m of pastMissing) {
    const key = m.client || '(no name)';
    if (!byClient.has(key)) byClient.set(key, []);
    byClient.get(key).push(m);
  }
  console.log('\n================ MISSING CREDITS GROUPED BY CLIENT ================');
  for (const [client, list] of [...byClient.entries()].sort()) {
    console.log(`\n${client}  (${list.length} session(s) to reconcile)`);
    for (const m of list) {
      console.log(`   ${m.date} ${m.time}  ${m.service}  reg ${money(m.regular)} -> ${money(m.perSession)}  pkg="${m.pkg}"`);
    }
  }

  // Dump full JSON for later use.
  const out = { salonId: SALON_ID, generatedAt: new Date().toISOString(),
    pkgMismatch, pastMissing, futureMissing };
  const fs = await import('node:fs');
  const outPath = process.env.AUDIT_OUT || '/tmp/rbl-audit.json';
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('\nFull detail written to ' + outPath);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
