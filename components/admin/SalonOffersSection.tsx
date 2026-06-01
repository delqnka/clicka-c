'use client';

import { Camera, Trash2, X } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import type { AdminSalonOffer } from '@/lib/salon-offers';
import { offerSpotsLeft } from '@/lib/salon-offers';

function dateInputValue(iso: string | null): string {
  if (!iso) return '';
  const slice = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(slice) ? slice : '';
}

function campaignFromDateInput(dateStr: string): string | null {
  const v = dateStr.trim();
  if (!v) return null;
  return new Date(`${v}T00:00:00`).toISOString();
}

function campaignUntilDateInput(dateStr: string): string | null {
  const v = dateStr.trim();
  if (!v) return null;
  return new Date(`${v}T23:59:59.999`).toISOString();
}

type Props = {
  offers: AdminSalonOffer[];
  isMobile: boolean;
  busyKey: string;
  inp: CSSProperties;
  onChange: (offers: AdminSalonOffer[]) => void;
  onUploadImages: (offerIndex: number, files: FileList | null) => void | Promise<void>;
};

export function SalonOffersSection({
  offers,
  isMobile,
  busyKey,
  inp,
  onChange,
  onUploadImages,
}: Props) {
  const [durationDrafts, setDurationDrafts] = useState<Record<number, string>>({});

  function updateOffer(index: number, patch: Partial<AdminSalonOffer>) {
    onChange(offers.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }

  function durationDisplay(index: number, durationMin: number): string {
    if (durationDrafts[index] !== undefined) return durationDrafts[index];
    return String(durationMin);
  }

  function onDurationChange(index: number, raw: string) {
    setDurationDrafts((prev) => ({ ...prev, [index]: raw }));
    if (raw.trim() === '') return;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) updateOffer(index, { durationMin: n });
  }

  function onDurationBlur(index: number) {
    const raw = durationDrafts[index];
    setDurationDrafts((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    const parsed = raw !== undefined ? Number(raw) : offers[index]?.durationMin;
    const final =
      Number.isFinite(parsed) && parsed >= 5 ? Math.round(parsed) : 60;
    updateOffer(index, { durationMin: final });
  }

  function removeOffer(index: number) {
    onChange(offers.filter((_, i) => i !== index));
  }

  return (
    <div style={{ display: 'grid', gap: isMobile ? 14 : 12 }}>
      {offers.length === 0 ? (
        <p style={{ margin: 0, fontSize: 14, color: '#71717A' }}>Няма оферти.</p>
      ) : null}

      {offers.map((offer, i) => {
        const spots = offerSpotsLeft(offer);
        const uploadBusy = busyKey === `upload-offer-${i}`;
        return (
          <div
            key={offer.id || `new-${i}`}
            style={{
              border: '1px solid #E5E3DE',
              borderRadius: isMobile ? 18 : 12,
              padding: isMobile ? 16 : 14,
              background: '#fff',
              position: 'relative',
            }}
          >
            <button
              type="button"
              aria-label="Премахни оферта"
              onClick={() => removeOffer(i)}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                width: 26,
                height: 26,
                borderRadius: 999,
                border: '1px solid #E5E3DE',
                background: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>

            <div style={{ display: 'grid', gap: 10, paddingRight: 32 }}>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#71717A' }}>Заглавие</span>
                <input
                  style={inp}
                  value={offer.title}
                  onChange={(e) => updateOffer(i, { title: e.target.value })}
                  placeholder="Напр. -30% подстригване"
                />
              </label>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#71717A' }}>Описание</span>
                <textarea
                  style={{ ...inp, minHeight: 72, resize: 'vertical' }}
                  value={offer.description}
                  onChange={(e) => updateOffer(i, { description: e.target.value })}
                  placeholder="Какво включва офертата"
                />
              </label>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr auto',
                  gap: 10,
                  alignItems: 'end',
                }}
              >
                <label style={{ display: 'grid', gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#71717A' }}>Валидна от</span>
                  <input
                    type="date"
                    style={inp}
                    value={dateInputValue(offer.campaignValidFrom)}
                    onChange={(e) =>
                      updateOffer(i, { campaignValidFrom: campaignFromDateInput(e.target.value) })
                    }
                  />
                </label>
                <label style={{ display: 'grid', gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#71717A' }}>Валидна до</span>
                  <input
                    type="date"
                    style={inp}
                    value={dateInputValue(offer.campaignValidUntil)}
                    onChange={(e) =>
                      updateOffer(i, { campaignValidUntil: campaignUntilDateInput(e.target.value) })
                    }
                  />
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    minHeight: isMobile ? undefined : 42,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={offer.isActive}
                    onChange={(e) => updateOffer(i, { isActive: e.target.checked })}
                  />
                  Активна
                </label>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
                  gap: 10,
                }}
              >
                <label style={{ display: 'grid', gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#71717A' }}>Отстъпка %</span>
                  <input
                    type="number"
                    style={inp}
                    value={offer.discount ?? ''}
                    onChange={(e) =>
                      updateOffer(i, {
                        discount: e.target.value === '' ? null : Number(e.target.value) || 0,
                      })
                    }
                  />
                </label>
                <label style={{ display: 'grid', gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#71717A' }}>Макс. резервации</span>
                  <input
                    type="number"
                    min={1}
                    style={inp}
                    value={offer.maxClaims ?? ''}
                    onChange={(e) =>
                      updateOffer(i, {
                        maxClaims: e.target.value === '' ? null : Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    placeholder="∞"
                  />
                </label>
                <label style={{ display: 'grid', gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#71717A' }}>Продължителност</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={5}
                    step={5}
                    style={inp}
                    value={durationDisplay(i, offer.durationMin)}
                    onChange={(e) => onDurationChange(i, e.target.value)}
                    onBlur={() => onDurationBlur(i)}
                    placeholder="мин."
                  />
                </label>
              </div>

              {offer.maxClaims != null ? (
                <p style={{ margin: 0, fontSize: 12, color: '#71717A' }}>
                  Резервирани: <strong>{offer.totalClaims}</strong> / {offer.maxClaims}
                  {spots != null ? ` · остават ${spots}` : ''}
                </p>
              ) : null}

              <div style={{ display: 'grid', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#71717A' }}>Снимки</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {offer.images.map((url, imgIdx) => (
                    <div
                      key={`${url}-${imgIdx}`}
                      style={{
                        position: 'relative',
                        width: 72,
                        height: 72,
                        borderRadius: 12,
                        overflow: 'hidden',
                        border: '1px solid #E5E3DE',
                      }}
                    >
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        aria-label="Премахни снимка"
                        onClick={() =>
                          updateOffer(i, {
                            images: offer.images.filter((_, j) => j !== imgIdx),
                          })
                        }
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          width: 22,
                          height: 22,
                          borderRadius: 999,
                          border: 'none',
                          background: 'rgba(0,0,0,0.65)',
                          color: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <label
                    aria-label="Качи снимки към офертата"
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: uploadBusy ? 'wait' : 'pointer',
                      background: 'transparent',
                      border: '1.5px dashed #D4D4D8',
                      opacity: uploadBusy ? 0.6 : 1,
                      transition: 'border-color 160ms ease, transform 160ms ease',
                    }}
                  >
                    <Camera size={22} strokeWidth={1.85} color="#18181B" aria-hidden />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      disabled={uploadBusy}
                      onChange={(e) => void onUploadImages(i, e.target.files)}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
