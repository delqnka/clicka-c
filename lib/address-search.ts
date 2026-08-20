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
