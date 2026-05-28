/** Server-only: Google reviews (Outscraper) + static maps (Google Maps API). */

import { unstable_cache } from 'next/cache';

export type GoogleReviewLite = { author_name: string; rating: number; text: string };
export type GoogleReviewsProbe = {
  reviews: GoogleReviewLite[];
  source: 'outscraper' | 'none';
  reason?: string;
  providerStatus?: string;
  providerHint?: string;
};

type OutscraperPayload = {
  status?: string;
  id?: string;
  results_location?: string;
  data?: unknown;
};

export type GoogleBusinessSearchResult = {
  placeId: string;
  name: string;
  address: string;
  mapsUrl: string;
  businessStatus: string;
};

export function extractGooglePlaceIdFromMapsUrl(url: string | null | undefined): string | null {
  const raw = String(url ?? '').trim();
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    const queryPlaceId = parsed.searchParams.get('query_place_id')?.trim();
    if (queryPlaceId) return queryPlaceId;

    const q = parsed.searchParams.get('q')?.trim() ?? parsed.searchParams.get('query')?.trim() ?? '';
    if (q.toLowerCase().startsWith('place_id:')) {
      const id = q.slice('place_id:'.length).trim();
      if (id) return id;
    }

    const pathMatch = parsed.href.match(/!1s([^!/?&]+)/);
    if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]);
  } catch {
    const textMatch = raw.match(/place_id:([A-Za-z0-9_-]+)/i);
    if (textMatch?.[1]) return textMatch[1];
  }

  return null;
}

