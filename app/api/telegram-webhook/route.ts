import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { sql } from '@/lib/db';
import { sendTelegramMessage, getTelegramFilePath, getTelegramFileUrl } from '@/lib/telegram';
import {
  parseBlockFromMessage,
  parsedBlockToBookingBlock,
  formatBlockConfirmation,
} from '@/lib/telegram-block-parser';
import { normalizeBookingBlocks, type BookingBlock } from '@/lib/booking-blocks';
import { parseBookingsFromPhoto } from '@/lib/telegram-photo-parser';
import {
  handleAdminCommand,
  handlePriceListPhoto,
  isPriceListPhoto,
} from '@/lib/telegram-admin-commands';

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? '';

type TelegramUpdate = {
  message?: {
    chat: { id: number };
    from?: { first_name?: string };
    text?: string;
    caption?: string;
    photo?: { file_id: string; width: number; height: number }[];
    forward_date?: number;
    forward_from?: { first_name?: string };
    forward_sender_name?: string;
  };
};

async function findSalonByChatId(chatId: number): Promise<{ salonId: string; slug: string; name: string } | null> {
  const rows = await sql`
    SELECT CAST(id AS text) AS salon_id, slug, name
    FROM salons
    WHERE telegram_chat_id = ${String(chatId)}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const row = rows[0] as { salon_id: string; slug: string; name: string };
  return { salonId: row.salon_id, slug: row.slug, name: row.name };
}

async function addBookingBlock(salonId: string, slug: string, block: BookingBlock): Promise<void> {
  const currentRows = await sql`
    SELECT opening_hours
    FROM salons
    WHERE CAST(id AS text) = ${salonId}
    LIMIT 1
  `;
  const currentOpeningHours =
    currentRows[0]?.opening_hours && typeof currentRows[0].opening_hours === 'object'
      ? (currentRows[0].opening_hours as Record<string, unknown>)
      : {};

  const existing = normalizeBookingBlocks(currentOpeningHours.booking_blocks);
  existing.push(block);
  const updated = normalizeBookingBlocks(existing);

  const nextOpeningHours = { ...currentOpeningHours, booking_blocks: updated };

  await sql`
    UPDATE salons
    SET opening_hours = ${JSON.stringify(nextOpeningHours)}::jsonb, updated_at = now()
    WHERE CAST(id AS text) = ${salonId}
  `;
}

async function handleBlockMessage(chatId: number, text: string): Promise<void> {
  const salon = await findSalonByChatId(chatId);
  if (!salon) {
    await sendTelegramMessage(chatId, 'Първо свържи Telegram с Clicka салона си чрез /start КОД.');
    return;
  }

  const parsed = parseBlockFromMessage(text);
  if (!parsed) {
    await sendTelegramMessage(
      chatId,
      '❌ Не успях да разчета часа. Пробвай напр.:\n<b>зает 14:00-16:00 утре</b>\n\nИли forward-ни съобщението от Fresha/Studio24.',
    );
    return;
  }

  const block = parsedBlockToBookingBlock(parsed);
  await addBookingBlock(salon.salonId, salon.slug, block);
  revalidateTag(`salon-public-${salon.slug}`);
  await sendTelegramMessage(chatId, formatBlockConfirmation(parsed));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (WEBHOOK_SECRET) {
    const incoming = request.headers.get('x-telegram-bot-api-secret-token') ?? '';
    if (incoming !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = update.message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const text = (message.text ?? '').trim();
  const firstName = message.from?.first_name ?? '';

  // Handle /start command
  if (text.startsWith('/start')) {
    const parts = text.split(/\s+/);
    const code = parts[1]?.trim().toUpperCase() ?? '';

    if (!code) {
      await sendTelegramMessage(
        chatId,
        'Изпрати <b>/start КОД</b>, за да свържеш акаунта си.\n\nКода намираш в раздел Известия в Clicka.',
      );
      return NextResponse.json({ ok: true });
    }

    const salons = await sql`
      SELECT CAST(id AS text) AS salon_id, name, slug
      FROM salons
      WHERE upper(onboarding_code) = ${code}
      LIMIT 1
    `;

    if (salons.length === 0) {
      await sendTelegramMessage(
        chatId,
        `Кодът <b>${code}</b> не е намерен. Провери в Настройки → Известия и пробвай отново.`,
      );
      return NextResponse.json({ ok: true });
    }

    const salon = salons[0] as Record<string, unknown>;

    await sql`
      UPDATE salons
      SET telegram_chat_id = ${String(chatId)}
      WHERE CAST(id AS text) = ${String(salon.salon_id ?? '')}
    `;

    await sendTelegramMessage(
      chatId,
      `✅ <b>${String(salon.name ?? '')}</b> е свързан успешно${firstName ? `, ${firstName}` : ''}!\n\nОтсега насетне ще получаваш известия за нови резервации тук.\n\n💡 <b>Ново:</b> Можеш да forward-ваш съобщения от Fresha/Studio24 тук и часовете ще се блокират автоматично.`,
    );
    return NextResponse.json({ ok: true });
  }

  // Handle /help
  if (text === '/help') {
    await sendTelegramMessage(
      chatId,
      [
        '<b>Какво мога да правя:</b>',
        '',
        '📌 <b>Блокирай час</b>',
        '<code>зает 14:00-16:00 утре</code>',
        '<code>зает 9:00-10:00 понеделник</code>',
        '',
        '😴 <b>Почивен ден</b>',
        '<code>утре почивам</code>',
        '<code>събота почивам</code>',
        '',
        '⏰ <b>Работно време</b>',
        '<code>работя до 19:00 тази седмица</code>',
        '',
        '✂️ <b>Услуги</b>',
        '<code>добави услуга: Ламиниране — 45 мин — 60 лв</code>',
        '<code>промени цената на Маникюр на 35 лв</code>',
        '',
        '📸 <b>Ценоразпис (снимка)</b> — изпрати снимка с надпис <i>ценоразпис</i> и услугите влизат сами.',
        '',
        '📊 <b>Справки</b>',
        '<code>колко записа имам за утре</code>',
        '<code>следващият ми клиент</code>',
        '<code>приходът ми тази седмица</code>',
        '',
        '📩 <b>Forward от Fresha/Studio24</b> — forward-ни нотификацията и часът се блокира.',
      ].join('\n'),
    );
    return NextResponse.json({ ok: true });
  }

  // Handle /unblock
  if (text.startsWith('/unblock') || text.startsWith('/деблокирай')) {
    const salon = await findSalonByChatId(chatId);
    if (!salon) {
      await sendTelegramMessage(chatId, 'Първо свържи Telegram с Clicka салона си чрез /start КОД.');
      return NextResponse.json({ ok: true });
    }

    const parsed = parseBlockFromMessage(text.replace(/^\/(unblock|деблокирай)\s*/i, ''));
    if (!parsed) {
      await sendTelegramMessage(chatId, '❌ Напиши напр.: <b>/unblock 14:00 утре</b>');
      return NextResponse.json({ ok: true });
    }

    const currentRows = await sql`
      SELECT opening_hours FROM salons WHERE CAST(id AS text) = ${salon.salonId} LIMIT 1
    `;
    const currentOpeningHours =
      currentRows[0]?.opening_hours && typeof currentRows[0].opening_hours === 'object'
        ? (currentRows[0].opening_hours as Record<string, unknown>)
        : {};

    const blocks = normalizeBookingBlocks(currentOpeningHours.booking_blocks);
    const before = blocks.length;
    const filtered = blocks.filter(
      (b) => !(b.date === parsed.date && b.start === parsed.start),
    );

    if (filtered.length === before) {
      await sendTelegramMessage(chatId, '❌ Не намерих блокиран час за тази дата и час.');
      return NextResponse.json({ ok: true });
    }

    const nextOpeningHours = { ...currentOpeningHours, booking_blocks: filtered };
    await sql`
      UPDATE salons
      SET opening_hours = ${JSON.stringify(nextOpeningHours)}::jsonb, updated_at = now()
      WHERE CAST(id AS text) = ${salon.salonId}
    `;

    revalidateTag(`salon-public-${salon.slug}`);

    const d = new Date(`${parsed.date}T12:00:00`);
    const dateStr = d.toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' });
    await sendTelegramMessage(chatId, `🔓 Деблокиран: ${dateStr}, ${parsed.start}`);
    return NextResponse.json({ ok: true });
  }

  // Handle photo
  if (message.photo && message.photo.length > 0) {
    const salon = await findSalonByChatId(chatId);
    if (!salon) {
      await sendTelegramMessage(chatId, 'Първо свържи Telegram с Clicka салона си чрез /start КОД.');
      return NextResponse.json({ ok: true });
    }

    const largest = message.photo[message.photo.length - 1];
    const filePath = await getTelegramFilePath(largest.file_id);
    if (!filePath) {
      await sendTelegramMessage(chatId, '❌ Не успях да изтегля снимката. Пробвай отново.');
      return NextResponse.json({ ok: true });
    }

    const imageUrl = getTelegramFileUrl(filePath);
    const caption = (message.caption ?? '').trim();

    // Price list photo — add services
    if (isPriceListPhoto(caption)) {
      await handlePriceListPhoto(chatId, imageUrl, salon);
      return NextResponse.json({ ok: true });
    }

    // Booking screenshot — block time slots
    await sendTelegramMessage(chatId, '🔍 Анализирам снимката...');

    const bookings = await parseBookingsFromPhoto(imageUrl);
    if (bookings.length === 0) {
      await sendTelegramMessage(
        chatId,
        '❌ Не открих резервации в снимката. Увери се, че часовете и датите се виждат ясно.\n\n💡 За да добавиш услуги от ценоразпис, изпрати снимката с надпис <i>ценоразпис</i>.',
      );
      return NextResponse.json({ ok: true });
    }

    let blockedCount = 0;
    for (const b of bookings) {
      const block: BookingBlock = {
        date: b.date,
        allDay: false,
        start: b.start,
        end: b.end,
        note: 'От снимка (Fresha/друго приложение)',
      };
      await addBookingBlock(salon.salonId, salon.slug, block);
      blockedCount++;
    }

    revalidateTag(`salon-public-${salon.slug}`);

    const lines = [`🔒 <b>Блокирани ${blockedCount} часа от снимката:</b>`, ''];
    for (const b of bookings) {
      const d = new Date(`${b.date}T12:00:00`);
      const dateStr = d.toLocaleDateString('bg-BG', { weekday: 'short', day: 'numeric', month: 'long' });
      lines.push(`📅 ${dateStr} — ${b.start} – ${b.end}`);
    }
    lines.push('', '💡 Ако нещо е грешно, деблокирай с /unblock');

    await sendTelegramMessage(chatId, lines.join('\n'));
    return NextResponse.json({ ok: true });
  }

  // Any other text — try admin commands first, then booking block parser
  if (text) {
    const salon = await findSalonByChatId(chatId);
    if (salon) {
      const handled = await handleAdminCommand(chatId, text, salon);
      if (handled) return NextResponse.json({ ok: true });
    }
    await handleBlockMessage(chatId, text);
    return NextResponse.json({ ok: true });
  }

  await sendTelegramMessage(
    chatId,
    '💡 Forward-ни съобщение от Fresha/Studio24 или напиши напр.: <b>зает 14:00-16:00 утре</b>\n\n📸 Или изпрати <b>скрийншот</b> с резервациите и ще ги блокирам автоматично.\n\nНатисни /help за повече.',
  );
  return NextResponse.json({ ok: true });
}
