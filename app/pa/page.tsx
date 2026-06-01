import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isPlatformAdminSession } from '@/lib/platform-admin-auth';
import { sql } from '@/lib/db';
import PlatformAdminDashboard from '@/components/platform-admin/PlatformAdminDashboard';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Platform Admin — Clicka.bg',
  robots: 'noindex, nofollow',
};

export type SalonRow = {
  salon_id: string;
  slug: string;
  name: string;
  email: string;
  is_active: boolean;
  site_status: string | null;
  plan_type: string | null;
  stripe_session_id: string | null;
  stripe_customer_id: string | null;
  custom_domain: string | null;
  domain_status: string | null;
  created_at: string;
  updated_at: string | null;
  owner_email: string | null;
  booking_count: number;
  sms_credits: number;
};

async function loadSalons(): Promise<SalonRow[]> {
  try {
    const rows = await sql`
      SELECT
        CAST(s.id AS text) AS salon_id,
        s.slug,
        s.name,
        s.email,
        s.is_active,
        s.site_status,
        s.plan_type,
        s.stripe_session_id,
        s.stripe_customer_id,
        s.custom_domain,
        s.domain_status,
        s.created_at,
        s.updated_at,
        o.email AS owner_email,
        COALESCE(b.booking_count, 0) AS booking_count
      FROM salons s
      LEFT JOIN salon_owner_memberships m ON m.salon_id = CAST(s.id AS text)
      LEFT JOIN site_owners o ON o.id = m.owner_id
      LEFT JOIN (
        SELECT salon_id, COUNT(*) AS booking_count
        FROM bookings
        GROUP BY salon_id
      ) b ON CAST(b.salon_id AS text) = CAST(s.id AS text)
      ORDER BY s.created_at DESC
    `;
    return rows.map((r) => ({
      salon_id: String((r as Record<string, unknown>).salon_id ?? ''),
      slug: String((r as Record<string, unknown>).slug ?? ''),
      name: String((r as Record<string, unknown>).name ?? ''),
      email: String((r as Record<string, unknown>).email ?? ''),
      is_active: Boolean((r as Record<string, unknown>).is_active),
      site_status: (r as Record<string, unknown>).site_status as string | null,
      plan_type: (r as Record<string, unknown>).plan_type as string | null,
      stripe_session_id: (r as Record<string, unknown>).stripe_session_id as string | null,
      stripe_customer_id: (r as Record<string, unknown>).stripe_customer_id as string | null,
      custom_domain: (r as Record<string, unknown>).custom_domain as string | null,
      domain_status: (r as Record<string, unknown>).domain_status as string | null,
      created_at: String((r as Record<string, unknown>).created_at ?? ''),
      updated_at: (r as Record<string, unknown>).updated_at as string | null,
      owner_email: (r as Record<string, unknown>).owner_email as string | null,
      booking_count: Number((r as Record<string, unknown>).booking_count ?? 0),
      sms_credits: 0,
    }));
  } catch {
    return [];
  }
}

async function loadRecentBookings() {
  try {
    const rows = await sql`
      SELECT
        CAST(b.id AS text) AS booking_id,
        b.client_name,
        b.client_phone,
        b.service_name,
        b.date,
        b.time,
        b.status,
        b.created_at,
        s.name AS salon_name,
        s.slug AS salon_slug
      FROM bookings b
      JOIN salons s ON CAST(s.id AS text) = CAST(b.salon_id AS text)
      ORDER BY b.created_at DESC
      LIMIT 50
    `;
    return rows.map((r) => r as Record<string, unknown>);
  } catch {
    return [];
  }
}

export default async function PlatformAdminPage() {
  void cookies(); // force dynamic

  if (!isPlatformAdminSession()) {
    redirect('/pa/sign-in');
  }

  const [salons, recentBookings] = await Promise.all([
    loadSalons(),
    loadRecentBookings(),
  ]);

  const totalSalons = salons.length;
  const activeSalons = salons.filter((s) => s.is_active).length;
  const totalBookings = salons.reduce((sum, s) => sum + s.booking_count, 0);
  const claimedSalons = salons.filter((s) => s.owner_email).length;

  return (
    <PlatformAdminDashboard
      salons={salons}
      recentBookings={recentBookings as never[]}
      stats={{
        totalSalons,
        activeSalons,
        totalBookings,
        claimedSalons,
      }}
    />
  );
}
