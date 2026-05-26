import { renderLegalDocumentPage } from '@/lib/legal-document-page';

export const dynamic = 'force-dynamic';

export default function CookiesOnHostPage() {
  return renderLegalDocumentPage({ document: 'cookies' });
}
