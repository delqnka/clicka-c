'use client';

import { Plus } from 'lucide-react';
import { useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import { ADMIN_DAYS } from '@/components/admin/admin-constants';
import { ADMIN_COMPACT_SAVE_BTN, ADMIN_T } from '@/components/admin/admin-theme';
import { AdminSection } from '@/components/admin/admin-ui';
import type { AdminSitePayload } from '@/lib/admin-site';

type DayKey = (typeof ADMIN_DAYS)[number]['key'];

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
  const [activeDayKey, setActiveDayKey] = useState<DayKey>('monday');

  const timeInp = (extra?: CSSProperties): CSSProperties => ({
    ...inp,
    minWidth: 0,
    minHeight: isMobile ? 34 : undefined,
    padding: isMobile ? '6px 4px' : '6px 8px',
    fontSize: isMobile ? 13 : 14,
    textAlign: 'center',
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
    const day = ADMIN_DAYS.find((d) => d.key === dayKey)!;
    const d = site.workingHours[dayKey];

    if (compact) {
      return (
        <div
          style={{
            padding: '8px 10px',
            border: `1px solid ${ADMIN_T.border}`,
            borderRadius: 10,
            background: ADMIN_T.surface,
            opacity: d.closed ? 0.55 : 1,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: d.closed ? 0 : 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{day.label}</span>
            <button
              type="button"
              aria-label={d.closed ? 'Отвори' : 'Затвори'}
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
                border: 'none',
                background: d.closed ? '#E5E7EB' : ADMIN_T.accent,
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
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  position: 'absolute',
                  top: 2,
                  left: d.closed ? 2 : 18,
                  transition: 'left 200ms ease',
                }}
              />
            </button>
          </div>
          {d.closed ? (
            <span style={{ fontSize: 12, color: ADMIN_T.subtle }}>Почивен ден</span>
          ) : (
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
                style={timeInp({ flex: 1 })}
              />
              <span style={{ color: ADMIN_T.muted, fontSize: 11, flexShrink: 0 }}>–</span>
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
            </div>
          )}
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
          background: ADMIN_T.surface,
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
            <span style={{ fontSize: 12, color: ADMIN_T.subtle }}>Почивен ден</span>
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
            Почивен
          </label>
        </div>
      </div>
    );
  }

  return (
    <AdminSection
      title="Работно време"
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
            Блокиран ден
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
            {busyKey === 'hours' ? 'Запазване…' : 'Запази'}
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
            {ADMIN_DAYS.map((day) => {
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
                    background: selected ? '#F0FDF4' : '#fff',
                    padding: '4px 9px',
                    fontSize: 11,
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
          {ADMIN_DAYS.map((day) => renderDayEditor(day.key))}
        </div>
      )}

      <div style={{ marginTop: isMobile ? 12 : 14 }}>
        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: ADMIN_T.text }}>
          Изключения (блокирани дни и часове)
        </p>
        <div style={{ display: 'grid', gap: 8 }}>
          {site.bookingBlocks.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: ADMIN_T.muted }}>Няма блокирани дни.</p>
          ) : null}
          {site.bookingBlocks.map((block, i) => (
            <div
              key={`${block.date}-${block.start ?? 'allday'}-${i}`}
              style={{
                border: `1px solid ${ADMIN_T.border}`,
                borderRadius: isMobile ? 12 : ADMIN_T.radiusSm,
                padding: isMobile ? '10px' : '8px 10px',
                background: ADMIN_T.surface,
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr 1fr' : '150px 100px 100px auto',
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
                  style={inp}
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
                  style={inp}
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
                  style={inp}
                />
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    gridColumn: isMobile ? '1 / -1' : undefined,
                  }}
                >
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: ADMIN_T.muted }}>
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
                    style={{ ...btn('ghost'), color: '#EF4444', padding: '5px 8px', fontSize: 12 }}
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
        </div>
      </div>
    </AdminSection>
  );
}
