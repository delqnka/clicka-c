import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { sql } from '@/lib/db';
import { sendTelegramMessage, getTelegramFilePath, getTelegramFileUrl, sendTelegramInlineKeyboard, answerCallbackQuery } from '@/lib/telegram';
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
  handleGalleryPhoto,
  photoTargetFromCaption,
  handleClientRemindCallback,
} from '@/lib/telegram-admin-commands';

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? '';

type TelegramUpdate = {
  message?: {
    message_id: number;
    chat: { id: number };
    from?: { first_name?: string };
    text?: string;
    caption?: string;
    photo?: { file_id: string; width: number; height: number }[];
    forward_date?: number;
    forward_from?: { first_name?: string };
    forward_sender_name?: string;
    reply_to_message?: { message_id: number };
  };
  callback_query?: {
    id: string;
    from: { id: number };
    data: string;
    message?: { chat: { id: number } };
  };
};

async function findSalonByChatId(
  chatId: number,
): Promise<{ salonId: string; slug: string; name: string; staffMemberId: string | null } | null> {
  // 1. Look up non-owner staff members first (TEAM plan).
  // Owners are excluded here so they always fall through to the salons lookup
  // and get staffMemberId: null — preserving their "sees all bookings" access.
  const staffRows = await sql`
    SELECT sm.id AS staff_member_id, sm.salon_id,
           s.slug, s.name
    FROM staff_members sm
    JOIN salons s ON CAST(s.id AS text) = sm.salon_id
    WHERE sm.telegram_chat_id = ${String(chatId)}
      AND sm.is_owner = false
    LIMIT 1
  `.catch(() => []);

  if (staffRows.length > 0) {
    const r = staffRows[0] as { staff_member_id: string; salon_id: string; slug: string; name: string };
    return { salonId: r.salon_id, slug: r.slug, name: r.name, staffMemberId: r.staff_member_id };
  }

  // 2. Fall back to legacy salon-level telegram_chat_id (pre-migration salons).
  const rows = await sql`
    SELECT CAST(id AS text) AS salon_id, slug, name
    FROM salons
    WHERE telegram_chat_id = ${String(chatId)}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const row = rows[0] as { salon_id: string; slug: string; name: string };
  return { salonId: row.salon_id, slug: row.slug, name: row.name, staffMemberId: null };
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

  // ── Callback query (inline button press) ────────────────────────────────
  if (update.callback_query) {
    const cbq = update.callback_query;
    const cbChatId = cbq.message?.chat.id ?? cbq.from.id;
    await answerCallbackQuery(cbq.id);

    if (cbq.data.startsWith('cnr:')) {
      const parts = cbq.data.split(':');
      const type = parts[1]!;
      const clientName = parts.slice(2).join(':');
      const salonForCallback = await findSalonByChatId(cbChatId);
      if (salonForCallback) {
        await handleClientRemindCallback(cbChatId, type, salonForCallback.salonId, clientName);
      }
      return NextResponse.json({ ok: true });
    }

    if (cbq.data.startsWith('photo_action:')) {
      const action = cbq.data.split(':')[1];
      const salon = await findSalonByChatId(cbChatId);
      if (!salon) return NextResponse.json({ ok: true });

      // Retrieve URL from DB state
      const stateRows = await sql`SELECT bot_conversation_state FROM salons WHERE telegram_chat_id = ${String(cbChatId)} LIMIT 1`;
      const state = stateRows[0]?.bot_conversation_state as { type?: string; url?: string } | null;
      const imageUrl = state?.type === 'last_photo' ? state.url : null;
      if (!imageUrl) {
        await sendTelegramMessage(cbChatId, '⚠️ Снимката е изтекла. Изпрати я отново.');
        return NextResponse.json({ ok: true });
      }

      if (action === 'price_list') {
        await handlePriceListPhoto(cbChatId, imageUrl, salon);
      } else {
        await handleGalleryPhoto(cbChatId, imageUrl, salon, 'gallery');
      }
    }
    return NextResponse.json({ ok: true });
  }

  const message = update.message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const text = (message.text ?? '').trim();
  const firstName = message.from?.first_name ?? '';

  // ── Handle salon reply to client chat message ────────────────────────────
  if (message.reply_to_message?.message_id && text) {
    const repliedToId = message.reply_to_message.message_id;
    // Find chat session via the telegram_message_id we stored when forwarding
    const sessionRows = await sql`
      SELECT m.session_id
      FROM salon_chat_messages m
      WHERE m.telegram_message_id = ${repliedToId}
      LIMIT 1
    ` as { session_id: string }[];

    if (sessionRows.length > 0) {
      const sessionId = sessionRows[0]!.session_id;
      await sql`
        INSERT INTO salon_chat_messages (session_id, role, content)
        VALUES (${sessionId}, 'salon', ${text})
      `;
      await sql`
        UPDATE salon_chat_sessions SET last_message_at = now() WHERE id = ${sessionId}
      `;
      await sendTelegramMessage(chatId, '✅ Отговорът е изпратен на клиента.');
      return NextResponse.json({ ok: true });
    }
  }

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

    // Try staff member onboarding code first (TEAM plan — each staff has own code).
    const staffRows = await sql`
      SELECT sm.id AS staff_member_id, sm.name AS staff_name,
             s.name AS salon_name
      FROM staff_members sm
      JOIN salons s ON CAST(s.id AS text) = sm.salon_id
      WHERE upper(sm.onboarding_code) = ${code}
      LIMIT 1
    `.catch(() => []);

    if (staffRows.length > 0) {
      const sr = staffRows[0] as { staff_member_id: string; staff_name: string; salon_name: string };
      await sql`
        UPDATE staff_members
        SET telegram_chat_id = ${String(chatId)}
        WHERE id = ${sr.staff_member_id}::uuid
      `;
      await sendTelegramMessage(
        chatId,
        `✅ <b>${sr.staff_name}</b> от <b>${sr.salon_name}</b> е свързан успешно${firstName ? `, ${firstName}` : ''}!\n\nОтсега насетне ще получаваш известия за твоите резервации тук.`,
      );
      return NextResponse.json({ ok: true });
    }

    // Fall back to salon-level onboarding code (SOLO plan / owner).
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

    // Update the salon row.
    await sql`
      UPDATE salons
      SET telegram_chat_id = ${String(chatId)}
      WHERE CAST(id AS text) = ${String(salon.salon_id ?? '')}
    `;
    // Update the owner staff_member row — clear any other row that holds this chatId first
    // to avoid violating the UNIQUE constraint on staff_members.telegram_chat_id.
    await sql`
      UPDATE staff_members SET telegram_chat_id = NULL
      WHERE telegram_chat_id = ${String(chatId)}
        AND NOT (salon_id = ${String(salon.salon_id ?? '')} AND is_owner = true)
    `.catch(() => {});
    await sql`
      UPDATE staff_members
      SET telegram_chat_id = ${String(chatId)}
      WHERE salon_id = ${String(salon.salon_id ?? '')} AND is_owner = true
    `.catch(() => {});

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
    const isForwarded = !!message.forward_date;
    const photoTarget = photoTargetFromCaption(caption);

    // Price list photo
    if (photoTarget === 'price_list') {
      await handlePriceListPhoto(chatId, imageUrl, salon);
      return NextResponse.json({ ok: true });
    }

    // Forwarded photo without special caption → try booking screenshot parse
    if (isForwarded && !caption) {
      await sendTelegramMessage(chatId, '🔍 Анализирам снимката...');
      const bookings = await parseBookingsFromPhoto(imageUrl);
      if (bookings.length > 0) {
        let blockedCount = 0;
        for (const b of bookings) {
          const block: BookingBlock = { date: b.date, allDay: false, start: b.start, end: b.end, note: 'От снимка (Fresha/друго приложение)' };
          await addBookingBlock(salon.salonId, salon.slug, block);
          blockedCount++;
        }
        revalidateTag(`salon-public-${salon.slug}`);
        const lines = [`🔒 <b>Блокирани ${blockedCount} часа от снимката:</b>`, ''];
        for (const b of bookings) {
          const d = new Date(`${b.date}T12:00:00`);
          lines.push(`📅 ${d.toLocaleDateString('bg-BG', { weekday: 'short', day: 'numeric', month: 'long' })} — ${b.start} – ${b.end}`);
        }
        lines.push('', '💡 Ако нещо е грешно, деблокирай с /unblock');
        await sendTelegramMessage(chatId, lines.join('\n'));
        return NextResponse.json({ ok: true });
      }
      // Forwarded but no bookings found — fall through to gallery
    }

    // No caption → save URL in DB state, ask what to do via inline buttons
    if (!caption) {
      // Store the image URL in last_photo state so callback can retrieve it
      await sql`
        UPDATE salons SET bot_conversation_state = ${JSON.stringify({ type: 'last_photo', url: imageUrl, created_at: new Date().toISOString() })}::jsonb
        WHERE telegram_chat_id = ${String(chatId)}
      `;
      await sendTelegramInlineKeyboard(
        chatId,
        '📸 Какво да направя с тази снимка?',
        [[
          { text: '📋 Ценоразпис', callback_data: 'photo_action:price_list' },
          { text: '🖼️ Портфолио', callback_data: 'photo_action:gallery' },
        ]],
      );
      return NextResponse.json({ ok: true });
    }

    // Default: upload to gallery / cover / portfolio
    const galleryTarget = photoTarget === 'booking' ? 'gallery' : photoTarget;
    await handleGalleryPhoto(chatId, imageUrl, salon, galleryTarget);
    return NextResponse.json({ ok: true });
  }

  // Any other text — try admin commands first, then booking block parser
  if (text) {
    const salon = await findSalonByChatId(chatId);
    if (salon) {
      const handled = await handleAdminCommand(chatId, text, {
        salonId: salon.salonId,
        slug: salon.slug,
        name: salon.name,
        staffMemberId: salon.staffMemberId,
      });
      if (handled) return NextResponse.json({ ok: true });

      // Admin command not recognised — try booking-block parser ("зает 14:00-16:00")
      const blockParsed = parseBlockFromMessage(text);
      if (blockParsed) {
        const block: BookingBlock = parsedBlockToBookingBlock(blockParsed);
        await addBookingBlock(salon.salonId, salon.slug, block);
        revalidateTag(`salon-public-${salon.slug}`);
        await sendTelegramMessage(chatId, formatBlockConfirmation(blockParsed));
      } else {
        // Nothing matched — send a helpful hint instead of the confusing time-parser error
        await sendTelegramMessage(
          chatId,
          '❓ Не разбрах тази команда.\n\n' +
          '<b>Справки:</b>\n• оборот тази седмица / месец\n• резервации утре / днес\n• следващ клиент\n\n' +
          '<b>Блокиране:</b>\n• зает 14:00-16:00 утре\n• почивам утре\n\n' +
          '<b>Управление:</b>\n• добави услуга: Масаж — 60 мин — 80 лв\n• промени цената на Масаж на 90 лв\n\n' +
          'Натисни /help за пълен списък.',
        );
      }
      return NextResponse.json({ ok: true });
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
