'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  DOMAIN_SETUP_FEE_BGN_CENTS,
  DOMAIN_SETUP_FEE_CENTS,
  DOMAIN_TLD_OPTIONS,
  formatDomainPurchaseStatus,
  type DomainTldOption,
  type DomainPurchaseRequest,
} from '@/lib/domain-purchase-shared';

type Props = {
  slug: string;
  siteName: string;
  siteEmail: string;
  sitePhone: string;
  siteAddress: string;
  siteCity: string;
};

type FormState = {
  requestedLabel: string;
  tld: string;
  registrantType: 'individual' | 'company';
  registrantName: string;
  companyName: string;
  companyId: string;
  registrantEmail: string;
  registrantPhone: string;
  registrantViber: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  countryCode: string;
  notes: string;
  agreedToActOnBehalf: boolean;
  agreedToPolicies: boolean;
};

function normalizeSuggestedLabel(value: string) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function onlyCyrillic(value: string) {
  return value.replace(/[^а-яА-Я0-9\s.,'"\-/№]+/g, '');
}

function onlyDigitsPhone(value: string) {
  return value.replace(/[^0-9+\s]+/g, '');
}

function formatMoney(cents: number, currency = 'EUR') {
  return new Intl.NumberFormat('bg-BG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDualPrice(eurCents: number, bgnCents: number) {
  return `${formatMoney(eurCents, 'EUR')} / ${formatMoney(bgnCents, 'BGN')}`;
}

async function readJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

const sectionCardStyle: CSSProperties = {
  border: '1px solid rgba(0,0,0,0.12)',
  borderRadius: 30,
  background: '#fff',
  boxShadow: '0 20px 54px rgba(0,0,0,0.16)',
  padding: 'clamp(16px, 4vw, 26px)',
};

const insetCardStyle: CSSProperties = {
  border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: 24,
  background: '#fff',
  boxShadow: '0 14px 36px rgba(0,0,0,0.14)',
  padding: 20,
};

const inputStyle: CSSProperties = {
  width: '100%',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: 18,
  background: '#fff',
  color: '#000',
  padding: '14px 16px',
  fontSize: 16,
  fontWeight: 500,
  outline: 'none',
  boxShadow: '0 10px 24px rgba(0,0,0,0.1)',
};

const primaryButtonStyle: CSSProperties = {
  border: 'none',
  borderRadius: 999,
  background: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)',
  color: '#fff',
  fontWeight: 600,
  fontSize: 15,
  padding: '14px 20px',
  cursor: 'pointer',
  boxShadow: '0 14px 30px rgba(219,39,119,0.35)',
};

const fieldShellStyle: CSSProperties = {
  display: 'grid',
  gap: 10,
  padding: 16,
  border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: 22,
  background: '#fff',
  boxShadow: '0 12px 30px rgba(0,0,0,0.14)',
};

const fieldLabelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1.4,
  color: 'rgba(0,0,0,0.75)',
};

const choiceGridStyle: CSSProperties = {
  display: 'grid',
  gap: 10,
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(130px, 100%), 1fr))',
};

const twoColumnGridStyle: CSSProperties = {
  display: 'grid',
  gap: 14,
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
};

const ACTIVE_GRADIENT = 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)';

function choiceButtonStyle(active: boolean): CSSProperties {
  return {
    display: 'grid',
    gap: 6,
    textAlign: 'left',
    padding: 'clamp(12px, 3vw, 16px)',
    borderRadius: 22,
    border: '1px solid transparent',
    backgroundImage: active
      ? `linear-gradient(#fff, #fff), ${ACTIVE_GRADIENT}`
      : 'linear-gradient(#fff, #fff), linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.1))',
    backgroundOrigin: 'border-box',
    backgroundClip: 'padding-box, border-box',
    boxShadow: active ? '0 16px 34px rgba(168,85,247,0.22)' : '0 12px 28px rgba(0,0,0,0.12)',
    cursor: 'pointer',
    transition: 'all 160ms ease',
  };
}

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  width: 'fit-content',
  padding: '5px 10px',
  borderRadius: 999,
  border: '1px solid rgba(0,0,0,0.1)',
  boxShadow: '0 10px 24px rgba(0,0,0,0.14)',
  fontSize: 11,
  fontWeight: 500,
  background: '#fff',
};

function FieldShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={fieldShellStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
    </label>
  );
}

