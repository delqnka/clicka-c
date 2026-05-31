'use client';

import { Calendar, Check, Copy, RefreshCw } from 'lucide-react';
import { useEffect, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import { GOOGLE_PLACE_ID_FINDER_URL } from '@/components/admin/admin-constants';
import { ADMIN_T } from '@/components/admin/admin-theme';
import { AdminInfoCard, AdminSection } from '@/components/admin/admin-ui';
import type { AdminSitePayload } from '@/lib/admin-site';

type CalendarStatus = {
  loading: boolean;
  googleConnected: boolean;
  googleConfigured: boolean;
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
  onConnectGoogleCalendar,
  onDisconnectGoogleCalendar,
  onResyncGoogleCalendar,
  onSaveExternalIcsUrl,
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
  onConnectGoogleCalendar: () => void;
  onDisconnectGoogleCalendar: () => void | Promise<void>;
  onResyncGoogleCalendar: () => void | Promise<void>;
  onSaveExternalIcsUrl: (url: string) => void | Promise<void>;
}) {
  const [externalIcsDraft, setExternalIcsDraft] = useState(calendarStatus.externalIcsUrl || '');

  useEffect(() => {
    setExternalIcsDraft(calendarStatus.externalIcsUrl || '');
  }, [calendarStatus.externalIcsUrl]);

  return (
    <AdminSection title="Интеграции" desc="Telegram, календар и Google отзиви.">
      <div style={{ display: 'grid', gap: 10 }}>
        <AdminInfoCard
          title="Календар"
          status={
            calendarStatus.externalIcsUrl || calendarStatus.feedUrl ? 'connected' : 'pending'
          }
        >
          <p style={{ margin: 0, fontSize: 13, color: ADMIN_T.muted, lineHeight: 1.6 }}>
            Работи <strong>без Google Cloud</strong> и без OAuth ключове — само календарни линкове (ICS),
            както ColorTrack чете телефона, но през web.
          </p>

          {calendarStatus.feedUrl ? (
            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: ADMIN_T.text }}>
                1. Clicka → Google / iPhone / Outlook (резервациите в твоя календар)
              </p>
              <p style={{ margin: 0, fontSize: 12, color: ADMIN_T.subtle, lineHeight: 1.55 }}>
                Google Calendar: calendar.google.com → Other calendars → + → From URL → paste линка.
                <br />
                iPhone: Настройки → Календар → Акаунти → Добави абонаментен календар.
              </p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(calendarStatus.feedUrl).catch(() => null);
                  setBusyKey('copied-cal-feed');
                  setTimeout(() => setBusyKey((k) => (k === 'copied-cal-feed' ? '' : k)), 2000);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: ADMIN_T.radiusSm,
                  background: '#F4F4F5',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <code
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                    paddingRight: 8,
                  }}
                >
                  {calendarStatus.feedUrl}
                </code>
                {busyKey === 'copied-cal-feed' ? (
                  <Check size={15} style={{ color: '#16a34a', flexShrink: 0 }} />
                ) : (
                  <Copy size={15} style={{ color: ADMIN_T.muted, flexShrink: 0 }} />
                )}
              </button>
            </div>
          ) : (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: ADMIN_T.subtle }}>
              {calendarStatus.loading ? 'Генерираме линк…' : 'Линкът се зарежда…'}
            </p>
          )}

          <div style={{ marginTop: 14, display: 'grid', gap: 6 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: ADMIN_T.text }}>
              2. Твоят календар → Clicka (Booksy, Fresha, iPhone — виж ги в Резервации)
            </p>
            <p style={{ margin: 0, fontSize: 12, color: ADMIN_T.subtle, lineHeight: 1.55 }}>
              iPhone/iCloud: Календар → име на календар → ⓘ → Абонирай се → Copy Link → paste тук.
              Ако ползваш Google на телефона, синхронизирай го с iCloud или paste Google ICS export линк.
            </p>
            <input
              style={{ ...inp, fontSize: 13 }}
              value={externalIcsDraft}
              onChange={(e) => setExternalIcsDraft(e.target.value)}
              placeholder="webcal://… или https://…calendar.ics"
            />
            <button
              type="button"
              style={btn('primary')}
              disabled={busyKey === 'calendar-ics-save'}
              onClick={() => void onSaveExternalIcsUrl(externalIcsDraft)}
            >
              {busyKey === 'calendar-ics-save' ? 'Запазване…' : 'Запази и синхронизирай'}
            </button>
          </div>

          {calendarStatus.googleConfigured ? (
            <details style={{ marginTop: 14 }}>
              <summary style={{ fontSize: 12, fontWeight: 600, color: ADMIN_T.subtle, cursor: 'pointer' }}>
                По избор: автоматичен Google OAuth (изисква Google Cloud на платформата)
              </summary>
              <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                <p style={{ margin: 0, fontSize: 12, color: ADMIN_T.muted, lineHeight: 1.55 }}>
                  {calendarStatus.googleConnected
                    ? 'OAuth връзката е активна. Можеш да я махнеш — ICS линковете по-горе работят и без нея.'
                    : 'Не е задължително. Повечето салони ползват само ICS линковете по-горе.'}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {calendarStatus.googleConnected ? (
                    <>
                      <button
                        type="button"
                        style={btn('sm-ghost')}
                        disabled={busyKey === 'calendar-resync'}
                        onClick={() => void onResyncGoogleCalendar()}
                      >
                        {busyKey === 'calendar-resync' ? 'Синхронизираме…' : 'Синхронизирай отново'}
                      </button>
                      <button
                        type="button"
                        style={btn('danger')}
                        disabled={busyKey === 'calendar-disconnect'}
                        onClick={() => void onDisconnectGoogleCalendar()}
                      >
                        {busyKey === 'calendar-disconnect' ? 'Премахваме…' : 'Премахни OAuth'}
                      </button>
                    </>
                  ) : (
                    <button type="button" style={btn('sm-ghost')} onClick={onConnectGoogleCalendar}>
                      <Calendar size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                      Свържи Google OAuth
                    </button>
                  )}
                </div>
              </div>
            </details>
          ) : null}

          <button
            type="button"
            style={{ ...btn('sm-ghost'), marginTop: 10 }}
            disabled={calendarStatus.loading}
            onClick={() => void loadCalendarStatus()}
          >
            {calendarStatus.loading ? 'Проверяваме…' : 'Обнови статуса'}
          </button>
        </AdminInfoCard>

        <AdminInfoCard title="Telegram" status={site.telegramChatId ? 'connected' : 'pending'}>
          {site.telegramChatId ? (
            <p style={{ margin: 0, fontSize: 13, color: ADMIN_T.muted, lineHeight: 1.6 }}>
              Telegram е свързан. Ще получаваш известия при нова резервация.
            </p>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 13, color: ADMIN_T.muted, lineHeight: 1.6 }}>
                Отвори{' '}
                <a
                  href="https://t.me/clicka_booking_bot"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: ADMIN_T.text, fontWeight: 600 }}
                >
                  @clicka_booking_bot
                </a>{' '}
                в Telegram и изпрати:
              </p>
              {site.onboardingCode ? (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`/start ${site.onboardingCode}`).catch(() => null);
                    setBusyKey('copied-tg');
                    setTimeout(() => setBusyKey((k) => (k === 'copied-tg' ? '' : k)), 2000);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    marginTop: 10,
                    padding: '10px 14px',
                    borderRadius: ADMIN_T.radiusSm,
                    background: '#F4F4F5',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <code style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', fontFamily: 'monospace' }}>
                    /start {site.onboardingCode}
                  </code>
                  {busyKey === 'copied-tg' ? (
                    <Check size={15} style={{ color: '#16a34a', flexShrink: 0 }} />
                  ) : (
                    <Copy size={15} style={{ color: ADMIN_T.muted, flexShrink: 0 }} />
                  )}
                </button>
              ) : (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: ADMIN_T.subtle }}>Кодът се генерира при активиране на акаунта.</p>
              )}
            </>
          )}
        </AdminInfoCard>

        <AdminInfoCard title="Google Reviews" status={googleReviewsStatus.connected ? 'connected' : 'pending'}>
          <p style={{ margin: 0, fontSize: 13, color: ADMIN_T.muted, lineHeight: 1.6 }}>
            {hasGoogleReviewsCandidate
              ? googleReviewsStatus.loading
                ? 'Проверяваме...'
                : googleReviewsStatus.connected
                  ? googleReviewsStatus.totalCount && googleReviewsStatus.totalCount > 0
                    ? `Показваме ${googleReviewsStatus.count} ревюта (4+ звезди) от общо ${googleReviewsStatus.totalCount} в Google.`
                    : `Показваме ${googleReviewsStatus.count} ревюта (4+ звезди) на сайта.`
                  : googleReviewsStatus.reason === 'missing_outscraper_key'
                    ? 'Липсва OUTSCRAPER_API_KEY на сървъра — без него отзивите не се зареждат.'
                    : googleReviewsStatus.reason === 'outscraper_api_error'
                      ? 'Outscraper върна грешка. Провери OUTSCRAPER_API_KEY и лимитите на акаунта.'
                      : googleReviewsStatus.reason === 'outscraper_pending'
                        ? 'Outscraper още обработва заявката. Изчакай малко и натисни „Обнови статуса".'
                        : 'Place ID е запазен. Натисни „Извлечи ревютата", за да ги заредим на сайта.'
              : (
                  <>
                    Добави Google Place ID или Maps линк в раздел <strong>Сайт</strong> — виж{' '}
                    <a
                      href={GOOGLE_PLACE_ID_FINDER_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: ADMIN_T.accent, fontWeight: 600 }}
                    >
                      Place ID Finder
                    </a>
                    .
                  </>
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
                ? `Показваме ${reviewsFetch.result.count ?? 0} ревюта (4+ звезди) на сайта.${Number(reviewsFetch.result.newCount ?? 0) > 0 ? ` Нови: ${reviewsFetch.result.newCount}.` : ' Няма нови ревюта от последното зареждане.'}`
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
                    Извличаме ревютата…
                  </>
                ) : (
                  'Извлечи ревютата'
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
                {googleReviewsStatus.loading ? 'Проверяваме…' : 'Обнови статуса'}
              </button>
            </div>
          ) : null}
          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 12, color: ADMIN_T.subtle }}>Търси бизнес в Google и избери правилния профил:</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={googleBizQuery}
                onChange={(e) => setGoogleBizQuery(e.target.value)}
                placeholder="Напр. Salon Urban Varna"
                style={{ ...inp, fontSize: 13 }}
              />
              <button type="button" onClick={() => void searchGoogleBusinesses()} style={btn('sm-ghost')} disabled={googleBizLoading}>
                {googleBizLoading ? 'Търсим…' : 'Търси'}
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
                      setNotice('Избран е Google бизнес профил. Извличаме ревютата...');
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
                    <div style={{ fontSize: 12, color: ADMIN_T.muted }}>{biz.address || 'Без адрес'}</div>
                    {biz.businessStatus ? (
                      <div style={{ fontSize: 11, color: ADMIN_T.subtle, marginTop: 3 }}>Статус: {biz.businessStatus}</div>
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
      </div>
    </AdminSection>
  );
}
