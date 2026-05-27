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
  source: 'openrouter' | 'google_maps' | 'none';
  reason?: string;
};

async function fetchGoogleReviewsFromMapsApi(placeId: string): Promise<GoogleReviewLite[]> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) return [];

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId.trim())}&fields=reviews&reviews_sort=newest&key=${encodeURIComponent(key)}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      result?: { reviews?: { author_name?: string; rating?: number; text?: string }[] };
    };
    const rev = data.result?.reviews;
    if (!Array.isArray(rev)) return [];
    return rev.map((r) => ({
      author_name: String(r.author_name ?? ''),
      rating: Number(r.rating) || 0,
      text: String(r.text ?? ''),
    }));
  } catch {
    return [];
  }
}

export async function probeGoogleReviewsForPlace(placeId: string): Promise<GoogleReviewsProbe> {
  const id = placeId.trim();
  if (!id) return { reviews: [], source: 'none', reason: 'missing_place_id' };

  if (getOpenRouterApiKey()) {
    const fromOpenRouter = await fetchGoogleReviewsViaOpenRouter(id);
    if (fromOpenRouter.length > 0) return { reviews: fromOpenRouter, source: 'openrouter' };
  }

  const hasMapsKey = Boolean(process.env.GOOGLE_MAPS_SERVER_KEY?.trim());
  if (hasMapsKey) {
    const fromMaps = await fetchGoogleReviewsFromMapsApi(id);
    if (fromMaps.length > 0) return { reviews: fromMaps, source: 'google_maps' };
  }

  if (!getOpenRouterApiKey() && !hasMapsKey) {
    return { reviews: [], source: 'none', reason: 'missing_openrouter_and_maps_keys' };
  }

  return { reviews: [], source: 'none', reason: 'no_reviews_or_invalid_place_id' };
}

/**
 * 1) OpenRouter (perplexity/sonar) — основен път, изисква OPENROUTER_API_KEY
 * 2) Google Places API — резервен, ако има GOOGLE_MAPS_SERVER_KEY
 */
export async function fetchGoogleReviewsForPlace(placeId: string): Promise<GoogleReviewLite[]> {
  const id = placeId.trim();
  if (!id) return [];

  return unstable_cache(
    async () => (await probeGoogleReviewsForPlace(id)).reviews,
    ['google-reviews', id],
    { revalidate: 3600 },
  )();
}

export function buildStaticMapUrl(lat: number, lng: number): string | null {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=640x240&scale=2&markers=color:0x5B21B6%7C${lat},${lng}&key=${encodeURIComponent(key)}`;
}
