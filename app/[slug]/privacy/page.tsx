import { notFound } from 'next/navigation';
import { getPublicSalonPageData } from '@/lib/public-salon';
import { generatePrivacyPolicy } from '@/lib/legal-templates';
import type { LegalInfo } from '@/lib/legal-templates';

export const dynamic = 'force-dynamic';

export default async function PrivacyPage({ params }: { params: { slug: string } }) {
  const pageData = await getPublicSalonPageData({ slug: params.slug });
  if (!pageData) return notFound();

  const salon = pageData.salon as Record<string, unknown>;
  const legal = (salon.legal_info ?? {}) as Partial<LegalInfo>;
  const domain = String(salon.custom_domain || `${params.slug}.clicka.bg`).trim();

  const info: LegalInfo = {
    companyName:  String(legal.companyName  ?? salon.name ?? '').trim() || 'Фирмата',
    eik:          String(legal.eik          ?? '').trim() || '—',
    managerName:  String(legal.managerName  ?? '').trim() || '—',
    address:      String(legal.address      ?? salon.address ?? '').trim() || '—',
    contactEmail: String(legal.contactEmail ?? salon.email ?? '').trim() || '—',
    salonName:    String(salon.name ?? '').trim() || 'Салонът',
    salonDomain:  domain,
  };

  const html = generatePrivacyPolicy(info);

  return (
    <main style={{ maxWidth: 780, margin: '0 auto', padding: '48px 24px 80px', fontFamily: 'system-ui, sans-serif', color: '#1a1a1a', lineHeight: 1.7 }}>
      <a href={`/${params.slug}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', textDecoration: 'none', marginBottom: 32 }}>
        ← Обратно към {info.salonName}
      </a>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
