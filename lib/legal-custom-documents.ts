import type { LegalDocumentKind } from '@/lib/legal-documents-shared';

export type LegalCustomDocumentEntry = {
  useCustom: boolean;
  body: string;
};

export type LegalCustomDocuments = Record<LegalDocumentKind, LegalCustomDocumentEntry>;

export type LegalInfoStored = {
  companyName: string;
  eik: string;
  managerName: string;
  address: string;
  contactEmail: string;
  customDocuments: LegalCustomDocuments;
};

const EMPTY_ENTRY: LegalCustomDocumentEntry = { useCustom: false, body: '' };

export function defaultLegalCustomDocuments(): LegalCustomDocuments {
  return {
    terms: { ...EMPTY_ENTRY },
    privacy: { ...EMPTY_ENTRY },
    cookies: { ...EMPTY_ENTRY },
  };
}

export function defaultLegalInfoStored(): LegalInfoStored {
  return {
    companyName: '',
    eik: '',
    managerName: '',
    address: '',
    contactEmail: '',
    customDocuments: defaultLegalCustomDocuments(),
  };
}

function normalizeEntry(raw: unknown): LegalCustomDocumentEntry {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_ENTRY };
  const o = raw as Record<string, unknown>;
  return {
    useCustom: o.useCustom === true,
    body: String(o.body ?? '').trim(),
  };
}

export function normalizeLegalCustomDocuments(raw: unknown): LegalCustomDocuments {
  const base = defaultLegalCustomDocuments();
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  return {
    terms: normalizeEntry(o.terms),
    privacy: normalizeEntry(o.privacy),
    cookies: normalizeEntry(o.cookies),
  };
}

/** Парсва целия `legal_info` json от salons. */
export function normalizeLegalInfoFromDb(raw: unknown): LegalInfoStored {
  if (!raw || typeof raw !== 'object') return defaultLegalInfoStored();
  const o = raw as Record<string, unknown>;
  return {
    companyName: String(o.companyName ?? '').trim(),
    eik: String(o.eik ?? '').trim(),
    managerName: String(o.managerName ?? '').trim(),
    address: String(o.address ?? '').trim(),
    contactEmail: String(o.contactEmail ?? '').trim(),
    customDocuments: normalizeLegalCustomDocuments(o.customDocuments),
  };
}

export function escapeLegalHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Plain text → параграфи; ако вече има HTML тагове — както е. */
export function formatLegalDocumentBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return '';
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;
  return trimmed
    .split(/\n{2,}/)
    .map(block => {
      const inner = escapeLegalHtml(block).replace(/\n/g, '<br />');
      return `<p>${inner}</p>`;
    })
    .join('\n');
}

export function getCustomDocumentHtml(
  stored: LegalInfoStored,
  kind: LegalDocumentKind,
): string | null {
  const entry = stored.customDocuments[kind];
  if (!entry.useCustom || !entry.body.trim()) return null;
  return formatLegalDocumentBody(entry.body);
}
