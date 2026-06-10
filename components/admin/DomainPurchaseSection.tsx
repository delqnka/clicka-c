'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  DOMAIN_SETUP_FEE_CENTS,
  DOMAIN_TLD_OPTIONS,
  domainPurchaseStepForField,
  firstDomainPurchaseFieldError,
  formatDomainPurchaseStatus,
  validateDomainPurchaseForm,
  type DomainPurchaseFieldKey,
  type DomainTldOption,
  type DomainPurchaseRequest,
} from '@/lib/domain-purchase-shared';

type Props = {
  slug: string;
  siteName: string;
  ownerName: string;
  siteEmail: string;
  sitePhone: string;
  siteAddress: string;
  siteCity: string;
  onBack?: () => void;
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

async function readJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

const ACTIVE_GRADIENT = 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)';

const primaryButtonStyle: CSSProperties = {
  border: 'none',
  borderRadius: 999,
  background: ACTIVE_GRADIENT,
  color: '#fff',
  fontWeight: 600,
  fontSize: 15,
  padding: '14px 20px',
  cursor: 'pointer',
  boxShadow: '0 14px 30px rgba(219,39,119,0.35)',
  flex: 1,
};

const backButtonStyle: CSSProperties = {
  border: '1px solid rgba(0,0,0,0.12)',
  borderRadius: 999,
  background: '#fff',
  color: '#000',
  fontWeight: 500,
  fontSize: 15,
  padding: '14px 20px',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  flexShrink: 0,
};

const flatInputStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  height: 48,
  boxSizing: 'border-box',
  border: '1px solid rgba(0,0,0,0.14)',
  borderRadius: 12,
  background: '#fff',
  color: '#000',
  padding: '0 14px',
  fontSize: 15,
  fontWeight: 500,
  outline: 'none',
};

function inputStyle(hasError: boolean): CSSProperties {
  return hasError
    ? { ...flatInputStyle, borderColor: '#ef4444', boxShadow: '0 0 0 1px #ef4444' }
    : flatInputStyle;
}

function stepFieldKeys(step: 1 | 2 | 3 | 4): DomainPurchaseFieldKey[] {
  if (step === 1) return ['requestedLabel', 'tld'];
  if (step === 3) {
    return [
      'registrantName',
      'registrantEmail',
      'registrantPhone',
      'companyName',
      'companyId',
      'addressLine1',
      'city',
      'postalCode',
    ];
  }
  if (step === 4) return ['agreedToActOnBehalf', 'agreedToPolicies'];
  return [];
}

function pickStepErrors(
  form: FormState,
  step: 1 | 2 | 3 | 4,
): Partial<Record<DomainPurchaseFieldKey, string>> {
  const all = validateDomainPurchaseForm(form);
  const picked: Partial<Record<DomainPurchaseFieldKey, string>> = {};
  for (const key of stepFieldKeys(step)) {
    if (key === 'companyName' || key === 'companyId') {
      if (form.registrantType !== 'company') continue;
    }
    if (all[key]) picked[key] = all[key];
  }
  return picked;
}

const fieldLabelStyle: CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: 'rgba(0,0,0,0.6)',
  marginBottom: 6,
};

const choiceGridStyle: CSSProperties = {
  display: 'grid',
  gap: 10,
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))',
};

