'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import { BarChart3, Eye, Facebook, CheckCircle2, AlertCircle, Loader2, Circle, Zap } from 'lucide-react';
import { ADMIN_T, ADMIN_COMPACT_SAVE_BTN } from '@/components/admin/admin-theme';
import { AdminSection } from '@/components/admin/admin-ui';
import type { AdminSitePayload } from '@/lib/admin-site';

type Props = {
  site: AdminSitePayload;
  setSite: (fn: (prev: AdminSitePayload) => AdminSitePayload) => void;
  slug: string;
  inp: CSSProperties;
  sitePublicUrl: string;
};

const GA4_RE = /^G-[A-Z0-9]{4,20}$/;
const PIXEL_RE = /^\d{10,20}$/;
const CLARITY_RE = /^[a-z0-9]{5,20}$/i;

type ConnectionStatus = 'idle' | 'checking' | 'ok' | 'error';

type ToolStatus = {
  ga4: ConnectionStatus;
  pixel: ConnectionStatus;
  clarity: ConnectionStatus;
};

export function MarketingTabPanel({ site, setSite, slug, inp, sitePublicUrl }: Props) {
  const [ga4Id, setGa4Id] = useState(site.ga4Id ?? '');
  const [metaPixelId, setMetaPixelId] = useState(site.metaPixelId ?? '');
  const [clarityId, setClarityId] = useState(site.clarityId ?? '');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [status, setStatus] = useState<ToolStatus>({ ga4: 'idle', pixel: 'idle', clarity: 'idle' });
  const [metaTestResult, setMetaTestResult] = useState<'idle' | 'sent' | 'no_pixel'>('idle');

  useEffect(() => {
    setGa4Id(site.ga4Id ?? '');
    setMetaPixelId(site.metaPixelId ?? '');
    setClarityId(site.clarityId ?? '');
    // Показваме статус за вече запазените ID-та
    setStatus({
      ga4: site.ga4Id ? 'ok' : 'idle',
      pixel: site.metaPixelId ? 'ok' : 'idle',
      clarity: site.clarityId ? 'ok' : 'idle',
    });
  }, [site.ga4Id, site.metaPixelId, site.clarityId]);

  async function handleSave() {
    setSaving(true);
    setNotice('');
    try {
      const res = await fetch(`/api/admin/marketing?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ga4Id, metaPixelId, clarityId }),
      });
      const json = await res.json().catch(() => ({})) as Record<string, unknown>;
      if (!res.ok) {
        setNotice(String(json.error ?? 'Грешка при запис.'));
        return;
      }
      setSite((prev) => ({ ...prev, ga4Id, metaPixelId, clarityId }));
      setNotice('Настройките са запазени.');
    } catch {
      setNotice('Мрежова грешка.');
    } finally {
      setSaving(false);
    }
  }

  function handleTest() {
    const errors: Partial<Record<keyof ToolStatus, string>> = {};

    if (ga4Id && !GA4_RE.test(ga4Id)) errors.ga4 = 'Невалиден формат (трябва: G-XXXXXXXXXX)';
    if (metaPixelId && !PIXEL_RE.test(metaPixelId)) errors.pixel = 'Невалиден формат (само цифри, 10-20 знака)';
    if (clarityId && !CLARITY_RE.test(clarityId)) errors.clarity = 'Невалиден формат';

    setStatus({
      ga4: !ga4Id ? 'idle' : errors.ga4 ? 'error' : 'ok',
      pixel: !metaPixelId ? 'idle' : errors.pixel ? 'error' : 'ok',
      clarity: !clarityId ? 'idle' : errors.clarity ? 'error' : 'ok',
    });
  }

  function handleMetaTest() {
    // Отваря публичния сайт на салона с ?pixelTest=1
    // Пикселът е зареден там (на правилния домейн), не в admin панела.
    const testUrl = sitePublicUrl.replace(/\/$/, '') + '?pixelTest=1';
    window.open(testUrl, '_blank', 'noopener');
    setMetaTestResult('sent');
    setTimeout(() => setMetaTestResult('idle'), 12000);
  }

  const hasChanges =
    ga4Id !== (site.ga4Id ?? '') ||
    metaPixelId !== (site.metaPixelId ?? '') ||
    clarityId !== (site.clarityId ?? '');

  const hasUnsavedChanges = hasChanges;
  const anyConfigured = !!(ga4Id || metaPixelId || clarityId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '4px 0' }}>

      {/* Connection status overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 10,
      }}>
        <StatusCard label="Google Analytics 4" id={ga4Id} status={status.ga4} color="#e11d48" />
        <StatusCard label="Meta Pixel" id={metaPixelId} status={status.pixel} color="#1877f2" />
        <StatusCard label="Microsoft Clarity" id={clarityId} status={status.clarity} color="#0078d4" />
      </div>

      <AdminSection
        title="Google Analytics 4"
        icon={<BarChart3 size={16} color="#e11d48" />}
        desc="Проследявай трафик, конверсии и стойност на резервациите."
      >
        <label style={labelStyle}>Measurement ID</label>
        <input
          style={inp}
          value={ga4Id}
          onChange={(e) => { setGa4Id(e.target.value.trim()); setStatus(s => ({ ...s, ga4: 'idle' })); }}
          placeholder="G-XXXXXXXXXX"
          spellCheck={false}
          autoComplete="off"
        />
        <p style={hintStyle}>GA4 → Admin → Data Streams → Web → Measurement ID</p>
      </AdminSection>

      <AdminSection
        title="Meta Pixel"
        icon={<Facebook size={16} color="#1877f2" />}
        desc="Проследявай реализации от Facebook и Instagram реклами."
      >
        <label style={labelStyle}>Pixel ID</label>
        <input
          style={inp}
          value={metaPixelId}
          onChange={(e) => { setMetaPixelId(e.target.value.trim()); setStatus(s => ({ ...s, pixel: 'idle' })); }}
          placeholder="123456789012345"
          spellCheck={false}
          autoComplete="off"
        />
        <p style={hintStyle}>Meta Events Manager → твоят пиксел → Settings</p>
      </AdminSection>

      <AdminSection
        title="Microsoft Clarity"
        icon={<Eye size={16} color="#0078d4" />}
        desc="Безплатни session recordings и heatmaps. (по желание)"
      >
        <label style={labelStyle}>Project ID</label>
        <input
          style={inp}
          value={clarityId}
          onChange={(e) => { setClarityId(e.target.value.trim()); setStatus(s => ({ ...s, clarity: 'idle' })); }}
          placeholder="abc123xyz"
          spellCheck={false}
          autoComplete="off"
        />
        <p style={hintStyle}>clarity.microsoft.com → твоят проект → Settings</p>
      </AdminSection>

      {/* Events info */}
      <div style={{
        background: '#fafaf9', border: `1px solid ${ADMIN_T.border}`,
        borderRadius: ADMIN_T.radius, padding: 16,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: ADMIN_T.text }}>
          Автоматични събития
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
          {[
            ['Meta Pixel', 'Schedule, BookingCompleted, Lead, PageView'],
            ['GA4', 'booking_started, booking_completed (+value), generate_lead'],
          ].map(([tool, events]) => (
            <div key={tool}>
              <span style={{ fontSize: 12, fontWeight: 600, color: ADMIN_T.muted }}>{tool}: </span>
              <span style={{ fontSize: 12, color: ADMIN_T.subtle }}>{events}</span>
            </div>
          ))}
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: ADMIN_T.subtle, lineHeight: 1.5 }}>
          При резервация се изпраща и стойността (EUR) — агенцията може да види 100 € реклама → 800 € резервации.
          Скриптовете се активират само след cookie consent. Всеки салон използва само своите ID-та.
        </p>
      </div>

      {notice && (
        <p style={{ margin: 0, fontSize: 14, color: notice.includes('запазени') ? '#15803d' : '#be123c' }}>
          {notice}
        </p>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={handleSave}
          disabled={saving || !hasUnsavedChanges}
          style={{ ...ADMIN_COMPACT_SAVE_BTN, opacity: saving || !hasUnsavedChanges ? 0.6 : 1 }}
        >
          {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', marginRight: 6 }} />}
          {saving ? 'Запис...' : 'Запази'}
        </button>
        <button
          onClick={handleTest}
          disabled={!anyConfigured}
          style={{ ...testBtnStyle, opacity: anyConfigured ? 1 : 0.5 }}
          title="Проверява формата на въведените ID-та"
        >
          Провери формат
        </button>
        {metaPixelId && (
          <button
            onClick={handleMetaTest}
            style={{ ...testBtnStyle, display: 'flex', alignItems: 'center', gap: 6, borderColor: '#1877f2', color: '#1877f2' }}
            title="Изпраща ClickaTest събитие — провери го в Meta Events Manager"
          >
            <Zap size={13} />
            Изпрати тест към Meta
          </button>
        )}
      </div>

      {metaTestResult === 'sent' && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 16px',
          borderRadius: ADMIN_T.radius, fontSize: 14,
          background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8',
          lineHeight: 1.6,
        }}>
          <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Публичният сайт е отворен с тестово събитие.</strong>
            <ol style={{ margin: '6px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <li>В новия таб — <strong>приеми маркетинговите бисквитки</strong> в cookie banner-а.</li>
              <li>Събитието <code>ClickaTest</code> ще се изпрати от <strong>домейна на твоя сайт</strong>.</li>
              <li>Отвори <strong>Meta Events Manager → твоят пиксел → Test Events</strong> и провери дали виждаш <code>ClickaTest</code>.</li>
            </ol>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#3b82f6' }}>
              Защо от публичния сайт? Meta отчита събитията по домейн — ако тестът тръгне от admin.clicka.bg,
              Meta ще види грешен домейн и рекламните кампании ще са некоректно атрибутирани.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusCard({
  label, id, status, color,
}: {
  label: string;
  id: string;
  status: ConnectionStatus;
  color: string;
}) {
  const icons: Record<ConnectionStatus, React.ReactNode> = {
    idle: <Circle size={14} color={ADMIN_T.subtle} />,
    checking: <Loader2 size={14} color={color} style={{ animation: 'spin 1s linear infinite' }} />,
    ok: <CheckCircle2 size={14} color="#16a34a" />,
    error: <AlertCircle size={14} color="#dc2626" />,
  };
  const labels: Record<ConnectionStatus, string> = {
    idle: 'Не е настроен',
    checking: 'Проверява...',
    ok: id ? `ID: ${id.length > 14 ? id.slice(0, 12) + '…' : id}` : 'Настроен',
    error: 'Невалиден формат',
  };
  const colors: Record<ConnectionStatus, string> = {
    idle: ADMIN_T.subtle,
    checking: color,
    ok: '#16a34a',
    error: '#dc2626',
  };

  return (
    <div style={{
      border: `1px solid ${status === 'ok' ? '#bbf7d0' : status === 'error' ? '#fecdd3' : ADMIN_T.border}`,
      borderRadius: ADMIN_T.radius,
      padding: '10px 14px',
      background: status === 'ok' ? '#f0fdf4' : status === 'error' ? '#fff1f2' : '#fff',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icons[status]}
        <span style={{ fontSize: 12, fontWeight: 700, color: colors[status] }}>
          {status === 'ok' ? '✓ Свързан' : status === 'error' ? '✗ Грешка' : '—'}
        </span>
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: ADMIN_T.text }}>{label}</span>
      <span style={{ fontSize: 11, color: ADMIN_T.subtle, fontFamily: 'monospace' }}>
        {labels[status]}
      </span>
    </div>
  );
}

const labelStyle: CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: ADMIN_T.text, marginBottom: 6,
};

const hintStyle: CSSProperties = {
  margin: '6px 0 0', fontSize: 12, color: ADMIN_T.subtle, lineHeight: 1.4,
};

const testBtnStyle: CSSProperties = {
  padding: '9px 20px', borderRadius: 999, border: `1px solid ${ADMIN_T.border}`,
  background: 'transparent', color: ADMIN_T.muted, fontWeight: 600,
  fontSize: 14, cursor: 'pointer',
};
