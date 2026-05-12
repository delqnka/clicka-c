'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  DOMAIN_SETUP_FEE_CENTS,
  DOMAIN_TLD_OPTIONS,
  formatDomainPurchaseStatus,
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
  addressLine1: string;
  city: string;
  postalCode: string;
  countryCode: string;
  notes: string;
  agreedToActOnBehalf: boolean;
};

function normalizeSuggestedLabel(value: string) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function formatMoney(cents: number, currency = 'EUR') {
  return new Intl.NumberFormat('bg-BG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

async function readJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

const cardStyle: CSSProperties = {
  border: '1px solid rgba(0,0,0,0.12)',
  borderRadius: 22,
  background: '#fff',
  boxShadow: '0 14px 40px rgba(0,0,0,0.08)',
  padding: 20,
};

const inputStyle: CSSProperties = {
  width: '100%',
  border: '1px solid rgba(0,0,0,0.18)',
  borderRadius: 16,
  background: '#fff',
  color: '#000',
  padding: '14px 16px',
  fontSize: 15,
  outline: 'none',
};

const primaryButtonStyle: CSSProperties = {
  border: '1px solid #000',
  borderRadius: 999,
  background: '#000',
  color: '#fff',
  fontWeight: 800,
  padding: '13px 18px',
  cursor: 'pointer',
};

const labelStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};

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
    addressLine1: siteAddress,
    city: siteCity,
    postalCode: '',
    countryCode: 'BG',
    notes: '',
    agreedToActOnBehalf: false,
  });

  const selectedTld = useMemo(
    () => DOMAIN_TLD_OPTIONS.find(item => item.value === form.tld) ?? DOMAIN_TLD_OPTIONS[0],
    [form.tld]
  );
  const fullDomainPreview = `${form.requestedLabel || 'example'}.${selectedTld.value}`;
  const totalCents = selectedTld.feeCents + DOMAIN_SETUP_FEE_CENTS;

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
      <div style={cardStyle}>
        <div style={{ display: 'grid', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Купи домейн през нас
          </p>
          <h3 style={{ margin: 0, fontSize: 24, lineHeight: 1.2 }}>
            Регистрираме домейна на твоето име и го свързваме вместо теб
          </h3>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>
            Цената включва домейна за първата година и таксата за ръчно свързване към сайта.
          </p>
        </div>

        {request ? (
          <div style={{ ...cardStyle, marginTop: 18, padding: 18 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Последна заявка
              </p>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{request.fullDomain}</p>
              <p style={{ margin: 0, fontSize: 15 }}>
                Статус: <strong>{formatDomainPurchaseStatus(request.status)}</strong>
              </p>
              <p style={{ margin: 0, fontSize: 15 }}>
                Сума: <strong>{formatMoney(request.totalFeeCents, request.currency.toUpperCase())}</strong>
              </p>
              {request.createdAt ? (
                <p style={{ margin: 0, fontSize: 14 }}>
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
          <div style={{ ...cardStyle, marginTop: 18, borderColor: '#000' }}>
            <p style={{ margin: 0, fontSize: 14 }}>{error}</p>
          </div>
        ) : null}

        {notice ? (
          <div style={{ ...cardStyle, marginTop: 18, borderColor: '#000' }}>
            <p style={{ margin: 0, fontSize: 14 }}>{notice}</p>
          </div>
        ) : null}

        <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'minmax(0, 1.3fr) minmax(140px, 0.7fr)' }}>
            <label style={labelStyle}>
              Желан домейн
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
            </label>

            <label style={labelStyle}>
              Разширение
              <select
                value={form.tld}
                onChange={e => setForm(prev => ({ ...prev, tld: e.target.value }))}
                style={inputStyle}
              >
                {DOMAIN_TLD_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ ...cardStyle, padding: 18 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Преглед
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 800 }}>{fullDomainPreview}</p>
            <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.7 }}>
              Домейн: <strong>{formatMoney(selectedTld.feeCents)}</strong>
              <br />
              Свързване: <strong>{formatMoney(DOMAIN_SETUP_FEE_CENTS)}</strong>
              <br />
              Общо: <strong>{formatMoney(totalCents)}</strong>
            </p>
          </div>

          <label style={labelStyle}>
            Регистрация като
            <select
              value={form.registrantType}
              onChange={e =>
                setForm(prev => ({
                  ...prev,
                  registrantType: e.target.value === 'company' ? 'company' : 'individual',
                }))
              }
              style={inputStyle}
            >
              <option value="individual">Физическо лице</option>
              <option value="company">Фирма</option>
            </select>
          </label>

          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <label style={labelStyle}>
              Име / получател
              <input
                value={form.registrantName}
                onChange={e => setForm(prev => ({ ...prev, registrantName: e.target.value }))}
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Имейл
              <input
                type="email"
                value={form.registrantEmail}
                onChange={e => setForm(prev => ({ ...prev, registrantEmail: e.target.value }))}
                style={inputStyle}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <label style={labelStyle}>
              Телефон
              <input
                value={form.registrantPhone}
                onChange={e => setForm(prev => ({ ...prev, registrantPhone: e.target.value }))}
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Пощенски код
              <input
                value={form.postalCode}
                onChange={e => setForm(prev => ({ ...prev, postalCode: e.target.value }))}
                style={inputStyle}
              />
            </label>
          </div>

          {form.registrantType === 'company' ? (
            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <label style={labelStyle}>
                Фирма
                <input
                  value={form.companyName}
                  onChange={e => setForm(prev => ({ ...prev, companyName: e.target.value }))}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                ЕИК / VAT
                <input
                  value={form.companyId}
                  onChange={e => setForm(prev => ({ ...prev, companyId: e.target.value }))}
                  style={inputStyle}
                />
              </label>
            </div>
          ) : null}

          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <label style={labelStyle}>
              Адрес
              <input
                value={form.addressLine1}
                onChange={e => setForm(prev => ({ ...prev, addressLine1: e.target.value }))}
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Град
              <input
                value={form.city}
                onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))}
                style={inputStyle}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'minmax(0, 1fr)' }}>
            <label style={labelStyle}>
              Държава
              <input
                value={form.countryCode}
                onChange={e => setForm(prev => ({ ...prev, countryCode: e.target.value.toUpperCase() }))}
                style={inputStyle}
              />
            </label>
          </div>

          <label style={labelStyle}>
            Бележки
            <textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </label>

          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, lineHeight: 1.6 }}>
            <input
              type="checkbox"
              checked={form.agreedToActOnBehalf}
              onChange={e => setForm(prev => ({ ...prev, agreedToActOnBehalf: e.target.checked }))}
              style={{ marginTop: 3 }}
            />
            <span>
              Потвърждавам, че Clicka ще регистрира домейна от мое име с данните по-горе и ще го
              свърже към сайта ми.
            </span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>
              Поддържани домейни: {DOMAIN_TLD_OPTIONS.map(item => item.label).join(', ')}.
            </p>
            <button type="button" onClick={submitRequest} style={primaryButtonStyle} disabled={busy}>
              {busy ? 'Подготвяме…' : `Заяви и плати ${formatMoney(totalCents)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
