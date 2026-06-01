'use client';

import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import {
  cityFromOsmResult,
  osmEmbedUrl,
  type AddressSearchResult,
  searchAddresses,
} from '@/lib/address-search';

type Props = {
  label: string;
  value: string;
  inputStyle: CSSProperties;
  className?: string;
  onChange: (address: string) => void;
  onSelect: (result: {
    address: string;
    city: string;
    lat: number;
    lng: number;
    googleMapsUrl: string;
  }) => void;
};

export function AddressAutocompleteField({
  label,
  value,
  inputStyle,
  className,
  onChange,
  onSelect,
}: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchAddresses(q);
        if (!ctrl.signal.aborted) setResults(data);
      } catch {
        if (!ctrl.signal.aborted) setResults([]);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  return (
    <label style={{ display: 'grid', gap: 5 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#18181B', letterSpacing: '0.02em' }}>
        {label}
      </span>
      <input
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          onChange(e.target.value);
        }}
        style={inputStyle}
        className={className}
        placeholder="ул. Витоша 42"
        autoComplete="off"
        aria-autocomplete="list"
      />
      {(loading || results.length > 0) && (
        <div
          style={{
            border: '1px solid #E5E3DE',
            borderRadius: 10,
            overflow: 'hidden',
            maxHeight: 220,
            overflowY: 'auto',
            background: '#fff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          }}
          role="listbox"
        >
          {loading ? (
            <div style={{ padding: '10px 12px', fontSize: 13, color: '#71717A' }}>Търсим адреси…</div>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.lat}-${r.lon}-${i}`}
                type="button"
                role="option"
                onClick={() => {
                  const lat = Number(r.lat);
                  const lng = Number(r.lon);
                  const address = r.display_name;
                  const city = cityFromOsmResult(r);
                  setQuery(address);
                  setResults([]);
                  onSelect({
                    address,
                    city,
                    lat,
                    lng,
                    googleMapsUrl: osmEmbedUrl(lat, lng),
                  });
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  borderBottom: i < results.length - 1 ? '1px solid #F5F4F2' : 'none',
                  background: '#fff',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  fontSize: 13,
                  lineHeight: 1.45,
                  fontFamily: 'inherit',
                  color: '#18181B',
                }}
              >
                {r.display_name}
              </button>
            ))
          )}
        </div>
      )}
    </label>
  );
}
