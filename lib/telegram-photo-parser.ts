import {
  getOpenRouterApiKey,
  OPENROUTER_BASE,
  openRouterHeaders,
} from '@/lib/openrouter';

const VISION_MODEL = 'google/gemini-2.5-flash-preview';

const SYSTEM_PROMPT = `You are an OCR assistant that extracts booking appointments from screenshots of salon booking apps (Fresha, Studio24, Booksy, etc).

Extract ALL visible appointments/bookings from the screenshot. For each one, return:
- date: in YYYY-MM-DD format
- start: start time in HH:mm format
- end: end time in HH:mm format

If only a start time and duration are visible (no explicit end time), calculate the end time from duration.
If the year is not visible, assume the current year (2026).
If you see a date like "Mon 2 Jun" or "Пон 2 Юни", convert it to YYYY-MM-DD.

Return ONLY a valid JSON array. No markdown, no explanation. Example:
[{"date":"2026-06-02","start":"10:00","end":"11:00"},{"date":"2026-06-02","start":"14:30","end":"15:30"}]

If you cannot read any bookings, return [].`;

export type ParsedPhotoBooking = {
  date: string;
  start: string;
  end: string;
};

export async function parseBookingsFromPhoto(
  imageUrl: string,
): Promise<ParsedPhotoBooking[]> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) return [];

  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: openRouterHeaders(),
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: 'Extract all bookings from this screenshot.' },
          ],
        },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) return [];

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content ?? '';

  return extractBookingsArray(content);
}

function extractBookingsArray(raw: string): ParsedPhotoBooking[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  let arr: unknown[];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) arr = parsed;
    else return [];
  } catch {
    const match = trimmed.match(/\[[\s\S]*\]/);
    if (!match) return [];
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) arr = parsed;
      else return [];
    } catch {
      return [];
    }
  }

  const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const results: ParsedPhotoBooking[] = [];

  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const date = String(row.date ?? '').trim();
    const start = String(row.start ?? '').trim();
    const end = String(row.end ?? '').trim();
    if (!dateRe.test(date) || !timeRe.test(start) || !timeRe.test(end)) continue;
    results.push({ date, start, end });
  }

  return results;
}
