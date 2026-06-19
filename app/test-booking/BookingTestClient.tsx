'use client';

import { useRef, useState } from 'react';
import { BookingWidget } from '@/components/booking/BookingWidget';
import type { BookingWidgetHandle } from '@/components/booking/types';

type Props = {
  slug: string;
  salon: Record<string, unknown>;
};

export function BookingTestClient({ slug, salon }: Props) {
  const bookingRef = useRef<BookingWidgetHandle>(null);
  const [lastOpened, setLastOpened] = useState<string | null>(null);

  const services = Array.isArray(salon.services) ? salon.services as Array<{ id?: string; name?: string }> : [];

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 640, margin: '0 auto', padding: '2rem 1rem' }}>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          {String(salon.name ?? slug)}
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#666' }}>
          Test страница — <code>BookingWidget</code> без SalonPublicParity, без iframe.
        </p>
      </div>

      {/* Generic "Book now" trigger */}
      <button
        onClick={() => {
          setLastOpened('generic');
          bookingRef.current?.open();
        }}
        style={{
          display: 'block',
          width: '100%',
          padding: '0.875rem',
          borderRadius: '0.75rem',
          border: 'none',
          background: String(salon.primary_color ?? '#5B21B6'),
          color: '#fff',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '1rem',
        }}
      >
        Запази час
      </button>

      {/* Service-specific triggers */}
      {services.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Или директно към услуга:
          </p>
          {services.slice(0, 4).map((svc) => {
            const id = String(svc?.id ?? '');
            const name = String(svc?.name ?? id);
            return (
              <button
                key={id}
                onClick={() => {
                  setLastOpened(name);
                  bookingRef.current?.open(id);
                }}
                style={{
                  padding: '0.625rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e5e5',
                  background: '#fff',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}

      {lastOpened && (
        <p style={{ fontSize: '0.75rem', color: '#888' }}>
          Последно отворено: <strong>{lastOpened}</strong>
        </p>
      )}

      {/* THE WIDGET — no iframe, no redirect, no Clicka branding */}
      <BookingWidget
        ref={bookingRef}
        slug={slug}
        salon={salon}
      />
    </div>
  );
}
