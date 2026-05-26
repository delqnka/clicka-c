/** Server-only: Google reviews (OpenRouter) + static maps (Google Maps API). */

import { unstable_cache } from 'next/cache';
import {
  fetchGoogleReviewsViaOpenRouter,
  type GoogleReviewLite,
} from '@/lib/google-reviews-openrouter';
import { getOpenRouterApiKey } from '@/lib/openrouter';

export type { GoogleReviewLite };

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

async function fetchGoogleReviewsForPlaceUncached(placeId: string): Promise<GoogleReviewLite[]> {
  const id = placeId.trim();
  if (!id) return [];

  if (getOpenRouterApiKey()) {
    const fromOpenRouter = await fetchGoogleReviewsViaOpenRouter(id);
    if (fromOpenRouter.length > 0) return fromOpenRouter;
  }

  return fetchGoogleReviewsFromMapsApi(id);
}

/**
 * 1) OpenRouter (perplexity/sonar) — основен път, изисква OPENROUTER_API_KEY
 * 2) Google Places API — резервен, ако има GOOGLE_MAPS_SERVER_KEY
 */
export async function fetchGoogleReviewsForPlace(placeId: string): Promise<GoogleReviewLite[]> {
  const id = placeId.trim();
  if (!id) return [];

  return unstable_cache(
    () => fetchGoogleReviewsForPlaceUncached(id),
    ['google-reviews', id],
    { revalidate: 3600 },
  )();
}

export function buildStaticMapUrl(lat: number, lng: number): string | null {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=640x240&scale=2&markers=color:0x5B21B6%7C${lat},${lng}&key=${encodeURIComponent(key)}`;
}
