import { renderLegalDocumentPage } from '@/lib/legal-document-page';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: true } };

export default function PrivacyPage({ params }: { params: { slug: string } }) {
  return renderLegalDocumentPage({ slug: params.slug, document: 'privacy' });
}
