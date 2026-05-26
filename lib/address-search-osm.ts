export function osmEmbedUrl(lat: number, lng: number): string {
  const d = 0.01;
  const bbox = `${(lng - d).toFixed(6)}%2C${(lat - d).toFixed(6)}%2C${(lng + d).toFixed(6)}%2C${(lat + d).toFixed(6)}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(6)}%2C${lng.toFixed(6)}`;
}

export type OsmAddressResult = {
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

export async function searchOsmAddresses(query: string): Promise<OsmAddressResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=bg&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'clicka.bg/1.0 (https://clicka.bg; contact: hello@clicka.bg)',
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? (data as OsmAddressResult[]) : [];
}
