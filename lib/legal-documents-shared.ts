export type LegalDocumentKind = 'terms' | 'privacy' | 'cookies';

export const LEGAL_DOCUMENT_LABELS: Record<LegalDocumentKind, string> = {
  terms: 'Условия за ползване',
  privacy: 'Политика за поверителност',
  cookies: 'Политика за бисквитки',
};
