'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import {
  VISITOR_AMENITY_LABELS,
  type SalonFaqItem,
  type SalonVisitorInfo,
} from '@/lib/salon-visitor-info';

const T = {
  border: '#E4E4E7',
  muted: '#71717A',
  text: '#18181B',
  accent: '#18181B',
};

type Props = {
  faqItems: SalonFaqItem[];
  visitorInfo: SalonVisitorInfo;
  visitorAdditionalInfo: string;
  inputStyle: CSSProperties;
  onChangeFaq: (items: SalonFaqItem[]) => void;
  onChangeVisitorInfo: (info: SalonVisitorInfo) => void;
  onChangeAdditionalInfo: (text: string) => void;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: 'grid', gap: 5 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: T.muted, letterSpacing: '0.02em' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

export function SalonFaqVisitorFields({
  faqItems,
  visitorInfo,
  visitorAdditionalInfo,
  inputStyle,
  onChangeFaq,
  onChangeVisitorInfo,
  onChangeAdditionalInfo,
}: Props) {
  function addFaq() {
    onChangeFaq([
      ...faqItems,
      {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `faq-${Date.now()}`,
        question: '',
        answer: '',
      },
    ]);
  }

  function updateFaq(id: string, patch: Partial<SalonFaqItem>) {
    onChangeFaq(faqItems.map(item => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeFaq(id: string) {
    onChangeFaq(faqItems.filter(item => item.id !== id));
  }

  function setVisitor<K extends keyof SalonVisitorInfo>(key: K, value: SalonVisitorInfo[K]) {
    onChangeVisitorInfo({ ...visitorInfo, [key]: value });
  }

  return (
    <div style={{ display: 'grid', gap: 28, marginTop: 20 }}>
      <div>
        <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: T.text }}>
          Често задавани въпроси (FAQ)
        </h3>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: T.muted, lineHeight: 1.5 }}>
          Показват се на публичния сайт. Празните редове не се запазват.
        </p>
        <div style={{ display: 'grid', gap: 12 }}>
          {faqItems.map((item, index) => (
            <div
              key={item.id}
              style={{
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: 12,
                background: '#FAFAFA',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: T.muted }}>Въпрос {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeFaq(item.id)}
                  aria-label="Изтрий въпрос"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: T.muted,
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <input
                value={item.question}
                onChange={e => updateFaq(item.id, { question: e.target.value })}
                placeholder="Напр. Има ли паркинг?"
                style={{ ...inputStyle, marginBottom: 8 }}
              />
              <textarea
                value={item.answer}
                onChange={e => updateFaq(item.id, { answer: e.target.value })}
                placeholder="Отговор за клиентите…"
                style={{ ...inputStyle, minHeight: 72, resize: 'vertical', lineHeight: 1.55 }}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addFaq}
          style={{
            marginTop: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            border: `1px dashed ${T.border}`,
            borderRadius: 10,
            padding: '8px 14px',
            background: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            color: T.text,
          }}
        >
          <Plus size={16} />
          Добави въпрос
        </button>
      </div>

      <div>
        <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: T.text }}>
          Удобства и достъп
        </h3>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: T.muted, lineHeight: 1.5 }}>
          Отбележи само това, което важи — на сайта се показват само отметнатите.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))',
            gap: 10,
          }}
        >
          {VISITOR_AMENITY_LABELS.map(({ key, label }) => (
            <label
              key={key}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 12px',
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                background: visitorInfo[key] ? '#F4F4F5' : '#fff',
                cursor: 'pointer',
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              <input
                type="checkbox"
                checked={visitorInfo[key]}
                onChange={e => setVisitor(key, e.target.checked)}
                style={{ marginTop: 2, accentColor: T.accent }}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        {visitorInfo.hasParking ? (
          <div style={{ marginTop: 12 }}>
            <Field label="Уточнение за паркинг (по желание)">
              <input
                value={visitorInfo.parkingNotes}
                onChange={e => setVisitor('parkingNotes', e.target.value)}
                placeholder="Напр. безплатен, зад сградата"
                style={inputStyle}
              />
            </Field>
          </div>
        ) : null}
        <div style={{ marginTop: 12 }}>
          <Field label="Автобуси / транспорт (по желание)">
            <input
              value={visitorInfo.busLines}
              onChange={e => setVisitor('busLines', e.target.value)}
              placeholder="Напр. № 9, 117, метро Витоша"
              style={inputStyle}
            />
          </Field>
        </div>
      </div>

      <Field label="Допълнителна информация за клиенти">
        <textarea
          value={visitorAdditionalInfo}
          onChange={e => onChangeAdditionalInfo(e.target.value)}
          placeholder="Всичко друго, което искаш клиентите да знаят преди резервация…"
          style={{ ...inputStyle, minHeight: 100, resize: 'vertical', lineHeight: 1.6 }}
        />
        <p style={{ margin: '6px 0 0', fontSize: 12, color: T.muted }}>
          Показва се на сайта само ако е попълнено.
        </p>
      </Field>
    </div>
  );
}
