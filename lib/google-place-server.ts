/** Само за server (Route Handler / RSC). Изисква GOOGLE_MAPS_SERVER_KEY в .env */

export type GoogleReviewLite = { author_name: string; rating: number; text: string };

export async function fetchGoogleReviewsForPlace(placeId: string): Promise<GoogleReviewLite[]> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key || !placeId.trim()) return [];
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

export function buildStaticMapUrl(lat: number, lng: number): string | null {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=640x240&scale=2&markers=color:0x5B21B6%7C${lat},${lng}&key=${encodeURIComponent(key)}`;
}
