'use client';

import type { CSSProperties } from 'react';
import { LEGAL_DOCUMENT_LABELS, type LegalDocumentKind } from '@/lib/legal-documents-shared';
import type { LegalCustomDocuments } from '@/lib/legal-custom-documents';

const KINDS: LegalDocumentKind[] = ['terms', 'privacy', 'cookies'];

const KIND_HINTS: Record<LegalDocumentKind, string> = {
  terms: 'Общи условия за ползване на сайта и резервациите.',
  privacy: 'Политика за поверителност (GDPR) — как обработвате лични данни.',
  cookies: 'Политика за бисквитки и проследяващи технологии.',
};

type Props = {
  value: LegalCustomDocuments;
  inputStyle: CSSProperties;
  onChange: (next: LegalCustomDocuments) => void;
};

export function LegalCustomDocumentsEditor({ value, inputStyle, onChange }: Props) {
  function patchKind(kind: LegalDocumentKind, patch: Partial<LegalCustomDocuments[LegalDocumentKind]>) {
    onChange({
      ...value,
      [kind]: { ...value[kind], ...patch },
    });
  }

  return (
    <div style={{ display: 'grid', gap: 20, marginTop: 24, paddingTop: 24, borderTop: '1px solid #E4E4E7' }}>
      <div>
        <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#18181B' }}>
          Собствени правни текстове (по желание)
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: '#71717A', lineHeight: 1.55 }}>
          По подразбиране документите се генерират от попълнените фирмени данни. Можеш да включиш
          собствен текст за всеки документ — препоръчително е да го прегледа адвокат.
        </p>
      </div>

      {KINDS.map(kind => {
        const entry = value[kind];
        return (
          <div
            key={kind}
            style={{
              border: '1px solid #E4E4E7',
              borderRadius: 12,
              padding: 14,
              background: entry.useCustom ? '#FAFAFA' : '#fff',
            }}
          >
            <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#18181B' }}>
              {LEGAL_DOCUMENT_LABELS[kind]}
            </p>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: '#71717A', lineHeight: 1.5 }}>
              {KIND_HINTS[kind]}
            </p>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                fontSize: 13,
                lineHeight: 1.45,
                cursor: 'pointer',
                marginBottom: entry.useCustom ? 12 : 0,
              }}
            >
              <input
                type="checkbox"
                checked={entry.useCustom}
                onChange={e => patchKind(kind, { useCustom: e.target.checked })}
                style={{ marginTop: 3, accentColor: '#18181B' }}
              />
              <span>
                Използвай <strong>собствен текст</strong> (иначе — автоматичен шаблон)
              </span>
            </label>
            {entry.useCustom ? (
              <textarea
                value={entry.body}
                onChange={e => patchKind(kind, { body: e.target.value })}
                placeholder="Постави тук пълния текст на документа. Можеш да ползваш обикновен текст (параграфи с празен ред) или HTML от адвокат."
                style={{
                  ...inputStyle,
                  minHeight: 220,
                  resize: 'vertical',
                  lineHeight: 1.55,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: 12,
                }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
