import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `Ти си асистент на Clicka.bg — платформа за онлайн записване за салони за красота в България.

Помагаш на потенциални клиенти (собственици на салони) да разберат продукта и да се регистрират.

КАКВО Е CLICKA:
- Платформа за онлайн записване за салони, фризьори, козметици, маникюристи, барбъри и др.
- Клиентите на салона резервират час онлайн 24/7 без телефонно обаждане
- Собственикът управлява записванията, персонала и работното време от телефона
- Автоматични напомняния за клиентите (намалява отменените часове)
- Собствена страница на салона с линк за споделяне

ЦЕНИ:
- Безплатен период: 30 дни
- След това: достъпна месечна такса (насочвай към регистрация за точни цени)

ФУНКЦИИ:
- Онлайн записване 24/7
- Управление на персонал и услуги
- Собствена публична страница на салона
- Автоматични SMS/имейл напомняния
- Статистики и отчети
- Работи на телефон, таблет и компютър

ПРАВИЛА:
- Отговаряй само на въпроси свързани с Clicka и онлайн записване за салони
- Бъди кратък и приятелски
- Насочвай към регистрация на clicka.bg
- Ако не знаеш нещо конкретно, кажи че могат да се свържат на hello@clicka.bg
- Отговаряй на български`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://clicka.bg',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-lite-001',
        max_tokens: 400,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.slice(-10),
        ],
      }),
    });

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? 'Нещо се обърка.';
    return NextResponse.json({ message: text });
  } catch {
    return NextResponse.json({ error: 'Грешка при свързване' }, { status: 500 });
  }
}
