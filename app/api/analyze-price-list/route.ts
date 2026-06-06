import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const VISION_MODEL = 'anthropic/claude-3.5-sonnet';

const SYSTEM_PROMPT = `Ти си асистент, който извлича информация за услуги и цени от снимки на ценоразписи на салони за красота.
Върни САМО валиден JSON масив без никакъв допълнителен текст, обяснения или markdown.
Форматът трябва да е точно: [{ "name": string, "price": number, "duration_min": number, "category": string }]

КРИТИЧНО ВАЖНО: Извлечи АБСОЛЮТНО ВСИЧКИ услуги от снимката — нито една не трябва да бъде пропусната. Преброй редовете на снимката и се увери, че JSON масивът съдържа точно толкова елементи.
НЕ дедублирай! "Дамско подстригване", "Мъжко подстригване" и "Детско подстригване" са три РАЗЛИЧНИ услуги и трябва да се появят като три отделни записа в JSON-а, дори ако изглеждат сходни.

За всяка услуга задължително попълни "category":
- Ако на ценоразписа има заглавия/секции (напр. "Маникюр", "Коса", "Боядисване", "Педикюр"), използвай името на секцията за всички услуги под нея, докато не се появи нова секция.
- Ако няма видими секции, предложи кратка българска категория (1–3 думи) по смисъла на услугата. Подобни услуги — еднаква категория.
- Не оставяй празни category.
Ако продължителността не е посочена, прецени я спрямо вида услуга (напр. подстригване 30 мин, боядисване 90 мин, маникюр 45 мин).
Цените да са числа в евро (EUR), без символ за валута. Ако на ценоразписа са в лева (лв./BGN), преобразувай в евро (раздели на 1.95583) и закръгли до цяло число, освен ако е посочена дробна част.
Ако има диапазон, вземи средната стойност.`;

function buildUserPrompt(hints: string[], salonCategory: string) {
  const hintBlock =
    hints.length > 0
      ? `\nПредпочитани категории (използвай същите имена, когато подхождат): ${hints.join(', ')}.`
      : '';
  const salonBlock = salonCategory
    ? `\nТип на салона: ${salonCategory} — ползвай го само ако няма по-точна секция на ценоразписа.`
    : '';
  return `Анализирай тази снимка на ценоразпис и извлечи всички услуги с цени, продължителност и категория.
Върни САМО JSON масив: [{ "name": "Услуга", "price": 25, "duration_min": 30, "category": "Маникюр" }] — price винаги в EUR.${hintBlock}${salonBlock}
Без обяснения, без markdown, само JSON.`;
}

function originFromRequest(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit('analyze-price-list', ip, 5, 60 * 60 * 1000);
  if (rl.limited) return NextResponse.json({ error: 'Твърде много заявки. Опитай след час.' }, { status: 429 });

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: 'Липсва OPENROUTER_API_KEY (настрой env променливата).' },
      { status: 500 }
    );
  }

  let body: {
    imageBase64?: string;
    imageUrl?: string;
    categoryHints?: string[];
    salonCategory?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни' }, { status: 400 });
  }

  const { imageBase64, imageUrl } = body;
  const categoryHints = Array.isArray(body.categoryHints)
    ? body.categoryHints.map((h) => String(h).trim()).filter(Boolean).slice(0, 24)
    : [];
  const salonCategory = String(body.salonCategory ?? '').trim();
  const userPrompt = buildUserPrompt(categoryHints, salonCategory);

  if (!imageBase64 && !imageUrl) {
    return NextResponse.json(
      { error: 'Необходима е снимка (imageBase64 или imageUrl)' },
      { status: 400 }
    );
  }

  // Make sure OpenRouter receives a resolvable image.
  // If we get a relative URL (e.g. `/api/image?...`) we fetch it server-side and pass as base64.
  let finalDataUrl: string | null = null;

  if (imageBase64) {
    finalDataUrl = `data:image/jpeg;base64,${imageBase64}`;
  } else if (imageUrl) {
    try {
      const absoluteUrl = imageUrl.startsWith('/')
        ? `${originFromRequest(request)}${imageUrl}`
        : imageUrl;

      const imgRes = await fetch(absoluteUrl, { cache: 'no-store' });
      if (!imgRes.ok) {
        return NextResponse.json(
          {
            error: 'Не успяхме да заредим снимката за анализ',
            status: imgRes.status,
          },
          { status: 422 }
        );
      }

      const mime = imgRes.headers.get('content-type') || 'image/jpeg';
      const bytes = await imgRes.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');
      finalDataUrl = `data:${mime};base64,${base64}`;
    } catch (e: unknown) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Грешка при зареждане на снимката' },
        { status: 422 }
      );
    }
  }

  if (!finalDataUrl) {
    return NextResponse.json({ error: 'Неуспешна подготовка на снимката' }, { status: 422 });
  }

  const imageContent = {
    type: 'image_url' as const,
    image_url: { url: finalDataUrl },
  };

  const payload = {
    model: VISION_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [{ type: 'text', text: userPrompt }, imageContent],
      },
    ],
    temperature: 0.1,
  };

  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      // OpenRouter recommends these headers (helpful for debugging/quotas).
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      'X-Title': 'Clicka.bg',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return NextResponse.json(
      {
        error: 'Грешка при анализ на ценоразписа',
        status: response.status,
        details: text.slice(0, 2000),
      },
      { status: 502 }
    );
  }

  const data = await response.json();
  const raw: string = data.choices?.[0]?.message?.content ?? '';

  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return NextResponse.json(
      { error: 'Не успяхме да разчетем ценоразписа' },
      { status: 422 }
    );
  }

  let services: { name: string; price: number; duration_min: number; category?: string }[];
  try {
    services = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json(
      { error: 'Не успяхме да разчетем ценоразписа' },
      { status: 422 }
    );
  }

  return NextResponse.json(services);
}
