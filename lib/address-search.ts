import { osmEmbedUrl } from '@/lib/address-search-osm';

export type AddressSearchResult = {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    pedestrian?: string;
    footway?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
  };
};

export function cityFromOsmResult(result: AddressSearchResult, fallback = ''): string {
  return (
    result.address?.city ||
    result.address?.town ||
    result.address?.village ||
    result.address?.county ||
    fallback
  );
}

export { osmEmbedUrl };

function compactJoin(parts: Array<string | undefined | null>, separator = ', '): string {
  return parts.map((part) => String(part ?? '').trim()).filter(Boolean).join(separator);
}

export function googleMapsSearchUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}

export function isGoogleMapsUrl(value: string): boolean {
  const raw = value.trim();
  if (!raw) return false;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    return (
      host === 'maps.app.goo.gl' ||
      host.endsWith('.google.com') && url.pathname.toLowerCase().includes('/maps') ||
      host === 'google.com' && url.pathname.toLowerCase().includes('/maps') ||
      host === 'maps.google.com'
    );
  } catch {
    return false;
  }
}

export function extractCoordinatesFromGoogleMapsUrl(value: string): { lat: number; lng: number } | null {
  const raw = value.trim();
  if (!raw) return null;

  const atMatch = raw.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,|z|\/|\?|$)/);
  if (atMatch) {
    const lat = Number(atMatch[1]);
    const lng = Number(atMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  const dataMatch = raw.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (dataMatch) {
    const lat = Number(dataMatch[1]);
    const lng = Number(dataMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  try {
    const url = new URL(raw);
    const candidates = [
      url.searchParams.get('q'),
      url.searchParams.get('query'),
      url.searchParams.get('ll'),
      url.searchParams.get('center'),
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
      const match = candidate.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
      if (!match) continue;
      const lat = Number(match[1]);
      const lng = Number(match[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  } catch {
    return null;
  }

  return null;
}

export function addressLineFromSearchResult(result: AddressSearchResult): string {
  const road =
    result.address?.road ||
    result.address?.pedestrian ||
    result.address?.footway ||
    '';
  const streetLine = compactJoin([road, result.address?.house_number], ' ');
  return streetLine || result.display_name;
}

export async function searchAddresses(query: string, contextCity = ''): Promise<AddressSearchResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const params = new URLSearchParams({ q });
  const city = contextCity.trim();
  if (city) params.set('city', city);

  const res = await fetch(`/api/address-search?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) return [];

  const data = (await res.json()) as AddressSearchResult[];
  return Array.isArray(data) ? data : [];
}
