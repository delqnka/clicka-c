/** Server-only: Google reviews (OpenRouter) + static maps (Google Maps API). */

import { unstable_cache } from 'next/cache';
import {
  fetchGoogleReviewsViaOpenRouter,
  type GoogleReviewLite,
} from '@/lib/google-reviews-openrouter';
import { getOpenRouterApiKey } from '@/lib/openrouter';

export type { GoogleReviewLite };
export type GoogleReviewsProbe = {
  reviews: GoogleReviewLite[];
  source: 'openrouter' | 'none';
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

export async function probeGoogleReviewsForPlace(
  placeId: string,
  businessContext?: { name?: string; city?: string },
): Promise<GoogleReviewsProbe> {
  const id = placeId.trim();
  if (!id) return { reviews: [], source: 'none', reason: 'missing_place_id' };

  if (!getOpenRouterApiKey()) {
    return { reviews: [], source: 'none', reason: 'missing_openrouter_key' };
  }

  const result = await fetchGoogleReviewsViaOpenRouter(id, businessContext);
  if (result.reviews.length > 0) {
    return { reviews: result.reviews, source: 'openrouter' };
  }

  return {
    reviews: [],
    source: 'none',
    reason: result.reason ?? 'openrouter_empty',
  };
}

/** OpenRouter (Perplexity Sonar) — изисква OPENROUTER_API_KEY и валиден place_id. */
export async function fetchGoogleReviewsForPlace(
  placeId: string,
  businessContext?: { name?: string; city?: string },
): Promise<GoogleReviewLite[]> {
  const id = placeId.trim();
  if (!id) return [];

  const probe = await unstable_cache(
    () => probeGoogleReviewsForPlace(id, businessContext),
    ['google-reviews-or', id],
    { revalidate: 900 },
  )();

  if (probe.reviews.length > 0) return probe.reviews;

  const fresh = await probeGoogleReviewsForPlace(id, businessContext);
  return fresh.reviews;
}

export function buildStaticMapUrl(lat: number, lng: number): string | null {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=640x240&scale=2&markers=color:0x5B21B6%7C${lat},${lng}&key=${encodeURIComponent(key)}`;
}
