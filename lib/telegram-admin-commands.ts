/**
 * Telegram admin commands — service management, working hours, booking management, and queries.
 * Called from the Telegram webhook when the message is from the salon owner.
 */
import { sql } from '@/lib/db';
import { revalidateTag } from 'next/cache';
import { sendTelegramMessage } from '@/lib/telegram';
import { normalizeServices, type ServiceItem } from '@/lib/salon-services';
import { sendSmsReminder } from '@/lib/smsapi';
import {
  getOpenRouterApiKey,
  OPENROUTER_BASE,
  openRouterHeaders,
} from '@/lib/openrouter';

// ─── Regex patterns ─────────────────────────────────────────────────────────

const ADD_SERVICE_RE =
  /^(?:добав[ии]|add)\s+услуг[аa][:：]?\s+(.+?)(?:\s*[—\-–]\s*(\d+)\s*мин(?:\.|ути)?)?(?:\s*[—\-–]\s*(\d+(?:[.,]\d+)?)\s*(?:лв|bgn|€|eur|лев)?)?$/i;

const UPDATE_PRICE_RE =
  /^(?:промен[ии]|смен[ии])\s+цен(?:ата|а)\s+на\s+(.+?)\s+на\s+(\d+(?:[.,]\d+)?)\s*(?:лв|bgn|€|eur|лев)?$/i;

const DELETE_SERVICE_RE =
  /^(?:изтри[йи]|премахн[ии]|махн[ии])\s+услуг(?:ата|а)\s+(.+)$/i;

const WORK_UNTIL_RE =
  /^работ[яа]\s+до\s+(\d{1,2}:\d{2})(?:\s+(?:тази\s+)?(?:седмица|week))?$/i;

const DAY_HOURS_RE =
  /^(?:от\s+)?(понеделник|вторник|сряда|четвъртък|петък|събота|неделя)\s+(?:работим?|сме\s+отворени?)\s+от\s+(\d{1,2}:\d{2})\s+до\s+(\d{1,2}:\d{2})$/i;

const DAY_CLOSED_RE =
  /^(понеделник|вторник|сряда|четвъртък|петък|събота|неделя)\s+(?:сме\s+)?затворени?$/i;

const DAY_OFF_RE =
  /^(?:(утре|днес|понеделник|вторник|сряда|четвъртък|петък|събота|неделя|\d{1,2}[\/\.\-]\d{1,2}(?:[\/\.\-]\d{2,4})?)\s+)?почивам(?:\s+.*)?$/i;

// Booking management
const CONFIRM_BOOKING_RE =
  /^потвърди\s+резервацията\s+(?:на\s+)?(.+)$/i;

const CANCEL_BOOKING_RE =
  /^откажи\s+резервацията\s+(?:в\s+)?(\d{1,2}:\d{2})(?:\s+(?:утре|днес))?$/i;

const REMIND_TOMORROW_RE =
  /^напомни\s+(?:на\s+всички\s+)?клиенти(?:те)?\s+(?:за\s+)?утре$/i;

const PENDING_BOOKINGS_RE =
  /^(?:имам\s+ли\s+)?(?:незатвърдени|непотвърдени)\s+резервации?$/i;

// Profile
const UPDATE_PHONE_RE =
  /^(?:смен[ии]|промен[ии])\s+телефон(?:а|ът)?\s+(?:на\s+)?(\+?[\d\s\-]+)$/i;

const UPDATE_INSTAGRAM_RE =
  /^(?:добав[ии]|смен[ии]|промен[ии])\s+instagram[:：]?\s*@?(\S+)$/i;

const UPDATE_BIO_RE =
  /^(?:обнов[ии]|промен[ии])\s+(?:bio|биото|описанието)[:：]\s*([\s\S]+)$/i;

// Queries
const BOOKINGS_TOMORROW_RE =
  /^(?:колко\s+)?(?:записа?|резервации?)\s+(?:имам\s+)?(?:за\s+)?утре\b/i;

const BOOKINGS_TODAY_RE =
  /^(?:колко\s+)?(?:записа?|резервации?)\s+(?:имам\s+)?(?:за\s+)?днес\b/i;

const NEXT_CLIENT_RE =
  /^(?:кой\s+е\s+)?следващ(?:ият|ия|ото)?\s+(?:ми\s+)?клиент\b/i;

const REVENUE_THIS_WEEK_RE =
  /^(?:какъв\s+е\s+)?(?:приход(?:ът|а)|оборот(?:ът|а))(?:\s+ми)?\s+(?:тази\s+)?(?:седмица|week)\b/i;

const REVENUE_THIS_MONTH_RE =
  /^(?:какъв\s+е\s+)?(?:приход(?:ът|а)|оборот(?:ът|а))(?:\s+ми)?\s+(?:този\s+)?(?:месец|month)\b/i;

