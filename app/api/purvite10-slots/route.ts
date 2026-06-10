import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const PROMO_KEY = 'purvite10';
const PROMO_TOTAL = 10;

export async function GET() {
  try {
    // Ensure table exists
    await sql`
      CREATE TABLE IF NOT EXISTS promo_campaigns (
        key        TEXT PRIMARY KEY,
        total      INT  NOT NULL DEFAULT 10,
        used       INT  NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    // Upsert row so it always exists
    await sql`
      INSERT INTO promo_campaigns (key, total, used)
      VALUES (${PROMO_KEY}, ${PROMO_TOTAL}, 0)
      ON CONFLICT (key) DO NOTHING
    `;

    const rows = await sql`
      SELECT total, used FROM promo_campaigns WHERE key = ${PROMO_KEY} LIMIT 1
    `;

    const { total, used } = rows[0] ?? { total: PROMO_TOTAL, used: 0 };
    const remaining = Math.max(0, total - used);

    return NextResponse.json({ total, used, remaining }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[purvite10-slots] Error:', err);
    return NextResponse.json({ total: PROMO_TOTAL, used: 0, remaining: PROMO_TOTAL });
  }
}
