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

export async function searchOsmAddresses(query: string): Promise<OsmAddressResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=bg&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'alternine/1.0 (https://app.alternine.co; contact: support@alternine.co)',
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data as OsmAddressResult[];
    }
  } catch {
    // Fall through to Photon below.
  }

  return searchPhotonAddresses(q);
}
