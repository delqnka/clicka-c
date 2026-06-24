'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import {
  SALON_PARKING_KEYS,
  SALON_PARKING_LABELS_BG,
  SALON_PAYMENT_LABELS_BG,
  SALON_VENUE_EXTRA_KEYS,
  SALON_VENUE_EXTRA_LABELS_BG,
  type SalonParkingKey,
  type SalonPaymentPreference,
  type SalonVenueExtraKey,
  type SalonVenueExtras,
} from '@/lib/salon-venue-extras';
import {
  type SalonFaqItem,
  type SalonVisitorInfo,
} from '@/lib/salon-visitor-info';

const T = {
  border: '#E4E4E7',
  muted: '#71717A',
  text: '#18181B',
};

type Props = {
  faqItems: SalonFaqItem[];
  visitorInfo: SalonVisitorInfo;
  visitorAdditionalInfo: string;
  venueExtras: SalonVenueExtras;
  inputStyle: CSSProperties;
  onChangeFaq: (items: SalonFaqItem[]) => void;
  onChangeVisitorInfo: (info: SalonVisitorInfo) => void;
  onChangeAdditionalInfo: (text: string) => void;
  onChangeVenueExtras: (extras: SalonVenueExtras) => void;
  section?: 'all' | 'faq' | 'amenities' | 'additional';
  compact?: boolean;
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: T.text }}>{label}</span>
      {children}
    </label>
  );
}

function SubLabel({ children }: { children: ReactNode }) {
  return (
    <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 500, color: T.text }}>{children}</p>
  );
}

function CheckboxGrid({
  items,
  checked,
  onToggle,
  compact,
}: {
  items: { key: string; label: string }[];
  checked: (key: string) => boolean;
  onToggle: (key: string, value: boolean) => void;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(180px, 100%), 1fr))',
        gap: compact ? 6 : 8,
      }}
    >
      {items.map(({ key, label }) => (
        <label
          key={key}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: compact ? '7px 9px' : '8px 10px',
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            background: checked(key) ? '#F4F4F5' : '#fff',
            cursor: 'pointer',
            fontSize: 12,
            lineHeight: 1.35,
          }}
        >
          <input
            type="checkbox"
            checked={checked(key)}
            onChange={(e) => onToggle(key, e.target.checked)}
            style={{ marginTop: 1, accentColor: T.text }}
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}