const REVENUE_CLIENT_RE =
  /^(?:оборот|приход)\s+(?:от\s+(?:клиент\s+)?)?(.+)$/i;

const CLIENT_COUNT_MONTH_RE =
  /^колко\s+клиент(?:а|и)\s+(?:имах\s+)?(?:този\s+)?(?:месец|month)\b/i;

const TOP_SERVICES_RE =
  /^(?:кои\s+са\s+)?(?:най-популярни(?:те)?|топ)\s+(?:ми\s+)?услуги\b/i;

const LIST_SERVICES_RE =
  /^(?:покажи|виж|изброй)\s+(?:всички\s+)?услуги(?:те)?$/i;

const PRICE_LIST_CAPTION_RE = /ценоразпис|прайс\s*лист|услуги\s+цени|price\s*list/i;

// ─── Day helpers ─────────────────────────────────────────────────────────────

const BG_DAY_TO_JS: Record<string, number> = {
  неделя: 0, понеделник: 1, вторник: 2, сряда: 3,
  четвъртък: 4, петък: 5, събота: 6,
};

const JS_DAY_TO_BG_KEY = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function resolveDayName(name: string): string {
  const lower = name.toLowerCase();
  if (lower === 'днес') return todayISO();
  if (lower === 'утре') return offsetDayISO(1);
  const jsDay = BG_DAY_TO_JS[lower];
  if (jsDay !== undefined) {
    const today = new Date();
    const todayJs = today.getDay();
    let diff = jsDay - todayJs;
    if (diff <= 0) diff += 7;
    return offsetDayISO(diff);
  }
  const dmMatch = name.match(/^(\d{1,2})[\/\.\-](\d{1,2})(?:[\/\.\-](\d{2,4}))?$/);
  if (dmMatch) {
    const day = dmMatch[1]!.padStart(2, '0');
    const month = dmMatch[2]!.padStart(2, '0');
    const year = dmMatch[3]
      ? dmMatch[3].length === 2 ? `20${dmMatch[3]}` : dmMatch[3]
      : String(new Date().getFullYear());
    return `${year}-${month}-${day}`;
  }
  return todayISO();
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function offsetDayISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function bgDayNameToKey(bg: string): string {
  const map: Record<string, string> = {
    понеделник: 'monday', вторник: 'tuesday', сряда: 'wednesday',
    четвъртък: 'thursday', петък: 'friday', събота: 'saturday', неделя: 'sunday',
  };
  return map[bg.toLowerCase()] ?? bg.toLowerCase();
}

function formatDateBg(dateStr: string, opts?: Intl.DateTimeFormatOptions): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString('bg-BG', opts ?? { weekday: 'long', day: 'numeric', month: 'long' });
}

function lvToEur(lv: number): number {
  return Math.round(lv / 1.95583);
}

function eurToLv(eur: number): string {
  return (eur * 1.95583).toFixed(2);
}

// ─── Services helpers ────────────────────────────────────────────────────────

async function getSalonServices(salonId: string): Promise<ServiceItem[]> {
  const rows = await sql`
    SELECT services FROM salons WHERE CAST(id AS text) = ${salonId} LIMIT 1
  `;
  return normalizeServices(rows[0]?.services ?? []);
}

async function saveSalonServices(salonId: string, slug: string, services: ServiceItem[]): Promise<void> {
  await sql`
    UPDATE salons
    SET services = ${JSON.stringify(services)}::jsonb, updated_at = now()
    WHERE CAST(id AS text) = ${salonId}
  `;
  revalidateTag(`salon-public-${slug}`);
}

// ─── Public types ────────────────────────────────────────────────────────────

export type SalonRef = { salonId: string; slug: string; name: string };

export function isPriceListPhoto(caption: string): boolean {
  return PRICE_LIST_CAPTION_RE.test(caption);
}

// ─── Main dispatcher ─────────────────────────────────────────────────────────

