import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { resolveSalonBySlugOrHost } from '@/lib/admin-auth';
import { ensureStaffSchema } from '@/lib/ensure-staff-schema';

const PUBLIC_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_CORS });
}

export type PublicStaffMember = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatarUrl: string | null;
  serviceIds: string[];
};

/** Public endpoint — no auth required. Returns staff members for the booking widget. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const lookup = await resolveSalonBySlugOrHost({
    slug: request.headers.get('x-salon-slug') || searchParams.get('slug'),
    host: request.headers.get('host'),
    includeInactive: false,
  });

  if (!lookup) {
    return NextResponse.json({ staff: [] }, { headers: PUBLIC_CORS });
  }

  try {
    await ensureStaffSchema();
    const rows = await sql`
      SELECT
        sm.id,
        sm.name,
        sm.slug,
        sm.bio,
        sm.avatar_url,
        ARRAY_AGG(ss.service_id) FILTER (WHERE ss.service_id IS NOT NULL) AS service_ids
      FROM staff_members sm
      LEFT JOIN staff_services ss ON ss.staff_member_id = sm.id
      JOIN salons s ON CAST(s.id AS text) = sm.salon_id
      WHERE s.slug = ${lookup.slug}
        AND sm.is_owner = false
        AND sm.is_active = true
      GROUP BY sm.id
      ORDER BY sm.created_at ASC
    `;

    const staff: PublicStaffMember[] = rows.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: String(row.id ?? ''),
        name: String(row.name ?? ''),
        slug: String(row.slug ?? ''),
        bio: row.bio ? String(row.bio) : null,
        avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
        serviceIds: Array.isArray(row.service_ids) ? (row.service_ids as string[]) : [],
      };
    });

    return NextResponse.json({ staff }, { headers: PUBLIC_CORS });
  } catch {
    // If staff table doesn't exist yet (fresh salon), return empty — SOLO flow
    return NextResponse.json({ staff: [] }, { headers: PUBLIC_CORS });
  }
}
