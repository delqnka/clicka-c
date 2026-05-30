import { renderLegalDocumentPage } from '@/lib/legal-document-page';

export const dynamic = 'force-dynamic';

export default function CookiesPage({ params }: { params: { slug: string } }) {
  return renderLegalDocumentPage({ slug: params.slug, document: 'cookies' });
}