/** Try to match and execute an admin command. Returns true if handled. */
export async function handleAdminCommand(
  chatId: number,
  text: string,
  salon: SalonRef,
): Promise<boolean> {

  // ── Add service ──────────────────────────────────────────────────────────
  const addMatch = text.match(ADD_SERVICE_RE);
  if (addMatch) {
    const rawName = addMatch[1]!.trim();
    const duration = addMatch[2] ? Math.max(5, parseInt(addMatch[2], 10)) : 30;
    const price = addMatch[3] ? lvToEur(parseFloat(addMatch[3].replace(',', '.'))) : 0;
    const services = await getSalonServices(salon.salonId);
    if (services.some((s) => s.name.toLowerCase() === rawName.toLowerCase())) {
      await sendTelegramMessage(chatId, `⚠️ Услугата <b>${rawName}</b> вече съществува.\nЗа да промениш цената: <code>Промени цената на ${rawName} на ${price} лв</code>`);
      return true;
    }
    services.push({ name: rawName, price, duration_min: duration });
    await saveSalonServices(salon.salonId, salon.slug, services);
    await sendTelegramMessage(chatId, `✅ Добавена услуга:\n<b>${rawName}</b> — ${duration} мин — ${price} €`);
    return true;
  }

  // ── Delete service ───────────────────────────────────────────────────────
  const deleteMatch = text.match(DELETE_SERVICE_RE);
  if (deleteMatch) {
    const targetName = deleteMatch[1]!.trim();
    const services = await getSalonServices(salon.salonId);
    const idx = findServiceIndex(services, targetName);
    if (idx === -1) {
      await sendTelegramMessage(chatId, `❌ Не намерих услуга <b>${targetName}</b>.`);
      return true;
    }
    const removed = services[idx]!.name;
    services.splice(idx, 1);
    await saveSalonServices(salon.salonId, salon.slug, services);
    await sendTelegramMessage(chatId, `🗑 Услугата <b>${removed}</b> е изтрита.`);
    return true;
  }

  // ── Update price ─────────────────────────────────────────────────────────
  const priceMatch = text.match(UPDATE_PRICE_RE);
  if (priceMatch) {
    const targetName = priceMatch[1]!.trim();
    const newPriceLv = parseFloat(priceMatch[2]!.replace(',', '.'));
    const newPriceEur = lvToEur(newPriceLv);
    const services = await getSalonServices(salon.salonId);
    const idx = findServiceIndex(services, targetName);
    if (idx === -1) {
      await sendTelegramMessage(chatId, `❌ Не намерих услуга <b>${targetName}</b>.\n\n${listServicesText(services)}`);
      return true;
    }
    services[idx]!.price = newPriceEur;
    await saveSalonServices(salon.salonId, salon.slug, services);
    await sendTelegramMessage(chatId, `✅ Цената на <b>${services[idx]!.name}</b> е <b>${newPriceEur} €</b> (${newPriceLv} лв)`);
    return true;
  }

  // ── List services ────────────────────────────────────────────────────────
  if (LIST_SERVICES_RE.test(text)) {
    const services = await getSalonServices(salon.salonId);
    if (services.length === 0) {
      await sendTelegramMessage(chatId, 'ℹ️ Все още няма добавени услуги.');
      return true;
    }
    const lines = [`✂️ <b>Услуги (${services.length}):</b>`, ''];
    let currentCat = '';
    for (const s of services) {
      if (s.category && s.category !== currentCat) {
        currentCat = s.category;
        lines.push(`\n<b>${currentCat}</b>`);
      }
      lines.push(`• ${s.name} — ${s.duration_min} мин — ${s.price} €`);
    }
    await sendTelegramMessage(chatId, lines.join('\n'));
    return true;
  }

  // ── Day hours ─────────────────────────────────────────────────────────────
  const dayHoursMatch = text.match(DAY_HOURS_RE);
  if (dayHoursMatch) {
    const dayKey = bgDayNameToKey(dayHoursMatch[1]!);
    const open = dayHoursMatch[2]!;
    const close = dayHoursMatch[3]!;
    await updateSingleDayHours(salon.salonId, salon.slug, dayKey, { open, close });
    await sendTelegramMessage(chatId, `✅ <b>${dayHoursMatch[1]}</b>: ${open} – ${close}`);
    return true;
  }

  // ── Day closed ────────────────────────────────────────────────────────────
  const dayClosedMatch = text.match(DAY_CLOSED_RE);
  if (dayClosedMatch) {
    const dayKey = bgDayNameToKey(dayClosedMatch[1]!);
    await updateSingleDayHours(salon.salonId, salon.slug, dayKey, null);
    await sendTelegramMessage(chatId, `✅ <b>${dayClosedMatch[1]}</b> е маркиран като затворен.`);
    return true;
  }

  // ── Work until HH:mm this week ────────────────────────────────────────────
  const workUntilMatch = text.match(WORK_UNTIL_RE);
  if (workUntilMatch) {
    const closeTime = workUntilMatch[1]!;
    await updateWorkingHoursClose(salon.salonId, salon.slug, closeTime);
    await sendTelegramMessage(chatId, `✅ Работното ви време тази седмица е актуализирано до <b>${closeTime}</b>`);
    return true;
  }

  // ── Day off ───────────────────────────────────────────────────────────────
  const dayOffMatch = text.match(DAY_OFF_RE);
  if (dayOffMatch) {
    const dayToken = (dayOffMatch[1] ?? 'утре').toLowerCase();
    const date = resolveDayName(dayToken);
    await blockAllDay(salon.salonId, salon.slug, date);
    await sendTelegramMessage(chatId, `🔒 <b>${formatDateBg(date)}</b> е блокиран — без резервации за целия ден.`);
    return true;
  }

  // ── Confirm booking ───────────────────────────────────────────────────────
  const confirmMatch = text.match(CONFIRM_BOOKING_RE);
  if (confirmMatch) {
    const clientName = confirmMatch[1]!.trim();
    await handleConfirmBooking(chatId, salon, clientName);
    return true;
  }

  // ── Cancel booking ────────────────────────────────────────────────────────
  const cancelMatch = text.match(CANCEL_BOOKING_RE);
  if (cancelMatch) {
    const time = cancelMatch[1]!;
    const dateStr = text.toLowerCase().includes('утре') ? offsetDayISO(1) : todayISO();
    await handleCancelBooking(chatId, salon, dateStr, time);
    return true;
  }

  // ── Remind clients tomorrow ───────────────────────────────────────────────
  if (REMIND_TOMORROW_RE.test(text)) {
    await handleRemindTomorrow(chatId, salon);
    return true;
  }

  // ── Pending bookings ──────────────────────────────────────────────────────
  if (PENDING_BOOKINGS_RE.test(text)) {
    await handlePendingBookings(chatId, salon);
    return true;
  }

  // ── Update phone ──────────────────────────────────────────────────────────
  const phoneMatch = text.match(UPDATE_PHONE_RE);
  if (phoneMatch) {
    const phone = phoneMatch[1]!.trim().replace(/\s+/g, '');
    await sql`UPDATE salons SET phone = ${phone}, updated_at = now() WHERE CAST(id AS text) = ${salon.salonId}`;
    revalidateTag(`salon-public-${salon.slug}`);
    await sendTelegramMessage(chatId, `✅ Телефонът е обновен: <b>${phone}</b>`);
    return true;
  }

  // ── Update Instagram ──────────────────────────────────────────────────────
  const igMatch = text.match(UPDATE_INSTAGRAM_RE);
  if (igMatch) {
    const handle = igMatch[1]!.replace(/^@/, '');
    await sql`UPDATE salons SET instagram_username = ${handle}, updated_at = now() WHERE CAST(id AS text) = ${salon.salonId}`;
    revalidateTag(`salon-public-${salon.slug}`);
    await sendTelegramMessage(chatId, `✅ Instagram обновен: <b>@${handle}</b>`);
    return true;
  }

  // ── Update bio ────────────────────────────────────────────────────────────
  const bioMatch = text.match(UPDATE_BIO_RE);
  if (bioMatch) {
    const bio = bioMatch[1]!.trim();
    await sql`UPDATE salons SET about = ${bio}, updated_at = now() WHERE CAST(id AS text) = ${salon.salonId}`;
    revalidateTag(`salon-public-${salon.slug}`);
    await sendTelegramMessage(chatId, `✅ Описанието е обновено.`);
    return true;
  }

  // ── Bookings today ────────────────────────────────────────────────────────
  if (BOOKINGS_TODAY_RE.test(text)) {
    await handleBookingsForDay(chatId, salon, todayISO(), 'днес');
    return true;
  }

  // ── Bookings tomorrow ─────────────────────────────────────────────────────
  if (BOOKINGS_TOMORROW_RE.test(text)) {
    await handleBookingsForDay(chatId, salon, offsetDayISO(1), 'утре');
    return true;
  }

  // ── Next client ───────────────────────────────────────────────────────────
  if (NEXT_CLIENT_RE.test(text)) {
    await handleNextClient(chatId, salon);
    return true;
  }

  // ── Revenue — specific client ─────────────────────────────────────────────
  if (REVENUE_CLIENT_RE.test(text)) {
    // Only match if it doesn't look like week/month query
    if (!REVENUE_THIS_WEEK_RE.test(text) && !REVENUE_THIS_MONTH_RE.test(text)) {
      const clientMatch = text.match(REVENUE_CLIENT_RE);
      const clientName = clientMatch![1]!.trim();
      await handleClientRevenue(chatId, salon, clientName);
      return true;
    }
  }

  // ── Revenue this week ─────────────────────────────────────────────────────
  if (REVENUE_THIS_WEEK_RE.test(text)) {
    await handleRevenue(chatId, salon, 'week');
    return true;
  }

  // ── Revenue this month ────────────────────────────────────────────────────
  if (REVENUE_THIS_MONTH_RE.test(text)) {
    await handleRevenue(chatId, salon, 'month');
    return true;
  }

  // ── Client count this month ───────────────────────────────────────────────
  if (CLIENT_COUNT_MONTH_RE.test(text)) {
    await handleClientCountMonth(chatId, salon);
    return true;
  }

  // ── Top services ──────────────────────────────────────────────────────────
  if (TOP_SERVICES_RE.test(text)) {
    await handleTopServices(chatId, salon);
    return true;
  }

  return false;
}

