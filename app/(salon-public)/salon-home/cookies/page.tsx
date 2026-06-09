import { renderLegalDocumentPage } from '@/lib/legal-document-page';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: true } };

export default function SalonHomeCookiesPage() {
  return renderLegalDocumentPage({ document: 'cookies' });
}
