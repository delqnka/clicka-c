import { renderLegalDocumentPage } from '@/lib/legal-document-page';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: true } };

export default function SalonHomeTermsPage() {
  return renderLegalDocumentPage({ document: 'terms' });
}