// ─── Price list photo ─────────────────────────────────────────────────────────

export async function handlePriceListPhoto(
  chatId: number,
  imageUrl: string,
  salon: SalonRef,
): Promise<void> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    await sendTelegramMessage(chatId, '❌ AI услугата не е конфигурирана.');
    return;
  }

  await sendTelegramMessage(chatId, '🔍 Анализирам ценоразписа...');

  const systemPrompt = `Ти си асистент, който извлича информация за услуги и цени от снимки на ценоразписи.
Върни САМО валиден JSON масив без markdown. Форматът: [{"name":string,"price":number,"duration_min":number,"category":string}]
Цените да са в евро (EUR). Ако са в лева, раздели на 1.95583 и закръгли до цяло число.
Ако продължителността не е посочена, прецени я по типа услуга.`;

  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: openRouterHeaders(),
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: 'Извлечи всички услуги с цени от ценоразписа. Върни само JSON.' },
          ],
        },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    await sendTelegramMessage(chatId, '❌ Грешка при анализ на снимката. Пробвай отново.');
    return;
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = (data.choices?.[0]?.message?.content ?? '').trim();

  let parsed: { name: string; price: number; duration_min: number; category?: string }[] = [];
  try {
    const jsonStr = raw.startsWith('[') ? raw : (raw.match(/\[[\s\S]*\]/) ?? ['[]'])[0]!;
    parsed = JSON.parse(jsonStr);
  } catch {
    await sendTelegramMessage(chatId, '❌ Не успях да разчета ценоразписа. Увери се, че услугите и цените се виждат ясно.');
    return;
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    await sendTelegramMessage(chatId, '❌ Не открих услуги в снимката.');
    return;
  }

  const existing = await getSalonServices(salon.salonId);
  const existingNames = new Set(existing.map((s) => s.name.toLowerCase()));
  const added: ServiceItem[] = [];

  for (const item of parsed) {
    const name = String(item.name ?? '').trim();
    if (!name || existingNames.has(name.toLowerCase())) continue;
    const svc: ServiceItem = {
      name,
      price: Math.max(0, Math.round(Number(item.price) || 0)),
      duration_min: Math.max(5, Number(item.duration_min) || 30),
      ...(item.category ? { category: String(item.category).trim() } : {}),
    };
    added.push(svc);
    existingNames.add(name.toLowerCase());
  }

  if (added.length === 0) {
    await sendTelegramMessage(chatId, 'ℹ️ Всички услуги от ценоразписа вече съществуват.');
    return;
  }

  await saveSalonServices(salon.salonId, salon.slug, [...existing, ...added]);

  const lines = [`✅ <b>Добавени ${added.length} услуги от ценоразписа:</b>`, ''];
  for (const s of added) {
    lines.push(`• ${s.name} — ${s.duration_min} мин — ${s.price} €${s.category ? ` (${s.category})` : ''}`);
  }
  await sendTelegramMessage(chatId, lines.join('\n'));
}