function TldOptionCard({
  option,
  active,
  onSelect,
}: {
  option: DomainTldOption;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" onClick={onSelect} style={choiceButtonStyle(active)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.1 }}>{option.label}</span>
        {option.badge ? <span style={badgeStyle}>{option.badge}</span> : null}
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.5 }}>
          {formatDualPrice(option.feeCents, option.feeBgnCents)}
        </span>
        {option.originalFeeCents && option.originalFeeBgnCents ? (
          <span
            style={{
              fontSize: 13,
              fontWeight: 400,
              lineHeight: 1.5,
              color: 'rgba(0,0,0,0.5)',
              textDecoration: 'line-through',
            }}
          >
            {formatDualPrice(option.originalFeeCents, option.originalFeeBgnCents)}
          </span>
        ) : null}
      </div>
    </button>
  );
}

export default function DomainPurchaseSection({
  slug,
  siteName,
  siteEmail,
  sitePhone,
  siteAddress,
  siteCity,
}: Props) {
  const [request, setRequest] = useState<DomainPurchaseRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<FormState>({
    requestedLabel: normalizeSuggestedLabel(slug),
    tld: 'bg',
    registrantType: 'individual',
    registrantName: siteName,
    companyName: '',
    companyId: '',
    registrantEmail: siteEmail,
    registrantPhone: sitePhone,
    registrantViber: '',
    addressLine1: siteAddress,
    city: siteCity,
    postalCode: '',
    countryCode: 'BG',
    notes: '',
    agreedToActOnBehalf: false,
    agreedToPolicies: false,
  });
  const [step, setStep] = useState<1 | 2>(1);

  const selectedTld = useMemo(
    () => DOMAIN_TLD_OPTIONS.find(item => item.value === form.tld) ?? DOMAIN_TLD_OPTIONS[0],
    [form.tld]
  );
  const fullDomainPreview = `${form.requestedLabel || 'example'}.${selectedTld.value}`;
  const totalCents = selectedTld.feeCents + DOMAIN_SETUP_FEE_CENTS;
  const totalBgnCents = selectedTld.feeBgnCents + DOMAIN_SETUP_FEE_BGN_CENTS;

  useEffect(() => {
    let cancelled = false;

    async function loadRequest() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/domain-purchase-request?slug=${encodeURIComponent(slug)}`, {
          cache: 'no-store',
        });
        const data = await readJson(res);
        if (!res.ok) {
          throw new Error(data.error || 'Не успяхме да заредим заявката.');
        }
        if (cancelled) return;
        setRequest((data.request as DomainPurchaseRequest | null) ?? null);
        if (data.request) {
          const current = data.request as DomainPurchaseRequest;
          setForm(prev => ({
            ...prev,
            requestedLabel: current.requestedLabel || prev.requestedLabel,
            tld: current.tld || prev.tld,
            registrantType: current.registrantType,
            registrantName: current.registrantName || prev.registrantName,
            companyName: current.companyName || prev.companyName,
            companyId: current.companyId || prev.companyId,
            registrantEmail: current.registrantEmail || prev.registrantEmail,
            registrantPhone: current.registrantPhone || prev.registrantPhone,
            registrantViber: current.registrantViber || prev.registrantViber,
            addressLine1: current.addressLine1 || prev.addressLine1,
            city: current.city || prev.city,
            postalCode: current.postalCode || prev.postalCode,
            countryCode: current.countryCode || prev.countryCode,
            notes: current.notes || prev.notes,
          }));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Не успяхме да заредим заявката.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadRequest();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('domainPurchase');
    if (status === 'success') {
      setNotice('Плащането е успешно. Обработваме заявката ти за домейна.');
    }
    if (status === 'cancelled') {
      setNotice('Плащането беше прекъснато. Можеш да опиташ отново.');
    }
  }, []);

  async function submitRequest() {
    setBusy(true);
    setError('');
    setNotice('');

    try {
      const res = await fetch('/api/admin/domain-purchase-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          ...form,
        }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        throw new Error(data.error || 'Не успяхме да създадем заявката.');
      }

      if (typeof data.checkoutUrl === 'string' && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      setRequest((data.request as DomainPurchaseRequest | null) ?? null);
      setNotice(
        data.skipCheckout
          ? 'Тестовата заявка е записана като платена и е готова за ръчна обработка.'
          : 'Заявката е създадена успешно.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не успяхме да създадем заявката.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16, marginTop: 18 }}>
      <div style={sectionCardStyle}>
        <div style={{ display: 'grid', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Купи домейн през нас
          </p>
          <h3 style={{ margin: 0, fontSize: 'clamp(20px, 6vw, 28px)', lineHeight: 1.2, fontWeight: 600 }}>
            Регистрираме домейна на твоето име и го свързваме вместо теб
          </h3>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: 'rgba(0,0,0,0.78)' }}>
            Плащаш отделно домейна за 1 година според разширението и фиксирана такса за техническа администрация и конфигуриране.
          </p>
        </div>

        {request ? (
          <div style={{ ...insetCardStyle, marginTop: 20 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Последна заявка
              </p>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>{request.fullDomain}</p>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>
                Статус: <strong>{formatDomainPurchaseStatus(request.status)}</strong>
              </p>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>
                Сума: <strong>{formatMoney(request.totalFeeCents, request.currency.toUpperCase())}</strong>
              </p>
              {request.createdAt ? (
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>
                  Подадена на {new Date(request.createdAt).toLocaleString()}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {loading ? (
          <p style={{ margin: '18px 0 0', fontSize: 15 }}>Зареждаме заявката…</p>
        ) : null}

        {error ? (
          <div style={{ ...insetCardStyle, marginTop: 18, borderColor: '#000' }}>
            <p style={{ margin: 0, fontSize: 14 }}>{error}</p>
          </div>
        ) : null}

        {notice ? (
          <div style={{ ...insetCardStyle, marginTop: 18, borderColor: '#000' }}>
            <p style={{ margin: 0, fontSize: 14 }}>{notice}</p>
          </div>
        ) : null}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20 }}>
          <span style={{ ...badgeStyle, ...(step === 1 ? { backgroundImage: `linear-gradient(#fff,#fff), ${ACTIVE_GRADIENT}`, backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', border: '1px solid transparent' } : {}) }}>
            1. Тип регистрант
          </span>
          <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.1)' }} />
          <span style={{ ...badgeStyle, ...(step === 2 ? { backgroundImage: `linear-gradient(#fff,#fff), ${ACTIVE_GRADIENT}`, backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', border: '1px solid transparent' } : {}) }}>
            2. Данни и плащане
          </span>
        </div>

        {step === 1 ? (
          <div style={{ display: 'grid', gap: 16, marginTop: 20 }}>
            <FieldShell label="Желан домейн">
              <input
                value={form.requestedLabel}
                onChange={e =>
                  setForm(prev => ({
                    ...prev,
                    requestedLabel: normalizeSuggestedLabel(e.target.value),
                  }))
                }
                placeholder="studioani"
                style={inputStyle}
              />
            </FieldShell>

            <div style={{ display: 'grid', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Избери разширение</p>
              <div style={choiceGridStyle}>
                {DOMAIN_TLD_OPTIONS.map(option => (
                  <TldOptionCard
                    key={option.value}
                    option={option}
                    active={form.tld === option.value}
                    onSelect={() => setForm(prev => ({ ...prev, tld: option.value }))}
                  />
                ))}
              </div>
            </div>

            <div style={{ ...insetCardStyle, display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Преглед
                </p>
                <p style={{ margin: 0, fontSize: 24, fontWeight: 600, lineHeight: 1.2 }}>{fullDomainPreview}</p>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>Домейн</span>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>
                    {formatDualPrice(selectedTld.feeCents, selectedTld.feeBgnCents)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>Техническа администрация и конфигуриране</span>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>
                    {formatDualPrice(DOMAIN_SETUP_FEE_CENTS, DOMAIN_SETUP_FEE_BGN_CENTS)}
                  </span>
                </div>
                <div style={{ height: 1, background: 'rgba(0,0,0,0.08)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>Общо</span>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{formatDualPrice(totalCents, totalBgnCents)}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Регистрация като</p>
              <div style={{ ...choiceGridStyle, gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))' }}>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, registrantType: 'individual' }))}
                  style={choiceButtonStyle(form.registrantType === 'individual')}
                >
                  <span style={{ fontSize: 16, fontWeight: 600 }}>Физическо лице</span>
                </button>

                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, registrantType: 'company' }))}
                  style={choiceButtonStyle(form.registrantType === 'company')}
                >
                  <span style={{ fontSize: 16, fontWeight: 600 }}>Фирма</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'grid' }}>
              <button type="button" onClick={() => setStep(2)} style={primaryButtonStyle}>
                Продължи към данните
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16, marginTop: 20 }}>
            <div style={{ ...insetCardStyle, display: 'grid', gap: 14 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Данни за регистрация {form.registrantType === 'company' ? '(Фирма)' : '(Физическо лице)'}
              </p>

              <div style={twoColumnGridStyle}>
                <FieldShell label="Име / получател (на кирилица)">
                  <input
                    value={form.registrantName}
                    onChange={e => setForm(prev => ({ ...prev, registrantName: onlyCyrillic(e.target.value) }))}
                    style={inputStyle}
                  />
                </FieldShell>

                <FieldShell label="Имейл">
                  <input
                    type="email"
                    value={form.registrantEmail}
                    onChange={e => setForm(prev => ({ ...prev, registrantEmail: e.target.value }))}
                    style={inputStyle}
                  />
                </FieldShell>
              </div>

              <div style={twoColumnGridStyle}>
                <FieldShell label="Телефон (и Viber)">
                  <input
                    type="tel"
                    inputMode="tel"
                    value={form.registrantPhone}
                    onChange={e =>
                      setForm(prev => ({
                        ...prev,
                        registrantPhone: onlyDigitsPhone(e.target.value),
                        registrantViber: onlyDigitsPhone(e.target.value),
                      }))
                    }
                    placeholder="0888 123 456"
                    style={inputStyle}
                  />
                </FieldShell>

                <FieldShell label="Пощенски код">
                  <input
                    inputMode="numeric"
                    value={form.postalCode}
                    onChange={e => setForm(prev => ({ ...prev, postalCode: onlyDigitsPhone(e.target.value) }))}
                    style={inputStyle}
                  />
                </FieldShell>
              </div>

              {form.registrantType === 'company' ? (
                <div style={twoColumnGridStyle}>
                  <FieldShell label="Фирма (на кирилица)">
                    <input
                      value={form.companyName}
                      onChange={e => setForm(prev => ({ ...prev, companyName: onlyCyrillic(e.target.value) }))}
                      style={inputStyle}
                    />
                  </FieldShell>

                  <FieldShell label="ЕИК / VAT">
                    <input
                      value={form.companyId}
                      onChange={e => setForm(prev => ({ ...prev, companyId: e.target.value }))}
                      style={inputStyle}
                    />
                  </FieldShell>
                </div>
              ) : null}

              <div style={twoColumnGridStyle}>
                <FieldShell label="Адрес (на кирилица)">
                  <input
                    value={form.addressLine1}
                    onChange={e => setForm(prev => ({ ...prev, addressLine1: onlyCyrillic(e.target.value) }))}
                    style={inputStyle}
                  />
                </FieldShell>

                <FieldShell label="Град (на кирилица)">
                  <input
                    value={form.city}
                    onChange={e => setForm(prev => ({ ...prev, city: onlyCyrillic(e.target.value) }))}
                    style={inputStyle}
                  />
                </FieldShell>
              </div>

              <FieldShell label="Държава">
                <input
                  value={form.countryCode}
                  onChange={e => setForm(prev => ({ ...prev, countryCode: e.target.value.toUpperCase() }))}
                  style={inputStyle}
                />
              </FieldShell>

              <FieldShell label="Бележки (на кирилица)">
                <textarea
                  value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: onlyCyrillic(e.target.value) }))}
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }}
                />
              </FieldShell>
            </div>

            <div
              style={{
                ...insetCardStyle,
                display: 'grid',
                gap: 12,
                padding: 18,
              }}
            >
              <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  checked={form.agreedToActOnBehalf}
                  onChange={e => setForm(prev => ({ ...prev, agreedToActOnBehalf: e.target.checked }))}
                  style={{ marginTop: 4 }}
                />
                <span style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(0,0,0,0.8)' }}>
                  Потвърждавам, че Clicka ще регистрира домейна от мое име с данните по-горе и ще го
                  свърже към сайта ми.
                </span>
              </label>

              <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  checked={form.agreedToPolicies}
                  onChange={e => setForm(prev => ({ ...prev, agreedToPolicies: e.target.checked }))}
                  style={{ marginTop: 4 }}
                />
                <span style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(0,0,0,0.8)' }}>
                  Съгласен/на съм с{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, textDecoration: 'underline' }}>
                    Общите условия
                  </a>{' '}
                  и{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, textDecoration: 'underline' }}>
                    Политиката за поверителност
                  </a>{' '}
                  на Clicka.bg.
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{ ...primaryButtonStyle, background: '#fff', color: '#000', border: '1px solid rgba(0,0,0,0.12)', boxShadow: '0 12px 28px rgba(0,0,0,0.1)', flex: '0 0 auto' }}
              >
                Назад
              </button>
              <button
                type="button"
                onClick={submitRequest}
                style={{ ...primaryButtonStyle, flex: 1 }}
                disabled={busy || !form.agreedToActOnBehalf || !form.agreedToPolicies}
              >
                {busy ? 'Подготвяме…' : `Заяви и плати ${formatDualPrice(totalCents, totalBgnCents)}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
