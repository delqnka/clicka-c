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
import { syncDomainWithVercel } from '@/lib/vercel-domains';

async function persistDomainState({
  slug,
  domain,
  provider,
}: {
  slug: string;
  domain: string;
  provider: Awaited<ReturnType<typeof syncDomainWithVercel>>;
}) {
  await sql`
    UPDATE salons
    SET
      custom_domain = ${domain},
      domain_status = ${provider.status},
      domain_last_checked_at = now(),
      domain_verified_at = CASE WHEN ${provider.status} = 'active' THEN now() ELSE domain_verified_at END,
      domain_config = ${JSON.stringify({
        provider: provider.provider,
        dnsInstructions: provider.dnsInstructions,
        verificationInstructions: provider.verificationInstructions,
        configuredBy: provider.configuredBy,
        misconfigured: provider.misconfigured,
        verified: provider.verified,
        providerDetails: provider.details,
        checkedAt: new Date().toISOString(),
      })}::jsonb,
      updated_at = now()
    WHERE slug = ${slug}
  `;

  await ensureDomainPurchaseSchema();
  await sql`
    UPDATE domain_purchase_requests
    SET
      status = CASE
        WHEN ${provider.status} = 'active' THEN 'connected'
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

  const provider = await syncDomainWithVercel(domain);
  await persistDomainState({
    slug: auth.salon.slug,
    domain,
    provider,
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