export async function resolveGooglePlaceId(options: {
  explicitPlaceId?: string | null | undefined;
  mapsUrl?: string | null | undefined;
}): Promise<string | null> {
  const explicit = String(options.explicitPlaceId ?? '').trim();
  if (explicit) return explicit;
  return extractGooglePlaceIdFromMapsUrl(options.mapsUrl);
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function collectOutscraperRows(input: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(input)) return [];
  const out: Array<Record<string, unknown>> = [];
  for (const item of input) {
    if (!item) continue;
    if (Array.isArray(item)) {
      for (const nested of item) {
        if (nested && typeof nested === 'object') out.push(nested as Record<string, unknown>);
      }
      continue;
    }
    if (typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (Array.isArray(row.reviews_data)) {
      for (const nested of row.reviews_data) {
        if (nested && typeof nested === 'object') out.push(nested as Record<string, unknown>);
      }
      continue;
    }
    out.push(row);
  }
  return out;
}

function mapOutscraperReviews(data: unknown): GoogleReviewLite[] {
  return collectOutscraperRows(data)
    .slice(0, 10)
    .map((r) => ({
      author_name: String(r.author_title ?? r.reviewer_name ?? r.author_name ?? 'Google потребител').trim(),
      rating: Math.min(5, Math.max(1, Math.round(Number(r.review_rating ?? r.rating ?? r.stars ?? 5)))),
      text: String(r.review_text ?? r.text ?? '').trim(),
    }))
    .filter((r) => Number.isFinite(r.rating));
}

async function outscraperGet(url: string, apiKey: string): Promise<OutscraperPayload> {
  const res = await fetch(url, {
    headers: { 'X-API-KEY': apiKey },
    cache: 'no-store',
  });
  if (!res.ok) {
    console.warn('[outscraper] HTTP', res.status, await res.text().catch(() => ''));
    throw new Error('outscraper_api_error');
  }
  return (await res.json()) as OutscraperPayload;
}

async function fetchReviewsViaOutscraperQuery(
  queryValue: string,
): Promise<{ reviews: GoogleReviewLite[]; reason?: string; status?: string; hint?: string }> {
  const key = process.env.OUTSCRAPER_API_KEY?.trim();
  if (!key) return { reviews: [], reason: 'missing_outscraper_key' };

  const params = new URLSearchParams({
    query: queryValue,
    reviewsLimit: '10',
    language: 'bg',
    sort: 'newest',
  });

  try {
    const first = await outscraperGet(`https://api.app.outscraper.com/maps/reviews-v3?${params}`, key);
    const firstStatus = String(first.status ?? '').trim() || 'Success';
    const firstStatusLower = firstStatus.toLowerCase();
    const firstReviews = mapOutscraperReviews(first.data);
    let hint = '';
    if (Array.isArray(first.data) && first.data[0] && typeof first.data[0] === 'object') {
      const item = first.data[0] as Record<string, unknown>;
      const name = String(item.name ?? '').trim();
      const placeId = String(item.place_id ?? '').trim();
      const businessStatus = String(item.business_status ?? '').trim();
      const reviewsCount = Array.isArray(item.reviews_data) ? item.reviews_data.length : null;
      const parts = [
        name ? `обект: ${name}` : '',
        placeId ? `place_id: ${placeId}` : '',
        businessStatus ? `status: ${businessStatus}` : '',
        reviewsCount != null ? `reviews_data: ${reviewsCount}` : '',
      ].filter(Boolean);
      if (parts.length > 0) hint = parts.join(' | ');
    }

    if (firstReviews.length > 0) return { reviews: firstReviews, status: firstStatus, hint };
    if (firstStatusLower !== 'pending') return { reviews: [], reason: 'outscraper_empty', status: firstStatus, hint };

    const requestUrl =
      String(first.results_location ?? '').trim()
      || (first.id ? `https://api.app.outscraper.com/requests/${encodeURIComponent(first.id)}` : '');
    if (!requestUrl) return { reviews: [], reason: 'outscraper_pending', status: 'Pending', hint };

    for (let i = 0; i < 6; i++) {
      await delay(2000);
      const polled = await outscraperGet(requestUrl, key);
      const polledStatus = String(polled.status ?? '').trim() || 'Pending';
      const polledStatusLower = polledStatus.toLowerCase();
      const polledReviews = mapOutscraperReviews(polled.data);
      if (polledReviews.length > 0) return { reviews: polledReviews, status: polledStatus, hint };
      if (polledStatusLower === 'success') return { reviews: [], reason: 'outscraper_empty', status: polledStatus, hint };
    }
    return { reviews: [], reason: 'outscraper_pending', status: 'Pending', hint };
  } catch {
    return { reviews: [], reason: 'outscraper_api_error' };
  }
}

async function fetchReviewsViaOutscraper(
  placeId: string,
): Promise<{ reviews: GoogleReviewLite[]; reason?: string; status?: string; hint?: string }> {
  const id = placeId.trim();
  if (!id) return { reviews: [], reason: 'missing_place_id', status: '', hint: '' };

  const attempts = [`place_id:${id}`, id];
  let sawPending = false;
  let sawSuccessEmpty = false;
  let lastStatus = '';
  let lastHint = '';

  for (const queryValue of attempts) {
    const result = await fetchReviewsViaOutscraperQuery(queryValue);
    if (result.status) lastStatus = result.status;
    if (result.hint) lastHint = result.hint;
    if (result.reviews.length > 0) return { reviews: result.reviews, status: lastStatus, hint: lastHint };

    const status = String(result.status ?? '').trim().toLowerCase();
    if (status === 'success') sawSuccessEmpty = true;
    if (result.reason === 'outscraper_pending') sawPending = true;

    if (result.reason === 'missing_outscraper_key' || result.reason === 'outscraper_api_error') {
      return { reviews: [], reason: result.reason, status: lastStatus, hint: lastHint };
    }
  }

  if (sawSuccessEmpty) return { reviews: [], reason: 'outscraper_empty', status: lastStatus || 'Success', hint: lastHint };
  if (sawPending) return { reviews: [], reason: 'outscraper_pending', status: lastStatus || 'Pending', hint: lastHint };
  return { reviews: [], reason: 'outscraper_empty', status: lastStatus || 'Success', hint: lastHint };
}

export async function probeGoogleReviewsForPlace(placeId: string): Promise<GoogleReviewsProbe> {
  const id = placeId.trim();
  if (!id) return { reviews: [], source: 'none', reason: 'missing_place_id' };

  const result = await fetchReviewsViaOutscraper(id);
  if (result.reviews.length > 0) {
    return { reviews: result.reviews, source: 'outscraper', providerStatus: result.status, providerHint: result.hint };
  }
  return {
    reviews: [],
    source: 'none',
    reason: result.reason ?? 'outscraper_empty',
    providerStatus: result.status,
    providerHint: result.hint,
  };
}

/** Outscraper - requires OUTSCRAPER_API_KEY and valid place_id. */
export async function fetchGoogleReviewsForPlace(placeId: string): Promise<GoogleReviewLite[]> {
  const id = placeId.trim();
  if (!id) return [];

  const probe = await unstable_cache(
    () => probeGoogleReviewsForPlace(id),
    ['google-reviews-osc', id],
    { revalidate: 900 },
  )();

  if (probe.reviews.length > 0) return probe.reviews;
  const fresh = await probeGoogleReviewsForPlace(id);
  return fresh.reviews;
}

export function buildStaticMapUrl(lat: number, lng: number): string | null {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=640x240&scale=2&markers=color:0x5B21B6%7C${lat},${lng}&key=${encodeURIComponent(key)}`;
}

export async function searchGoogleBusinessesByName(
  query: string,
): Promise<{ results: GoogleBusinessSearchResult[]; reason?: string }> {
  const key = process.env.OUTSCRAPER_API_KEY?.trim();
  if (!key) return { results: [], reason: 'missing_outscraper_key' };

  const q = query.trim();
  if (!q) return { results: [], reason: 'empty_query' };

  const params = new URLSearchParams({
    query: q,
    limit: '6',
    async: 'false',
    language: 'bg',
  });

  try {
    const data = await outscraperGet(`https://api.app.outscraper.com/maps/search-v3?${params}`, key);
    const raw = Array.isArray(data.data) ? data.data : [];
    const rows: Record<string, unknown>[] = [];
    for (const item of raw) {
      if (!item) continue;
      if (Array.isArray(item)) {
        for (const nested of item) {
          if (nested && typeof nested === 'object') rows.push(nested as Record<string, unknown>);
        }
        continue;
      }
      if (typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const nestedCandidates = [row.results, row.businesses, row.places];
      const nestedArray = nestedCandidates.find((x) => Array.isArray(x));
      if (Array.isArray(nestedArray)) {
        for (const nested of nestedArray) {
          if (nested && typeof nested === 'object') rows.push(nested as Record<string, unknown>);
        }
        continue;
      }
      rows.push(row);
    }

    const mapped = rows
      .map((item) => {
        const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : null;
        if (!row) return null;
        const placeId = String(row.place_id ?? '').trim();
        if (!placeId) return null;
        return {
          placeId,
          name: String(row.name ?? '').trim() || 'Без име',
          address: String(row.full_address ?? row.address ?? '').trim(),
          mapsUrl: String(row.location_link ?? '').trim(),
          businessStatus: String(row.business_status ?? '').trim(),
        } satisfies GoogleBusinessSearchResult;
      })
      .filter((x): x is GoogleBusinessSearchResult => Boolean(x));

    const unique = new Map<string, GoogleBusinessSearchResult>();
    for (const item of mapped) {
      if (!unique.has(item.placeId)) unique.set(item.placeId, item);
    }
    const results = [...unique.values()];
    if (results.length === 0) return { results: [], reason: 'outscraper_empty' };
    return { results };
  } catch {
    return { results: [], reason: 'outscraper_api_error' };
  }
}
