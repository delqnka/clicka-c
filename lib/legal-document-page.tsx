import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { CookiesPolicyContent } from '@/components/legal/cookies-policy-content';
import { extractHostname, getPrimaryPublicUrl } from '@/lib/domain-routing';
import {
  generatePrivacyPolicy,
  generateTermsOfService,
  type LegalInfo,
} from '@/lib/legal-templates';
import type { LegalDocumentKind } from '@/lib/legal-documents-shared';
import { getPublicSalonPageData } from '@/lib/public-salon';

export type { LegalDocumentKind } from '@/lib/legal-documents-shared';

export function buildLegalInfo(
  salon: Record<string, unknown>,
  salonSlug: string,
): LegalInfo {
  const legal = (salon.legal_info ?? {}) as Partial<LegalInfo>;
  const salonDomain = extractHostname(
    getPrimaryPublicUrl({
      slug: salonSlug,
      customDomain: String(salon.custom_domain ?? ''),
      domainStatus: String(salon.domain_status ?? ''),
    }),
  );

  return {
    companyName: String(legal.companyName ?? salon.name ?? '').trim() || 'Фирмата',
    eik: String(legal.eik ?? '').trim() || '—',
    managerName: String(legal.managerName ?? '').trim() || '—',
    address: String(legal.address ?? salon.address ?? '').trim() || '—',
    contactEmail: String(legal.contactEmail ?? salon.email ?? '').trim() || '—',
    salonName: String(salon.name ?? '').trim() || 'Салонът',
    salonDomain,
  };
}

function legalMainStyle() {
  return {
    maxWidth: 780,
    margin: '0 auto',
    padding: '48px 24px 80px',
    fontFamily: 'system-ui, sans-serif',
    color: '#1a1a1a',
    lineHeight: 1.7,
  } as const;
}

function backLinkStyle() {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: '#6b7280',
    textDecoration: 'none',
    marginBottom: 32,
  } as const;
}

export async function renderLegalDocumentPage({
  slug: slugParam,
  document: kind,
}: {
  slug?: string;
  document: LegalDocumentKind;
}) {
  const host = headers().get('host');
  const pageData = await getPublicSalonPageData({ slug: slugParam, host });
  if (!pageData) return notFound();

  const salon = pageData.salon as Record<string, unknown>;
  const info = buildLegalInfo(salon, pageData.salonSlug);
  const homeUrl = getPrimaryPublicUrl({
    slug: pageData.salonSlug,
    customDomain: String(salon.custom_domain ?? ''),
    domainStatus: String(salon.domain_status ?? ''),
  });

  if (kind === 'cookies') {
    return (
      <main style={legalMainStyle()}>
        <a href={homeUrl} style={backLinkStyle()}>
          ← Обратно към {info.salonName}
        </a>
        <CookiesPolicyContent
          salonName={info.salonName}
          domain={info.salonDomain}
          contactEmail={info.contactEmail}
        />
      </main>
    );
  }

  const html = kind === 'terms' ? generateTermsOfService(info) : generatePrivacyPolicy(info);

  return (
    <main style={legalMainStyle()}>
      <a href={homeUrl} style={backLinkStyle()}>
        ← Обратно към {info.salonName}
      </a>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
