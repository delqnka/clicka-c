import { sql } from '@/lib/db';
import { ensureClientPackagesSchema } from '@/lib/client-packages';

export type ClientPackageDefinition = {
  id: string;
  salonId: string;
  name: string;
  description: string | null;
  totalSessions: number;
  price: number | null;
  validityDays: number;
  serviceIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type PackageDefinitionRow = {
  id: string;
  salon_id: string;
  name: string;
  description: string | null;
  total_sessions: number;
  price: number | string | null;
  validity_days: number;
  service_ids: unknown;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function normalizeServiceIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item ?? '').trim()).filter(Boolean))];
}

function rowToDefinition(row: PackageDefinitionRow): ClientPackageDefinition {
  return {
    id: row.id,
    salonId: row.salon_id,
    name: row.name,
    description: row.description,
    totalSessions: Math.max(1, Math.round(Number(row.total_sessions) || 1)),
    price: row.price == null ? null : Math.max(0, Number(row.price) || 0),
    validityDays: Math.max(1, Math.round(Number(row.validity_days) || 30)),
    serviceIds: normalizeServiceIds(row.service_ids),
    isActive: row.is_active !== false,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

export async function ensureClientPackageDefinitionsSchema() {
  await ensureClientPackagesSchema();
  await sql`
    CREATE TABLE IF NOT EXISTS client_package_definitions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      salon_id text NOT NULL,
      name text NOT NULL,
      description text,
      total_sessions int NOT NULL,
      price numeric,
      validity_days int NOT NULL DEFAULT 30,
      service_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS client_package_definitions_salon_name_uniq
      ON client_package_definitions(salon_id, lower(trim(name)))
  `;
}

export async function listClientPackageDefinitions(salonId: string) {
  await ensureClientPackageDefinitionsSchema();
  const rows = await sql`
    SELECT
      id, salon_id, name, description, total_sessions, price,
      validity_days, service_ids, is_active, created_at, updated_at
    FROM client_package_definitions
    WHERE salon_id = ${salonId}
    ORDER BY is_active DESC, created_at ASC
  ` as PackageDefinitionRow[];
  return rows.map(rowToDefinition);
}

export async function upsertClientPackageDefinition(input: {
  id?: string | null;
  salonId: string;
  name: string;
  description?: string | null;
  totalSessions: number;
  price?: number | null;
  validityDays: number;
  serviceIds: string[];
  isActive?: boolean;
}) {
  await ensureClientPackageDefinitionsSchema();
  const name = input.name.trim();
  if (!name) throw new Error('Името на пакета е задължително.');
  const totalSessions = Math.max(1, Math.round(Number(input.totalSessions) || 1));
  const validityDays = Math.max(1, Math.round(Number(input.validityDays) || 30));
  const serviceIds = normalizeServiceIds(input.serviceIds);

  const rows = input.id
    ? await sql`
        UPDATE client_package_definitions
        SET
          name = ${name},
          description = ${input.description?.trim() || null},
          total_sessions = ${totalSessions},
          price = ${input.price ?? null},
          validity_days = ${validityDays},
          service_ids = ${JSON.stringify(serviceIds)}::jsonb,
          is_active = ${input.isActive !== false},
          updated_at = now()
        WHERE id = ${input.id}::uuid
          AND salon_id = ${input.salonId}
        RETURNING id, salon_id, name, description, total_sessions, price, validity_days, service_ids, is_active, created_at, updated_at
      `
    : await sql`
        INSERT INTO client_package_definitions (
          salon_id, name, description, total_sessions, price, validity_days, service_ids, is_active
        )
        VALUES (
          ${input.salonId},
          ${name},
          ${input.description?.trim() || null},
          ${totalSessions},
          ${input.price ?? null},
          ${validityDays},
          ${JSON.stringify(serviceIds)}::jsonb,
          ${input.isActive !== false}
        )
        ON CONFLICT (salon_id, (lower(trim(name)))) DO UPDATE SET
          description = EXCLUDED.description,
          total_sessions = EXCLUDED.total_sessions,
          price = EXCLUDED.price,
          validity_days = EXCLUDED.validity_days,
          service_ids = EXCLUDED.service_ids,
          is_active = EXCLUDED.is_active,
          updated_at = now()
        RETURNING id, salon_id, name, description, total_sessions, price, validity_days, service_ids, is_active, created_at, updated_at
      `;

  if (rows.length === 0) throw new Error('Пакетът не е намерен.');
  return rowToDefinition(rows[0] as PackageDefinitionRow);
}

export async function deleteClientPackageDefinition(input: { salonId: string; id: string }) {
  await ensureClientPackageDefinitionsSchema();
  await sql`
    DELETE FROM client_package_definitions
    WHERE salon_id = ${input.salonId}
      AND id = ${input.id}::uuid
  `;
}
