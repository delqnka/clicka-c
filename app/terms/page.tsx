import { renderLegalDocumentPage } from '@/lib/legal-document-page';

export const dynamic = 'force-dynamic';

/** Правни документи на собствен домейн или поддомейн (без /slug в пътя). */
export default function TermsOnHostPage() {
  return renderLegalDocumentPage({ document: 'terms' });
}
