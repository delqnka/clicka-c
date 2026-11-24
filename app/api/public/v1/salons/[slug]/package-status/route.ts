import { NextRequest, NextResponse } from 'next/server';
import { resolveSalonBySlugOrHost } from '@/lib/admin-auth';
import { findActiveClientPackage, findExhaustedClientPackage } from '@/lib/client-packages';
import { getBrowserHost } from '@/lib/domain-routing';
import { verifyApiKey } from '@/lib/public-api-auth';

const PUBLIC_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
} as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_CORS });
}

/**
 * Returns only the active-package balance needed by the public booking form.
 * Matching deliberately requires the client's name plus phone or email; a
 * name on its own must never reveal package information.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: PUBLIC_CORS });
  }

  const slug = String(params.slug ?? '').trim();
  const clientName = String(body.clientName ?? '').trim();
  const clientPhone = String(body.clientPhone ?? '').trim();
  const clientEmail = String(body.clientEmail ?? '').trim().toLowerCase();
  const phoneDigits = clientPhone.replace(/\D/g, '');
  const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail);

  if (!slug || clientName.length < 2 || (phoneDigits.length < 7 && !hasValidEmail)) {
    return NextResponse.json({ error: 'Missing client details' }, { status: 400, headers: PUBLIC_CORS });
  }

  const auth = await verifyApiKey(request, { slug, requiredScope: 'book', corsHeaders: PUBLIC_CORS });
  if (!auth.ok) return auth.response;

  // Never follow a same-slug record to a different tenant. This makes an old
  // API key misconfiguration visible without exposing another salon's data.
  const currentSalon = await resolveSalonBySlugOrHost({
    slug,
    host: getBrowserHost(request.headers),
    includeInactive: false,
  });
  if (!currentSalon || currentSalon.salonId !== auth.salonId) {
    return NextResponse.json(
      { error: 'Booking API key is not linked to this salon.' },
      { status: 409, headers: PUBLIC_CORS },
    );
  }

  const activePackage = await findActiveClientPackage({
    salonId: auth.salonId,
    clientName,
    clientPhone,
    clientEmail,
  });

  // Only look for a used-up package when there is no credit-bearing one, so the
  // form can warn the client to buy a new one instead of silently charging.
  const exhaustedPackage = activePackage
    ? null
    : await findExhaustedClientPackage({
        salonId: auth.salonId,
        clientName,
        clientPhone,
        clientEmail,
      });

  return NextResponse.json({ package: activePackage, exhaustedPackage }, { headers: PUBLIC_CORS });
}