function choiceButtonStyle(active: boolean): CSSProperties {
  return {
    display: 'grid',
    gap: 6,
    textAlign: 'left',
    padding: 'clamp(12px, 3vw, 16px)',
    borderRadius: 16,
    border: '1px solid transparent',
    backgroundImage: active
      ? `linear-gradient(#fff, #fff), ${ACTIVE_GRADIENT}`
      : 'linear-gradient(#fff, #fff), linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.1))',
    backgroundOrigin: 'border-box',
    backgroundClip: 'padding-box, border-box',
    boxShadow: active ? '0 8px 24px rgba(168,85,247,0.2)' : '0 4px 14px rgba(0,0,0,0.08)',
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
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  fontSize: 11,
  fontWeight: 500,
  background: '#fff',
};

function FlatField({
  label,
  children,
  error,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  error?: string;
  htmlFor?: string;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        style={{
          ...fieldLabelStyle,
          color: error ? '#b91c1c' : fieldLabelStyle.color,
        }}
      >
        {label}
      </label>
      {children}
      {error ? (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#b91c1c', lineHeight: 1.4 }}>{error}</p>
      ) : null}
    </div>
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
    <button type="button" onClick={onSelect} style={{ ...choiceButtonStyle(active), padding: '7px 10px', gap: 2 }}>
      <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{option.label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(0,0,0,0.55)' }}>
          {formatMoney(option.feeCents, 'EUR')}
        </span>
        {option.originalFeeCents ? (
          <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', textDecoration: 'line-through' }}>
            {formatMoney(option.originalFeeCents, 'EUR')}
          </span>
        ) : null}
      </div>
    </button>
  );
}

function StepPill({ n, active, complete }: { n: number; active: boolean; complete: boolean }) {
  const filled = active || complete;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: '50%',
        fontSize: 11,
        fontWeight: 700,
        transition: 'all 200ms',
        ...(filled
          ? {
              backgroundImage: ACTIVE_GRADIENT,
              color: '#fff',
              boxShadow: '0 4px 12px rgba(219,39,119,0.3)',
            }
          : {
              background: '#fff',
              color: 'rgba(0,0,0,0.35)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              border: '1px solid rgba(0,0,0,0.08)',
            }),
      }}
    >
      {complete && !active ? '✓' : n}
    </span>
  );
}

const STEP_TITLES: Record<number, string> = {
  1: 'Какъв домейн искаш?',
  2: 'На кого да регистрираме?',
  3: 'Данни за регистрация',
  4: 'Преглед и плащане',
};