// ─── Booking handlers ────────────────────────────────────────────────────────

async function handleBookingsForDay(
  chatId: number,
  salon: SalonRef,
  date: string,
  label: string,
): Promise<void> {
  const rows = await sql`
    SELECT client_name, time, service_name, status
    FROM bookings
    WHERE salon_id = CAST(${salon.salonId} AS uuid)
      AND date = ${date}
      AND status NOT IN ('cancelled')
    ORDER BY time ASC
  ` as { client_name: string; time: string; service_name: string; status: string }[];

  const dateStr = formatDateBg(date);
  if (rows.length === 0) {
    await sendTelegramMessage(chatId, `📅 <b>${dateStr}</b>\n\nНяма записи за ${label}.`);
    return;
  }

  const lines = [`📅 <b>${dateStr} — ${rows.length} ${pluralBooking(rows.length)}:</b>`, ''];
  for (const r of rows) {
    const icon = r.status === 'confirmed' ? '✅' : '⏳';
    lines.push(`${icon} ${r.time} — <b>${r.client_name}</b> (${r.service_name})`);
  }
  await sendTelegramMessage(chatId, lines.join('\n'));
}

async function handleNextClient(chatId: number, salon: SalonRef): Promise<void> {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentTime = now.toTimeString().slice(0, 5);

  const rows = await sql`
    SELECT client_name, client_phone, time, service_name, service_duration, date
    FROM bookings
    WHERE salon_id = CAST(${salon.salonId} AS uuid)
      AND status NOT IN ('cancelled', 'completed')
      AND (date > ${todayStr} OR (date = ${todayStr} AND time >= ${currentTime}))
    ORDER BY date ASC, time ASC
    LIMIT 1
  ` as { client_name: string; client_phone: string; time: string; service_name: string; service_duration: number | null; date: string }[];

  if (rows.length === 0) {
    await sendTelegramMessage(chatId, 'ℹ️ Няма предстоящи записи.');
    return;
  }

  const r = rows[0]!;
  const isToday = r.date === todayStr;
  const dateLabel = isToday ? 'Днес' : formatDateBg(r.date);

  const lines = [
    `👤 <b>Следващ клиент:</b>`,
    '',
    `🗓 ${dateLabel} в ${r.time}`,
    `👤 ${r.client_name}`,
    `📞 ${r.client_phone}`,
    `✂️ ${r.service_name}${r.service_duration ? ` (${r.service_duration} мин)` : ''}`,
  ];
  await sendTelegramMessage(chatId, lines.join('\n'));
}

