import { renderLegalDocumentPage } from '@/lib/legal-document-page';

export const dynamic = 'force-dynamic';

export default function PrivacyOnHostPage() {
  return renderLegalDocumentPage({ document: 'privacy' });
}
