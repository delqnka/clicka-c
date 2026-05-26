import {
  extractJsonArrayFromModelText,
  getOpenRouterApiKey,
  openRouterChatCompletion,
} from '@/lib/openrouter';

export type GoogleReviewLite = { author_name: string; rating: number; text: string };

/** Модел с уеб достъп (Perplexity Sonar през OpenRouter). */
const DEFAULT_REVIEWS_MODEL = 'perplexity/sonar';

const SYSTEM_PROMPT = `Ти извличаш публични отзиви от Google Maps за бизнес.
Върни САМО валиден JSON масив без markdown и без пояснения.
Формат: [{ "author_name": string, "rating": number, "text": string }]
- rating: цяло число от 1 до 5
- text: текста на отзива (ако липсва, използвай кратко резюме от звездите)
- author_name: име на автора или "Google потребител"
Максимум 10 най-нови отзива. Ако няма отзиви, върни [].`;

function reviewsModel(): string {
  return process.env.OPENROUTER_REVIEWS_MODEL?.trim() || DEFAULT_REVIEWS_MODEL;
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

export async function fetchGoogleReviewsViaOpenRouter(placeId: string): Promise<GoogleReviewLite[]> {
  const id = placeId.trim();
  if (!id || !getOpenRouterApiKey()) return [];

  const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(id)}`;

  const result = await openRouterChatCompletion({
    model: reviewsModel(),
    temperature: 0.1,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Извлечи публичните Google Maps отзиви за този бизнес.

Google Place ID: ${id}
Директен линк: ${mapsUrl}

Върни САМО JSON масив с най-новите отзиви (до 10).`,
      },
    ],
  });

  if (!result.ok) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[google-reviews-openrouter]', result.status, result.details);
    }
    return [];
  }

  const parsed = extractJsonArrayFromModelText(result.content);
  if (!parsed) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[google-reviews-openrouter] Could not parse model output:', result.content.slice(0, 500));
    }
    return [];
  }

  return normalizeReviews(parsed);
}