async function handleConfirmBooking(chatId: number, salon: SalonRef, clientName: string): Promise<void> {
  const tomorrow = offsetDayISO(1);
  const rows = await sql`
    SELECT CAST(id AS text) AS id, client_name, date, time, service_name
    FROM bookings
    WHERE salon_id = CAST(${salon.salonId} AS uuid)
      AND status = 'pending'
      AND lower(client_name) LIKE ${`%${clientName.toLowerCase()}%`}
      AND date >= ${todayISO()}
    ORDER BY date ASC, time ASC
    LIMIT 1
  ` as { id: string; client_name: string; date: string; time: string; service_name: string }[];

  if (rows.length === 0) {
    await sendTelegramMessage(chatId, `❌ Не намерих незатвърдена резервация за <b>${clientName}</b>.`);
    return;
  }

  const r = rows[0]!;
  await sql`UPDATE bookings SET status = 'confirmed' WHERE CAST(id AS text) = ${r.id}`;
  await sendTelegramMessage(
    chatId,
    `✅ Потвърдена резервация:\n👤 ${r.client_name}\n🗓 ${formatDateBg(r.date)} в ${r.time}\n✂️ ${r.service_name}`,
  );
}

async function handleCancelBooking(chatId: number, salon: SalonRef, date: string, time: string): Promise<void> {
  const rows = await sql`
    SELECT CAST(id AS text) AS id, client_name, service_name
    FROM bookings
    WHERE salon_id = CAST(${salon.salonId} AS uuid)
      AND date = ${date}
      AND time = ${time}
      AND status NOT IN ('cancelled', 'completed')
    LIMIT 1
  ` as { id: string; client_name: string; service_name: string }[];

  if (rows.length === 0) {
    await sendTelegramMessage(chatId, `❌ Не намерих резервация в ${time} на ${formatDateBg(date)}.`);
    return;
  }

  const r = rows[0]!;
  await sql`UPDATE bookings SET status = 'cancelled' WHERE CAST(id AS text) = ${r.id}`;
  await sendTelegramMessage(
    chatId,
    `🚫 Резервацията е отказана:\n👤 ${r.client_name}\n🗓 ${formatDateBg(date)} в ${time}\n✂️ ${r.service_name}`,
  );
}

async function handlePendingBookings(chatId: number, salon: SalonRef): Promise<void> {
  const rows = await sql`
    SELECT client_name, date, time, service_name
    FROM bookings
    WHERE salon_id = CAST(${salon.salonId} AS uuid)
      AND status = 'pending'
      AND date >= ${todayISO()}
    ORDER BY date ASC, time ASC
    LIMIT 10
  ` as { client_name: string; date: string; time: string; service_name: string }[];

  if (rows.length === 0) {
    await sendTelegramMessage(chatId, '✅ Няма незатвърдени резервации.');
    return;
  }

  const lines = [`⏳ <b>Незатвърдени резервации (${rows.length}):</b>`, ''];
  for (const r of rows) {
    lines.push(`• ${formatDateBg(r.date, { weekday: 'short', day: 'numeric', month: 'short' })} ${r.time} — ${r.client_name} (${r.service_name})`);
  }
  lines.push('', '💡 За потвърждение: <code>потвърди резервацията на [Име]</code>');
  await sendTelegramMessage(chatId, lines.join('\n'));
}

async function handleRemindTomorrow(chatId: number, salon: SalonRef): Promise<void> {
  const tomorrow = offsetDayISO(1);

  const salonRows = await sql`
    SELECT name, phone FROM salons WHERE CAST(id AS text) = ${salon.salonId} LIMIT 1
  ` as { name: string; phone: string }[];
  const salonInfo = salonRows[0] ?? { name: salon.name, phone: '' };

  const rows = await sql`
    SELECT client_name, client_phone, time, service_name, sms_reminder_consent
    FROM bookings
    WHERE salon_id = CAST(${salon.salonId} AS uuid)
      AND date = ${tomorrow}
      AND status NOT IN ('cancelled', 'completed')
    ORDER BY time ASC
  ` as { client_name: string; client_phone: string; time: string; service_name: string; sms_reminder_consent: boolean }[];

  if (rows.length === 0) {
    await sendTelegramMessage(chatId, `ℹ️ Няма резервации за утре.`);
    return;
  }

  let sent = 0;
  let skipped = 0;
  for (const r of rows) {
    if (!r.sms_reminder_consent || !r.client_phone) { skipped++; continue; }
    const result = await sendSmsReminder(
      r.client_phone, r.client_name, salonInfo.name,
      salonInfo.phone, r.service_name, tomorrow, r.time,
    );
    if (result.success) sent++; else skipped++;
  }

  await sendTelegramMessage(
    chatId,
    `📲 Напомняния за утре:\n✅ Изпратени: ${sent}\n⏭ Пропуснати (без съгласие/телефон): ${skipped}`,
  );
}

