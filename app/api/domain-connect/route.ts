import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  isValidDomain,
  normalizeDomainCandidate,
  requireAdminRequestAccess,
} from '@/lib/admin-auth';
import { loadAdminSiteDataBySlug } from '@/lib/admin-site';
import { ROOT_DOMAIN } from '@/lib/domain-routing';
import { ensureDomainPurchaseSchema } from '@/lib/domain-purchase';
import { syncDomainWithVercel, removeProjectDomain } from '@/lib/vercel-domains';
import { writeAuditLog } from '@/lib/audit-log';

async function persistDomainState({
  slug,
  domain,
  provider,
}: {
  slug: string;
  domain: string;
  provider: Awaited<ReturnType<typeof syncDomainWithVercel>>;
}) {
  const configJson = JSON.stringify({
    provider: provider.provider,
    dnsInstructions: provider.dnsInstructions,
    verificationInstructions: provider.verificationInstructions,
    configuredBy: provider.configuredBy,
    misconfigured: provider.misconfigured,
    verified: provider.verified,
    providerDetails: provider.details,
    checkedAt: new Date().toISOString(),
  });

  const isActive = provider.status === 'active';

  await sql`
    UPDATE salons
    SET
      custom_domain = ${domain},
      domain_status = ${provider.status},
      domain_last_checked_at = now(),
      domain_verified_at = CASE WHEN ${isActive} THEN now() ELSE domain_verified_at END,
      domain_config = ${configJson},
      updated_at = now()
    WHERE slug = ${slug}
  `;

  await ensureDomainPurchaseSchema();
  const statusForPurchase = provider.status;
  await sql`
    UPDATE domain_purchase_requests
    SET
      status = CASE
        WHEN ${statusForPurchase} = 'active' THEN 'connected'
        WHEN status IN ('paid', 'requested') THEN 'processing'
        ELSE status
      END,
      updated_at = now()
    WHERE lower(full_domain) = lower(${domain})
      AND salon_id IN (SELECT id::text FROM salons WHERE slug = ${slug} LIMIT 1)
      AND status <> 'rejected'
  `;
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const site = await loadAdminSiteDataBySlug(auth.salon.slug);
  if (!site) {
    return NextResponse.json({ error: 'Сайтът не е намерен.' }, { status: 404 });
  }

  return NextResponse.json({
    customDomain: site.customDomain,
    domainStatus: site.domainStatus,
    domainConfig: site.domainConfig,
  });
}

export async function PATCH(request: NextRequest) {
  let body: { slug?: string; domain?: string } = {};
  try {
    body = await request.json();
  } catch {}

  const auth = await requireAdminRequestAccess(
    request,
    body.slug ?? request.nextUrl.searchParams.get('slug')
  );
  if (!auth.ok) return auth.response;

  const site = await loadAdminSiteDataBySlug(auth.salon.slug);
  if (!site || !site.customDomain) {
    return NextResponse.json({ error: 'Няма свързан домейн за проверка.' }, { status: 400 });
  }

  const provider = await syncDomainWithVercel(site.customDomain);
  await persistDomainState({
    slug: auth.salon.slug,
    domain: site.customDomain,
    provider,
  });

  return NextResponse.json({
    success: true,
    customDomain: site.customDomain,
    domainStatus: provider.status,
    dnsInstructions: provider.dnsInstructions,
    verificationInstructions: provider.verificationInstructions,
    provider: provider.provider,
    providerDetails: provider.details,
    configuredBy: provider.configuredBy,
    misconfigured: provider.misconfigured,
    verified: provider.verified,
  });
}

export async function DELETE(request: NextRequest) {
  let body: { slug?: string } = {};
  try { body = await request.json(); } catch {}

  const auth = await requireAdminRequestAccess(
    request,
    body.slug ?? request.nextUrl.searchParams.get('slug')
  );
  if (!auth.ok) return auth.response;

  const site = await loadAdminSiteDataBySlug(auth.salon.slug);
  if (!site) return NextResponse.json({ error: 'Сайтът не е намерен.' }, { status: 404 });

  const removedDomain = site.customDomain;
  if (removedDomain) {
    await removeProjectDomain(removedDomain);
  }

  await sql`
    UPDATE salons
    SET
      custom_domain = NULL,
      domain_status = NULL,
      domain_config = NULL,
      domain_verified_at = NULL,
      domain_last_checked_at = now(),
      updated_at = now()
    WHERE slug = ${auth.salon.slug}
  `;

  void writeAuditLog({
    salonId: auth.salon.salonId,
    ownerId: auth.session.ownerId,
    action: 'domain_disconnected',
    detail: removedDomain ? { domain: removedDomain } : undefined,
    ip: request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null,
  });

  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  let body: { slug?: string; domain?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const auth = await requireAdminRequestAccess(
    request,
    body.slug ?? request.nextUrl.searchParams.get('slug')
  );
  if (!auth.ok) return auth.response;

  const domain = normalizeDomainCandidate(body.domain ?? '');
  if (!domain || !isValidDomain(domain)) {
    return NextResponse.json({ error: 'Въведете валиден домейн.' }, { status: 400 });
  }
  if (domain === ROOT_DOMAIN || domain.endsWith(`.${ROOT_DOMAIN}`)) {
    return NextResponse.json({ error: 'Този домейн е запазен за платформата.' }, { status: 400 });
  }

  // Prevent claiming a domain already registered to another salon
  const existing = await sql`
    SELECT slug FROM salons
    WHERE lower(custom_domain) = lower(${domain})
      AND slug <> ${auth.salon.slug}
    LIMIT 1
  `;
  if (existing.length > 0) {
    return NextResponse.json(
      { error: 'Този домейн вече е свързан с друг акаунт.' },
      { status: 409 },
    );
  }

  const provider = await syncDomainWithVercel(domain);
  await persistDomainState({
    slug: auth.salon.slug,
    domain,
    provider,
  });

  void writeAuditLog({
    salonId: auth.salon.salonId,
    ownerId: auth.session.ownerId,
    action: 'domain_connected',
    detail: { domain, status: provider.status },
    ip: request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null,
  });

  return NextResponse.json({
    success: true,
    customDomain: domain,
    domainStatus: provider.status,
    dnsInstructions: provider.dnsInstructions,
    verificationInstructions: provider.verificationInstructions,
    provider: provider.provider,
    providerDetails: provider.details,
    configuredBy: provider.configuredBy,
    misconfigured: provider.misconfigured,
    verified: provider.verified,
  });
}