export function SalonFaqVisitorFields({
  faqItems,
  visitorAdditionalInfo,
  venueExtras,
  inputStyle,
  onChangeFaq,
  onChangeAdditionalInfo,
  onChangeVenueExtras,
  section = 'all',
  compact = false,
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
    onChangeFaq(faqItems.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeFaq(id: string) {
    onChangeFaq(faqItems.filter((item) => item.id !== id));
  }

  function setExtra(key: SalonVenueExtraKey | SalonParkingKey, value: boolean) {
    onChangeVenueExtras({ ...venueExtras, [key]: value || undefined });
  }

  function setPayment(value: SalonPaymentPreference | '') {
    onChangeVenueExtras({
      ...venueExtras,
      paymentPreference: value || undefined,
    });
  }

  const amenityItems = (SALON_VENUE_EXTRA_KEYS as readonly SalonVenueExtraKey[]).map((key) => ({
    key,
    label: SALON_VENUE_EXTRA_LABELS_BG[key],
  }));

  const parkingItems = (SALON_PARKING_KEYS as readonly SalonParkingKey[]).map((key) => ({
    key,
    label: SALON_PARKING_LABELS_BG[key],
  }));

  const showFaq = section === 'all' || section === 'faq';
  const showAmenities = section === 'all' || section === 'amenities';
  const showAdditional = section === 'all' || section === 'additional';

  return (
    <div style={{ display: 'grid', gap: compact ? 12 : 20, marginTop: section === 'all' ? 16 : 0 }}>
      {showFaq ? (
        <div>
          {!compact || section === 'all' ? (
            <SubLabel>Често задавани въпроси</SubLabel>
          ) : null}
          <div style={{ display: 'grid', gap: 8 }}>
            {faqItems.map((item, index) => (
              <div
                key={item.id}
                style={{
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: compact ? 8 : 10,
                  background: '#FAFAFA',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 500, color: T.muted }}>Въпрос {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeFaq(item.id)}
                    aria-label="Изтрий въпрос"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: T.muted,
                      cursor: 'pointer',
                      padding: 2,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <input
                  value={item.question}
                  onChange={(e) => updateFaq(item.id, { question: e.target.value })}
                  placeholder="Напр. Има ли паркинг?"
                  style={{ ...inputStyle, marginBottom: 6 }}
                />
                <textarea
                  value={item.answer}
                  onChange={(e) => updateFaq(item.id, { answer: e.target.value })}
                  placeholder="Отговор…"
                  style={{ ...inputStyle, minHeight: compact ? 56 : 64, resize: 'vertical', lineHeight: 1.45 }}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addFaq}
            style={{
              marginTop: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              border: 'none',
              background: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              backgroundImage: '#000',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            + Добави въпрос
          </button>
        </div>
      ) : null}

      {showAmenities ? (
        <div>
          {!compact || section === 'all' ? <SubLabel>Допълнителна информация</SubLabel> : null}

          <SubLabel>Допълнителна информация</SubLabel>
          <CheckboxGrid
            compact={compact}
            items={amenityItems}
            checked={(key) => venueExtras[key as SalonVenueExtraKey] === true}
            onToggle={(key, value) => setExtra(key as SalonVenueExtraKey, value)}
          />

          <div style={{ marginTop: 10 }}>
            <SubLabel>Паркинг / зона</SubLabel>
            <CheckboxGrid
              compact={compact}
              items={parkingItems}
              checked={(key) => venueExtras[key as SalonParkingKey] === true}
              onToggle={(key, value) => setExtra(key as SalonParkingKey, value)}
            />
          </div>

          <div style={{ marginTop: 10 }}>
            <Field label="Плащане">
              <select
                value={venueExtras.paymentPreference ?? ''}
                onChange={(e) => setPayment(e.target.value as SalonPaymentPreference | '')}
                style={inputStyle}
              >
                <option value="">— не е посочено —</option>
                {(Object.keys(SALON_PAYMENT_LABELS_BG) as SalonPaymentPreference[]).map((key) => (
                  <option key={key} value={key}>
                    {SALON_PAYMENT_LABELS_BG[key]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {venueExtras.nearMetro ? (
            <div style={{ marginTop: 8 }}>
              <Field label="Уточнение за метро">
                <input
                  value={venueExtras.nearMetroDetails ?? ''}
                  onChange={(e) =>
                    onChangeVenueExtras({ ...venueExtras, nearMetroDetails: e.target.value || undefined })
                  }
                  placeholder="Напр. станция Витоша"
                  style={inputStyle}
                />
              </Field>
            </div>
          ) : null}

          {venueExtras.convenientTransport ? (
            <div style={{ marginTop: 8 }}>
              <Field label="Уточнение за транспорт">
                <input
                  value={venueExtras.convenientTransportDetails ?? ''}
                  onChange={(e) =>
                    onChangeVenueExtras({
                      ...venueExtras,
                      convenientTransportDetails: e.target.value || undefined,
                    })
                  }
                  placeholder="Напр. спирка пред салона"
                  style={inputStyle}
                />
              </Field>
            </div>
          ) : null}
        </div>
      ) : null}

      {showAdditional ? (
        <Field label="Допълнителна информация">
          <textarea
            value={visitorAdditionalInfo}
            onChange={(e) => onChangeAdditionalInfo(e.target.value)}
            placeholder="Информация за клиентите…"
            style={{ ...inputStyle, minHeight: compact ? 72 : 88, resize: 'vertical', lineHeight: 1.45 }}
          />
        </Field>
      ) : null}
    </div>
  );
}