// ─── Revenue handlers ────────────────────────────────────────────────────────

async function handleRevenue(chatId: number, salon: SalonRef, period: 'week' | 'month'): Promise<void> {
  let periodStart: string;
  let periodEnd: string;
  let label: string;

  const today = new Date();

  if (period === 'week') {
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    periodStart = monday.toISOString().slice(0, 10);
    periodEnd = sunday.toISOString().slice(0, 10);
    label = `${monday.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long' })} – ${sunday.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long' })}`;
  } else {
    periodStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    periodEnd = lastDay.toISOString().slice(0, 10);
    label = today.toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' });
  }

  const rows = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
      COALESCE(SUM(service_price), 0)::numeric AS revenue,
      COALESCE(SUM(service_price) FILTER (WHERE status = 'completed'), 0)::numeric AS completed_revenue
    FROM bookings
    WHERE salon_id = CAST(${salon.salonId} AS uuid)
      AND date >= ${periodStart}
      AND date <= ${periodEnd}
      AND status NOT IN ('cancelled')
  ` as { total: number; completed: number; revenue: number; completed_revenue: number }[];

  const r = rows[0]!;
  const total = Number(r.total);
  const completed = Number(r.completed);
  const revenueEur = Number(r.revenue);
  const completedEur = Number(r.completed_revenue);

  const lines = [
    `💰 <b>Оборот — ${label}:</b>`,
    '',
    `📊 Общо резервации: ${total}`,
    `✅ Завършени: ${completed}`,
    `💵 Очакван оборот: <b>${revenueEur.toFixed(0)} €</b> (${eurToLv(revenueEur)} лв)`,
  ];
  if (completedEur > 0 && completedEur !== revenueEur) {
    lines.push(`💵 Реализиран оборот: <b>${completedEur.toFixed(0)} €</b> (${eurToLv(completedEur)} лв)`);
  }
  await sendTelegramMessage(chatId, lines.join('\n'));
}

async function handleClientRevenue(chatId: number, salon: SalonRef, clientName: string): Promise<void> {
  const rows = await sql`
    SELECT
      COUNT(*)::int AS total,
      COALESCE(SUM(service_price), 0)::numeric AS revenue,
      MIN(date) AS first_visit,
      MAX(date) AS last_visit,
      mode() WITHIN GROUP (ORDER BY service_name) AS top_service
    FROM bookings
    WHERE salon_id = CAST(${salon.salonId} AS uuid)
      AND lower(client_name) LIKE ${`%${clientName.toLowerCase()}%`}
      AND status NOT IN ('cancelled')
  ` as { total: number; revenue: number; first_visit: string; last_visit: string; top_service: string }[];

  const r = rows[0]!;
  const total = Number(r.total);

  if (total === 0) {
    await sendTelegramMessage(chatId, `❌ Не намерих резервации за клиент <b>${clientName}</b>.`);
    return;
  }

  const revenueEur = Number(r.revenue);
  const lines = [
    `👤 <b>Клиент: ${clientName}</b>`,
    '',
    `📊 Посещения: ${total}`,
    `💵 Общ оборот: <b>${revenueEur.toFixed(0)} €</b> (${eurToLv(revenueEur)} лв)`,
    `💡 Средно на посещение: ${total > 0 ? (revenueEur / total).toFixed(0) : 0} €`,
  ];
  if (r.top_service) lines.push(`✂️ Любима услуга: ${r.top_service}`);
  if (r.first_visit) lines.push(`📅 Първо посещение: ${formatDateBg(r.first_visit, { day: 'numeric', month: 'long', year: 'numeric' })}`);
  if (r.last_visit) lines.push(`📅 Последно посещение: ${formatDateBg(r.last_visit, { day: 'numeric', month: 'long', year: 'numeric' })}`);

  await sendTelegramMessage(chatId, lines.join('\n'));
}

async function handleClientCountMonth(chatId: number, salon: SalonRef): Promise<void> {
  const today = new Date();
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

  const rows = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(DISTINCT lower(client_name))::int AS unique_clients
    FROM bookings
    WHERE salon_id = CAST(${salon.salonId} AS uuid)
      AND date >= ${monthStart}
      AND status NOT IN ('cancelled')
  ` as { total: number; unique_clients: number }[];

  const r = rows[0]!;
  const month = today.toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' });
  await sendTelegramMessage(
    chatId,
    `👥 <b>${month}:</b>\n\n📊 Резервации: ${r.total}\n👤 Уникални клиенти: ${r.unique_clients}`,
  );
}

