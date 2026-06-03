import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { resolveSalonBySlugOrHost } from '@/lib/admin-auth';
import { getPublicSalonPageData } from '@/lib/public-salon';
import { ensureStaffSchema } from '@/lib/ensure-staff-schema';
import { StaffDirectBookingView } from '@/components/salon/StaffDirectBookingView';

export const revalidate = 60;

type Props = { params: { staffSlug: string }; searchParams?: Record<string, string | string[] | undefined> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await loadStaffData(params.staffSlug);
  if (!data) return {};
  return {
    title: `Резервация при ${data.staff.name} — ${data.salonName}`,
    description: data.staff.bio ?? `Онлайн резервация при ${data.staff.name}`,
  };
}

async function loadStaffData(staffSlug: string) {
  try {
    await ensureStaffSchema();
    const rows = await sql`
      SELECT
        sm.id,
        sm.name,
        sm.slug,
        sm.bio,
        sm.avatar_url,
        sm.salon_id,
        s.slug AS salon_slug,
        s.name AS salon_name,
        ARRAY_AGG(ss.service_id) FILTER (WHERE ss.service_id IS NOT NULL) AS service_ids
      FROM staff_members sm
      LEFT JOIN staff_services ss ON ss.staff_member_id = sm.id
      JOIN salons s ON CAST(s.id AS text) = sm.salon_id
      WHERE sm.slug = ${staffSlug}
        AND sm.is_owner = false
        AND sm.is_active = true
        AND s.is_active = true
      GROUP BY sm.id, s.slug, s.name
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    const row = rows[0] as Record<string, unknown>;
    return {
      staff: {
        id: String(row.id ?? ''),
        name: String(row.name ?? ''),
        slug: String(row.slug ?? ''),
        bio: row.bio ? String(row.bio) : null,
        avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
        serviceIds: Array.isArray(row.service_ids) ? (row.service_ids as string[]) : [],
      },
      salonSlug: String(row.salon_slug ?? ''),
      salonName: String(row.salon_name ?? ''),
    };
  } catch {
    return null;
  }
}

export default async function StaffDirectBookingPage({ params }: Props) {
  const data = await loadStaffData(params.staffSlug);
  if (!data) notFound();

  if (data.staff.serviceIds.length === 0) {
    return (
      <main style={{ fontFamily: 'system-ui, sans-serif', padding: '60px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
          {data.staff.name}
        </h1>
        <p style={{ color: '#555' }}>Профилът не е наличен за резервация в момента.</p>
      </main>
    );
  }

  const pageData = await getPublicSalonPageData({ slug: data.salonSlug });
  if (!pageData) notFound();

  return (
    <StaffDirectBookingView
      pageData={pageData}
      staff={data.staff}
    />
  );
}
