import crypto from 'crypto';
import { sql } from '@/lib/db';
import { ensureStaffSchema } from '@/lib/ensure-staff-schema';

export type StaffMember = {
  id: string;
  salonId: string;
  name: string;
  slug: string;
  email: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isOwner: boolean;
  isActive: boolean;
  telegramChatId: string | null;
  googleCalendarId: string | null;
  googleCalendarRefreshToken: string | null;
  serviceIds: string[];
  onboardingCode: string | null;
};

type StaffRow = {
  id: string;
  salon_id: string;
  name: string;
  slug: string;
  email: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_owner: boolean;
  is_active: boolean;
  telegram_chat_id: string | null;
  google_calendar_id: string | null;
  google_calendar_refresh_token: string | null;
  service_ids: string[] | null;
  onboarding_code: string | null;
};

function rowToStaffMember(row: StaffRow): StaffMember {
  return {
    id: row.id,
    salonId: row.salon_id,
    name: row.name,
    slug: row.slug,
    email: row.email,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    isOwner: row.is_owner,
    isActive: row.is_active ?? true,
    telegramChatId: row.telegram_chat_id,
    googleCalendarId: row.google_calendar_id,
    googleCalendarRefreshToken: row.google_calendar_refresh_token,
    serviceIds: row.service_ids ?? [],
    onboardingCode: row.onboarding_code ?? null,
  };
}

export async function getStaffMembers(salonId: string): Promise<StaffMember[]> {
  await ensureStaffSchema();
  const rows = await sql`
    SELECT
      sm.id, sm.salon_id, sm.name, sm.slug, sm.email, sm.bio, sm.avatar_url,
      sm.is_owner, sm.is_active, sm.telegram_chat_id, sm.google_calendar_id,
      sm.google_calendar_refresh_token, sm.onboarding_code,
      ARRAY_AGG(ss.service_id) FILTER (WHERE ss.service_id IS NOT NULL) AS service_ids
    FROM staff_members sm
    LEFT JOIN staff_services ss ON ss.staff_member_id = sm.id
    WHERE sm.salon_id = ${salonId}
    GROUP BY sm.id
    ORDER BY sm.is_owner DESC, sm.created_at ASC
  `;
  return (rows as StaffRow[]).map(rowToStaffMember);
}

export async function getStaffMemberBySlug(
  salonId: string,
  slug: string,
): Promise<StaffMember | null> {
  await ensureStaffSchema();
  const rows = await sql`
    SELECT
      sm.id, sm.salon_id, sm.name, sm.slug, sm.email, sm.bio, sm.avatar_url,
      sm.is_owner, sm.is_active, sm.telegram_chat_id, sm.google_calendar_id,
      sm.google_calendar_refresh_token, sm.onboarding_code,
      ARRAY_AGG(ss.service_id) FILTER (WHERE ss.service_id IS NOT NULL) AS service_ids
    FROM staff_members sm
    LEFT JOIN staff_services ss ON ss.staff_member_id = sm.id
    WHERE sm.salon_id = ${salonId} AND sm.slug = ${slug}
    GROUP BY sm.id
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  return rowToStaffMember(rows[0] as StaffRow);
}

export async function getStaffMemberByTelegramChatId(
  chatId: string,
): Promise<(StaffMember & { salonSlug: string; salonName: string }) | null> {
  await ensureStaffSchema();
  const rows = await sql`
    SELECT
      sm.id, sm.salon_id, sm.name, sm.slug, sm.email, sm.bio, sm.avatar_url,
      sm.is_owner, sm.is_active, sm.telegram_chat_id, sm.google_calendar_id,
      sm.google_calendar_refresh_token, sm.onboarding_code,
      ARRAY_AGG(ss.service_id) FILTER (WHERE ss.service_id IS NOT NULL) AS service_ids,
      s.slug AS salon_slug, s.name AS salon_name
    FROM staff_members sm
    LEFT JOIN staff_services ss ON ss.staff_member_id = sm.id
    JOIN salons s ON CAST(s.id AS text) = sm.salon_id
    WHERE sm.telegram_chat_id = ${chatId}
    GROUP BY sm.id, s.slug, s.name
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const row = rows[0] as StaffRow & { salon_slug: string; salon_name: string };
  return { ...rowToStaffMember(row), salonSlug: row.salon_slug, salonName: row.salon_name };
}

