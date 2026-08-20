'use client';

import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  addressLineFromSearchResult,
  cityFromOsmResult,
  extractCoordinatesFromGoogleMapsUrl,
  googleMapsSearchUrl,
  isGoogleMapsUrl,
  type AddressSearchResult,
  searchAddresses,
} from '@/lib/address-search';

type Props = {
  label: string;
  value: string;
  city?: string;
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
  onGoogleMapsUrl?: (result: {
    googleMapsUrl: string;
    lat: number | null;
    lng: number | null;
  }) => void;
};

export function AddressAutocompleteField({
  label,
  value,
  city = '',
  inputStyle,
  className,
  onChange,
  onSelect,
  onGoogleMapsUrl,
}: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState('');
  const onGoogleMapsUrlRef = useRef(onGoogleMapsUrl);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    onGoogleMapsUrlRef.current = onGoogleMapsUrl;
  }, [onGoogleMapsUrl]);

  useEffect(() => {
    const q = query.trim();
    if (isGoogleMapsUrl(q)) {
      setResults([]);
      setLoading(false);
      setSearchedQuery(q);
      const coords = extractCoordinatesFromGoogleMapsUrl(q);
      onGoogleMapsUrlRef.current?.({
        googleMapsUrl: q,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      });
      return;
    }

    if (q.length < 3) {
      setResults([]);
      setLoading(false);
      setSearchedQuery('');
      return;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchAddresses(q, city);
        if (!ctrl.signal.aborted) {
          setResults(data);
          setSearchedQuery(q);
        }
      } catch {
        if (!ctrl.signal.aborted) {
          setResults([]);
          setSearchedQuery(q);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [city, query]);

  return (
    <label style={{ display: 'grid', gap: 5 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#18181B', letterSpacing: '0.02em' }}>
        {label}
      </span>
      <input
        value={query}
        onChange={e => {
          const next = e.target.value;
          setQuery(next);
          if (isGoogleMapsUrl(next.trim())) {
            const coords = extractCoordinatesFromGoogleMapsUrl(next);
            onGoogleMapsUrlRef.current?.({
              googleMapsUrl: next.trim(),
              lat: coords?.lat ?? null,
              lng: coords?.lng ?? null,
            });
            return;
          }
          onChange(next);
        }}
        style={inputStyle}
        className={className}
        placeholder="ул. Витоша 42"
        autoComplete="off"
        aria-autocomplete="list"
      />
      {(loading || results.length > 0 || searchedQuery === query.trim()) && (
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
          ) : isGoogleMapsUrl(query.trim()) ? (
            <div style={{ padding: '10px 12px', fontSize: 13, color: '#71717A', lineHeight: 1.45 }}>
              Google Maps линкът е разпознат. Натисни “Запази”, за да се покаже на сайта.
            </div>
          ) : results.length > 0 ? (
            results.map((r, i) => (
              <button
                key={`${r.lat}-${r.lon}-${i}`}
                type="button"
                role="option"
                onClick={() => {
                  const lat = Number(r.lat);
                  const lng = Number(r.lon);
                  const address = addressLineFromSearchResult(r);
                  const city = cityFromOsmResult(r);
                  setQuery(address);
                  setResults([]);
                  onChange(address);
                  onSelect({
                    address,
                    city,
                    lat,
                    lng,
                    googleMapsUrl: googleMapsSearchUrl(lat, lng),
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
          ) : (
            <div style={{ padding: '10px 12px', fontSize: 13, color: '#71717A', lineHeight: 1.45 }}>
              Няма намерени адреси. Пробвай с град + улица + номер, например “София Витоша 42”.
            </div>
          )}
        </div>
      )}
    </label>
  );
}
