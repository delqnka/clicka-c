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

type PhotonFeature = {
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    countrycode?: string;
  };
};

function compactJoin(parts: Array<string | undefined | null>): string {
  return parts.map((part) => String(part ?? '').trim()).filter(Boolean).join(', ');
}

function photonFeatureToResult(feature: PhotonFeature): OsmAddressResult | null {
  const coords = feature.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  const [lon, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const p = feature.properties ?? {};
  if (p.countrycode && p.countrycode.toLowerCase() !== 'bg') return null;

  const streetLine = compactJoin([
    p.street,
    p.housenumber,
  ]);
  const displayName = compactJoin([
    p.name && p.name !== streetLine ? p.name : '',
    streetLine,
    p.city,
    p.county,
    p.state,
    p.postcode,
    p.country || 'България',
  ]);

  if (!displayName) return null;

  return {
    display_name: displayName,
    lat: String(lat),
    lon: String(lon),
    address: {
      road: p.street,
      house_number: p.housenumber,
      city: p.city,
      county: p.county || p.state,
    },
  };
}

async function searchPhotonAddresses(query: string): Promise<OsmAddressResult[]> {
  const url = `https://photon.komoot.io/api/?limit=8&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'alternine/1.0 (https://app.alternine.co; contact: support@alternine.co)',
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) return [];
  const data = (await res.json()) as { features?: PhotonFeature[] };
  if (!Array.isArray(data.features)) return [];
  return data.features
    .map(photonFeatureToResult)
    .filter((result): result is OsmAddressResult => Boolean(result))
    .slice(0, 6);
}

function normalizeBulgarianAddressQuery(query: string): string {
  return query
    .replace(/\bул\.?\s*/giu, 'улица ')
    .replace(/\bбул\.?\s*/giu, 'булевард ')
    .replace(/\bжк\.?\s*/giu, 'ж.к. ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasCountryHint(query: string): boolean {
  return /\b(българия|bulgaria|bg)\b/iu.test(query);
}

function hasCityHint(query: string, city: string): boolean {
  const normalizedQuery = query.toLocaleLowerCase('bg-BG');
  const normalizedCity = city.toLocaleLowerCase('bg-BG');
  return Boolean(normalizedCity) && normalizedQuery.includes(normalizedCity);
}

function buildAddressSearchQueries(query: string, city = ''): string[] {
  const q = query.trim();
  const normalized = normalizeBulgarianAddressQuery(q);
  const cityTrimmed = city.trim();
  const baseQueries = [q, normalized];
  const withCity = cityTrimmed && !hasCityHint(q, cityTrimmed)
    ? baseQueries.map((candidate) => `${cityTrimmed} ${candidate}`)
    : [];
  const all = [...baseQueries, ...withCity];
  return all
    .flatMap((candidate) => (hasCountryHint(candidate) ? [candidate] : [candidate, `${candidate}, България`]))
    .map((candidate) => candidate.replace(/\s+/g, ' ').trim())
    .filter((candidate, index, arr) => candidate.length >= 3 && arr.indexOf(candidate) === index);
}

function dedupeResults(results: OsmAddressResult[]): OsmAddressResult[] {
  const seen = new Set<string>();
  const unique: OsmAddressResult[] = [];
  for (const result of results) {
    const lat = Number(result.lat);
    const lon = Number(result.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const key = `${lat.toFixed(6)},${lon.toFixed(6)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(result);
  }
  return unique;
}

async function searchNominatim(query: string): Promise<OsmAddressResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&countrycodes=bg&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'alternine/1.0 (https://app.alternine.co; contact: support@alternine.co)',
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data as OsmAddressResult[] : [];
}

export async function searchOsmAddresses(query: string, city = ''): Promise<OsmAddressResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const candidates = buildAddressSearchQueries(q, city);
  const nominatimResults: OsmAddressResult[] = [];
  try {
    for (const candidate of candidates) {
      const data = await searchNominatim(candidate);
      nominatimResults.push(...data);
      const unique = dedupeResults(nominatimResults);
      if (unique.length >= 6) return unique.slice(0, 6);
    }
  } catch {
    // Fall through to Photon below.
  }

  if (nominatimResults.length > 0) {
    return dedupeResults(nominatimResults).slice(0, 6);
  }

  for (const candidate of candidates) {
    const photonResults = await searchPhotonAddresses(candidate);
    if (photonResults.length > 0) return dedupeResults(photonResults).slice(0, 6);
  }

  return [];
}
