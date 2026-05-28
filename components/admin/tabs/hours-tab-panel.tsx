'use client';

import { Plus } from 'lucide-react';
import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import { ADMIN_DAYS } from '@/components/admin/admin-constants';
import { ADMIN_T } from '@/components/admin/admin-theme';
import { AdminSection } from '@/components/admin/admin-ui';
import type { AdminSitePayload } from '@/lib/admin-site';

const TIME_TAB_SHADOW = '0 4px 14px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)';

export function HoursTabPanel({
  site,
  setSite,
  isMobile,
  inp,
  btn,
  busyKey,
  saveHours,
}: {
  site: AdminSitePayload;
  setSite: Dispatch<SetStateAction<AdminSitePayload>>;
  isMobile: boolean;
  inp: CSSProperties;
  btn: (variant: 'primary' | 'ghost' | 'danger' | 'sm-ghost') => CSSProperties;
  busyKey: string;
  saveHours: () => void;
}) {
  const timeTabInp = (extra?: CSSProperties): CSSProperties => ({
    ...inp,
    width: 'auto',
    flex: 1,
    minWidth: 0,
    minHeight: isMobile ? 36 : undefined,
    padding: isMobile ? '8px 6px' : inp.padding,
    fontSize: isMobile ? 14 : inp.fontSize,
    textAlign: 'center',
    boxShadow: TIME_TAB_SHADOW,
    ...extra,
  });

  return (
    <AdminSection
      title="Работно време"
      action={
        <button type="button" onClick={saveHours} style={btn('primary')} disabled={busyKey === 'hours'}>
          {busyKey === 'hours' ? 'Запазваме…' : 'Запази'}
        </button>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : '1fr',
          gap: isMobile ? 8 : 8,
        }}
      >
        {ADMIN_DAYS.map((day) => {
          const d = site.workingHours[day.key];
          const dayLabel = isMobile ? day.shortLabel : day.label;
          return (
            <div
              key={day.key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? 8 : 0,
                padding: isMobile ? '10px 10px' : '10px 14px',
                border: isMobile ? 'none' : `1px solid ${ADMIN_T.border}`,
                borderRadius: isMobile ? 14 : ADMIN_T.radiusSm,
                background: ADMIN_T.surface,
                boxShadow: isMobile ? TIME_TAB_SHADOW : 'none',
                opacity: d.closed ? 0.5 : 1,
                transition: 'opacity 200ms ease',
              }}
            >
              {isMobile ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.2,
                  }}
                >
                  {dayLabel}
                </span>
                  <button
                    type="button"
                    aria-label={d.closed ? 'Отвори' : 'Затвори'}
                    onClick={() =>
                      setSite((p) => ({
                        ...p,
                        workingHours: {
                          ...p.workingHours,
                          [day.key]: { ...p.workingHours[day.key], closed: !d.closed },
                        },
                      }))
                    }
                    style={{
                      width: 40,
                      height: 22,
                      borderRadius: 11,
                      border: 'none',
                      background: d.closed ? '#E5E7EB' : ADMIN_T.accent,
                      position: 'relative',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'background 200ms ease',
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        background: '#fff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        position: 'absolute',
                        top: 2,
                        left: d.closed ? 2 : 20,
                        transition: 'left 200ms ease',
                      }}
                    />
                  </button>
              </div>
              ) : null}
              {isMobile && !d.closed ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="time"
                    value={d.open}
                    onChange={(e) =>
                      setSite((p) => ({
                        ...p,
                        workingHours: {
                          ...p.workingHours,
                          [day.key]: { ...p.workingHours[day.key], open: e.target.value },
                        },
                      }))
                    }
                    style={timeTabInp()}
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
                          [day.key]: { ...p.workingHours[day.key], close: e.target.value },
                        },
                      }))
                    }
                    style={timeTabInp()}
                  />
                </div>
              ) : null}
              {d.closed && isMobile ? (
                <span style={{ fontSize: 12, color: ADMIN_T.subtle, lineHeight: 1.2 }}>Почивен</span>
              ) : null}
              {!isMobile ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '130px 1fr auto',
                    gap: 10,
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{day.label}</span>
                  {!d.closed ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="time"
                        value={d.open}
                        onChange={(e) =>
                          setSite((p) => ({
                            ...p,
                            workingHours: {
                              ...p.workingHours,
                              [day.key]: { ...p.workingHours[day.key], open: e.target.value },
                            },
                          }))
                        }
                        style={timeTabInp({ flex: 'none', width: 120 })}
                      />
                      <span style={{ color: ADMIN_T.muted, fontSize: 13 }}>–</span>
                      <input
                        type="time"
                        value={d.close}
                        onChange={(e) =>
                          setSite((p) => ({
                            ...p,
                            workingHours: {
                              ...p.workingHours,
                              [day.key]: { ...p.workingHours[day.key], close: e.target.value },
                            },
                          }))
                        }
                        style={timeTabInp({ flex: 'none', width: 120 })}
                      />
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, color: ADMIN_T.subtle }}>Почивен ден</span>
                  )}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
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
                            [day.key]: { ...p.workingHours[day.key], closed: e.target.checked },
                          },
                        }))
                      }
                    />
                    Почивен
                  </label>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14 }}>
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: ADMIN_T.text }}>
          Изключения (блокирани дни и часове)
        </p>
        <div style={{ display: 'grid', gap: 8 }}>
          {site.bookingBlocks.map((block, i) => (
            <div
              key={`${block.date}-${block.start ?? 'allday'}-${i}`}
              style={{
                border: isMobile ? 'none' : `1px solid ${ADMIN_T.border}`,
                borderRadius: isMobile ? 16 : ADMIN_T.radiusSm,
                padding: isMobile ? '14px 14px' : '10px 12px',
                background: ADMIN_T.surface,
                boxShadow: isMobile ? TIME_TAB_SHADOW : 'none',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr 1fr' : '160px 110px 110px auto',
                  gap: 8,
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
                  style={{ ...inp, boxShadow: isMobile ? TIME_TAB_SHADOW : undefined }}
                />
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
                  disabled={block.allDay}
                  style={{ ...inp, boxShadow: isMobile ? TIME_TAB_SHADOW : undefined }}
                />
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
                  disabled={block.allDay}
                  style={{ ...inp, boxShadow: isMobile ? TIME_TAB_SHADOW : undefined }}
                />
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    gridColumn: isMobile ? '1 / -1' : undefined,
                  }}
                >
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: ADMIN_T.muted }}>
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
                    Цял ден
                  </label>
                  <button
                    type="button"
                    style={{ ...btn('ghost'), color: '#EF4444', padding: '6px 10px' }}
                    onClick={() =>
                      setSite((p) => ({
                        ...p,
                        bookingBlocks: p.bookingBlocks.filter((_, j) => j !== i),
                      }))
                    }
                  >
                    Премахни
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            style={{ ...btn('ghost'), justifyContent: 'center' }}
            onClick={() => {
              const today = new Date();
              const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
              setSite((p) => ({
                ...p,
                bookingBlocks: [...p.bookingBlocks, { date, allDay: true }],
              }));
            }}
          >
            <Plus size={14} />
            Добави блокиран ден/часове
          </button>
        </div>
      </div>
    </AdminSection>
  );
}
