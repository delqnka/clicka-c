export type LegalDocumentKind = 'terms' | 'privacy' | 'cookies';

export const LEGAL_DOCUMENT_LABELS: Record<LegalDocumentKind, string> = {
  terms: 'Условия за ползване',
  privacy: 'Политика за поверителност',
  cookies: 'Политика за бисквитки',
};

export const LEGAL_DOCUMENT_LABELS_EN: Record<LegalDocumentKind, string> = {
  terms: 'Terms of Use',
  privacy: 'Privacy Policy',
  cookies: 'Cookie Policy',
};

export function getLegalDocumentLabels(locale: 'bg' | 'en'): Record<LegalDocumentKind, string> {
  return locale === 'en' ? LEGAL_DOCUMENT_LABELS_EN : LEGAL_DOCUMENT_LABELS;
}
