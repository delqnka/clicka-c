import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  isValidDomain,
  normalizeDomainCandidate,
  requireAdminRequestAccess,
} from '@/lib/admin-auth';
import { loadAdminSiteDataBySlug } from '@/lib/admin-site';
import { ROOT_DOMAIN } from '@/lib/domain-routing';
import { buildDnsInstructions, syncDomainWithVercel } from '@/lib/vercel-domains';

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

  const instructions = buildDnsInstructions(domain);
  const provider = await syncDomainWithVercel(domain);

  await sql`
    UPDATE salons
    SET
      custom_domain = ${domain},
      domain_status = ${provider.status},
      domain_last_checked_at = now(),
      domain_verified_at = CASE WHEN ${provider.status} = 'active' THEN now() ELSE domain_verified_at END,
      domain_config = ${JSON.stringify({
        provider: provider.provider,
        dnsInstructions: instructions,
        providerDetails: provider.details,
      })}::jsonb,
      updated_at = now()
    WHERE slug = ${auth.salon.slug}
  `;

  return NextResponse.json({
    success: true,
    customDomain: domain,
    domainStatus: provider.status,
    dnsInstructions: instructions,
    provider: provider.provider,
    providerDetails: provider.details,
  });
}

