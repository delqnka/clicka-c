/** Server-only: Google reviews (Outscraper) + static maps (Google Maps API). */

import { unstable_cache } from 'next/cache';

export type GoogleReviewLite = { author_name: string; rating: number; text: string };
export type GoogleReviewsProbe = {
  reviews: GoogleReviewLite[];
  source: 'outscraper' | 'none';
  reason?: string;
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

  const fromMapsUrl = extractGooglePlaceIdFromMapsUrl(options.mapsUrl);
  if (fromMapsUrl) return fromMapsUrl;

  return null;
}

async function fetchReviewsViaOutscraper(
  placeId: string,
): Promise<{ reviews: GoogleReviewLite[]; reason?: string }> {
  const key = process.env.OUTSCRAPER_API_KEY?.trim();
  if (!key) return { reviews: [], reason: 'missing_outscraper_key' };

  const params = new URLSearchParams({
    query: `place_id:${placeId}`,
    reviewsLimit: '10',
    language: 'bg',
    sort: 'newest',
  });

  try {
    const res = await fetch(
      `https://api.app.outscraper.com/maps/reviews-v3?${params}`,
      { headers: { 'X-API-KEY': key }, next: { revalidate: 900 } },
    );

    if (!res.ok) {
      console.warn('[outscraper] HTTP', res.status, await res.text().catch(() => ''));
      return { reviews: [], reason: 'outscraper_api_error' };
    }

    const data = (await res.json()) as {
      status?: string;
      data?: {
        author_title?: string;
        review_rating?: number;
        review_text?: string;
      }[][];
    };

    const raw = data.data?.[0];
    if (!Array.isArray(raw) || raw.length === 0) {
      return { reviews: [], reason: 'outscraper_empty' };
    }

    const reviews: GoogleReviewLite[] = raw
      .slice(0, 10)
      .map((r) => ({
        author_name: String(r.author_title ?? 'Google потребител').trim(),
        rating: Math.min(5, Math.max(1, Math.round(Number(r.review_rating ?? 5)))),
        text: String(r.review_text ?? '').trim(),
      }))
      .filter((r) => r.text);

    return { reviews };
  } catch (err) {
    console.warn('[outscraper] fetch error:', err);
    return { reviews: [], reason: 'outscraper_api_error' };
  }
}

export async function probeGoogleReviewsForPlace(
  placeId: string,
): Promise<GoogleReviewsProbe> {
  const id = placeId.trim();
  if (!id) return { reviews: [], source: 'none', reason: 'missing_place_id' };

  const result = await fetchReviewsViaOutscraper(id);
  if (result.reviews.length > 0) {
    return { reviews: result.reviews, source: 'outscraper' };
  }

  return {
    reviews: [],
    source: 'none',
    reason: result.reason ?? 'outscraper_empty',
  };
}

/** Outscraper — изисква OUTSCRAPER_API_KEY и валиден place_id. */
export async function fetchGoogleReviewsForPlace(
  placeId: string,
): Promise<GoogleReviewLite[]> {
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