async function handleTopServices(chatId: number, salon: SalonRef): Promise<void> {
  const rows = await sql`
    SELECT service_name, COUNT(*)::int AS cnt, COALESCE(SUM(service_price), 0)::numeric AS revenue
    FROM bookings
    WHERE salon_id = CAST(${salon.salonId} AS uuid)
      AND status NOT IN ('cancelled')
      AND date >= ${offsetDayISO(-90)}
    GROUP BY service_name
    ORDER BY cnt DESC
    LIMIT 5
  ` as { service_name: string; cnt: number; revenue: number }[];

  if (rows.length === 0) {
    await sendTelegramMessage(chatId, 'ℹ️ Все още няма данни за популярността на услугите.');
    return;
  }

  const lines = ['🏆 <b>Топ услуги (последните 90 дни):</b>', ''];
  rows.forEach((r, i) => {
    lines.push(`${i + 1}. <b>${r.service_name}</b> — ${r.cnt} пъти — ${Number(r.revenue).toFixed(0)} €`);
  });
  await sendTelegramMessage(chatId, lines.join('\n'));
}

// ─── Working hours helpers ───────────────────────────────────────────────────

async function updateSingleDayHours(
  salonId: string,
  slug: string,
  dayKey: string,
  hours: { open: string; close: string } | null,
): Promise<void> {
  const rows = await sql`
    SELECT working_hours FROM salons WHERE CAST(id AS text) = ${salonId} LIMIT 1
  `;
  const wh = ((rows[0]?.working_hours ?? {}) as Record<string, unknown>);
  const updated = {
    ...wh,
    [dayKey]: hours ? { open: hours.open, close: hours.close } : { closed: true },
  };
  await sql`
    UPDATE salons SET working_hours = ${JSON.stringify(updated)}::jsonb, updated_at = now()
    WHERE CAST(id AS text) = ${salonId}
  `;
  revalidateTag(`salon-public-${slug}`);
}

async function updateWorkingHoursClose(salonId: string, slug: string, closeTime: string): Promise<void> {
  const rows = await sql`
    SELECT working_hours FROM salons WHERE CAST(id AS text) = ${salonId} LIMIT 1
  `;
  const wh = ((rows[0]?.working_hours ?? {}) as Record<string, { open?: string; close?: string; closed?: boolean }>);
  const today = new Date().getDay();
  const keysToUpdate = JS_DAY_TO_BG_KEY.slice(today);
  const updated = { ...wh };
  for (const key of keysToUpdate) {
    const existing = updated[key];
    if (existing && !existing.closed) updated[key] = { ...existing, close: closeTime };
  }
  await sql`
    UPDATE salons SET working_hours = ${JSON.stringify(updated)}::jsonb, updated_at = now()
    WHERE CAST(id AS text) = ${salonId}
  `;
  revalidateTag(`salon-public-${slug}`);
}

async function blockAllDay(salonId: string, slug: string, date: string): Promise<void> {
  const rows = await sql`
    SELECT opening_hours FROM salons WHERE CAST(id AS text) = ${salonId} LIMIT 1
  `;
  const current = (rows[0]?.opening_hours && typeof rows[0].opening_hours === 'object'
    ? rows[0].opening_hours : {}) as Record<string, unknown>;

  const { normalizeBookingBlocks } = await import('@/lib/booking-blocks');
  const blocks = normalizeBookingBlocks(current.booking_blocks);
  if (!blocks.some((b) => b.date === date && b.allDay)) {
    blocks.push({ date, allDay: true, start: '00:00', end: '23:59', note: 'Почивен ден (Telegram)' });
  }
  await sql`
    UPDATE salons SET opening_hours = ${JSON.stringify({ ...current, booking_blocks: blocks })}::jsonb, updated_at = now()
    WHERE CAST(id AS text) = ${salonId}
  `;
  revalidateTag(`salon-public-${slug}`);
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function findServiceIndex(services: ServiceItem[], name: string): number {
  const exact = services.findIndex((s) => s.name.toLowerCase() === name.toLowerCase());
  if (exact !== -1) return exact;
  return services.findIndex(
    (s) => s.name.toLowerCase().includes(name.toLowerCase()) ||
           name.toLowerCase().includes(s.name.toLowerCase()),
  );
}

function listServicesText(services: ServiceItem[]): string {
  if (services.length === 0) return 'Все още няма добавени услуги.';
  return 'Налични услуги:\n' + services.map((s) => `• ${s.name}`).join('\n');
}

function pluralBooking(n: number): string {
  return n === 1 ? 'запис' : 'записа';
}
