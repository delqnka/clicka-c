import {
  extractJsonArrayFromModelText,
  getOpenRouterApiKey,
  openRouterChatCompletion,
} from '@/lib/openrouter';

export type GoogleReviewLite = { author_name: string; rating: number; text: string };

export type OpenRouterReviewsResult = {
  reviews: GoogleReviewLite[];
  reason?: 'missing_openrouter_key' | 'openrouter_api_error' | 'openrouter_parse_error' | 'openrouter_empty';
};

/** Google Gemini модел през OpenRouter (fallback ако Places API не е наличен). */
const DEFAULT_REVIEWS_MODEL = 'google/gemini-2.5-flash-preview';

const SYSTEM_PROMPT = `You extract public Google Maps reviews for a business.
Return ONLY a valid JSON array starting with [ and ending with ]. No markdown, no explanation.
Format: [{ "author_name": string, "rating": number, "text": string }]
- rating: integer 1-5
- text: the review text (original language)
- author_name: reviewer name or "Google потребител"
Return up to 10 most recent reviews. If no reviews found, return [].`;

function reviewsModel(): string {
  return process.env.OPENROUTER_REVIEWS_MODEL?.trim() || DEFAULT_REVIEWS_MODEL;
}

function extractReviewsArray(raw: string): unknown[] | null {
  const fromArray = extractJsonArrayFromModelText(raw);
  if (fromArray) return fromArray;

  const trimmed = raw.trim();
  const tryObject = (value: unknown): unknown[] | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const row = value as Record<string, unknown>;
    for (const key of ['reviews', 'data', 'items', 'results']) {
      if (Array.isArray(row[key])) return row[key];
    }
    return null;
  };

  try {
    const direct = JSON.parse(trimmed) as unknown;
    const nested = tryObject(direct);
    if (nested) return nested;
  } catch {
    // continue
  }

  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      const nested = tryObject(JSON.parse(objectMatch[0]) as unknown);
      if (nested) return nested;
    } catch {
      // continue
    }
  }

  return null;
}

function normalizeReviews(parsed: unknown): GoogleReviewLite[] {
  if (!Array.isArray(parsed)) return [];

  const out: GoogleReviewLite[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const author_name = String(row.author_name ?? row.author ?? row.name ?? '').trim();
    const text = String(row.text ?? row.review ?? row.comment ?? '').trim();
    const ratingRaw = Number(row.rating ?? row.stars ?? 0);
    const rating = Number.isFinite(ratingRaw)
      ? Math.min(5, Math.max(1, Math.round(ratingRaw)))
      : 5;

    if (!text && !author_name) continue;

    out.push({
      author_name: author_name || 'Google потребител',
      rating,
      text: text || '—',
    });
    if (out.length >= 10) break;
  }
  return out;
}

async function fetchOnce(
  placeId: string,
  temperature: number,
  businessContext?: { name?: string; city?: string },
): Promise<OpenRouterReviewsResult> {
  const id = placeId.trim();
  if (!id) return { reviews: [], reason: 'openrouter_empty' };
  if (!getOpenRouterApiKey()) return { reviews: [], reason: 'missing_openrouter_key' };

  const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(id)}`;

  const nameLine = businessContext?.name
    ? `\nИме на бизнеса: ${businessContext.name}${businessContext.city ? `, ${businessContext.city}` : ''}`
    : '';

  const result = await openRouterChatCompletion({
    model: reviewsModel(),
    temperature,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Search Google Maps and find the public reviews for this business.${nameLine}

Google Place ID: ${id}
Google Maps URL: ${mapsUrl}

Please search the web for Google Maps reviews of this business and return ONLY a JSON array with up to 10 reviews.`,
      },
    ],
  });

  if (!result.ok) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[google-reviews-openrouter]', result.status, result.details);
    }
    return { reviews: [], reason: 'openrouter_api_error' };
  }

  const parsed = extractReviewsArray(result.content);
  if (!parsed) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[google-reviews-openrouter] Could not parse model output:', result.content.slice(0, 500));
    }
    return { reviews: [], reason: 'openrouter_parse_error' };
  }

  const reviews = normalizeReviews(parsed);
  if (reviews.length === 0) return { reviews: [], reason: 'openrouter_empty' };
  return { reviews };
}

export async function fetchGoogleReviewsViaOpenRouter(
  placeId: string,
  businessContext?: { name?: string; city?: string },
): Promise<OpenRouterReviewsResult> {
  const first = await fetchOnce(placeId, 0.1, businessContext);
  if (first.reviews.length > 0) return first;
  if (first.reason === 'missing_openrouter_key' || first.reason === 'openrouter_api_error') {
    return first;
  }

  const second = await fetchOnce(placeId, 0.25, businessContext);
  return second.reviews.length > 0 ? second : second.reason ? second : first;
}
