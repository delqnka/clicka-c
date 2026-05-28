'use client';

import { Plus, Trash2, Upload, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { AdminSalonOffer } from '@/lib/salon-offers';
import { newEmptyOffer, offerSpotsLeft } from '@/lib/salon-offers';

type Props = {
  offers: AdminSalonOffer[];
  isMobile: boolean;
  busyKey: string;
  inp: CSSProperties;
  btn: (variant: 'primary' | 'ghost' | 'danger' | 'sm-ghost') => CSSProperties;
  onChange: (offers: AdminSalonOffer[]) => void;
  onUploadImages: (offerIndex: number, files: FileList | null) => void | Promise<void>;
  onSave: () => void | Promise<void>;
};

export function SalonOffersSection({
  offers,
  isMobile,
  busyKey,
  inp,
  btn,
  onChange,
  onUploadImages,
  onSave,
}: Props) {
  function updateOffer(index: number, patch: Partial<AdminSalonOffer>) {
    onChange(offers.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }

  function removeOffer(index: number) {
    onChange(offers.filter((_, i) => i !== index));
  }

  function addOffer() {
    onChange([newEmptyOffer(), ...offers]);
  }

  return (
    <div style={{ display: 'grid', gap: isMobile ? 14 : 12 }}>
      {offers.length === 0 ? (
        <p style={{ margin: 0, fontSize: 14, color: '#71717A' }}>
          Няма оферти. Добави първата — ще се покаже на сайта с отделен модал за резервация.
        </p>
      ) : null}

      {offers.map((offer, i) => {
        const spots = offerSpotsLeft(offer);
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
                  gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
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
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#71717A' }}>Минути</span>
                  <input
                    type="number"
                    min={15}
                    style={inp}
                    value={offer.durationMin}
                    onChange={(e) =>
                      updateOffer(i, { durationMin: Math.max(15, Number(e.target.value) || 60) })
                    }
                  />
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    marginTop: isMobile ? 0 : 22,
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
                        borderRadius: 10,
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
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 10,
                      border: '1px dashed #D4D4D8',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      cursor: busyKey === `upload-offer-${i}` ? 'wait' : 'pointer',
                      fontSize: 11,
                      color: '#71717A',
                    }}
                  >
                    <Upload size={16} />
                    Качи
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      disabled={busyKey === `upload-offer-${i}`}
                      onChange={(e) => void onUploadImages(i, e.target.files)}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" style={btn('ghost')} onClick={addOffer}>
          <Plus size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
          Добави оферта
        </button>
        <button
          type="button"
          style={btn('primary')}
          disabled={busyKey === 'offers'}
          onClick={() => void onSave()}
        >
          {busyKey === 'offers' ? 'Запазваме…' : 'Запази офертите'}
        </button>
      </div>
    </div>
  );
}