export async function getStaffMemberById(id: string): Promise<StaffMember | null> {
  await ensureStaffSchema();
  const rows = await sql`
    SELECT
      sm.id, sm.salon_id, sm.name, sm.slug, sm.email, sm.bio, sm.avatar_url,
      sm.is_owner, sm.is_active, sm.telegram_chat_id, sm.google_calendar_id,
      sm.google_calendar_refresh_token, sm.onboarding_code,
      ARRAY_AGG(ss.service_id) FILTER (WHERE ss.service_id IS NOT NULL) AS service_ids
    FROM staff_members sm
    LEFT JOIN staff_services ss ON ss.staff_member_id = sm.id
    WHERE sm.id = ${id}::uuid
    GROUP BY sm.id
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  return rowToStaffMember(rows[0] as StaffRow);
}

export function isTeamPlan(plan: string): boolean {
  return plan === 'team' || plan === 'ekip';
}

export function getStaffLimit(plan: string): number {
  return isTeamPlan(plan) ? 3 : 1;
}

export async function createStaffMember(input: {
  salonId: string;
  name: string;
  slug: string;
  email?: string | null;
  serviceIds?: string[];
}): Promise<StaffMember> {
  await ensureStaffSchema();
  const onboardingCode = crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A3F9C2B1"
  const rows = await sql`
    INSERT INTO staff_members (salon_id, name, slug, email, onboarding_code)
    VALUES (${input.salonId}, ${input.name}, ${input.slug}, ${input.email ?? null}, ${onboardingCode})
    RETURNING id, salon_id, name, slug, email, bio, avatar_url, is_owner, is_active,
              telegram_chat_id, google_calendar_id, google_calendar_refresh_token, onboarding_code
  `;
  const row = rows[0] as StaffRow;
  const member = rowToStaffMember({ ...row, service_ids: [] });

  if (input.serviceIds && input.serviceIds.length > 0) {
    await setStaffServices(member.id, input.serviceIds);
    member.serviceIds = input.serviceIds;
  }

  return member;
}

export async function updateStaffMember(
  id: string,
  salonId: string,
  input: {
    name?: string;
    slug?: string;
    email?: string | null;
    bio?: string | null;
    isActive?: boolean;
    serviceIds?: string[];
  },
): Promise<void> {
  await ensureStaffSchema();
  // Use separate UPDATE statements per field to avoid CASE WHEN with JS boolean interpolation.
  if (input.name !== undefined) {
    await sql`UPDATE staff_members SET name = ${input.name} WHERE id = ${id}::uuid AND salon_id = ${salonId}`;
  }
  if (input.slug !== undefined) {
    await sql`UPDATE staff_members SET slug = ${input.slug} WHERE id = ${id}::uuid AND salon_id = ${salonId}`;
  }
  if (input.email !== undefined) {
    // Normalize empty string to null so ?? fallback works correctly in notifications.
    const emailVal = input.email?.trim() || null;
    await sql`UPDATE staff_members SET email = ${emailVal} WHERE id = ${id}::uuid AND salon_id = ${salonId}`;
  }
  if (input.bio !== undefined) {
    const bioVal = input.bio?.trim() || null;
    await sql`UPDATE staff_members SET bio = ${bioVal} WHERE id = ${id}::uuid AND salon_id = ${salonId}`;
  }
  if (input.isActive !== undefined) {
    await sql`UPDATE staff_members SET is_active = ${input.isActive} WHERE id = ${id}::uuid AND salon_id = ${salonId}`;
  }
  if (input.serviceIds !== undefined) {
    await setStaffServices(id, input.serviceIds);
  }
}

export async function deleteStaffMember(id: string, salonId: string): Promise<void> {
  await ensureStaffSchema();
  // staff_services rows cascade-delete via FK
  await sql`
    DELETE FROM staff_members
    WHERE id = ${id}::uuid AND salon_id = ${salonId} AND is_owner = false
  `;
}

async function setStaffServices(staffMemberId: string, serviceIds: string[]): Promise<void> {
  await sql`DELETE FROM staff_services WHERE staff_member_id = ${staffMemberId}::uuid`;
  if (serviceIds.length === 0) return;
  for (const sid of serviceIds) {
    await sql`
      INSERT INTO staff_services (staff_member_id, service_id)
      VALUES (${staffMemberId}::uuid, ${sid})
      ON CONFLICT DO NOTHING
    `;
  }
}
