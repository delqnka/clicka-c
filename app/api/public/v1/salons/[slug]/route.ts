import { NextRequest } from 'next/server';
import { GET as getSalon, OPTIONS } from '@/app/api/public/salons/[slug]/route';

export { OPTIONS };

/**
 * GET /api/public/v1/salons/:slug
 *
 * Public salon read for the SDK.
 *
 * Delegates to the secure public route so `v1` and non-`v1` stay aligned on
 * API-key enforcement and response shape.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  return getSalon(request, { params });
}
