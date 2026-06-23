'use client';

import { Plus } from 'lucide-react';
import { useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import { ADMIN_DAYS, getAdminDays } from '@/components/admin/admin-constants';
import { ADMIN_COMPACT_SAVE_BTN, ADMIN_T } from '@/components/admin/admin-theme';
import { AdminSection } from '@/components/admin/admin-ui';
import type { AdminSitePayload } from '@/lib/admin-site';
import { type Locale } from '@/lib/i18n';

type DayKey = (typeof ADMIN_DAYS)[number]['key'];

export function HoursTabPanel({
  site,
  setSite,
  isMobile,
  inp,
  btn,
  busyKey,
  saveHours,
  locale,
}: {
  site: AdminSitePayload;
  setSite: Dispatch<SetStateAction<AdminSitePayload>>;
  isMobile: boolean;
  inp: CSSProperties;
  btn: (variant: 'primary' | 'ghost' | 'danger' | 'sm-ghost') => CSSProperties;
  busyKey: string;
  saveHours: () => void;
  locale: Locale;
}) {
  const isEn = locale === 'en';
  const dayDefs = getAdminDays(locale);
  const [activeDayKey, setActiveDayKey] = useState<DayKey>('monday');

  const timeInp = (extra?: CSSProperties): CSSProperties => ({
    ...inp,
    minWidth: 0,
    minHeight: isMobile ? 34 : undefined,
    padding: isMobile ? '6px 4px' : '6px 8px',
    fontSize: isMobile ? 13 : 14,
    textAlign: 'center',
    background: '#fff',
    ...extra,
  });

  const blockInp = (extra?: CSSProperties): CSSProperties => ({
    ...inp,
    minWidth: 0,
    minHeight: isMobile ? 32 : 34,
    padding: isMobile ? '5px 6px' : '5px 8px',
    fontSize: isMobile ? 12 : 13,
    background: '#fff',
    ...extra,
  });

  function addBookingBlock() {
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setSite((p) => ({
      ...p,
      bookingBlocks: [...p.bookingBlocks, { date, allDay: true }],
    }));
  }

  function renderDayEditor(dayKey: DayKey, compact?: boolean) {
    const day = dayDefs.find((d) => d.key === dayKey) ?? ADMIN_DAYS.find((d) => d.key === dayKey)!;
    const d = site.workingHours[dayKey];

    if (compact) {
      return (
        <div
          style={{
            padding: '8px 10px',
            border: `1px solid ${ADMIN_T.border}`,
            borderRadius: 10,
            background: '#fff',
            opacity: d.closed ? 0.6 : 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {d.closed ? (
              <span style={{ flex: 1, fontSize: 13, color: ADMIN_T.muted }}>{isEn ? 'Day off' : 'Почивен ден'}</span>
            ) : (
              <>
                <input
                  type="time"
                  value={d.open}
                  onChange={(e) =>
                    setSite((p) => ({
                      ...p,
                      workingHours: {
                        ...p.workingHours,
                        [dayKey]: { ...p.workingHours[dayKey], open: e.target.value },
                      },
                    }))
                  }
                  style={timeInp({ flex: 1 })}
                />
                <span style={{ color: ADMIN_T.muted, fontSize: 12, flexShrink: 0 }}>–</span>
                <input
                  type="time"
                  value={d.close}
                  onChange={(e) =>
                    setSite((p) => ({
                      ...p,
                      workingHours: {
                        ...p.workingHours,
                        [dayKey]: { ...p.workingHours[dayKey], close: e.target.value },
                      },
                    }))
                  }
                  style={timeInp({ flex: 1 })}
                />
              </>
            )}
            <button
              type="button"
              aria-label={d.closed ? (isEn ? 'Open' : 'Отвори') : (isEn ? 'Close' : 'Затвори')}
              onClick={() =>
                setSite((p) => ({
                  ...p,
                  workingHours: {
                    ...p.workingHours,
                    [dayKey]: { ...p.workingHours[dayKey], closed: !d.closed },
                  },
                }))
              }
              style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                border: d.closed ? `1px solid ${ADMIN_T.border}` : 'none',
                background: d.closed ? '#fff' : ADMIN_T.accent,
                position: 'relative',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  background: '#fff',
                  boxShadow: d.closed ? 'none' : '0 1px 2px rgba(0,0,0,0.2)',
                  position: 'absolute',
                  top: d.closed ? 1 : 2,
                  left: d.closed ? 1 : 18,
                  transition: 'left 200ms ease',
                }}
              />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={dayKey}
        style={{
          padding: '8px 12px',
          border: `1px solid ${ADMIN_T.border}`,
          borderRadius: ADMIN_T.radiusSm,
          background: '#fff',
          opacity: d.closed ? 0.5 : 1,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr auto',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500 }}>{day.label}</span>
          {!d.closed ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="time"
                value={d.open}
                onChange={(e) =>
                  setSite((p) => ({
                    ...p,
                    workingHours: {
                      ...p.workingHours,
                      [dayKey]: { ...p.workingHours[dayKey], open: e.target.value },
                    },
                  }))
                }
                style={timeInp({ width: 108, flex: 'none' })}
              />
              <span style={{ color: ADMIN_T.muted, fontSize: 12 }}>–</span>
              <input
                type="time"
                value={d.close}
                onChange={(e) =>
                  setSite((p) => ({
                    ...p,
                    workingHours: {
                      ...p.workingHours,
                      [dayKey]: { ...p.workingHours[dayKey], close: e.target.value },
                    },
                  }))
                }
                style={timeInp({ width: 108, flex: 'none' })}
              />
            </div>
          ) : (
            <span style={{ fontSize: 12, color: ADMIN_T.subtle }}>{isEn ? 'Day off' : 'Почивен ден'}</span>
          )}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              color: ADMIN_T.muted,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={d.closed}
              onChange={(e) =>
                setSite((p) => ({
                  ...p,
                  workingHours: {
                    ...p.workingHours,
                    [dayKey]: { ...p.workingHours[dayKey], closed: e.target.checked },
                  },
                }))
              }
            />
            {isEn ? 'Off' : 'Почивен'}
          </label>
        </div>
      </div>
    );
  }

  return (
    <AdminSection
      title={isEn ? 'Working hours' : 'Работно време'}
      compact={isMobile}
      action={
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button
            type="button"
            onClick={addBookingBlock}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              borderRadius: 8,
              border: `1px solid ${ADMIN_T.border}`,
              background: '#fff',
              color: ADMIN_T.text,
              padding: '6px 10px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Plus size={13} strokeWidth={2.25} />
            {isEn ? 'Blocked day' : 'Блокиран ден'}
          </button>
          <button
            type="button"
            onClick={saveHours}
            disabled={busyKey === 'hours'}
            style={{
              ...ADMIN_COMPACT_SAVE_BTN,
              opacity: busyKey === 'hours' ? 0.7 : 1,
              cursor: busyKey === 'hours' ? 'wait' : 'pointer',
            }}
          >
            {busyKey === 'hours' ? (isEn ? 'Saving…' : 'Запазване…') : (isEn ? 'Save' : 'Запази')}
          </button>
        </div>
      }
    >
      {isMobile ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <div
            style={{
              display: 'flex',
              gap: 4,
              overflowX: 'auto',
              paddingBottom: 2,
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
            }}
          >
            {dayDefs.map((day) => {
              const selected = activeDayKey === day.key;
              const closed = site.workingHours[day.key].closed;
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setActiveDayKey(day.key)}
                  style={{
                    flexShrink: 0,
                    borderRadius: 8,
                    border: selected ? `1.5px solid ${ADMIN_T.accent}` : `1px solid ${ADMIN_T.border}`,
                    background: '#fff',
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: selected ? 600 : 500,
                    color: closed ? ADMIN_T.subtle : ADMIN_T.text,
                    cursor: 'pointer',
                    lineHeight: 1.2,
                  }}
                >
                  {day.shortLabel}
                </button>
              );
            })}
          </div>
          {renderDayEditor(activeDayKey, true)}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {dayDefs.map((day) => renderDayEditor(day.key))}
        </div>
      )}

      <div style={{ marginTop: isMobile ? 10 : 12 }}>
        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: ADMIN_T.muted }}>
          {isEn ? 'Blocked days and time slots' : 'Блокирани дни и часове'}
        </p>
        <div style={{ display: 'grid', gap: 6 }}>
          {site.bookingBlocks.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: ADMIN_T.subtle }}>{isEn ? 'There are no blocked days.' : 'Няма блокирани дни.'}</p>
          ) : null}
          {site.bookingBlocks.map((block, i) => (
            <div
              key={`${block.date}-${block.start ?? 'allday'}-${i}`}
              style={{
                border: `1px solid ${ADMIN_T.border}`,
                borderRadius: 8,
                padding: isMobile ? '6px 8px' : '6px 10px',
                background: '#fff',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'nowrap',
                  alignItems: 'center',
                  gap: 5,
                  overflowX: isMobile ? 'auto' : undefined,
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                <input
                  type="date"
                  value={block.date}
                  onChange={(e) =>
                    setSite((p) => ({
                      ...p,
                      bookingBlocks: p.bookingBlocks.map((b, j) => (j === i ? { ...b, date: e.target.value } : b)),
                    }))
                  }
                  style={blockInp({ flex: '0 0 auto', width: isMobile ? 118 : 130 })}
                />
                {!block.allDay ? (
                  <>
                    <input
                      type="time"
                      value={block.start ?? ''}
                      onChange={(e) =>
                        setSite((p) => ({
                          ...p,
                          bookingBlocks: p.bookingBlocks.map((b, j) =>
                            j === i ? { ...b, allDay: false, start: e.target.value || '00:00' } : b
                          ),
                        }))
                      }
                      style={blockInp({ flex: '1 1 72px', maxWidth: 96 })}
                    />
                    <span style={{ color: ADMIN_T.subtle, fontSize: 11, flexShrink: 0 }}>–</span>
                    <input
                      type="time"
                      value={block.end ?? ''}
                      onChange={(e) =>
                        setSite((p) => ({
                          ...p,
                          bookingBlocks: p.bookingBlocks.map((b, j) =>
                            j === i ? { ...b, allDay: false, end: e.target.value || '23:59' } : b
                          ),
                        }))
                      }
                      style={blockInp({ flex: '1 1 72px', maxWidth: 96 })}
                    />
                  </>
                ) : null}
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    color: ADMIN_T.muted,
                    whiteSpace: 'nowrap',
                    marginLeft: 'auto',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={block.allDay}
                    onChange={(e) =>
                      setSite((p) => ({
                        ...p,
                        bookingBlocks: p.bookingBlocks.map((b, j) =>
                          j === i
                            ? e.target.checked
                              ? { ...b, allDay: true, start: undefined, end: undefined }
                              : { ...b, allDay: false, start: b.start || '09:00', end: b.end || '10:00' }
                            : b
                        ),
                      }))
                    }
                  />
                  {isEn ? 'All day' : 'Цял ден'}
                </label>
                <button
                  type="button"
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#EF4444',
                    padding: 0,
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                  onClick={() =>
                    setSite((p) => ({
                      ...p,
                      bookingBlocks: p.bookingBlocks.filter((_, j) => j !== i),
                    }))
                  }
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: isMobile ? 10 : 14, borderTop: `1px solid ${ADMIN_T.border}`, paddingTop: isMobile ? 10 : 14 }}>
        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: ADMIN_T.muted }}>
          {isEn ? 'Time slot interval' : 'Интервал между часовете'}
        </p>
        <p style={{ margin: '0 0 8px', fontSize: 12, color: ADMIN_T.subtle }}>
          {isEn ? 'How often available time slots are shown to clients.' : 'На какъв интервал се показват свободните часове на клиентите.'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {[15, 20, 30, 45, 60].map((min) => (
            <button
              key={min}
              type="button"
              onClick={() => setSite((p) => ({ ...p, slotIntervalMin: min }))}
              style={{
                borderRadius: 8,
                border: (site.slotIntervalMin ?? 30) === min
                  ? `1.5px solid ${ADMIN_T.accent}`
                  : `1px solid ${ADMIN_T.border}`,
                background: (site.slotIntervalMin ?? 30) === min ? ADMIN_T.accent : '#fff',
                color: (site.slotIntervalMin ?? 30) === min ? '#fff' : ADMIN_T.text,
                padding: '5px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {min} {isEn ? 'min' : 'мин'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: isMobile ? 10 : 14, borderTop: `1px solid ${ADMIN_T.border}`, paddingTop: isMobile ? 10 : 14 }}>
        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: ADMIN_T.muted }}>
          {isEn ? 'Booking window' : 'Прозорец за резервации'}
        </p>
        <p style={{ margin: '0 0 8px', fontSize: 12, color: ADMIN_T.subtle }}>
          {isEn ? 'How many days ahead clients can book online.' : 'Колко дни напред могат клиентите да резервират онлайн.'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {[14, 30, 60, 90, 180, 365].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setSite((p) => ({ ...p, bookingAdvanceDays: days }))}
              style={{
                borderRadius: 8,
                border: site.bookingAdvanceDays === days
                  ? `1.5px solid ${ADMIN_T.accent}`
                  : `1px solid ${ADMIN_T.border}`,
                background: site.bookingAdvanceDays === days ? ADMIN_T.accent : '#fff',
                color: site.bookingAdvanceDays === days ? '#fff' : ADMIN_T.text,
                padding: '5px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {days === 365 ? (isEn ? '1 year' : '1 година') : days === 180 ? (isEn ? '6 months' : '6 месеца') : days === 90 ? (isEn ? '3 months' : '3 месеца') : `${days} ${isEn ? 'days' : 'дни'}`}
            </button>
          ))}
        </div>
      </div>
    </AdminSection>
  );
}
