import { osmEmbedUrl } from '@/lib/address-search-osm';

export type AddressSearchResult = {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
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

export async function searchAddresses(query: string): Promise<AddressSearchResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const res = await fetch(`/api/address-search?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
  if (!res.ok) return [];

  const data = (await res.json()) as AddressSearchResult[];
  return Array.isArray(data) ? data : [];
}
