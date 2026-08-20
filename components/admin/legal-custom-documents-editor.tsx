'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Upload } from 'lucide-react';
import { getLegalDocumentLabels, type LegalDocumentKind } from '@/lib/legal-documents-shared';
import type { LegalCustomDocuments } from '@/lib/legal-custom-documents';
import type { Locale } from '@/lib/i18n';

const KINDS: LegalDocumentKind[] = ['terms', 'privacy', 'cookies'];

const KIND_HINTS_BG: Record<LegalDocumentKind, string> = {
  terms: 'Общи условия за ползване на сайта и резервациите.',
  privacy: 'Политика за поверителност (GDPR) — как обработвате лични данни.',
  cookies: 'Политика за бисквитки и проследяващи технологии.',
};

const KIND_HINTS_EN: Record<LegalDocumentKind, string> = {
  terms: 'Terms of use for the website and bookings.',
  privacy: 'Privacy policy (GDPR) — how you process personal data.',
  cookies: 'Cookies and tracking technologies policy.',
};

type Props = {
  value: LegalCustomDocuments;
  inputStyle: CSSProperties;
  onChange: (next: LegalCustomDocuments) => void;
  locale?: Locale;
};

export function LegalCustomDocumentsEditor({ value, inputStyle, onChange, locale = 'bg' }: Props) {
  const isEn = locale === 'en';
  const KIND_HINTS = isEn ? KIND_HINTS_EN : KIND_HINTS_BG;
  const labels = getLegalDocumentLabels(locale);
  const [fileMessage, setFileMessage] = useState('');
  const [fileError, setFileError] = useState('');

  function patchKind(kind: LegalDocumentKind, patch: Partial<LegalCustomDocuments[LegalDocumentKind]>) {
    onChange({
      ...value,
      [kind]: { ...value[kind], ...patch },
    });
  }

  async function importTextFile(kind: LegalDocumentKind, file: File | null) {
    setFileMessage('');
    setFileError('');
    if (!file) return;
    const allowed =
      file.type.startsWith('text/') ||
      /\.(txt|md|markdown|html|htm)$/i.test(file.name);
    if (!allowed) {
      setFileError(isEn
        ? 'Please upload a text, Markdown, or HTML file so it can be edited here.'
        : 'Качи текстов, Markdown или HTML файл, за да може да се редактира тук.');
      return;
    }
    try {
      const body = await file.text();
      patchKind(kind, { useCustom: true, body });
      setFileMessage(isEn
        ? `${labels[kind]} imported. Review it and press Save.`
        : `${labels[kind]} е качен. Прегледай текста и натисни „Запази“.`);
    } catch {
      setFileError(isEn ? 'The file could not be read.' : 'Файлът не можа да бъде прочетен.');
    }
  }

  return (
    <div style={{ display: 'grid', gap: 20, marginTop: 24, paddingTop: 24, borderTop: '1px solid #E4E4E7' }}>
      <div>
        <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#18181B' }}>
          {isEn ? 'Custom legal text (optional)' : 'Собствени правни текстове (по желание)'}
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: '#71717A', lineHeight: 1.55 }}>
          {isEn
            ? 'By default, documents are generated from the company details above. You can provide your own text for each document — we recommend a lawyer review it.'
            : 'По подразбиране документите се генерират от попълнените фирмени данни. Можеш да включиш собствен текст за всеки документ — препоръчително е да го прегледа адвокат.'}
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
              {labels[kind]}
            </p>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: '#71717A', lineHeight: 1.5 }}>
              {KIND_HINTS[kind]}
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  border: '1px solid #E4E4E7',
                  borderRadius: 8,
                  background: '#fff',
                  color: '#18181B',
                  padding: '7px 11px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Upload size={14} />
                {isEn ? 'Upload text' : 'Качи текст'}
                <input
                  type="file"
                  accept=".txt,.md,.markdown,.html,.htm,text/plain,text/markdown,text/html"
                  onChange={(e) => {
                    void importTextFile(kind, e.target.files?.[0] ?? null);
                    e.currentTarget.value = '';
                  }}
                  style={{ display: 'none' }}
                />
              </label>
              <span style={{ fontSize: 12, color: '#71717A' }}>
                {isEn ? '.txt, .md, .html' : '.txt, .md, .html'}
              </span>
            </div>
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
                {isEn ? (
                  <>Use <strong>custom text</strong> (otherwise — auto-generated template)</>
                ) : (
                  <>Използвай <strong>собствен текст</strong> (иначе — автоматичен шаблон)</>
                )}
              </span>
            </label>
            {entry.useCustom ? (
              <textarea
                value={entry.body}
                onChange={e => patchKind(kind, { body: e.target.value })}
                placeholder={isEn
                  ? 'Paste the full document text here. You can use plain text (paragraphs separated by blank lines) or HTML from a lawyer.'
                  : 'Постави тук пълния текст на документа. Можеш да ползваш обикновен текст (параграфи с празен ред) или HTML от адвокат.'}
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
      {fileMessage || fileError ? (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: fileError ? '#991B1B' : '#065F46',
            background: fileError ? '#FEF2F2' : '#ECFDF5',
            padding: '8px 10px',
            borderRadius: 8,
            lineHeight: 1.45,
          }}
        >
          {fileError || fileMessage}
        </p>
      ) : null}
    </div>
  );
}
