'use client';

import { Check, Copy, RefreshCw } from 'lucide-react';
import { type CSSProperties, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { GOOGLE_PLACE_ID_FINDER_URL } from '@/components/admin/admin-constants';
import { ADMIN_T } from '@/components/admin/admin-theme';
import { AdminInfoCard, AdminSection } from '@/components/admin/admin-ui';
import { ResendIntegrationCard } from '@/components/admin/ResendIntegrationCard';
import type { AdminSitePayload } from '@/lib/admin-site';
import { type Locale } from '@/lib/i18n';

const TELEGRAM_BOT_USERNAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() || 'clicka_booking_bot';

type CalendarStatus = {
  loading: boolean;
  feedUrl: string;
  webcalUrl: string;
  externalIcsUrl: string;
};

type GoogleReviewsStatus = {
  loading: boolean;
  connected: boolean;
  count: number;
  totalCount: number | null;
  source: 'outscraper' | 'cache' | 'none' | null;
  reason: string | null;
  providerStatus?: string | null;
};

type GoogleReviewsFetchState = {
  loading: boolean;
  result: null | { success: boolean; count?: number; newCount?: number; message?: string };
};

type GoogleBusinessCandidate = {
  placeId: string;
  name: string;
  address: string;
  mapsUrl: string;
  businessStatus: string;
};

export function IntegrationsTabPanel({
  site,
  setSite,
  setNotice,
  busyKey,
  setBusyKey,
  inp,
  btn,
  hasGoogleReviewsCandidate,
  googleReviewsStatus,
  reviewsFetch,
  fetchGoogleReviews,
  loadGoogleReviewsStatus,
  googleBizQuery,
  setGoogleBizQuery,
  googleBizLoading,
  googleBizResults,
  googleBizMessage,
  searchGoogleBusinesses,
  calendarStatus,
  loadCalendarStatus,
  onSaveExternalIcsUrl,
  onSaveTracking,
  locale,
}: {
  site: AdminSitePayload;
  setSite: Dispatch<SetStateAction<AdminSitePayload>>;
  setNotice: (msg: string) => void;
  busyKey: string;
  setBusyKey: Dispatch<SetStateAction<string>>;
  inp: CSSProperties;
  btn: (variant: 'primary' | 'ghost' | 'danger' | 'sm-ghost') => CSSProperties;
  hasGoogleReviewsCandidate: boolean;
  googleReviewsStatus: GoogleReviewsStatus;
  reviewsFetch: GoogleReviewsFetchState;
  fetchGoogleReviews: (opts?: { placeId?: string; mapsUrl?: string }) => void | Promise<void>;
  loadGoogleReviewsStatus: (opts?: { cacheBust?: boolean }) => void | Promise<void>;
  googleBizQuery: string;
  setGoogleBizQuery: (q: string) => void;
  googleBizLoading: boolean;
  googleBizResults: GoogleBusinessCandidate[];
  googleBizMessage: string;
  searchGoogleBusinesses: () => void | Promise<void>;
  calendarStatus: CalendarStatus;
  loadCalendarStatus: () => void | Promise<void>;
  onSaveExternalIcsUrl: (url: string) => void | Promise<void>;
  onSaveTracking: () => void | Promise<void>;
  locale: Locale;
}) {
  const isEn = locale === 'en';
  return (
    <AdminSection title={isEn ? 'Integrations' : 'Интеграции'} desc={isEn ? 'Telegram, calendar and Google reviews.' : 'Telegram, календар и Google отзиви.'}>
      <div style={{ display: 'grid', gap: 10 }}>
        <AdminInfoCard title="Telegram" status={site.telegramChatId ? 'connected' : 'pending'} locale={locale}>
          {site.telegramChatId ? (
            <div style={{ display: 'grid', gap: 6 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
                {isEn ? 'The Telegram bot is connected' : 'Telegram ботът е свързан'}
              </p>
              <details>
                <summary style={{ fontSize: 13, fontWeight: 600, color: ADMIN_T.text, cursor: 'pointer' }}>
                  {isEn ? 'What can you do through the bot?' : 'Какво можеш да правиш през бота?'}
                </summary>
                <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 6, fontSize: 13, color: ADMIN_T.muted, lineHeight: 1.5 }}>
                  <BulletRow>{isEn ? 'Receive notifications for new bookings, cancellations and changes' : 'Получаваш известия за нови резервации, отмени и промени'}</BulletRow>
                  <BulletRow>{isEn ? 'Ask about your bookings, like "how many appointments do I have tomorrow" or "who is my next client"' : 'Питаш за резервациите си — „колко часа имам утре", „кой е следващият ми клиент"'}</BulletRow>
                  <BulletRow>{isEn ? 'See revenue and statistics, like "revenue this week" and "top services"' : 'Виждаш оборот и статистика — „оборот тази седмица", „топ услуги"'}</BulletRow>
                  <BulletRow>{isEn ? 'Confirm, cancel or move bookings with one message' : 'Потвърждаваш, отменяш или местиш резервации с едно съобщение'}</BulletRow>
                  <BulletRow>{isEn ? 'Add a new client and book an appointment directly from the chat' : 'Добавяш нов клиент и записваш час направо от чата'}</BulletRow>
                  <BulletRow>{isEn ? 'Block time slots or full days, like "busy 14:00-16:00 tomorrow"' : 'Блокираш часове или цели дни — „зает 14:00-16:00 утре", „почивен ден утре"'}</BulletRow>
                  <BulletRow>{isEn ? 'Manage your services, including add, edit price and delete' : 'Управляваш услугите си — добавяне, редакция на цена, изтриване'}</BulletRow>
                </ul>
              </details>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginTop: 4,
              padding: '14px 18px',
              borderRadius: 16,
              background: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)',
              boxShadow: '0 8px 32px rgba(219,39,119,.35)',
              color: '#fff',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0, opacity: 0.9 }}>
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.038 9.593c-.152.678-.549.843-1.112.524l-3.078-2.268-1.484 1.428c-.164.164-.302.302-.619.302l.221-3.131 5.703-5.152c.248-.221-.054-.344-.383-.123L7.12 14.073l-3.031-.947c-.658-.206-.671-.658.138-.975l11.84-4.564c.548-.197 1.028.134.495.661z"/>
              </svg>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{isEn ? 'Connect Telegram' : 'Свържи Telegram'}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, opacity: 0.85, lineHeight: 1.4 }}>
                  {isEn ? 'Receive booking notifications directly in Telegram' : 'Получавай известия за резервации директно в Telegram'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (site.onboardingCode) {
                    navigator.clipboard.writeText(`/start ${site.onboardingCode}`).catch(() => null);
                    setBusyKey('copied-tg');
                    setTimeout(() => setBusyKey((k) => (k === 'copied-tg' ? '' : k)), 2000);
                  }
                  window.open(`https://t.me/${TELEGRAM_BOT_USERNAME}`, '_blank');
                }}
                style={{
                  flexShrink: 0,
                  border: '2px solid rgba(255,255,255,0.6)',
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  borderRadius: 999,
                  padding: '7px 14px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {busyKey === 'copied-tg' ? (isEn ? 'Copied ✓' : 'Копирано ✓') : (isEn ? 'Connect →' : 'Свържи →')}
              </button>
            </div>
          )}
          {!site.telegramChatId && (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: ADMIN_T.subtle, lineHeight: 1.5 }}>
              {site.onboardingCode
                ? <>
                    {isEn ? 'The button copies the code and opens ' : 'Бутонът копира кода и отваря '}
                    <a href={`https://t.me/${TELEGRAM_BOT_USERNAME}`} target="_blank" rel="noreferrer" style={{ color: ADMIN_T.text, fontWeight: 600 }}>@{TELEGRAM_BOT_USERNAME}</a>
                    {isEn ? ' — just paste it in the chat.' : ' — просто го постави в чата.'}
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 8,
                      marginLeft: 0,
                    }}>
                      <code style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: 15,
                        padding: '6px 12px',
                        borderRadius: 8,
                        background: 'rgba(0,0,0,0.06)',
                        color: ADMIN_T.text,
                      }}>/start {site.onboardingCode}</code>
                      <button
                        type="button"
                        onClick={() => {
                          if (site.onboardingCode) {
                            navigator.clipboard.writeText(`/start ${site.onboardingCode}`).catch(() => null);
                            setBusyKey('copied-tg-code');
                            setTimeout(() => setBusyKey((k) => (k === 'copied-tg-code' ? '' : k)), 2000);
                          }
                        }}
                        title={isEn ? 'Copy code' : 'Копирай кода'}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          border: `1px solid ${ADMIN_T.border}`,
                          background: '#fff',
                          color: ADMIN_T.text,
                          cursor: 'pointer',
                        }}
                      >
                        {busyKey === 'copied-tg-code' ? <Check size={15} /> : <Copy size={15} />}
                      </button>
                    </span>
                  </>
                : (isEn ? 'The code is generated when the account is activated.' : 'Кодът се генерира при активиране на акаунта.')}
            </p>
          )}
        </AdminInfoCard>

        <AdminInfoCard title="Google Reviews" status={googleReviewsStatus.connected ? 'connected' : 'pending'} locale={locale}>
          <p style={{ margin: 0, fontSize: 13, color: ADMIN_T.muted, lineHeight: 1.6 }}>
            {hasGoogleReviewsCandidate
              ? googleReviewsStatus.loading
                ? (isEn ? 'Checking…' : 'Проверяваме...')
                : googleReviewsStatus.connected
                  ? googleReviewsStatus.totalCount && googleReviewsStatus.totalCount > 0
                    ? (isEn
                      ? `Showing ${googleReviewsStatus.count} reviews (4+ stars) out of ${googleReviewsStatus.totalCount} on Google.`
                      : `Показваме ${googleReviewsStatus.count} ревюта (4+ звезди) от общо ${googleReviewsStatus.totalCount} в Google.`)
                    : (isEn
                      ? `Showing ${googleReviewsStatus.count} reviews (4+ stars) on the site.`
                      : `Показваме ${googleReviewsStatus.count} ревюта (4+ звезди) на сайта.`)
                  : googleReviewsStatus.reason === 'missing_outscraper_key'
                    ? (isEn
                      ? 'OUTSCRAPER_API_KEY is missing on the server — reviews cannot be loaded without it.'
                      : 'Липсва OUTSCRAPER_API_KEY на сървъра — без него отзивите не се зареждат.')
                    : googleReviewsStatus.reason === 'outscraper_api_error'
                      ? (isEn
                        ? 'Outscraper returned an error. Check OUTSCRAPER_API_KEY and your account limits.'
                        : 'Outscraper върна грешка. Провери OUTSCRAPER_API_KEY и лимитите на акаунта.')
                      : googleReviewsStatus.reason === 'outscraper_pending'
                        ? (isEn
                          ? 'Outscraper is still processing the request. Wait a moment and press "Refresh status".'
                          : 'Outscraper още обработва заявката. Изчакай малко и натисни „Обнови статуса".')
                        : (isEn
                          ? 'Place ID is saved. Press "Fetch reviews" to load them on the site.'
                          : 'Place ID е запазен. Натисни „Извлечи ревютата", за да ги заредим на сайта.')
              : (
                  <a
                    href={GOOGLE_PLACE_ID_FINDER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: ADMIN_T.accent, fontWeight: 600 }}
                  >
                    Place ID Finder
                  </a>
                )}
          </p>
          {reviewsFetch.result ? (
            <p
              style={{
                margin: '6px 0 0',
                fontSize: 12,
                color: reviewsFetch.result.success ? '#16a34a' : '#dc2626',
                lineHeight: 1.5,
              }}
            >
              {reviewsFetch.result.success
                ? (isEn
                  ? `Showing ${reviewsFetch.result.count ?? 0} reviews (4+ stars) on the site.${Number(reviewsFetch.result.newCount ?? 0) > 0 ? ` New: ${reviewsFetch.result.newCount}.` : ' No new reviews since last refresh.'}`
                  : `Показваме ${reviewsFetch.result.count ?? 0} ревюта (4+ звезди) на сайта.${Number(reviewsFetch.result.newCount ?? 0) > 0 ? ` Нови: ${reviewsFetch.result.newCount}.` : ' Няма нови ревюта от последното зареждане.'}`)
                : reviewsFetch.result.message}
            </p>
          ) : null}
          {hasGoogleReviewsCandidate ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => void fetchGoogleReviews()}
                disabled={reviewsFetch.loading}
                style={{
                  ...btn('primary'),
                  opacity: reviewsFetch.loading ? 0.65 : 1,
                  cursor: reviewsFetch.loading ? 'wait' : 'pointer',
                }}
              >
                {reviewsFetch.loading ? (
                  <>
                    <RefreshCw size={14} style={{ marginRight: 6, verticalAlign: -2, animation: 'spin 1s linear infinite' }} />
                    {isEn ? 'Fetching reviews…' : 'Извличаме ревютата…'}
                  </>
                ) : (
                  isEn ? 'Fetch reviews' : 'Извлечи ревютата'
                )}
              </button>
              <button
                type="button"
                onClick={() => void loadGoogleReviewsStatus({ cacheBust: true })}
                disabled={googleReviewsStatus.loading}
                style={{
                  ...btn('sm-ghost'),
                  opacity: googleReviewsStatus.loading ? 0.65 : 1,
                  cursor: googleReviewsStatus.loading ? 'wait' : 'pointer',
                }}
              >
                {googleReviewsStatus.loading
                  ? (isEn ? 'Checking…' : 'Проверяваме…')
                  : (isEn ? 'Refresh status' : 'Обнови статуса')}
              </button>
            </div>
          ) : null}
          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: ADMIN_T.text }}>
              {isEn ? 'Find your business and pick the right profile' : 'Намери бизнеса си и избери правилния профил'}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={googleBizQuery}
                onChange={(e) => setGoogleBizQuery(e.target.value)}
                placeholder={isEn ? 'e.g. Salon Urban Varna' : 'Напр. Salon Urban Varna'}
                style={{ ...inp, fontSize: 13 }}
              />
              <button type="button" onClick={() => void searchGoogleBusinesses()} style={btn('sm-ghost')} disabled={googleBizLoading}>
                {googleBizLoading
                  ? (isEn ? 'Searching…' : 'Търсим…')
                  : (isEn ? 'Search' : 'Търси')}
              </button>
            </div>
            {googleBizResults.length > 0 ? (
              <div style={{ display: 'grid', gap: 6 }}>
                {googleBizResults.map((biz) => (
                  <button
                    key={biz.placeId}
                    type="button"
                    onClick={() => {
                      const selectedPlaceId = biz.placeId;
                      const selectedMapsUrl = biz.mapsUrl || site.googleMapsUrl;
                      setSite((p) => ({
                        ...p,
                        googlePlaceId: selectedPlaceId,
                        googleMapsUrl: biz.mapsUrl || p.googleMapsUrl,
                      }));
                      setNotice(isEn ? 'Google Business profile selected. Fetching reviews…' : 'Избран е Google бизнес профил. Извличаме ревютата...');
                      void fetchGoogleReviews({ placeId: selectedPlaceId, mapsUrl: selectedMapsUrl });
                    }}
                    style={{
                      border: `1px solid ${ADMIN_T.border}`,
                      borderRadius: 10,
                      background: '#fff',
                      padding: '8px 10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: ADMIN_T.text }}>{biz.name}</div>
                    <div style={{ fontSize: 12, color: ADMIN_T.muted }}>{biz.address || (isEn ? 'No address' : 'Без адрес')}</div>
                    {biz.businessStatus ? (
                      <div style={{ fontSize: 11, color: ADMIN_T.subtle, marginTop: 3 }}>{isEn ? 'Status: ' : 'Статус: '}{biz.businessStatus}</div>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
            {!googleBizLoading && googleBizMessage ? (
              <p style={{ margin: 0, fontSize: 12, color: ADMIN_T.subtle }}>{googleBizMessage}</p>
            ) : null}
          </div>
        </AdminInfoCard>

        <ResendIntegrationCard slug={site.slug} inp={inp} btn={btn} setNotice={setNotice} locale={locale} />

        <AdminInfoCard title={isEn ? 'Analytics & tracking' : 'Анализ и тракинг'} status={site.ga4Id || site.metaPixelId || site.clarityId ? 'connected' : 'pending'} locale={locale}>
          <div style={{ display: 'grid', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 13, color: ADMIN_T.muted, lineHeight: 1.6 }}>
              {isEn
                ? 'Optional IDs for GA4, Meta Pixel and Microsoft Clarity on the custom site.'
                : 'По желание: ID-та за GA4, Meta Pixel и Microsoft Clarity на custom сайта.'}
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              <input
                value={site.ga4Id}
                onChange={(e) => setSite((prev) => ({ ...prev, ga4Id: e.target.value.trim() }))}
                placeholder="G-XXXXXXXXXX"
                style={{ ...inp, fontSize: 13 }}
              />
              <input
                value={site.metaPixelId}
                onChange={(e) => setSite((prev) => ({ ...prev, metaPixelId: e.target.value.trim() }))}
                placeholder={isEn ? 'Meta Pixel ID' : 'Meta Pixel ID'}
                style={{ ...inp, fontSize: 13 }}
              />
              <input
                value={site.clarityId}
                onChange={(e) => setSite((prev) => ({ ...prev, clarityId: e.target.value.trim() }))}
                placeholder={isEn ? 'Clarity Project ID' : 'Clarity Project ID'}
                style={{ ...inp, fontSize: 13 }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => void onSaveTracking()}
                disabled={busyKey === 'tracking'}
                style={{
                  ...btn('primary'),
                  opacity: busyKey === 'tracking' ? 0.65 : 1,
                  cursor: busyKey === 'tracking' ? 'wait' : 'pointer',
                }}
              >
                {busyKey === 'tracking'
                  ? (isEn ? 'Saving…' : 'Запазване…')
                  : (isEn ? 'Save tracking IDs' : 'Запази tracking ID-тата')}
              </button>
            </div>
          </div>
        </AdminInfoCard>
      </div>
    </AdminSection>
  );
}

function BulletRow({ children }: { children: ReactNode }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span style={{ marginTop: 6, width: 6, height: 6, borderRadius: '50%', background: '#a855f7', flexShrink: 0 }} />
      <span>{children}</span>
    </li>
  );
}