export default function DomainPurchaseSection({
  slug,
  siteName,
  ownerName,
  siteEmail,
  sitePhone,
  siteAddress,
  siteCity,
  onBack,
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
    registrantName: ownerName || siteName,
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
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [stepError, setStepError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<DomainPurchaseFieldKey, string>>>({});

  const selectedTld = useMemo(
    () => DOMAIN_TLD_OPTIONS.find(item => item.value === form.tld) ?? DOMAIN_TLD_OPTIONS[0],
    [form.tld]
  );
  const fullDomainPreview = `${form.requestedLabel || 'example'}.${selectedTld.value}`;
  const totalCents = selectedTld.feeCents + DOMAIN_SETUP_FEE_CENTS;

  function clearFieldError(key: DomainPurchaseFieldKey) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function applyValidationErrors(errors: Partial<Record<DomainPurchaseFieldKey, string>>) {
    setFieldErrors(errors);
    const first = firstDomainPurchaseFieldError(errors);
    if (first) {
      setStep(domainPurchaseStepForField(first));
      setStepError('Попълни полетата, маркирани в червено.');
    } else {
      setStepError('');
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function loadRequest() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/domain-purchase-request?slug=${encodeURIComponent(slug)}`, {
          cache: 'no-store',
        });
        const data = await readJson(res);
        if (!res.ok) throw new Error(data.error || 'Не успяхме да заредим заявката.');
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
        if (!cancelled) setError(err instanceof Error ? err.message : 'Не успяхме да заредим заявката.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadRequest();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('domainPurchase');
    if (status === 'success') setNotice('Плащането е успешно. Обработваме заявката ти за домейна.');
    if (status === 'cancelled') setNotice('Плащането беше прекъснато. Можеш да опиташ отново.');
  }, []);

  async function submitRequest() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/admin/domain-purchase-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, ...form }),
      });
      const data = await readJson(res) as {
        error?: string;
        fields?: Partial<Record<DomainPurchaseFieldKey, string>>;
        checkoutUrl?: string;
        request?: DomainPurchaseRequest;
        skipCheckout?: boolean;
      };
      if (!res.ok) {
        if (data.fields && typeof data.fields === 'object') {
          applyValidationErrors(data.fields);
          return;
        }
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

  function handleNext() {
    setStepError('');
    if (step === 4) {
      const errors = validateDomainPurchaseForm(form);
      if (Object.keys(errors).length > 0) {
        applyValidationErrors(errors);
        return;
      }
      void submitRequest();
      return;
    }

    const errors = pickStepErrors(form, step);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setStepError('Попълни полетата, маркирани в червено.');
      return;
    }

    setFieldErrors({});
    setStep((s) => (s < 4 ? ((s + 1) as 1 | 2 | 3 | 4) : s));
  }

  function handleBack() {
    setStepError('');
    setFieldErrors({});
    if (step === 1) { onBack?.(); return; }
    setStep(s => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s));
  }

  const isPayDisabled = busy;

  // Is there an unpaid (abandoned) request?
  const isAbandoned = request !== null && request.status === 'requested';

  async function resumePayment() {
    if (!request) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/domain-purchase-request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, requestId: request.id }),
      });
      const data = await readJson(res) as { checkoutUrl?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Не успяхме да подновим плащането.');
      if (data.checkoutUrl) { window.location.href = data.checkoutUrl; return; }
      throw new Error('Няма линк за плащане.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка при подновяване на плащането.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16, marginTop: 18 }}>

      {/* Abandoned (unpaid) request — resume payment */}
      {isAbandoned ? (
        <div
          style={{
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: 16,
            background: '#fff',
            boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
            padding: '16px 18px',
            display: 'grid',
            gap: 8,
          }}
        >
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)' }}>
            Незавършена заявка
          </p>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>{request!.fullDomain}</p>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(0,0,0,0.55)', lineHeight: 1.55 }}>
            Заявката е попълнена, но плащането не е завършено. Можеш да продължиш оттам, където си спрял/а.
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={resumePayment}
              disabled={busy}
              style={{
                border: 'none',
                borderRadius: 999,
                background: ACTIVE_GRADIENT,
                color: '#fff',
                fontWeight: 600,
                fontSize: 13,
                padding: '10px 18px',
                cursor: busy ? 'default' : 'pointer',
                opacity: busy ? 0.5 : 1,
                boxShadow: '0 6px 18px rgba(219,39,119,0.28)',
                whiteSpace: 'nowrap',
              }}
            >
              {busy ? 'Подготвяме…' : `Продължи с плащане → ${formatMoney(request!.totalFeeCents, request!.currency.toUpperCase())}`}
            </button>
            <button
              type="button"
              onClick={() => setRequest(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(0,0,0,0.4)', textDecoration: 'underline', padding: 0 }}
            >
              Нова заявка с различен домейн
            </button>
          </div>
        </div>
      ) : null}

      {/* Existing paid/processing/connected request status */}
      {request && !isAbandoned ? (
        <div
          style={{
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: 20,
            background: '#fff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            padding: 20,
            display: 'grid',
            gap: 8,
          }}
        >
          <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.5)' }}>
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
            <p style={{ margin: 0, fontSize: 14, color: 'rgba(0,0,0,0.5)' }}>
              Подадена на {new Date(request.createdAt).toLocaleString()}
            </p>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <p style={{ margin: 0, fontSize: 15, color: 'rgba(0,0,0,0.5)' }}>Зареждаме заявката…</p>
      ) : null}

      {/* Global messages */}
      {error ? (
        <p style={{ margin: 0, fontSize: 14, color: '#b91c1c', lineHeight: 1.5 }}>{error}</p>
      ) : null}

      {notice ? (
        <p style={{ margin: 0, fontSize: 12, color: '#dc2626' }}>{notice}</p>
      ) : null}

      {/* Wizard — only when not loading and no abandoned request */}
      {!loading && !isAbandoned ? (
        <>
          {/* Step pills — above the card */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingLeft: 4 }}>
            {([1, 2, 3, 4] as const).map(n => (
              <StepPill key={n} n={n} active={step === n} complete={step > n} />
            ))}
          </div>

          <div
            style={{
              borderRadius: 24,
              border: '1px solid rgba(0,0,0,0.1)',
              background: '#fff',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              overflow: 'hidden',
            }}
          >
          {/* Wizard header — step title only */}
          <div
            style={{
              padding: '18px 20px 14px',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <p style={{ margin: 0, fontSize: 18, fontWeight: 600, lineHeight: 1.25 }}>
              {STEP_TITLES[step]}
            </p>
          </div>

          {/* Step error */}
          {stepError ? (
            <div style={{ margin: '0 24px', marginTop: 12, padding: '0 2px' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#b91c1c' }}>{stepError}</p>
            </div>
          ) : null}

          {/* Step content */}
          <div style={{ padding: '20px 24px' }}>
            {/* ── Step 1: Domain ── */}
            {step === 1 ? (
              <div style={{ display: 'grid', gap: 20 }}>
                <FlatField label="Желано име на домейна" error={fieldErrors.requestedLabel} htmlFor="domain-label">
                  <input
                    id="domain-label"
                    value={form.requestedLabel}
                    onChange={e => {
                      clearFieldError('requestedLabel');
                      setForm(prev => ({ ...prev, requestedLabel: normalizeSuggestedLabel(e.target.value) }));
                    }}
                    placeholder="studioani"
                    style={inputStyle(Boolean(fieldErrors.requestedLabel))}
                  />
                </FlatField>

                <div>
                  <p style={{
                    ...fieldLabelStyle,
                    marginBottom: 10,
                    color: fieldErrors.tld ? '#b91c1c' : fieldLabelStyle.color,
                  }}>
                    Избери разширение
                  </p>
                  <div style={choiceGridStyle}>
                    {DOMAIN_TLD_OPTIONS.map(option => (
                      <TldOptionCard
                        key={option.value}
                        option={option}
                        active={form.tld === option.value}
                        onSelect={() => {
                          clearFieldError('tld');
                          setForm(prev => ({ ...prev, tld: option.value }));
                        }}
                      />
                    ))}
                  </div>
                  {fieldErrors.tld ? (
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: '#b91c1c', lineHeight: 1.4 }}>{fieldErrors.tld}</p>
                  ) : null}
                </div>

                {/* Domain preview */}
                <div
                  style={{
                    borderRadius: 16,
                    border: '1px solid transparent',
                    backgroundImage: `linear-gradient(#fff, #fff), ${ACTIVE_GRADIENT}`,
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'padding-box, border-box',
                    padding: '16px 20px',
                    display: 'grid',
                    gap: 12,
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'rgba(0,0,0,0.45)' }}>
                      Преглед
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 700 }}>{fullDomainPreview}</p>
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                      <span style={{ fontSize: 14, color: 'rgba(0,0,0,0.6)' }}>Домейн</span>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{formatMoney(selectedTld.feeCents, 'EUR')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                      <span style={{ fontSize: 14, color: 'rgba(0,0,0,0.6)' }}>Регистрация и настройка</span>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{formatMoney(DOMAIN_SETUP_FEE_CENTS, 'EUR')}</span>
                    </div>
                    <div style={{ height: 1, background: 'rgba(0,0,0,0.08)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>Общо</span>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{formatMoney(totalCents, 'EUR')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* ── Step 2: Registrant type ── */}
            {step === 2 ? (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ ...choiceGridStyle, gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))' }}>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, registrantType: 'individual' }))}
                    style={choiceButtonStyle(form.registrantType === 'individual')}
                  >
                    <span style={{ fontSize: 16, fontWeight: 600 }}>Физическо лице</span>
                    <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)' }}>Регистрираме на твое лично име</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, registrantType: 'company' }))}
                    style={choiceButtonStyle(form.registrantType === 'company')}
                  >
                    <span style={{ fontSize: 16, fontWeight: 600 }}>Фирма</span>
                    <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)' }}>Регистрираме на юридическо лице</span>
                  </button>
                </div>
              </div>
            ) : null}

            {/* ── Step 3: Personal/company details ── */}
            {step === 3 ? (
              <div style={{ display: 'grid', gap: 16 }}>
                <FlatField
                  label={form.registrantType === 'company' ? 'МОЛ (Материално отговорно лице)' : 'Име и фамилия'}
                  error={fieldErrors.registrantName}
                  htmlFor="registrant-name"
                >
                  <input
                    id="registrant-name"
                    value={form.registrantName}
                    onChange={e => {
                      clearFieldError('registrantName');
                      setForm(prev => ({ ...prev, registrantName: onlyCyrillic(e.target.value) }));
                    }}
                    style={inputStyle(Boolean(fieldErrors.registrantName))}
                  />
                </FlatField>

                <FlatField label="Имейл" error={fieldErrors.registrantEmail} htmlFor="registrant-email">
                  <input
                    id="registrant-email"
                    type="email"
                    value={form.registrantEmail}
                    onChange={e => {
                      clearFieldError('registrantEmail');
                      setForm(prev => ({ ...prev, registrantEmail: e.target.value }));
                    }}
                    style={inputStyle(Boolean(fieldErrors.registrantEmail))}
                  />
                </FlatField>

                <FlatField label="Телефон" error={fieldErrors.registrantPhone} htmlFor="registrant-phone">
                  <input
                    id="registrant-phone"
                    type="tel"
                    inputMode="tel"
                    value={form.registrantPhone}
                    onChange={e => {
                      clearFieldError('registrantPhone');
                      setForm(prev => ({
                        ...prev,
                        registrantPhone: onlyDigitsPhone(e.target.value),
                        registrantViber: onlyDigitsPhone(e.target.value),
                      }));
                    }}
                    placeholder="0888 123 456"
                    style={inputStyle(Boolean(fieldErrors.registrantPhone))}
                  />
                </FlatField>

                {form.registrantType === 'company' ? (
                  <>
                    <FlatField label="Фирма" error={fieldErrors.companyName} htmlFor="company-name">
                      <input
                        id="company-name"
                        value={form.companyName}
                        onChange={e => {
                          clearFieldError('companyName');
                          setForm(prev => ({ ...prev, companyName: onlyCyrillic(e.target.value) }));
                        }}
                        style={inputStyle(Boolean(fieldErrors.companyName))}
                      />
                    </FlatField>
                    <FlatField label="ЕИК" error={fieldErrors.companyId} htmlFor="company-id">
                      <input
                        id="company-id"
                        value={form.companyId}
                        onChange={e => {
                          clearFieldError('companyId');
                          setForm(prev => ({ ...prev, companyId: e.target.value }));
                        }}
                        style={inputStyle(Boolean(fieldErrors.companyId))}
                      />
                    </FlatField>
                  </>
                ) : null}

                <FlatField label="Адрес" error={fieldErrors.addressLine1} htmlFor="address-line">
                  <input
                    id="address-line"
                    value={form.addressLine1}
                    onChange={e => {
                      clearFieldError('addressLine1');
                      setForm(prev => ({ ...prev, addressLine1: onlyCyrillic(e.target.value) }));
                    }}
                    style={inputStyle(Boolean(fieldErrors.addressLine1))}
                  />
                </FlatField>

                <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))' }}>
                  <FlatField label="Град" error={fieldErrors.city} htmlFor="city">
                    <input
                      id="city"
                      value={form.city}
                      onChange={e => {
                        clearFieldError('city');
                        setForm(prev => ({ ...prev, city: onlyCyrillic(e.target.value) }));
                      }}
                      style={inputStyle(Boolean(fieldErrors.city))}
                    />
                  </FlatField>

                  <FlatField label="Пощенски код" error={fieldErrors.postalCode} htmlFor="postal-code">
                    <input
                      id="postal-code"
                      inputMode="numeric"
                      value={form.postalCode}
                      onChange={e => {
                        clearFieldError('postalCode');
                        setForm(prev => ({ ...prev, postalCode: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) }));
                      }}
                      placeholder="1000"
                      style={inputStyle(Boolean(fieldErrors.postalCode))}
                    />
                  </FlatField>
                </div>
              </div>
            ) : null}

            {/* ── Step 4: Review & pay ── */}
            {step === 4 ? (
              <div style={{ display: 'grid', gap: 20 }}>
                {/* Domain & price summary */}
                <div
                  style={{
                    borderRadius: 16,
                    border: '1px solid transparent',
                    backgroundImage: `linear-gradient(#fff, #fff), ${ACTIVE_GRADIENT}`,
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'padding-box, border-box',
                    boxShadow: '0 8px 28px rgba(168,85,247,0.18)',
                    padding: '20px 22px',
                    display: 'grid',
                    gap: 14,
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.45)' }}>
                      Домейн
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 'clamp(22px, 6vw, 30px)', fontWeight: 700, lineHeight: 1.15 }}>
                      {fullDomainPreview}
                    </p>
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                      <span style={{ fontSize: 15, color: 'rgba(0,0,0,0.6)' }}>Домейн</span>
                      <span style={{ fontSize: 15, fontWeight: 500 }}>{formatMoney(selectedTld.feeCents, 'EUR')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                      <span style={{ fontSize: 15, color: 'rgba(0,0,0,0.6)' }}>Настройка</span>
                      <span style={{ fontSize: 15, fontWeight: 500 }}>{formatMoney(DOMAIN_SETUP_FEE_CENTS, 'EUR')}</span>
                    </div>
                    <div style={{ height: 1, background: 'rgba(0,0,0,0.1)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                      <span style={{ fontSize: 18, fontWeight: 700 }}>Общо</span>
                      <span style={{ fontSize: 18, fontWeight: 700 }}>{formatMoney(totalCents, 'EUR')}</span>
                    </div>
                  </div>
                </div>

                {/* Benefits list */}
                <div style={{ display: 'grid', gap: 8 }}>
                  {[
                    'Домейнът ще бъде регистриран на твое име',
                    'Ще го свържем към сайта ти',
                    'Не са нужни технически настройки от твоя страна',
                    'Обикновено това става в рамките на същия ден',
                    'Максимален срок: до 2 работни дни след плащането',
                    'През това време сайтът ти работи нормално на безплатния адрес',
                    'Ще получиш имейл на предоставения адрес щом домейнът е готов и свързан',
                  ].map(benefit => (
                    <div key={benefit} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.6, color: '#16a34a' }}>✓</span>
                      <span style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(0,0,0,0.75)' }}>{benefit}</span>
                    </div>
                  ))}
                </div>

                {/* Consent checkboxes */}
                <div style={{ display: 'grid', gap: 12 }}>
                  <label style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    cursor: 'pointer',
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: fieldErrors.agreedToActOnBehalf ? '1px solid #ef4444' : '1px solid transparent',
                  }}>
                    <input
                      type="checkbox"
                      checked={form.agreedToActOnBehalf}
                      onChange={e => {
                        clearFieldError('agreedToActOnBehalf');
                        setForm(prev => ({ ...prev, agreedToActOnBehalf: e.target.checked }));
                      }}
                      style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 13, lineHeight: 1.7, color: fieldErrors.agreedToActOnBehalf ? '#b91c1c' : 'rgba(0,0,0,0.75)' }}>
                      Потвърждавам, че домейнът ще бъде регистриран на мое име или на посочената от мен фирма.
                    </span>
                  </label>

                  <label style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    cursor: 'pointer',
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: fieldErrors.agreedToPolicies ? '1px solid #ef4444' : '1px solid transparent',
                  }}>
                    <input
                      type="checkbox"
                      checked={form.agreedToPolicies}
                      onChange={e => {
                        clearFieldError('agreedToPolicies');
                        setForm(prev => ({ ...prev, agreedToPolicies: e.target.checked }));
                      }}
                      style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 13, lineHeight: 1.7, color: fieldErrors.agreedToPolicies ? '#b91c1c' : 'rgba(0,0,0,0.75)' }}>
                      Съгласен/на съм с{' '}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, textDecoration: 'underline' }}>Общите условия</a>,{' '}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, textDecoration: 'underline' }}>Политиката за поверителност</a>{' '}
                      и{' '}
                      <a href="/cookies" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, textDecoration: 'underline' }}>Политиката за бисквитки</a>{' '}
                      на Clicka.bg.
                    </span>
                  </label>
                </div>
              </div>
            ) : null}
          </div>

          {/* Wizard footer — navigation buttons */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              padding: '16px 24px 20px',
              borderTop: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1 && !onBack}
              style={{
                ...backButtonStyle,
                opacity: step === 1 ? 0.3 : 1,
                cursor: step === 1 ? 'default' : 'pointer',
              }}
            >
              Назад
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={isPayDisabled}
              style={{
                ...primaryButtonStyle,
                opacity: isPayDisabled ? 0.4 : 1,
                cursor: isPayDisabled ? 'default' : 'pointer',
              }}
            >
              {step === 4
                ? busy
                  ? 'Подготвяме…'
                  : `Плати ${formatMoney(totalCents, 'EUR')}`
                : 'Продължи'}
            </button>
          </div>
        </div>
        </>
      ) : null}
    </div>
  );
}
