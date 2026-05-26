export const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

export function getOpenRouterApiKey(): string | undefined {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  return key || undefined;
}

export function openRouterHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${getOpenRouterApiKey()}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://clicka.bg',
    'X-Title': 'Clicka.bg',
  };
}

export type OpenRouterChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'user'; content: unknown[] };

export async function openRouterChatCompletion(options: {
  model: string;
  messages: OpenRouterChatMessage[];
  temperature?: number;
}): Promise<{ ok: true; content: string } | { ok: false; status: number; details: string }> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return { ok: false, status: 500, details: 'Missing OPENROUTER_API_KEY' };
  }

  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: openRouterHeaders(),
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.1,
    }),
  });

  if (!response.ok) {
    const details = (await response.text().catch(() => '')).slice(0, 2000);
    return { ok: false, status: response.status, details };
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content ?? '';
  return { ok: true, content };
}

export function extractJsonArrayFromModelText(raw: string): unknown[] | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const direct = JSON.parse(trimmed) as unknown;
    if (Array.isArray(direct)) return direct;
  } catch {
    // continue
  }

  const match = trimmed.match(/\[[\s\S]*\]/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]) as unknown;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
