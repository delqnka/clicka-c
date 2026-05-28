'use client';

import { Plus } from 'lucide-react';
import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import { ADMIN_DAYS } from '@/components/admin/admin-constants';
import { ADMIN_T } from '@/components/admin/admin-theme';
import { AdminSection } from '@/components/admin/admin-ui';
import type { AdminSitePayload } from '@/lib/admin-site';

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
  return (
    <AdminSection
      title="Работно време"
      desc="Настрой часовете и блокирай конкретни дни/часове."
      action={
        <button type="button" onClick={saveHours} style={btn('primary')} disabled={busyKey === 'hours'}>
          {busyKey === 'hours' ? 'Запазваме…' : 'Запази'}
        </button>
      }
    >
      <div style={{ display: 'grid', gap: isMobile ? 10 : 8 }}>
        {ADMIN_DAYS.map((day) => {
          const d = site.workingHours[day.key];
          return (
            <div
              key={day.key}
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '130px 1fr auto auto',
                gap: isMobile ? 12 : 10,
                alignItems: 'center',
                padding: isMobile ? '16px 18px' : '12px 14px',
                border: isMobile ? 'none' : `1px solid ${ADMIN_T.border}`,
                borderRadius: isMobile ? 18 : ADMIN_T.radiusSm,
                background: ADMIN_T.surface,
                boxShadow: isMobile ? '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)' : 'none',
                opacity: d.closed ? 0.5 : 1,
                transition: 'opacity 200ms ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: isMobile ? 16 : 14, fontWeight: isMobile ? 600 : 500, letterSpacing: '-0.01em' }}>
                  {day.label}
                </span>
                {isMobile ? (
                  <button
                    type="button"
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
                      width: 48,
                      height: 28,
                      borderRadius: 14,
                      border: 'none',
                      background: d.closed ? '#E5E7EB' : ADMIN_T.accent,
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'background 200ms ease',
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        background: '#fff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        position: 'absolute',
                        top: 3,
                        left: d.closed ? 3 : 23,
                        transition: 'left 200ms ease',
                      }}
                    />
                  </button>
                ) : null}
              </div>
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
                    style={{ ...inp, width: 'auto', flex: 1 }}
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
                    style={{ ...inp, width: 'auto', flex: 1 }}
                  />
                </div>
              ) : null}
              {d.closed && isMobile ? <span style={{ fontSize: 14, color: ADMIN_T.subtle }}>Почивен ден</span> : null}
              {!isMobile ? (
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
                boxShadow: isMobile ? '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)' : 'none',
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
