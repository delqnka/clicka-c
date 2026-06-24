import { randomBytes } from 'crypto';
import { sql } from '@/lib/db';

let ensurePromise: Promise<void> | null = null;

export async function ensureStaffSchema() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

      // staff_members
      await sql`
        CREATE TABLE IF NOT EXISTS staff_members (
          id                              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
          salon_id                        text        NOT NULL,
          name                            text        NOT NULL,
          slug                            text        NOT NULL,
          email                           text,
          bio                             text,
          avatar_url                      text,
          is_owner                        boolean     NOT NULL DEFAULT false,
          telegram_chat_id                text        UNIQUE,
          calendar_feed_token             text,
          onboarding_code                 text UNIQUE,
          portal_token                    text,
          is_active                       boolean     NOT NULL DEFAULT true,
          created_at                      timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS staff_members_salon_id_idx
          ON staff_members(salon_id)
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS staff_members_salon_slug_uniq
          ON staff_members(salon_id, slug)
      `;
      await sql`ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS portal_token text`;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS staff_members_portal_token_uniq
          ON staff_members(portal_token) WHERE portal_token IS NOT NULL
      `;

      // staff_services junction
      await sql`
        CREATE TABLE IF NOT EXISTS staff_services (
          staff_member_id uuid  NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
          service_id      text  NOT NULL,
          PRIMARY KEY (staff_member_id, service_id)
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS staff_services_service_id_idx
          ON staff_services(service_id)
      `;

      // is_active on staff_members (backfill existing rows)
      await sql`ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true`;

      // staff_member_id on bookings
      await sql`
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS staff_member_id uuid
          REFERENCES staff_members(id) ON DELETE SET NULL
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS bookings_staff_member_id_idx
          ON bookings(staff_member_id)
      `;

      // ── Stable service IDs migration ────────────────────────────────────────
      // Backfill salons whose services JSON has positional svc-N ids (or no id at
      // all). For each affected salon we: (a) build a deterministic old→new id map,
      // (b) rewrite salons.services with stable ids, (c) update any staff_services
      // rows that reference the old positional ids.  Idempotent: salons that already
      // have stable ids (no svc-N in their JSON) are skipped entirely.
      await migrateServiceIds();

      // Replace single-staff slot uniqueness with per-staff version
      await sql`DROP INDEX IF EXISTS bookings_active_slot_unique_idx`;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_slot_per_staff_uniq
          ON bookings(salon_id, COALESCE(staff_member_id::text, ''), date, time)
          WHERE status IN ('pending', 'confirmed')
      `;
    })().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service ID migration helpers
// ─────────────────────────────────────────────────────────────────────────────

function isUnstableServiceId(id: string): boolean {
  return !id || /^svc-\d/.test(id);
}

function stableId(usedIds: Set<string>): string {
  let id = randomBytes(4).toString('hex');
  while (usedIds.has(id)) id = randomBytes(4).toString('hex');
  usedIds.add(id);
  return id;
}

async function migrateServiceIds(): Promise<void> {
  // Fetch all salons whose services JSON contains a svc-N id anywhere.
  const rows = await sql`
    SELECT CAST(id AS text) AS salon_id, services
    FROM salons
    WHERE services::text ~ '"id"\s*:\s*"svc-\d'
       OR services::text NOT LIKE '%"id"%'
  `.catch(() => [] as unknown[]);

  for (const _row of rows) {
    const row = _row as { salon_id: string; services: unknown };
    let items: Record<string, unknown>[];
    try {
      const raw = typeof row.services === 'string' ? JSON.parse(row.services) : row.services;
      items = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
    } catch {
      continue;
    }
    if (items.length === 0) continue;

    // Build set of already-stable ids (won't be touched).
    const usedIds = new Set<string>(
      items.map((s) => String(s.id ?? '')).filter((id) => !isUnstableServiceId(id)),
    );

    // Build TWO mappings per unstable service:
    //   (a) storedId  → newId  (what the DB has, e.g. "" or "svc-2")
    //   (b) positionalId → newId (what parseSalonServices would have generated at
    //       runtime: svc-0, svc-1, … — used to fix any staff_services that were
    //       assigned before this migration ran)
    const idMap = new Map<string, string>(); // covers both (a) and (b)
    let hasChanges = false;
    const updated = items.map((s, index) => {
      const oldId = String(s.id ?? '');
      if (isUnstableServiceId(oldId)) {
        hasChanges = true;
        const newId = stableId(usedIds);
        // Map stored id (may be '' or 'svc-N') → newId
        if (oldId) idMap.set(oldId, newId);
        // Always map the positional id that parseSalonServices would have emitted
        const positional = `svc-${index}`;
        if (!idMap.has(positional)) idMap.set(positional, newId);
        return { ...s, id: newId };
      }
      return s;
    });

    if (!hasChanges) continue;

    // Write updated services back.
    await sql`
      UPDATE salons
      SET services = ${JSON.stringify(updated)}::jsonb
      WHERE CAST(id AS text) = ${row.salon_id}
    `.catch(() => {});

    // Update staff_services rows that reference any old/positional id.
    for (const [oldId, newId] of idMap) {
      if (!oldId) continue;
      await sql`
        UPDATE staff_services
        SET service_id = ${newId}
        WHERE service_id = ${oldId}
          AND staff_member_id IN (
            SELECT id FROM staff_members WHERE salon_id = ${row.salon_id}
          )
      `.catch(() => {});
    }
  }
}
