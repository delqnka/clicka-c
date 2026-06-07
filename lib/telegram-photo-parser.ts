import {
  getOpenRouterApiKey,
  OPENROUTER_BASE,
  openRouterHeaders,
} from '@/lib/openrouter';

const VISION_MODEL = 'google/gemini-2.5-flash-preview';

function buildSystemPrompt(): string {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const weekdayBg = today.toLocaleDateString('bg-BG', { weekday: 'long' });

  return `You are an OCR/handwriting assistant that extracts salon appointments from images. The image can be EITHER:
(a) a screenshot of a booking app (Fresha, Studio24, Booksy, etc), OR
(b) a photo of a handwritten note / page in a notebook / sticky note listing appointments (often in Bulgarian, Cyrillic handwriting).

Today's date is ${todayStr} (${weekdayBg}). Use it to resolve ANY relative or partial date references, including:
- relative words: "днес" (today), "утре" (tomorrow), "вдругиден" (day after tomorrow)
- weekday names: "понеделник", "вторник", "сряда", "четвъртък", "петък", "събота", "неделя" (the NEXT occurrence of that weekday from today, including today if it matches)
- partial dates like "10.06" or "10/06" → DD.MM, assume current year ${today.getFullYear()} (or next year if that date has already passed relative to today)
- dates like "Mon 2 Jun" or "Пон 2 Юни" → convert using the same logic

Extract ALL visible appointments/bookings from the image. For each one, return:
- date: in YYYY-MM-DD format (resolved to an absolute date as described above)
- start: start time in HH:mm format
- end: end time in HH:mm format
- note: optional short string with any extra legible context (e.g. client name, service) — omit if nothing legible

If only a start time and a duration (e.g. "45 мин") are visible, calculate the end time from the duration. If neither duration nor end time is visible, assume a 1-hour appointment.
Do your best with messy handwriting — a partial/uncertain read is better than skipping an entry, as long as you can identify a date and a start time.

Return ONLY a valid JSON array. No markdown, no explanation. Example:
[{"date":"2026-06-02","start":"10:00","end":"11:00","note":"Светлана — подстригване"},{"date":"2026-06-02","start":"14:30","end":"15:30"}]

If you genuinely cannot read any appointments at all, return [].`;
}

export type ParsedPhotoBooking = {
  date: string;
  start: string;
  end: string;
  note?: string;
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
        { role: 'system', content: buildSystemPrompt() },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: 'Extract all appointments from this image (screenshot or handwritten note).' },
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
    const noteRaw = row.note;
    const note = typeof noteRaw === 'string' && noteRaw.trim() ? noteRaw.trim().slice(0, 200) : undefined;
    results.push(note ? { date, start, end, note } : { date, start, end });
  }

  return results;
}
