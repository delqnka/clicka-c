/**
 * Telegram admin commands — service management, working hours, booking management, and queries.
 * Called from the Telegram webhook when the message is from the salon owner.
 */
import crypto from 'crypto';
import { sql } from '@/lib/db';
import { revalidateTag } from 'next/cache';
import { sendTelegramMessage } from '@/lib/telegram';
import { normalizeServices, type ServiceItem } from '@/lib/salon-services';
import { normalizeImageList } from '@/lib/admin-site';
import { uploadToR2 } from '@/lib/r2';
import sharp from 'sharp';
import { sendSmsReminder } from '@/lib/smsapi';
import {
  getOpenRouterApiKey,
  OPENROUTER_BASE,
  openRouterHeaders,
} from '@/lib/openrouter';
import { normalizeBookingBlocks, type BookingBlock } from '@/lib/booking-blocks';

// ─── Conversation history (persisted in DB per chatId, last 12 messages) ─────
type HistoryMessage = { role: 'user' | 'assistant'; content: string };

async function getHistory(chatId: number): Promise<HistoryMessage[]> {
  try {
    const rows = await sql`SELECT ai_chat_history FROM salons WHERE telegram_chat_id = ${String(chatId)} LIMIT 1`;
    const row = rows[0] as { ai_chat_history: HistoryMessage[] | null } | undefined;
    return row?.ai_chat_history ?? [];
  } catch {
    return [];
  }
}

async function saveHistory(chatId: number, history: HistoryMessage[]): Promise<void> {
  try {
    const trimmed = history.slice(-12);
    await sql`UPDATE salons SET ai_chat_history = ${JSON.stringify(trimmed)}::jsonb WHERE telegram_chat_id = ${String(chatId)}`;
  } catch {
    // non-critical
  }
}

async function appendHistory(chatId: number, role: 'user' | 'assistant', content: string): Promise<void> {
  const history = await getHistory(chatId);
  history.push({ role, content });
  await saveHistory(chatId, history);
}

// ─── Conversation state machine (persisted in DB, cleared after use) ─────────
// Gemini is used ONLY for intent detection. All multi-step flows are managed here.

const STATE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CTX_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours for last_context

// Entity stored in last_context — data snapshotted at list-show time, no extra DB round-trip
type LastContextEntity = {
  id: string;
  name: string;
  phone?: string;
  time?: string;
  date?: string;
  service_name?: string;
  price?: number;
};

type ConvState =
  | { type: 'waiting_reschedule_time'; booking_id: string; client_name: string; from_date: string; to_date: string; created_at: string }
  | { type: 'waiting_block_confirm'; date: string; created_at: string }
  | { type: 'waiting_block_and_reschedule'; block_date: string; booking_id: string; client_name: string; to_date: string; to_time: string; created_at: string }
  | { type: 'last_context'; entity_type: 'booking' | 'service' | 'client' | 'review'; entities: LastContextEntity[]; selected_entity?: LastContextEntity; created_at: string }
  | { type: 'waiting_entity_clarification'; pending_command: string; entities: LastContextEntity[]; created_at: string }
  | { type: 'last_photo'; url: string; created_at: string }
  | { type: 'last_imported_services'; serviceNames: string[]; created_at: string }
  | { type: 'last_client'; clientId: string | null; name: string; created_at: string }
  | { type: 'last_booking'; bookingId: string; clientName: string; clientId: string | null; date: string; time: string; serviceName: string; created_at: string }
  | { type: 'last_service'; name: string; created_at: string }
  | { type: 'waiting_confirm_save_phone'; clientName: string; phone: string; clientId: string | null; clientExists: boolean; created_at: string }
  | { type: 'waiting_disambig_save_phone'; candidates: { name: string; id: string; hint: string }[]; contact: string; created_at: string };

async function getState(chatId: number): Promise<ConvState | null> {
  try {
    const rows = await sql`SELECT bot_conversation_state FROM salons WHERE telegram_chat_id = ${String(chatId)} LIMIT 1`;
    const row = rows[0] as { bot_conversation_state: ConvState | null } | undefined;
    const state = row?.bot_conversation_state ?? null;
    if (!state) return null;
    // last_context and waiting_entity_clarification live 2 hours; other states expire after 30 min
    const ttl = (state.type === 'last_context' || state.type === 'waiting_entity_clarification') ? CTX_TTL_MS : STATE_TTL_MS;
    if (Date.now() - new Date(state.created_at).getTime() > ttl) {
      await clearStateRaw(chatId);
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

async function setState(chatId: number, state: ConvState): Promise<void> {
  try {
    await sql`UPDATE salons SET bot_conversation_state = ${JSON.stringify(state)}::jsonb WHERE telegram_chat_id = ${String(chatId)}`;
  } catch {
    // non-critical
  }
}

async function clearStateRaw(chatId: number): Promise<void> {
  try {
    await sql`UPDATE salons SET bot_conversation_state = NULL WHERE telegram_chat_id = ${String(chatId)}`;
  } catch { /* non-critical */ }
}

async function clearState(chatId: number): Promise<void> {
  await clearStateRaw(chatId);
}

// ─── Regex patterns ─────────────────────────────────────────────────────────

// Matches "нов клиент ..." with booking info (date or time present)
const NEW_CLIENT_BOOKING_RE =
  /^(?:нов[а]?\s+клиент[аa]?|добав(?:[ии]|ете(?:\s+ми)?)\s+(?:ми\s+)?нов[а]?\s+клиент[аa]?)\s+(.+)/i;

const ADD_CLIENT_RE =
  /^(?:добав(?:[ии]|ете(?:\s+ми)?)|запиш[ии]|регистрир[ии])\s+(?:ми\s+)?(?:нов[а]?\s+)?клиент[аa]?\s+(.+)/i;

const ADD_SERVICE_RE =
  /^(?:добав(?:[ии]|яне\s+на|ете(?:\s+ми)?)|add)\s+(?:ми\s+)?(?:нова\s+)?(?:услуг[аa][:：]?\s+)?(.+)/i;

const UPDATE_PRICE_RE =
  /^(?:промен[ии]|смен[ии])\s+цен(?:ата|а)\s+на\s+(.+?)\s+на\s+(\d+(?:[.,]\d+)?)\s*(лв|bgn|€|eur|лев)?$/i;

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

const REVENUE_LAST_WEEK_RE =
  /^(?:приход|оборот).*(?:минал|предишн).*седмиц|(?:приход|оборот).*седмиц.*(?:минал|предишн)/i;

const REVENUE_THIS_WEEK_RE =
  /^(?:приход|оборот).*седмиц/i;

const REVENUE_LAST_MONTH_RE =
  /^(?:приход|оборот).*(?:минал|предишн|предн).*месец|(?:приход|оборот).*месец.*(?:минал|предишн|предн)/i;

const REVENUE_THIS_MONTH_RE =
  /^(?:приход|оборот).*(?:месец|month)/i;

const REVENUE_LAST_YEAR_RE =
  /^(?:приход|оборот).*(?:минал|предишн|предн).*годин|(?:приход|оборот).*годин.*(?:минал|предишн|предн)/i;

const REVENUE_THIS_YEAR_RE =
  /^(?:приход|оборот).*годин/i;

const BOOKINGS_LAST_WEEK_RE =
  /^(?:колко\s+)?(?:записа?|резервации?|часов[еa]?|час[аa]?)\s+(?:имах?\s+)?(?:(?:минал|предишн)\w*\s+седмиц|седмиц\w*\s+(?:минал|предишн))/i;

const REVENUE_CLIENT_RE =
  /^(?:оборот|приход)[^\s]*\s+(?:от\s+(?:клиент\s+)?)?(.+)$/i;

const CLIENT_COUNT_LAST_WEEK_RE =
  /^колко\s+клиент.*(?:минал|предишн).*седмиц|^колко\s+клиент.*седмиц.*(?:минал|предишн)/i;

const CLIENT_COUNT_THIS_WEEK_RE =
  /^колко\s+клиент.*(?:тази|тая)\s+седмиц|^колко\s+клиент.*седмиц/i;

const CLIENT_COUNT_MONTH_RE =
  /^колко\s+клиент/i;

const NEW_CLIENTS_RE =
  /^(?:кои\s+са\s+(?:ми\s+)?)?(?:нов[иате]+\s+(?:ми\s+)?клиент|клиент[и]?\s+(?:нов|за\s+първи\s+път))/i;

const TOP_CLIENTS_RE =
  /^(?:топ|най-добр[иe]|най-верн[иe]|кои\s+са\s+(?:ми\s+)?(?:най-добр[иe]|топ|най-верн[иe]))\s+(?:ми\s+)?клиент|(?:клиент[и]?\s+(?:по(?=\s)|колко\s+са\s+(?:изхарч|платил))|кои\s+клиент.*(?:изхарч|платил|похарч))|\bвсич[кие]+\s+клиент.*(?:изхарч|платил|похарч|оборот|хар[ч])/i;

const TOP_SERVICES_RE =
  /^(?:кои\s+са\s+)?(?:най-популярни(?:те)?|топ)\s+(?:ми\s+)?услуги\b/i;

const DELETE_PHOTO_RE =
  /^(?:изтри[йи]|махни|премахни)(?:\s+(?:(?:последната\s+)?снимк[аaата]+|я|го|я))?$/i;

const LIST_SERVICES_RE =
  /^(?:покажи|виж|изброй)\s+(?:всички\s+)?услуги(?:те)?$/i;

const DELETE_IMPORTED_SERVICES_RE =
  /^(?:изтри[йи]|махни|премахни|изчисти)\s+(?:тези\s+)?(?:всички\s+)?(?:добавените?|внесените?|импортираните?|тези)\s+услуги(?:те)?$/i;

const PRICE_LIST_CAPTION_RE = /ценоразпис|прайс\s*лист|услуги\s+цени|price\s*list/i;

// Matches "номер на X", "телефона на X", "дай (ми) номера на X" etc. — without a phone number in the text
// Used to route directly to client_phone lookup (not save_client_contact)
const GET_CLIENT_PHONE_RE =
  /^(?:(?:дай\s+(?:ми\s+)?)?(?:номер[а]?|телефон[а]?(?:та)?)\s+(?:на\s+)?|какъв\s+е\s+телефон[аъ](?:т)?\s+(?:на\s+)?)(.+)$/i;

const FREE_SLOTS_RE =
  /(?:кога\s+(?:има\s+)?(?:свободн[оеа]|може|мога|мож[еа]\s+да\s+запиш[еа]?|има\s+час|е\s+свободн[оеа]))|(?:свободн[иоеа]\s+(?:часов[еa]?|час[аa]?|места?))|(?:има\s+ли\s+свободн[оеа])|(?:кога\s+(?:мога|можем)\s+да\s+(?:запиш[еа]?|дойд[еа]?))|(?:покажи\s+свободн[иоеа])|(?:кога\s+(?:си|сте)\s+свободн[иоеа]?)|(?:кога\s+следващи[ят]\s+свободен)/i;

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

export type SalonRef = {
  salonId: string;
  slug: string;
  name: string;
  /** Set for TEAM staff members — scopes all Telegram queries to this staff member only. */
  staffMemberId?: string | null;
};

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

  // ── Bare phone or email → apply to last_client if active ─────────────────
  const barePhone = /^(\+?(?:359|0)\d[\d\s\-]{6,12}\d)$/.exec(text.trim());
  const bareEmail = /^([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})$/.exec(text.trim());
  if (barePhone || bareEmail) {
    const state = await getState(chatId);
    if (state?.type === 'last_client') {
      const phone = barePhone?.[1]?.replace(/[\s\-]/g, '');
      const email = bareEmail?.[1];
      // Bot explicitly asked for the phone/email — save directly without second confirmation.
      await clearState(chatId);
      try {
        await upsertSalonClient(salon.salonId, state.name, { phone, email });
      } catch (err) {
        console.error('[TG_CLIENT] bare phone upsert failed:', err);
        await sendTelegramMessage(chatId, `❌ Грешка при запазване на телефона. Опитай пак.`);
        return true;
      }
      const detail = phone ? `телефон: <b>${phone}</b>` : `имейл: <b>${email}</b>`;
      await sendTelegramMessage(chatId, `✅ Запазих ${detail} за <b>${state.name}</b>.`);
      await appendHistory(chatId, 'user', text);
      await appendHistory(chatId, 'assistant', `[save_client_contact: ${state.name}${phone ? `, tel: ${phone}` : ''}${email ? `, email: ${email}` : ''}]`);
      return true;
    }
  }

  // ── Add service ──────────────────────────────────────────────────────────
  const addMatch = text.match(ADD_SERVICE_RE);
  const hasServiceKeyword = /услуг[аa]/i.test(text);
  const hasDurationOrPrice = /\d+\s*(?:ч|мин|часа|евро|лв|€|eur|bgn|лев)/i.test(text);
  const hasCategoryPhrase = /категори[яа]/i.test(text);
  // If the message mentions a category, let AI parse it — regex can't reliably handle "в нова/специална категория X"
  if (addMatch && (hasServiceKeyword || hasDurationOrPrice) && !hasCategoryPhrase) {
    const rawFull = addMatch[1]!.trim();

    // Parse duration — all formats:
    // "— 45 мин" | "за 45 мин" | "45мин" | "1ч" | "1ч30" | "1.5ч" | "за 2 часа" | "2 часа"
    let duration = 30;
    const dashMinMatch  = rawFull.match(/[—\-–]\s*(\d+)\s*мин/i);
    const forMinMatch   = rawFull.match(/(?:за\s+)?(\d+)\s*мин(?:ути?)?(?!\w)/i);
    const forHoursMatch = rawFull.match(/(?:за\s+)?(\d+(?:[.,]\d+)?)\s*часа?(?!\w)/i);
    const shortHrMin    = rawFull.match(/(\d+)ч(?:а?с?а?)?(?:\s*(\d+)\s*мин)?/i); // "1ч30мин" "1ч 30мин" "1ч"
    if (dashMinMatch)   duration = Math.max(5, parseInt(dashMinMatch[1]!, 10));
    else if (shortHrMin) {
      const hrs = parseInt(shortHrMin[1]!, 10);
      const mins = shortHrMin[2] ? parseInt(shortHrMin[2], 10) : 0;
      duration = Math.max(5, hrs * 60 + mins);
    }
    else if (forHoursMatch) duration = Math.max(5, Math.round(parseFloat(forHoursMatch[1]!.replace(',', '.')) * 60));
    else if (forMinMatch)   duration = Math.max(5, parseInt(forMinMatch[1]!, 10));

    // Parse price — all formats:
    // "— 60 лв/€" | "за 250 евро" | "250 евро" | "250€" | "250 лв"
    let price = 0;
    const dashPriceMatch = rawFull.match(/[—\-–]\s*(\d+(?:[.,]\d+)?)\s*(?:лв|bgn|€|eur|лев)/i);
    const anyPriceMatch  = rawFull.match(/(\d+(?:[.,]\d+)?)\s*(?:лв|bgn|€|eur|лев|евро)/i);
    if (dashPriceMatch) {
      const val = parseFloat(dashPriceMatch[1]!.replace(',', '.'));
      price = /€|eur/.test(dashPriceMatch[0]!.toLowerCase()) ? Math.round(val) : lvToEur(val);
    } else if (anyPriceMatch) {
      const val = parseFloat(anyPriceMatch[1]!.replace(',', '.'));
      price = /€|eur|евро/.test(anyPriceMatch[0]!.toLowerCase()) ? Math.round(val) : lvToEur(val);
    }

    // Parse category: "в категория X" | "в нова категория X" | "категория: X"
    let category: string | undefined;
    const catMatch = rawFull.match(/(?:в\s+)?(?:\w+\s+)?(?:категория|cat)[:：]?\s+([^—\-–\d]+?)(?:\s*[—\-–]|\s*\d|\s*$)/i);
    if (catMatch) category = catMatch[1]!.trim();

    // Extract clean service name (strip price/duration/category suffixes)
    const rawName = rawFull
      .replace(/\s*в\s+(?:\w+\s+)?(?:категория|cat)\s+.+$/i, '')
      .replace(/\s*(?:категория|cat)[:：]\s*.+$/i, '')
      .replace(/\s*[—\-–]\s*\d+\s*мин[^\s]*/gi, '')
      .replace(/\s*[—\-–]\s*\d+(?:[.,]\d+)?\s*(?:лв|bgn|€|eur|лев)/gi, '')
      .replace(/\s+\d+ч(?:а?с?а?)?\s*\d*(?:мин)?/gi, '')
      .replace(/\s+(?:за\s+)?\d+(?:[.,]\d+)?\s*(?:часа?|мин[^\s]*)/gi, '')
      .replace(/\s+(?:за\s+)?\d+(?:[.,]\d+)?\s*(?:лв|bgn|€|eur|лев|евро)/gi, '')
      .trim();

    if (!rawName) return await handleWithAI(chatId, text, salon);

    const services = await getSalonServices(salon.salonId);
    if (services.some((s) => s.name.toLowerCase() === rawName.toLowerCase())) {
      await sendTelegramMessage(chatId, `⚠️ Услугата <b>${rawName}</b> вече съществува.\nЗа да промениш цената: <code>Промени цената на ${rawName} на ${price} €</code>`);
      return true;
    }
    services.push({ name: rawName, price, duration_min: duration, ...(category ? { category } : {}) });
    await saveSalonServices(salon.salonId, salon.slug, services);
    const catInfo = category ? ` (${category})` : '';
    await sendTelegramMessage(chatId, `✅ Добавена услуга в <b>${salon.name}</b>:\n<b>${rawName}</b>${catInfo} — ${duration} мин — ${price} €`);
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
    const rawVal = parseFloat(priceMatch[2]!.replace(',', '.'));
    const unit = (priceMatch[3] ?? '').toLowerCase();
    const isEuro = /€|eur/.test(unit);
    const newPriceEur = isEuro ? Math.round(rawVal) : lvToEur(rawVal);
    const services = await getSalonServices(salon.salonId);
    const idx = findServiceIndex(services, targetName);
    if (idx === -1) {
      await sendTelegramMessage(chatId, `❌ Не намерих услуга <b>${targetName}</b>.\n\n${listServicesText(services)}`);
      return true;
    }
    services[idx]!.price = newPriceEur;
    await saveSalonServices(salon.salonId, salon.slug, services);
    await sendTelegramMessage(chatId, `✅ Цената на <b>${services[idx]!.name}</b> е <b>${newPriceEur} €</b>`);
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

  // ── Delete last imported services (from price list) ─────────────────────
  if (DELETE_IMPORTED_SERVICES_RE.test(text)) {
    const state = await getState(chatId);
    if (state?.type !== 'last_imported_services' || !state.serviceNames?.length) {
      await sendTelegramMessage(chatId, '⚠️ Не намерих последно добавени услуги от ценоразпис. Тази команда работи веднага след качване на ценоразпис.');
      return true;
    }
    const namesToRemove = new Set(state.serviceNames.map((n: string) => n.toLowerCase()));
    const services = await getSalonServices(salon.salonId);
    const remaining = services.filter(s => !namesToRemove.has(s.name.toLowerCase()));
    const removed = services.length - remaining.length;
    await saveSalonServices(salon.salonId, salon.slug, remaining);
    await clearState(chatId);
    await sendTelegramMessage(chatId, `🗑 Изтрити ${removed} услуги от последния ценоразпис.`);
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

  // ── Revenue last week ────────────────────────────────────────────────────
  if (REVENUE_LAST_WEEK_RE.test(text)) {
    await handleRevenue(chatId, salon, 'last_week');
    return true;
  }

  // ── Revenue this week ─────────────────────────────────────────────────────
  if (REVENUE_THIS_WEEK_RE.test(text)) {
    await handleRevenue(chatId, salon, 'week');
    return true;
  }

  // ── Revenue last month ────────────────────────────────────────────────────
  if (REVENUE_LAST_MONTH_RE.test(text)) {
    await handleRevenue(chatId, salon, 'last_month');
    return true;
  }

  // ── Revenue this month ────────────────────────────────────────────────────
  if (REVENUE_THIS_MONTH_RE.test(text)) {
    await handleRevenue(chatId, salon, 'month');
    return true;
  }

  // ── Revenue last year ─────────────────────────────────────────────────────
  if (REVENUE_LAST_YEAR_RE.test(text)) {
    await handleRevenue(chatId, salon, 'last_year');
    return true;
  }

  // ── Revenue this year ─────────────────────────────────────────────────────
  if (REVENUE_THIS_YEAR_RE.test(text)) {
    await handleRevenue(chatId, salon, 'year');
    return true;
  }

  // ── Bookings last week ────────────────────────────────────────────────────
  if (BOOKINGS_LAST_WEEK_RE.test(text)) {
    await handleBookingsForWeek(chatId, salon, 'last');
    return true;
  }

  // ── Client count — last week / this week / month ─────────────────────────
  if (CLIENT_COUNT_LAST_WEEK_RE.test(text)) {
    await handleClientCount(chatId, salon, 'last_week');
    return true;
  }
  if (CLIENT_COUNT_THIS_WEEK_RE.test(text)) {
    await handleClientCount(chatId, salon, 'week');
    return true;
  }
  if (CLIENT_COUNT_MONTH_RE.test(text)) {
    await handleClientCountMonth(chatId, salon);
    return true;
  }

  // ── New clients ───────────────────────────────────────────────────────────
  if (NEW_CLIENTS_RE.test(text)) {
    await handleNewClients(chatId, salon);
    return true;
  }

  // ── Top clients by spend ──────────────────────────────────────────────────
  if (TOP_CLIENTS_RE.test(text)) {
    await handleTopClients(chatId, salon);
    return true;
  }

  // ── Top services ──────────────────────────────────────────────────────────
  if (TOP_SERVICES_RE.test(text)) {
    await handleTopServices(chatId, salon);
    return true;
  }

  // ── /state debug command ─────────────────────────────────────────────────
  if (text.trim().toLowerCase() === '/state') {
    const s = await getState(chatId);
    if (!s) {
      await sendTelegramMessage(chatId, `🟢 <b>State:</b> няма активен state`);
    } else {
      const age = Math.round((Date.now() - new Date(s.created_at).getTime()) / 1000);
      const expiresIn = Math.max(0, Math.round((STATE_TTL_MS - (Date.now() - new Date(s.created_at).getTime())) / 1000));
      const isoToDMY = (v: string) => /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(8, 10) + '-' + v.slice(5, 7) + '-' + v.slice(0, 4) : v;
      const display = JSON.stringify(s, (_k, v) => typeof v === 'string' ? isoToDMY(v) : v, 2);
      const lines = [
        `🔍 <b>Bot State Debug</b>`,
        `<code>${display}</code>`,
        ``,
        `⏱ Възраст: ${age}с | Изтича след: ${expiresIn}с`,
      ];
      await sendTelegramMessage(chatId, lines.join('\n'));
    }
    return true;
  }

  // ── Delete last photo ────────────────────────────────────────────────────
  // For bare "изтрий" / "изтрий я" — only trigger if last_photo state is active
  const photoDeleteMatch = DELETE_PHOTO_RE.test(text);
  const isBareDelete = /^(?:изтри[йи]|махни|премахни)(?:\s+(?:я|го))?$/i.test(text.trim());
  if (photoDeleteMatch) {
    const state = await getState(chatId);
    if (isBareDelete && state?.type !== 'last_photo') {
      // Bare "изтрий" without photo context — fall through to AI
      return await handleWithAI(chatId, text, salon);
    }
    if (state?.type === 'last_photo') {
      const url = state.url;
      // Remove from gallery_images and portfolio_images
      const rows = await sql`SELECT gallery_images, portfolio_images FROM salons WHERE CAST(id AS text) = ${salon.salonId} LIMIT 1`;
      const gallery = normalizeImageList(rows[0]?.gallery_images).filter((u: string) => u !== url);
      const portfolio = normalizeImageList(rows[0]?.portfolio_images).filter((u: string) => u !== url);
      await sql`UPDATE salons SET gallery_images = ${JSON.stringify(gallery)}::jsonb, portfolio_images = ${JSON.stringify(portfolio)}::jsonb, updated_at = now() WHERE CAST(id AS text) = ${salon.salonId}`;
      revalidateTag(`salon-public-${salon.slug}`);
      await clearState(chatId);
      await sendTelegramMessage(chatId, '🗑 Снимката е изтрита.');
    } else {
      await sendTelegramMessage(chatId, '⚠️ Не намерих последно качена снимка. Изтриването работи веднага след качване.');
    }
    return true;
  }

  // ── "Нов клиент ИМЕ" без booking детайли → save_client_contact ──────────
  // Guards against AI misrouting "нов клиент Мария" to create_booking when
  // last_booking/last_service context is active.
  const NEW_CLIENT_PLAIN_RE =
    /^(?:нов[а]?\s+клиент[аa]?|запиши?\s+(?:нов[а]?\s+)?клиент[аa]?|добав[ии]\s+(?:ми\s+)?(?:нов[а]?\s+)?клиент[аa]?)\s+(.+)/i;
  const BOOKING_SIGNALS_RE =
    /\d{1,2}:\d{2}|утре|днес|вчера|понеделник|вторник|сряда|четвъртък|петък|събота|неделя|следващ|тази\s+седмица/i;
  const newClientMatch = text.match(NEW_CLIENT_PLAIN_RE);
  if (newClientMatch) {
    const rest = newClientMatch[1]!.trim();
    // If no booking signals detected → treat as a plain "add client" command
    if (!BOOKING_SIGNALS_RE.test(rest)) {
      // Extract phone/email if present, rest is the client name
      const phoneMatch = rest.match(/(\+?(?:359|0)\d[\d\s\-]{6,12}\d)/);
      const emailMatch = rest.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
      const clientName = rest
        .replace(phoneMatch?.[0] ?? '', '')
        .replace(emailMatch?.[0] ?? '', '')
        .trim();
      if (clientName) {
        await handleSaveClientContact(chatId, salon, clientName, phoneMatch?.[1]?.replace(/[\s\-]/g, ''), emailMatch?.[1]);
        return true;
      }
    }
  }

  // ── Fast path: "ИМЕ ТЕЛЕФОН [услуга] [дата] [час]" — regex parse, no AI ──
  // Only triggers when phone comes BEFORE booking signals, i.e. "Мария 0884595000 маникюр утре 10ч".
  // If phone comes AFTER booking info (e.g. "Мария маникюр утре\n08845...") → skip to AI.
  {
    const PHONE_IN_TEXT_RE = /(\+?(?:359|0)\d[\d\s\-]{6,12}\d)/;
    const phoneInTextMatch = text.match(PHONE_IN_TEXT_RE);
    if (phoneInTextMatch) {
      const phonePos = text.indexOf(phoneInTextMatch[0]);
      const bookingSignalMatch = text.search(BOOKING_SIGNALS_RE);
      // Only fast-path if phone is on first line and no booking signals appear before the phone
      const firstLineEnd = text.indexOf('\n');
      const phoneIsOnFirstLine = firstLineEnd === -1 || phonePos < firstLineEnd;
      if (phoneIsOnFirstLine && (bookingSignalMatch === -1 || phonePos <= bookingSignalMatch)) {
        // Strip leading action verbs so name extraction works correctly
        const ACTION_PREFIX_RE = /^(?:запиши?\s+(?:нов[а]?\s+)?(?:клиент[аa]?\s+)?|добав[ии]\s+(?:ми\s+)?(?:нов[а]?\s+)?(?:клиент[аa]?\s+)?(?:телефон(?:а|ът)?\s+на\s+|тел(?:ефон)?\.?\s+на\s+|номер(?:а|ът)?\s+на\s+)?|нов[а]?\s+клиент[аa]?\s+)/i;
        const stripped = text.replace(ACTION_PREFIX_RE, '').trim();
        const handled = await handleNewClientWithBooking(chatId, text, stripped, salon);
        if (handled) return true;
      }
    }
  }

  // ── "Номер на X" / "телефон на X" without a phone number → client_phone lookup ──
  // Guards against AI misrouting "номер на Мария Петрова" to save_client_contact
  // with the full phrase as the client name.
  {
    const BARE_PHONE_PRESENT_RE = /\+?(?:359|0)\d[\d\s\-]{6,12}\d/;
    const clientPhoneMatch = text.match(GET_CLIENT_PHONE_RE);
    if (clientPhoneMatch && !BARE_PHONE_PRESENT_RE.test(text)) {
      const clientName = clientPhoneMatch[1]!.trim();
      // Sanity check: name shouldn't look like a bare phone number or contain booking signals
      const BOOKING_SIGNALS_RE2 = /\d{1,2}:\d{2}|утре|днес|понеделник|вторник|сряда|четвъртък|петък|събота|неделя/i;
      if (clientName && !BOOKING_SIGNALS_RE2.test(clientName)) {
        await handleClientPhone(chatId, salon, clientName);
        return true;
      }
    }
  }

  // ── Free slots query ─────────────────────────────────────────────────────
  if (FREE_SLOTS_RE.test(text)) {
    return await handleWithAI(chatId, text, salon);
  }

  // ── AI fallback — free natural language ──────────────────────────────────
  return await handleWithAI(chatId, text, salon);
}

// ─── AI natural language fallback ────────────────────────────────────────────

type AIIntent =
  | { action: 'bookings_day'; date: string }
  | { action: 'bookings_week' }
  | { action: 'next_client' }
  | { action: 'revenue_week' }
  | { action: 'revenue_month' }
  | { action: 'revenue_months'; months?: number }
  | { action: 'revenue_range'; date_from: string; date_to: string }
  | { action: 'revenue_compare' }
  | { action: 'avg_booking_value' }
  | { action: 'revenue_client'; client_name: string }
  | { action: 'client_count' }
  | { action: 'list_clients' }
  | { action: 'inactive_clients'; months: number }
  | { action: 'top_services' }
  | { action: 'list_services' }
  | { action: 'pending_bookings' }
  | { action: 'create_booking'; client_name: string; service_name: string; date: string; time: string; phone?: string; email?: string }
  | { action: 'complete_booking'; client_name: string }
  | { action: 'sort_services'; by: 'price_asc' | 'price_desc' | 'duration_asc' | 'name_asc' }
  | { action: 'add_service'; name: string; duration_min: number; price_eur: number; category?: string; variants?: { label: string; price: number }[] }
  | { action: 'update_price'; service_name: string; price_eur: number }
  | { action: 'update_service'; service_name: string; price_eur?: number; duration_min?: number; category?: string; new_name?: string }
  | { action: 'update_category'; service_name: string; category: string }
  | { action: 'delete_service'; service_name: string }
  | { action: 'clarify'; question: string }
  | { action: 'block_hours'; date: string; start: string; end: string; note?: string }
  | { action: 'day_off'; date: string }
  | { action: 'unblock_day'; date: string }
  | { action: 'day_hours'; day_key: string; open: string; close: string }
  | { action: 'day_closed'; day_key: string }
  | { action: 'work_until'; close_time: string }
  | { action: 'update_phone'; phone: string }
  | { action: 'update_instagram'; handle: string }
  | { action: 'update_facebook'; handle: string }
  | { action: 'update_tiktok'; handle: string }
  | { action: 'update_google_maps'; url: string }
  | { action: 'update_email'; email: string }
  | { action: 'update_bio'; bio: string }
  | { action: 'update_owner_bio'; bio: string }
  | { action: 'sms_balance' }
  | { action: 'toggle_sms'; enabled: boolean }
  | { action: 'send_sms_to_client'; client_name: string; message?: string }
  | { action: 'confirm_booking'; client_name: string }
  | { action: 'cancel_booking'; date: string; time: string }
  | { action: 'remind_tomorrow' }
  | { action: 'client_phone'; client_name: string }
  | { action: 'save_client_contact'; client_name: string; phone?: string; email?: string }
  | { action: 'save_client_note'; client_name: string; note: string }
  | { action: 'client_note'; client_name: string }
  | { action: 'client_bookings'; client_name: string }
  | { action: 'reschedule_booking'; client_name: string; from_date: string; to_date: string; to_time?: string }
  | { action: 'update_booking_service'; client_name: string; date: string; time: string; new_service: string }
  | { action: 'confirm_day_off'; date: string }
  | { action: 'find_free_slots'; date_from?: string; date_to?: string; after_time?: string; service_name?: string; duration_min?: number }
  | { action: 'chat'; reply: string };

// ─── Free slot finder ────────────────────────────────────────────────────────

function parseSlotInterval(openingHours: unknown): number {
  if (openingHours && typeof openingHours === 'object') {
    const v = Number((openingHours as Record<string, unknown>).slot_interval_min);
    if ([15, 20, 30, 45, 60].includes(v)) return v;
  }
  return 30;
}

type FreeSlot = { date: string; time: string; label: string };

const JS_DAY_KEY = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

async function findNearestFreeSlots(
  salonId: string,
  skipDate: string,
  durationMin: number,
  limit = 3,
): Promise<FreeSlot[]> {
  // Load working hours + slot interval
  const whRows = await sql`SELECT working_hours, opening_hours FROM salons WHERE CAST(id AS text) = ${salonId} LIMIT 1`;
  const wh = (whRows[0]?.working_hours ?? {}) as Record<string, { open?: string; close?: string; closed?: boolean }>;
  const SLOT_STEP = parseSlotInterval(whRows[0]?.opening_hours);

  // Load bookings for the next 14 days
  const searchStart = offsetDayISO(1);
  const searchEnd = offsetDayISO(15);
  const bookingRows = await sql`
    SELECT date, time, COALESCE(service_duration, 60) AS duration
    FROM bookings
    WHERE CAST(salon_id AS text) = ${salonId}
      AND date >= ${searchStart}
      AND date <= ${searchEnd}
      AND status NOT IN ('cancelled', 'completed')
    ORDER BY date, time
  ` as { date: string; time: string; duration: number }[];

  // Index bookings by date
  const bookedByDate = new Map<string, { startMin: number; endMin: number }[]>();
  for (const b of bookingRows) {
    const [bh, bm] = b.time.split(':').map(Number);
    const startMin = (bh ?? 0) * 60 + (bm ?? 0);
    const endMin = startMin + b.duration;
    const list = bookedByDate.get(b.date) ?? [];
    list.push({ startMin, endMin });
    bookedByDate.set(b.date, list);
  }

  const slots: FreeSlot[] = [];

  for (let d = 1; d <= 14 && slots.length < limit; d++) {
    const dateStr = offsetDayISO(d);
    if (dateStr === skipDate) continue;

    const jsDay = new Date(dateStr + 'T12:00:00').getDay();
    const dayKey = JS_DAY_KEY[jsDay]!;
    const dayHours = wh[dayKey];
    if (!dayHours || dayHours.closed || !dayHours.open || !dayHours.close) continue;

    const [oh, om] = dayHours.open.split(':').map(Number);
    const [ch, cm] = dayHours.close.split(':').map(Number);
    const openMin = (oh ?? 9) * 60 + (om ?? 0);
    const closeMin = (ch ?? 18) * 60 + (cm ?? 0);
    const booked = bookedByDate.get(dateStr) ?? [];

    for (let t = openMin; t + durationMin <= closeMin && slots.length < limit; t += SLOT_STEP) {
      const overlaps = booked.some(b => t < b.endMin && t + durationMin > b.startMin);
      if (!overlaps) {
        const hh = String(Math.floor(t / 60)).padStart(2, '0');
        const mm = String(t % 60).padStart(2, '0');
        const timeStr = `${hh}:${mm}`;
        const dateObj = new Date(dateStr + 'T12:00:00');
        const dayName = dateObj.toLocaleDateString('bg-BG', { weekday: 'long' });
        const dayNum = dateObj.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long' });
        slots.push({ date: dateStr, time: timeStr, label: `${dayName} ${dayNum} в ${timeStr}` });
        // One slot per day is enough to keep the list clean
        break;
      }
    }
  }

  return slots;
}

async function handleFindFreeSlots(
  chatId: number,
  salon: SalonRef,
  opts: { date_from?: string; date_to?: string; after_time?: string; service_name?: string; duration_min?: number },
): Promise<void> {
  const today = todayISO();
  const fromDate = opts.date_from && opts.date_from >= today ? opts.date_from : today;
  const toDate = opts.date_to ?? offsetDayISO(14);

  // Resolve duration from service name if not provided directly
  let durationMin = opts.duration_min ?? 30;
  if (opts.service_name && !opts.duration_min) {
    const services = await getSalonServices(salon.salonId);
    const idx = findServiceIndex(services, opts.service_name);
    if (idx !== -1) durationMin = services[idx]!.duration_min;
  }

  // Load working hours + slot interval
  const whRows = await sql`SELECT working_hours, opening_hours FROM salons WHERE CAST(id AS text) = ${salon.salonId} LIMIT 1`;
  const wh = (whRows[0]?.working_hours ?? {}) as Record<string, { open?: string; close?: string; closed?: boolean }>;
  const SLOT_STEP = parseSlotInterval(whRows[0]?.opening_hours);

  // Load bookings in range
  const bookingRows = await sql`
    SELECT date, time, COALESCE(service_duration, 60) AS duration
    FROM bookings
    WHERE CAST(salon_id AS text) = ${salon.salonId}
      AND date >= ${fromDate}
      AND date <= ${toDate}
      AND status NOT IN ('cancelled', 'completed')
    ORDER BY date, time
  ` as { date: string; time: string; duration: number }[];

  const bookedByDate = new Map<string, { startMin: number; endMin: number }[]>();
  for (const b of bookingRows) {
    const [bh, bm] = b.time.split(':').map(Number);
    const startMin = (bh ?? 0) * 60 + (bm ?? 0);
    const endMin = startMin + b.duration;
    const list = bookedByDate.get(b.date) ?? [];
    list.push({ startMin, endMin });
    bookedByDate.set(b.date, list);
  }

  // Parse after_time constraint (e.g. "14:00")
  let afterMin = 0;
  if (opts.after_time) {
    const [ah, am] = opts.after_time.split(':').map(Number);
    afterMin = (ah ?? 0) * 60 + (am ?? 0);
  }

  const slots: FreeSlot[] = [];
  const SLOTS_PER_DAY = 3;
  const MAX_TOTAL = 8;

  // Iterate days from fromDate to toDate
  let d = new Date(fromDate + 'T12:00:00');
  const end = new Date(toDate + 'T12:00:00');
  while (d <= end && slots.length < MAX_TOTAL) {
    const dateStr = d.toISOString().slice(0, 10);
    const jsDay = d.getDay();
    const dayKey = JS_DAY_KEY[jsDay]!;
    const dayHours = wh[dayKey];
    if (!dayHours || dayHours.closed || !dayHours.open || !dayHours.close) {
      d.setDate(d.getDate() + 1);
      continue;
    }

    const [oh, om] = dayHours.open.split(':').map(Number);
    const [ch, cm] = dayHours.close.split(':').map(Number);
    const openMin = Math.max((oh ?? 9) * 60 + (om ?? 0), afterMin);
    const closeMin = (ch ?? 18) * 60 + (cm ?? 0);
    const booked = bookedByDate.get(dateStr) ?? [];

    let slotsThisDay = 0;
    for (let t = openMin; t + durationMin <= closeMin && slotsThisDay < SLOTS_PER_DAY && slots.length < MAX_TOTAL; t += SLOT_STEP) {
      const overlaps = booked.some(b => t < b.endMin && t + durationMin > b.startMin);
      if (!overlaps) {
        const hh = String(Math.floor(t / 60)).padStart(2, '0');
        const mm = String(t % 60).padStart(2, '0');
        const timeStr = `${hh}:${mm}`;
        const dayName = d.toLocaleDateString('bg-BG', { weekday: 'long' });
        const dayNum = d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long' });
        slots.push({ date: dateStr, time: timeStr, label: `${dayName} ${dayNum} в ${timeStr}` });
        slotsThisDay++;
      }
    }

    d.setDate(d.getDate() + 1);
  }

  if (slots.length === 0) {
    const rangeLabel = opts.date_to
      ? `до ${formatDateBg(toDate)}`
      : `в следващите 2 седмици`;
    await sendTelegramMessage(chatId, `😔 Нямам свободни часове ${rangeLabel}. Провери работното си време или блокираните дни.`);
    return;
  }

  const serviceLabel = opts.service_name ? ` за <b>${opts.service_name}</b>` : '';
  const lines = [`📅 <b>Свободни часове${serviceLabel}:</b>`, ''];

  let lastDate = '';
  for (const s of slots) {
    if (s.date !== lastDate) {
      if (lastDate) lines.push('');
      const dateObj = new Date(s.date + 'T12:00:00');
      lines.push(`<b>${dateObj.toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' })}</b>`);
      lastDate = s.date;
    }
    lines.push(`  • ${s.time}`);
  }

  lines.push('', '💡 Кажи "запиши [клиент] [услуга] [ден] в [час]" за да запазиш час.');
  await sendTelegramMessage(chatId, lines.join('\n'));
}

// Match "в 09:30", "09:30", "в 9", "14" etc.
const TIME_ONLY_RE = /^(?:в\s+)?(\d{1,2})(?::(\d{2}))?\s*(?:ч(?:аса?)?)?$/i;

function parseTimeOnly(text: string): string | null {
  const m = text.trim().match(TIME_ONLY_RE);
  if (!m) return null;
  let hh = parseInt(m[1]!, 10);
  const mm = m[2] ? parseInt(m[2], 10) : 0;
  if (hh < 7) hh += 12;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

const CONFIRM_RE = /^(да|yes|ок|okay|потвърди|потвърждавам|блокирай|добре|разбира\s+се)$/i;
const DENY_RE = /^(не|no|отказвам|откажи|стоп|cancel)$/i;

// ─── last_context reference resolution ───────────────────────────────────────

// "дай ми номерата им" / "телефоните им" / "номерата на всичките"
const CTX_PHONES_ALL_RE = /^(?:(?:дай|покажи)\s+)?(?:ми\s+)?(?:номер[аитe]{0,4}|телефон[иитe]{0,4})\s*(?:им|на\s+(?:всичк\w+|тях))?$/i;

// "имейлите им" / "имейл адресите им"
const CTX_EMAILS_ALL_RE = /^(?:(?:дай|покажи)\s+)?(?:ми\s+)?имейл\w*\s*(?:им|на\s+(?:всичк\w+|тях))?$/i;

// "изпрати им SMS" / "напомни им" / "прати им съобщение"
const CTX_SMS_ALL_RE = /^(?:изпрати|прати|напомни)\s+(?:им|на\s+всичк\w+|тях)/i;

// "дай телефона на 2" / "номера на 3"
const CTX_PHONE_NTH_RE = /^(?:(?:дай|покажи)\s+)?(?:ми\s+)?(?:номер[а]?|телефон[а]?)\s+(?:на\s+)?(\d+|първ\w+|втор\w+|трет\w+|четвърт\w+|пет\w+)$/i;

// "откажи 2" / "откажи втория"
const CTX_CANCEL_NTH_RE = /^(?:откажи|анулирай)\s+(\d+|първ\w+|втор\w+|трет\w+|четвърт\w+|пет\w+)\b/i;

// "потвърди 2" / "потвърди първия"
const CTX_CONFIRM_NTH_RE = /^потвърди\s+(\d+|първ\w+|втор\w+|трет\w+|четвърт\w+|пет\w+)$/i;

// "премести 2 за утре в 15" — resolves index, rewrites, re-routes to AI
const CTX_MOVE_NTH_RE = /^(?:премест[ии]|мест[ии])\s+(\d+|първ\w+|втор\w+|трет\w+|четвърт\w+|пет\w+)\b(.*)/i;

// "премести часа ѝ / нея / него за вторник в 12" — pronoun ref to selected_entity
const CTX_MOVE_PRONOUN_RE = /^(?:премест[ии]|мест[ии])\s+(?:часа?\s+)?(?:й\b|и́|нея|него|я\b|го\b|тя\b|той\b|тази\b|този\b|му\b)(.*)/i;

// "откажи я / го / нея / него"
const CTX_CANCEL_PRONOUN_RE = /^(?:откажи|анулирай)\s+(?:я\b|го\b|нея\b|него\b|тя\b|той\b|тази\b|този\b)$/i;

// "потвърди я / го / нея / него"
const CTX_CONFIRM_PRONOUN_RE = /^потвърди\s+(?:я\b|го\b|нея\b|него\b|тя\b|той\b|тази\b|този\b)$/i;

// "дай телефона й / му / и́"
const CTX_PHONE_PRONOUN_RE = /^(?:(?:дай|покажи)\s+)?(?:ми\s+)?(?:номер[а]?|телефон[а]?)\s+(?:й\b|и́|му\b|нея\b|него\b|й\b)$/i;

// "дай имейла й / му"
const CTX_EMAIL_PRONOUN_RE = /^(?:(?:дай|покажи)\s+)?(?:ми\s+)?имейл\w*\s+(?:й\b|и́|му\b|нея\b|него\b)$/i;

// "кой е първия" / "втория" / "3" / "3-ти" — shows entity info
const CTX_NTH_INFO_RE = /^(?:кой\s+е\s+)?(\d+|първ\w+|втор\w+|трет\w+|четвърт\w+|пет\w+)(?:\s+(?:клиент|от\s+тях|запис))?[?]?$/i;

// "2" / "за 2" / "втория" — disambiguation reply when bot asked "Кой клиент?"
const CTX_DISAMBIGUATION_RE = /^(?:за\s+)?(\d+|първ\w+|втор\w+|трет\w+|четвърт\w+|пет\w+)[.\s]*$/i;

function resolveOrdinalToIndex(token: string): number | null {
  const t = token.toLowerCase().trim();
  const numMatch = t.match(/^(\d+)/);
  if (numMatch) return parseInt(numMatch[1]!, 10) - 1; // 1-based → 0-based
  if (t.startsWith('първ')) return 0;
  if (t.startsWith('втор')) return 1;
  if (t.startsWith('трет')) return 2;
  if (t.startsWith('четвърт')) return 3;
  if (t.startsWith('пет')) return 4;
  if (t.startsWith('шест')) return 5;
  if (t.startsWith('сед')) return 6;
  if (t.startsWith('осм')) return 7;
  if (t.startsWith('дев')) return 8;
  if (t.startsWith('десет')) return 9;
  return null;
}

type LastContextState = Extract<ConvState, { type: 'last_context' }>;

async function handleContextReference(
  chatId: number,
  salon: SalonRef,
  text: string,
  ctx: LastContextState,
): Promise<boolean> {
  if (ctx.entity_type !== 'booking') return false;
  const entities = ctx.entities;
  if (entities.length === 0) return false;

  // ── All phones ─────────────────────────────────────────────────────────────
  if (CTX_PHONES_ALL_RE.test(text)) {
    const withPhone = entities.filter(e => e.phone);
    if (withPhone.length === 0) {
      await sendTelegramMessage(chatId, 'ℹ️ Никой от тези клиенти няма записан телефон.');
    } else {
      const lines = ['📞 <b>Телефони:</b>', ''];
      withPhone.forEach((e, i) => lines.push(`${i + 1}. <b>${e.name}</b>: <code>${e.phone}</code>`));
      await sendTelegramMessage(chatId, lines.join('\n'));
    }
    return true;
  }

  // ── All emails ─────────────────────────────────────────────────────────────
  if (CTX_EMAILS_ALL_RE.test(text)) {
    try {
      // Query by booking IDs — safe since IDs are our own UUIDs
      const rows = await sql`
        SELECT client_name, client_email FROM bookings
        WHERE id = ANY(${entities.map(e => e.id)}::uuid[])
          AND client_email IS NOT NULL AND client_email != ''
        ORDER BY time ASC
      ` as { client_name: string; client_email: string }[];
      if (rows.length === 0) {
        await sendTelegramMessage(chatId, 'ℹ️ Никой от тези клиенти няма записан имейл.');
      } else {
        const lines = ['📧 <b>Имейли:</b>', ''];
        rows.forEach((r, i) => lines.push(`${i + 1}. <b>${r.client_name}</b>: <code>${r.client_email}</code>`));
        await sendTelegramMessage(chatId, lines.join('\n'));
      }
    } catch {
      await sendTelegramMessage(chatId, 'ℹ️ Не намерих имейл адреси за тези клиенти.');
    }
    return true;
  }

  // ── SMS to all ─────────────────────────────────────────────────────────────
  if (CTX_SMS_ALL_RE.test(text)) {
    const date = entities[0]?.date;
    if (!date) {
      await sendTelegramMessage(chatId, 'ℹ️ Не мога да изпратя SMS без дата на резервациите.');
      return true;
    }
    // Delegate to the standard remind handler for this date
    const salonRows = await sql`SELECT name, phone FROM salons WHERE CAST(id AS text) = ${salon.salonId} LIMIT 1` as { name: string; phone: string }[];
    const salonInfo = salonRows[0] ?? { name: salon.name, phone: '' };
    let sent = 0;
    let skipped = 0;
    for (const e of entities) {
      if (!e.phone) { skipped++; continue; }
      const { sendSmsReminder } = await import('@/lib/smsapi');
      const result = await sendSmsReminder(e.phone, e.name, salonInfo.name, salonInfo.phone, e.service_name ?? '', date, e.time ?? '');
      if (result.success) sent++; else skipped++;
    }
    await sendTelegramMessage(chatId, `📲 SMS до списъка:\n✅ Изпратени: ${sent}\n⏭ Пропуснати: ${skipped}`);
    return true;
  }

  // ── Pronoun references → selected_entity ────────────────────────────────
  // Helper: resolve the "selected" entity — explicit selection or single entity
  const resolveSelected = (): LastContextEntity | null => {
    if (ctx.selected_entity) return ctx.selected_entity;
    if (entities.length === 1) return entities[0]!;
    return null;
  };

  // Helper: ask user to pick when ambiguous
  const askToPickEntity = async (pendingCommand: string): Promise<void> => {
    const lines = ['❓ За кой клиент?', ''];
    entities.forEach((e, i) => {
      lines.push(`${i + 1}. <b>${e.name}</b>${e.time ? ` — ${e.time}` : ''}`);
    });
    await sendTelegramMessage(chatId, lines.join('\n'));
    await setState(chatId, { type: 'waiting_entity_clarification', pending_command: pendingCommand, entities, created_at: new Date().toISOString() });
  };

  // ── Move pronoun: "премести часа ѝ за вторник в 12" ──────────────────────
  const movePronounMatch = text.match(CTX_MOVE_PRONOUN_RE);
  if (movePronounMatch) {
    const e = resolveSelected();
    if (!e) { await askToPickEntity(text); return true; }
    const rest = (movePronounMatch[1] ?? '').trim();
    const rewritten = `Премести резервацията на ${e.name}${e.date ? ` от ${e.date}` : ''}${rest ? ` ${rest}` : ''}`;
    await clearState(chatId);
    return await handleWithAI(chatId, rewritten, salon);
  }

  // ── Cancel pronoun: "откажи я" ────────────────────────────────────────────
  if (CTX_CANCEL_PRONOUN_RE.test(text)) {
    const e = resolveSelected();
    if (!e) { await askToPickEntity(text); return true; }
    if (!e.date || !e.time) {
      await sendTelegramMessage(chatId, `❌ Нямам дата/час за резервацията на <b>${e.name}</b>.`);
      return true;
    }
    await clearState(chatId);
    await handleCancelBooking(chatId, salon, e.date, e.time);
    return true;
  }

  // ── Confirm pronoun: "потвърди я" ─────────────────────────────────────────
  if (CTX_CONFIRM_PRONOUN_RE.test(text)) {
    const e = resolveSelected();
    if (!e) { await askToPickEntity(text); return true; }
    await clearState(chatId);
    await handleConfirmBooking(chatId, salon, e.name);
    return true;
  }

  // ── Phone pronoun: "дай телефона й" ──────────────────────────────────────
  if (CTX_PHONE_PRONOUN_RE.test(text)) {
    const e = resolveSelected();
    if (!e) { await askToPickEntity(text); return true; }
    if (!e.phone) {
      await sendTelegramMessage(chatId, `ℹ️ <b>${e.name}</b> няма записан телефон.`);
    } else {
      await sendTelegramMessage(chatId, `👤 <b>${e.name}</b>\n<code>${e.phone}</code>`);
    }
    return true;
  }

  // ── Email pronoun: "дай имейла й" ────────────────────────────────────────
  if (CTX_EMAIL_PRONOUN_RE.test(text)) {
    const e = resolveSelected();
    if (!e) { await askToPickEntity(text); return true; }
    try {
      const rows = await sql`SELECT client_email FROM bookings WHERE id = ${e.id}::uuid LIMIT 1` as { client_email: string }[];
      const email = rows[0]?.client_email;
      if (!email) {
        await sendTelegramMessage(chatId, `ℹ️ <b>${e.name}</b> няма записан имейл.`);
      } else {
        await sendTelegramMessage(chatId, `📧 <b>${e.name}</b>\n<code>${email}</code>`);
      }
    } catch {
      await sendTelegramMessage(chatId, `ℹ️ Не намерих имейл за <b>${e.name}</b>.`);
    }
    return true;
  }

  // ── Phone by index: "дай телефона на 2" ───────────────────────────────────
  const phoneNMatch = text.match(CTX_PHONE_NTH_RE);
  if (phoneNMatch) {
    const idx = resolveOrdinalToIndex(phoneNMatch[1]!);
    if (idx === null || idx < 0 || idx >= entities.length) {
      await sendTelegramMessage(chatId, `❌ Нямам запис с номер ${phoneNMatch[1]}. Показаните са ${entities.length}.`);
      return true;
    }
    const e = entities[idx]!;
    if (!e.phone) {
      await sendTelegramMessage(chatId, `ℹ️ <b>${e.name}</b> няма записан телефон.`);
    } else {
      await sendTelegramMessage(chatId, `👤 <b>${e.name}</b>\n<code>${e.phone}</code>`);
    }
    // Remember selected entity for follow-up pronoun commands
    await setState(chatId, { ...ctx, selected_entity: e });
    return true;
  }

  // ── Full info by ordinal: "първия", "втория", "3" ─────────────────────────
  const nthInfoMatch = text.match(CTX_NTH_INFO_RE);
  if (nthInfoMatch) {
    const idx = resolveOrdinalToIndex(nthInfoMatch[1]!);
    if (idx !== null && idx >= 0 && idx < entities.length) {
      const e = entities[idx]!;
      const lines = [`👤 <b>${e.name}</b>`];
      if (e.date && e.time) lines.push(`📅 ${formatDateBg(e.date)} в ${e.time}`);
      if (e.service_name) lines.push(`✂️ ${e.service_name}`);
      if (e.phone) lines.push(`📞 <code>${e.phone}</code>`);
      await sendTelegramMessage(chatId, lines.join('\n'));
      // Remember selected entity for follow-up pronoun commands
      await setState(chatId, { ...ctx, selected_entity: e });
      return true;
    }
  }

  // ── Cancel by index: "откажи 2" / "откажи втория" ────────────────────────
  const cancelNMatch = text.match(CTX_CANCEL_NTH_RE);
  if (cancelNMatch) {
    const idx = resolveOrdinalToIndex(cancelNMatch[1]!);
    if (idx === null || idx < 0 || idx >= entities.length) {
      await sendTelegramMessage(chatId, `❌ Нямам запис с номер ${cancelNMatch[1]}.`);
      return true;
    }
    const e = entities[idx]!;
    if (!e.date || !e.time) {
      await sendTelegramMessage(chatId, `❌ Нямам дата/час за резервацията на <b>${e.name}</b>.`);
      return true;
    }
    await clearState(chatId);
    await handleCancelBooking(chatId, salon, e.date, e.time);
    return true;
  }

  // ── Confirm by index: "потвърди 2" / "потвърди първия" ───────────────────
  const confirmNMatch = text.match(CTX_CONFIRM_NTH_RE);
  if (confirmNMatch) {
    const idx = resolveOrdinalToIndex(confirmNMatch[1]!);
    if (idx === null || idx < 0 || idx >= entities.length) {
      await sendTelegramMessage(chatId, `❌ Нямам запис с номер ${confirmNMatch[1]}.`);
      return true;
    }
    await clearState(chatId);
    await handleConfirmBooking(chatId, salon, entities[idx]!.name);
    return true;
  }

  // ── Reschedule by index: "премести 2 за утре в 15" ───────────────────────
  const moveNMatch = text.match(CTX_MOVE_NTH_RE);
  if (moveNMatch) {
    const idx = resolveOrdinalToIndex(moveNMatch[1]!);
    if (idx === null || idx < 0 || idx >= entities.length) {
      await sendTelegramMessage(chatId, `❌ Нямам запис с номер ${moveNMatch[1]}.`);
      return true;
    }
    const e = entities[idx]!;
    // Rewrite with resolved name and re-route to AI (state cleared to avoid loop)
    const rest = (moveNMatch[2] ?? '').trim();
    const rewritten = `Премести резервацията на ${e.name}${e.date ? ` от ${e.date}` : ''}${rest ? ` ${rest}` : ''}`;
    await clearState(chatId);
    return await handleWithAI(chatId, rewritten, salon);
  }

  return false;
}

async function handleWithAI(chatId: number, text: string, salon: SalonRef): Promise<boolean> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) return false;

  const _t: Record<string, number> = { start: Date.now() };
  const _ms = (key: string) => { _t[key] = Date.now(); };

  // ── State machine: handle all multi-step flows programmatically, no AI ────
  const convState = await getState(chatId);
  _ms('state_load');

  if (convState) {
    // ── waiting_reschedule_time: user must reply with a time ─────────────────
    if (convState.type === 'waiting_reschedule_time') {
      const toTime = parseTimeOnly(text);
      if (toTime) {
        await clearState(chatId);
        await appendHistory(chatId, 'user', text);
        await handleRescheduleBooking(chatId, salon, convState.client_name, convState.from_date, convState.to_date, toTime);
        return true;
      }
      // Not a time — user may be doing something else; clear state and fall through to AI
      await clearState(chatId);
    }

    // ── waiting_block_confirm: user must confirm or deny blocking the day ────
    if (convState.type === 'waiting_block_confirm') {
      if (CONFIRM_RE.test(text.trim())) {
        await clearState(chatId);
        await appendHistory(chatId, 'user', text);
        await blockAllDay(salon.salonId, salon.slug, convState.date);
        await sendTelegramMessage(chatId, `🔒 <b>${formatDateBg(convState.date)}</b> е блокиран — без нови резервации.`);
        return true;
      }
      if (DENY_RE.test(text.trim())) {
        await clearState(chatId);
        await appendHistory(chatId, 'user', text);
        await sendTelegramMessage(chatId, `ОК, денят не е блокиран.`);
        return true;
      }
      // User sent a more complex command (e.g. "блокирай И премести Деляна за вторник в 12:30")
      // Pass to AI but inject block_date into context so it can be resolved
      // State is cleared here; AI intent will handle the combined action below
      await clearState(chatId);
      // Fall through to AI with the block date injected as context
    }

    // ── waiting_block_and_reschedule: block the day AND reschedule ────────────
    if (convState.type === 'waiting_block_and_reschedule') {
      if (CONFIRM_RE.test(text.trim())) {
        await clearState(chatId);
        await appendHistory(chatId, 'user', text);
        await blockAllDay(salon.salonId, salon.slug, convState.block_date);
        await sendTelegramMessage(chatId, `🔒 <b>${formatDateBg(convState.block_date)}</b> е блокиран.`);
        await handleRescheduleBooking(chatId, salon, convState.client_name, convState.block_date, convState.to_date, convState.to_time);
        return true;
      }
      if (DENY_RE.test(text.trim())) {
        await clearState(chatId);
        await appendHistory(chatId, 'user', text);
        await sendTelegramMessage(chatId, `ОК, отменено.`);
        return true;
      }
      // Not a yes/no — clear state and fall through to AI
      await clearState(chatId);
    }

    // ── waiting_confirm_save_phone: confirm before adding phone/email to client ─
    if (convState.type === 'waiting_confirm_save_phone') {
      if (CONFIRM_RE.test(text.trim())) {
        await clearState(chatId);
        await appendHistory(chatId, 'user', text);
        const isEmail = convState.phone.startsWith('email:');
        const emailVal = isEmail ? convState.phone.slice(6) : undefined;
        const phoneVal = isEmail ? undefined : convState.phone;
        const upsertResult = await upsertSalonClient(salon.salonId, convState.clientName, { phone: phoneVal, email: emailVal });
        // Use the upsert result id — covers booking-derived clients whose clientId was null before confirmation
        const savedClientId = upsertResult.id ?? convState.clientId;
        await setState(chatId, { type: 'last_client', clientId: savedClientId, name: convState.clientName, created_at: new Date().toISOString() });
        const verb = convState.clientExists ? 'Запазих' : 'Добавих нов клиент';
        const detail = phoneVal ? `телефон: <b>${phoneVal}</b>` : `имейл: <b>${emailVal}</b>`;
        await sendTelegramMessage(chatId, `✅ ${verb} <b>${convState.clientName}</b> — ${detail}`);
        await appendHistory(chatId, 'assistant', `[save_client_contact: ${convState.clientName}${phoneVal ? `, tel: ${phoneVal}` : ''}${emailVal ? `, email: ${emailVal}` : ''}]`);
        return true;
      }
      if (DENY_RE.test(text.trim())) {
        await clearState(chatId);
        await appendHistory(chatId, 'user', text);
        await sendTelegramMessage(chatId, `ОК, нищо не е записано.`);
        return true;
      }
      // User sent something else — notify and clear, then process the new command normally
      await clearState(chatId);
      const isEmailCancel = convState.phone.startsWith('email:');
      const cancelDetail = isEmailCancel ? `имейл за <b>${convState.clientName}</b>` : `телефон за <b>${convState.clientName}</b>`;
      await sendTelegramMessage(chatId, `⚠️ Добавянето на ${cancelDetail} е отменено.`);
    }

    // ── waiting_disambig_save_phone: user picks which client to add phone to ─
    if (convState.type === 'waiting_disambig_save_phone') {
      const pickMatch = text.trim().match(/^(?:за\s+)?(\d+|първ\w+|втор\w+|трет\w+|четвърт\w+|пет\w+)[.\s]*$/i);
      if (pickMatch) {
        const idx = resolveOrdinalToIndex(pickMatch[1]!);
        const candidate = idx !== null ? convState.candidates[idx] : undefined;
        if (!candidate) {
          await sendTelegramMessage(chatId, `⚠️ Невалиден избор. Отговори с число от 1 до ${convState.candidates.length}.`);
          return true;
        }
        await clearState(chatId);
        await appendHistory(chatId, 'user', text);
        await setState(chatId, {
          type: 'waiting_confirm_save_phone',
          clientName: candidate.name,
          phone: convState.contact,
          clientId: candidate.id,
          clientExists: true,
          created_at: new Date().toISOString(),
        });
        const isEmail = convState.contact.startsWith('email:');
        const contactLabel = isEmail
          ? `✉️ Да добавя ли имейл:\n<b>${convState.contact.slice(6)}</b>`
          : `📞 Да добавя ли телефон:\n<b>${convState.contact}</b>`;
        await sendTelegramMessage(chatId, `👤 Намерих клиент:\n<b>${candidate.name}</b>\n\n${contactLabel}\n\n<i>Отговори да / не</i>`);
        return true;
      }
      if (DENY_RE.test(text.trim())) {
        await clearState(chatId);
        await sendTelegramMessage(chatId, `ОК, нищо не е записано.`);
        return true;
      }
      // Something else — clear and fall through
      await clearState(chatId);
    }
  }

  // ── waiting_entity_clarification: user answered "2" / "за 2" / "втория" ───
  // Bot had asked "За кой клиент?" — resolve index and replay pending command.
  const freshState = convState ?? await getState(chatId);
  if (freshState?.type === 'waiting_entity_clarification') {
    const disambigMatch = text.trim().match(CTX_DISAMBIGUATION_RE);
    if (disambigMatch) {
      const idx = resolveOrdinalToIndex(disambigMatch[1]!);
      const entities = freshState.entities;
      if (idx !== null && idx >= 0 && idx < entities.length) {
        const e = entities[idx]!;
        const pending = freshState.pending_command;
        // Build a synthetic last_context with selected_entity, then re-run handleContextReference
        const syntheticCtx: Extract<ConvState, { type: 'last_context' }> = {
          type: 'last_context',
          entity_type: 'booking',
          entities,
          selected_entity: e,
          created_at: freshState.created_at,
        };
        await setState(chatId, syntheticCtx);
        // Re-run the original pronoun command against the now-resolved context
        const handled = await handleContextReference(chatId, salon, pending, syntheticCtx);
        if (handled) return true;
        // Fallback: rewrite as explicit name and send to AI
        const rewritten = pending.replace(/(?:й\b|и́|нея|него|я\b|го\b|тя\b|той\b|тази\b|този\b|му\b)/gi, e.name);
        await clearState(chatId);
        return await handleWithAI(chatId, rewritten, salon);
      } else {
        await sendTelegramMessage(chatId, `❌ Нямам запис с номер ${disambigMatch[1]}. Показаните са ${freshState.entities.length}.`);
        return true;
      }
    }
    // User sent something else — clear clarification state and fall through
    await clearState(chatId);
  }

  // ── last_context: programmatic reference resolution (no AI needed) ─────────
  // Checked AFTER waiting_* states so multi-step flows always take priority.
  // If not recognized as a reference, falls through to the AI.
  if (freshState?.type === 'last_context') {
    const handled = await handleContextReference(chatId, salon, text, freshState);
    if (handled) return true;
  }

  const today = new Date();
  const todayStr = todayISO();
  const tomorrowStr = offsetDayISO(1);

  // Load salon context for conversational answers
  const salonContext = await loadSalonContext(salon.salonId);
  _ms('salon_ctx');
  const smsRows = await sql`SELECT sms_enabled FROM salons WHERE CAST(id AS text) = ${salon.salonId} LIMIT 1` as { sms_enabled: boolean }[];
  const smsEnabled = smsRows[0]?.sms_enabled ?? false;
  _ms('sms_check');

  const currentServices = await getSalonServices(salon.salonId);
  const servicesJson = JSON.stringify(currentServices.map((s, i) => ({ id: String(i + 1), name: s.name, price: s.price, duration_min: s.duration_min, category: s.category ?? null })), null, 2);

  // If there was a pending block_confirm state, inject the date as context for AI
  const pendingBlockDate = (convState?.type === 'waiting_block_confirm') ? convState.date : null;
  const lastCtxEntities = (freshState?.type === 'last_context') ? freshState.entities : null;
  const lastCtxContext = lastCtxEntities && lastCtxEntities.length > 0
    ? (() => {
        const entityLines = lastCtxEntities.map(e => {
          let s = e.name;
          if (e.date || e.time) s += ` (${[e.date, e.time].filter(Boolean).join(' ')})`;
          if (e.service_name) s += ` — ${e.service_name}`;
          if (e.price != null) s += ` — ${e.price} €`;
          return s;
        }).join('; ');
        const totalPrice = lastCtxEntities.reduce((sum, e) => sum + (Number(e.price) || 0), 0);
        const hasPrices = lastCtxEntities.some(e => e.price != null);
        return `\n\n[ПОСЛЕДНО ПОКАЗАНИ ЗАПИСИ (${lastCtxEntities.length} бр.): ${entityLines}. ${hasPrices ? `Обща стойност: ${totalPrice} €. Ако потребителят пита "за колко пари", "обща сума", "колко струват" — отговори директно с тази сума.` : ''} Ако потребителят използва "я", "го", "нея", "него", "тя", "той", "тази", "този" — имат предвид ${lastCtxEntities.length === 1 ? lastCtxEntities[0]!.name : 'някой от тези хора'}. ЗАДЪЛЖИТЕЛНО използвай точното им пълно ime от този списък — НЕ измисляй или съкращавай имена.]`;
      })()
    : '';
  const lastClientCtx = (freshState?.type === 'last_client')
    ? `\n\n[ПОСЛЕДНО РАБОТЕН КЛИЕНТ: "${freshState.name}"${freshState.clientId ? ` (id: ${freshState.clientId})` : ''}. Ако следващото съобщение добавя телефон, имейл, бележка или резервация без да посочва изрично клиент — отнася се за "${freshState.name}". Използвай точно това ime.]`
    : '';
  const lastBookingCtx = (freshState?.type === 'last_booking')
    ? `\n\n[ПОСЛЕДНА РЕЗЕРВАЦИЯ: ${freshState.clientName} — ${freshState.serviceName} на ${formatDateBg(freshState.date, { day: 'numeric', month: 'long' })} в ${freshState.time}${freshState.clientId ? ` (clientId: ${freshState.clientId})` : ''}. Ако потребителят казва "я", "го", "него", "нея", "премести я", "откажи я", "добави бележка" без да уточнява — имат предвид тази резервация/клиент.]`
    : '';
  const lastServiceCtx = (freshState?.type === 'last_service')
    ? `\n\n[ПОСЛЕДНО РАБОТЕНА УСЛУГА: "${freshState.name}". Ако следващото съобщение промени цена, продължителност или категория без да посочва услуга изрично — отнася се за "${freshState.name}".]`
    : '';
  const stateContext = [
    pendingBlockDate ? `\n\n[КОНТЕКСТ: Преди това потребителят искаше да блокира ${formatDateBg(pendingBlockDate)} (${pendingBlockDate}). Ако сега казва "блокирай деня" или "блокирай" без дата, имат предвид тази дата.]` : '',
    lastCtxContext,
    lastClientCtx,
    lastBookingCtx,
    lastServiceCtx,
  ].join('');

  // ── DEBUG: log all context for intent debugging ─────────────────────────
  console.log('[AI_DEBUG] ─────────────────────────────────────────────────');
  console.log('[AI_DEBUG] user_message:', JSON.stringify(text));
  console.log('[AI_DEBUG] freshState.type:', freshState?.type ?? 'null');
  console.log('[AI_DEBUG] last_client_ctx:', lastClientCtx || '(none)');
  console.log('[AI_DEBUG] last_booking_ctx:', lastBookingCtx || '(none)');
  console.log('[AI_DEBUG] last_service_ctx:', lastServiceCtx || '(none)');
  console.log('[AI_DEBUG] last_ctx_context:', lastCtxContext ? lastCtxContext.slice(0, 200) : '(none)');
  console.log('[AI_DEBUG] ─────────────────────────────────────────────────');

  const systemPrompt = `Ти си личен AI асистент на собственик на малък бизнес. Говориш на естествен, топъл български — като добър приятел с опит в бранша.${stateContext}

Днес е ${today.toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.
Днешна дата (ISO): ${todayStr}. Утрешна дата (ISO): ${tomorrowStr}.

${salonContext ? `Данни за бизнеса:\n${salonContext}\n` : ''}
ТЕКУЩИ УСЛУГИ (използвай този списък за да решиш дали услугата съществува):
${servicesJson}

Върни САМО валиден JSON обект. Ако съобщението изисква конкретно действие — върни action. За всичко останало (въпроси, разговор, съвети, съдържание, формули, мотивация) — върни { "action": "chat", "reply": "отговорът ти тук" }.

КРИТИЧНО ВАЖНО: Никога не слагай потвърждение за извършено действие в "chat" reply. Ако потребителят иска да добави/промени/изтрие нещо, ЗАДЪЛЖИТЕЛНО върни съответния action обект — никога { "action": "chat", "reply": "✅ Добавих..." }. Chat е САМО за разговор и въпроси, не за действия.

КРИТИЧНО ВАЖНО: Никога не измисляй резервации, клиенти или данни. Ако не знаеш точните данни, върни съответния action (bookings_day, bookings_week и т.н.) вместо да ги пишеш в chat reply. Никога не слагай списък с резервации в "chat" reply.

КРИТИЧНО ВАЖНО: Никога не измисляй ограничения на системата. Не казвай "системата не може", "нямам функция", "не мога да изчисля" — ако не знаеш нещо, кажи "Не знам" или поискай повторна команда. Никога не лъжи потребителя за възможностите на системата.

ИМЕЙЛ УВЕДОМЛЕНИЯ: Системата автоматично изпраща имейли при: (1) нова резервация — на клиента и на собственика; (2) преместване на резервация — на клиента с новия час; (3) напомняния преди час. Имейлите се изпращат само ако клиентът има записан имейл адрес. Не казвай никога, че системата не може да изпраща имейли.${smsEnabled ? '' : '\n\nSMS НАПОМНЯНИЯ: В момента SMS услугата е деактивирана. Не предлагай SMS опции на потребителя.'}

═══ НАЙ-ВАЖНО ПРАВИЛО ЗА УСЛУГИ ═══

Логика за избор на action:
1. Провери ТЕКУЩИ УСЛУГИ по-горе.
2. Ако услугата СЪЩЕСТВУВА (fuzzy match по смисъл) → update_service (дори без глагол — "маникюр 35 евро" = промяна на цената)
3. Ако услугата НЕ СЪЩЕСТВУВА → add_service САМО ако има изричен глагол (добави, нова услуга, създай, add)
4. Ако услугата НЕ СЪЩЕСТВУВА и НЯМА глагол → clarify ("Не намерих тази услуга. Искаш ли да я добавя?")
5. Ако има 2+ услуги с подобно ime и не е ясно коя → clarify

ДОБАВЯНЕ (add_service) — услугата НЕ е в списъка И има изричен глагол:
  "добави X", "нова услуга X", "ново — X 150 евро", "създай X", "add X"
  → { "action": "add_service", "name": "X", "duration_min": 45, "price_eur": 150 }
  БЕЗ глагол + услугата НЕ съществува → { "action": "clarify", "question": "Не намерих \"X\" в услугите ти. Искаш ли да я добавя?" }

  С ВАРИАНТИ — ако са изброени нива/специалисти с различни цени:
  "добави Мъжко подстригване с варианти: Barber 15€, Senior 20€, Master 25€"
  "добави подстригване — Junior 20лв, Senior 30лв, Master 40лв"
  → { "action": "add_service", "name": "Мъжко подстригване", "duration_min": 30, "price_eur": 15, "variants": [{"label":"Barber","price":15},{"label":"Senior Barber","price":20},{"label":"Master","price":25}] }
  price_eur = цената на ПЪРВИЯ (най-евтин) вариант.

  ПАРСВАНЕ НА ПОЛЕТАТА — много важно:
  - name: САМО името на услугата — спри преди цифри, "евро", "лв", "€", "за X ч", "X мин", "категория"
    Примери: "Грим вечерен 100 евро за 2 ч" → name="Грим вечерен"; "Маникюр гел 45мин 35лв" → name="Маникюр гел"
  - duration_min: търси "Xч", "X ч", "X часа", "Xмин", "X минути" — 1ч=60, 1ч30=90, 2ч=120, 45мин=45
  - price_eur: числото ПРЕДИ "евро"/"лв"/"€" — ако е в лева ÷ 1.96
  - category: текстът след "категория" / "в категория" / "кат."
  Пример: "добави Грим вечерен 100 евро за 2 ч в нова категория Грим"
    → { "action": "add_service", "name": "Грим вечерен", "duration_min": 120, "price_eur": 100, "category": "Грим" }

ОБНОВЯВАНЕ (update_service) — услугата ВЕЧЕ Е в списъка:
  "направи X Y евро", "смени X на Y", "X да струва Y", "вдигни цената на X", "X 35 евро",
  "увеличи времето на X на 3ч", "промени X на 120 евро", "тази услуга 50 евро"
  → { "action": "update_service", "service_name": "X", "price_eur": Y }
  Може да обновява: price_eur, duration_min, category, new_name — подавай само полетата, които се променят.

ИЗТРИВАНЕ (delete_service):
  "махни X", "премахни X", "изтрий X", "спри X", "не предлагаме X", "скрий X"

УТОЧНЯВАНЕ (clarify) — само при реална двусмисленост:
  → { "action": "clarify", "question": "Имаш предвид X или Y?" }

ПРЕДСТОЯЩИ РЕЗЕРВАЦИИ НА КЛИЕНТ (client_bookings):
  "Стоянка кога има час", "кога е следващия запис на Мария", "следващ час на Иван", "кога идва Деляна", "записи на Мария", "Виолета кога е"
  → { "action": "client_bookings", "client_name": "Стоянка" }
  ВАЖНО: Никога не питай "коя Стоянка?" или "имаш предвид X или Y?" — подай директно каквото е написано. Системата сама ще намери по частично съвпадение на първото или пълното ime.

СВОБОДНИ ЧАСОВЕ (find_free_slots):
  Когато питаш кога имаш свободно / кога може клиент да дойде / какви са свободните часове.
  "кога имам свободно", "кога може", "кога има свободен час", "свободни часове тази седмица"
  "има ли свободно утре", "кога мога да запиша нов клиент", "покажи свободните ми часове"
  "кога следващия свободен час", "кога мога да взема клиент", "кога съм свободна"
  "свободно ли е тази седмица", "кога мога да запиша маникюр", "за маникюр кога може"
  "кога има свободно след 14ч", "свободни часове в петък", "кога имаш място за педикюр"
  "тази седмица кога мога да запиша", "следващата седмица кога има часове"
  "има ли нещо свободно за утре", "можеш ли да ме запишеш за боядисване тази седмица"
  → { "action": "find_free_slots" }
  → { "action": "find_free_slots", "date_from": "YYYY-MM-DD", "date_to": "YYYY-MM-DD" }
  → { "action": "find_free_slots", "service_name": "маникюр" }
  → { "action": "find_free_slots", "date_from": "YYYY-MM-DD", "after_time": "14:00" }
  → { "action": "find_free_slots", "date_from": "YYYY-MM-DD", "date_to": "YYYY-MM-DD", "service_name": "боядисване" }
  ВАЖНО: date_from и date_to са незадължителни — пропусни ги ако потребителят не е посочил конкретен период.
  Ако е посочен ден ("утре", "в петък") → date_from = date_to = тази дата.
  Ако е посочена седмица ("тази седмица") → date_from = утре, date_to = края на тази работна седмица.
  Ако е посочен час ("след 14ч", "след обяд") → after_time = "14:00".
  Ако е спомената услуга → service_name = точното и́ name от списъка с услуги.

ТЕЛЕФОН НА КЛИЕНТ (client_phone):
  "дай ми номера на Мария", "какъв е телефонът на Иван", "номера на Деляна", "телефон на клиента"
  "номер на Мария Петрова", "телефон на Ваня Велчева"  ← БЕЗ цифри = търсене, НЕ запазване!
  → { "action": "client_phone", "client_name": "Мария" }
  ВАЖНО: "номер на X" / "телефон на X" БЕЗ цифри в текста = client_phone (ТЪРСЕНЕ), НЕ save_client_contact!
  НЕ използвай пълния текст като client_name — извлечи САМО името след "на".

ЗАПАЗИ КОНТАКТ НА КЛИЕНТ (save_client_contact):
  Само когато няма дата/час/услуга — просто се запазва контакт.
  "телефонът на Мария е 0888123456", "Иван има имейл ivan@mail.com", "добави тел на Деляна 0877000111"
  "добави нов клиент Румен Иванов 0899000111", "нов клиент Анна с имейл anna@mail.com"
  → { "action": "save_client_contact", "client_name": "Мария", "phone": "0888123456" }
  ВАЖНО: Никога не подавай цялата команда като client_name ("номер на Мария" НЕ е клиентско ime)!
  → { "action": "save_client_contact", "client_name": "Иван", "email": "ivan@mail.com" }
  ВАЖНО: Ако съобщението съдържа И телефон, И услуга, И дата → използвай create_booking (с phone поле), НЕ save_client_contact.
  Телефонът и имейлът са незадължителни — може да се подадат един или двата. Никога не измисляй телефон/имейл ако не са изрично написани.

БЕЛЕЖКА ЗА КЛИЕНТ (save_client_note):
  "бележка за Виолета: не искаше да е много руса"
  "запомни за Мария че иска фризура без сешоар"
  "напомни ми че Виолета искаше да си купи шампоан"
  "напомни ми за Иван че е алергичен към амоняк"
  "Виолета предпочита продукти без амоняк"
  "отбележи за Иван че иска по-тъмен цвят"
  "не забравяй — Мария не обича сешоара"
  → { "action": "save_client_note", "client_name": "Виолета", "note": "искаше да си купи шампоан" }
  ВАЖНО: "напомни ми че X..." = save_client_note, НЕ е chat. Никога не питай допълнителни въпроси — подай директно action-а. Системата ще попита за напомняне.

ПРОЧЕТИ БЕЛЕЖКА ЗА КЛИЕНТ (client_note):
  "каква е бележката за Виолета", "какво знаем за Мария", "покажи бележката за Иван"
  → { "action": "client_note", "client_name": "Виолета" }

ПРЕМЕСТВАНЕ НА РЕЗЕРВАЦИЯ (reschedule_booking):
  "премести резервацията на Деляна от петък за вторник в 13", "мести Иван за утре в 15:30", "смени часа на Мария за сряда в 10"
  → { "action": "reschedule_booking", "client_name": "Деляна", "from_date": "YYYY-MM-DD", "to_date": "YYYY-MM-DD", "to_time": "HH:mm" }

  ВАЖНО: from_date и to_date ЗАДЪЛЖИТЕЛНО трябва да са валидни ISO дати (YYYY-MM-DD). Ако не можеш да определиш точна дата, НЕ използвай reschedule_booking — върни { "action": "chat", "reply": "Уточни от коя дата на коя дата." }
  КОНТЕКСТ: Ако в историята на разговора си задал въпрос за дата/час и потребителят отговаря с кратко "следващия", "следващата", "същия", "да", "не" и т.н. — разгледай предишния въпрос и реши кое имат предвид. Например ако си питал "за кой вторник — 2 юни или 9 юни?" и отговорът е "следващия/следващата" → избери по-далечната дата.
  to_time е незадължително — пропусни го ако потребителят не е споменал час.

НОВА РЕЗЕРВАЦИЯ ОТ СОБСТВЕНИКА (create_booking):
  "нов клиент Виолета утре подстригване 13ч", "запиши Виолета утре 13 подстригване", "Виолета подстригване утре 13ч"
  "запиши Мария 0884595000 маникюр утре 10ч", "нов клиент Иван 0877123456 подстригване в петък 11:00"
  → { "action": "create_booking", "client_name": "Виолета", "service_name": "подстригване", "date": "YYYY-MM-DD", "time": "13:00" }
  → { "action": "create_booking", "client_name": "Мария", "service_name": "маникюр", "date": "YYYY-MM-DD", "time": "10:00", "phone": "0884595000" }
  ВАЖНО: Ако съобщението съдържа ЕДНОВРЕМЕННО услуга + дата/час → ВИНАГИ използвай create_booking, дори ако има телефон.
  Телефонът се подава в полето "phone" — НЕ се прави отделен save_client_contact.
  date и time ЗАДЪЛЖИТЕЛНО са точни стойности. Резервацията се записва директно — без потвърждение.

ПОТВЪРЖДАВАНЕ на запис (confirm_booking):
  "потвърди Мария", "окей записа на Иван", "да, потвърди", "ок потвърждавам"

ПРИКЛЮЧВАНЕ на запис (complete_booking):
  "готово с Мария", "Мария приключи", "отбележи като готова", "done с клиента"

ОТКАЗВАНЕ на запис (cancel_booking):
  "откажи записа в 14:00", "анулирай в понеделник в 10", "изтрий часа за утре в 15:30"

БЛОКИРАНЕ НА ЧАС (block_hours):
  "блокирай от 13 до 15 в сряда", "запази ми 14-16 за лични неща", "занят съм утре 10-12"

ПОЧИВЕН ДЕН (day_off):
  "в неделя не работя", "петък е почивен", "блокирай цял ден 12 юни", "утре съм болна"

РАБОТНО ВРЕМЕ (day_hours / work_until):
  "вторник от 9 до 18", "сряда 10-19", "работя до 20 днес", "утре свършвам в 17"

РАЗГОВОР (chat) — само когато НЕ може да се изпълни никакво действие:
  въпроси, съвети, идеи за бизнес, текстове за публикации, мотивация, общи разговори

═══ РАЗПОЗНАВАНЕ НА ДАТА И ЧАС ═══

Преобразувай разговорни изрази в точни стойности спрямо днешна дата ${todayStr}:
- "утре" → ${tomorrowStr}
- "в понеделник" / "следващия понеделник" → намери следващата такава дата
- "другата сряда" / "другия петък" / "другата седмица в X" → сряда/петък/X на седмицата СЛЕД следващата (т.е. +2 седмици от последното минало или +1 ако следващата вече е тази седмица)
- "след 2 дни" → изчисли ISO датата
- "18ти" / "18-ти" / "18-о" / "на 18" / "18 число" → 18-то число на текущия месец; ако е в миналото → следващия месец
- "сутринта" → 09:00, "на обяд" → 13:00, "следобед" → 15:00, "вечерта" → 18:00
- "и половина" след час → добави :30 (напр. "в 3 и половина" → 15:30)
- Ако часът е без AM/PM и е между 7 и 21 → приеми го директно; ако е под 7 → добави 12

═══ ИМЕНА НА УСЛУГИ ═══

ВАЖНО: "часове", "час", "запис", "записи" са синоними на "резервации". "Колко часа имам утре" = резервации утре. "Часовете ми тази седмица" = bookings_week. "Следващият ми час" = next_client.

Хората пишат имена на услуги с грешки, съкращения или на разговорен език. Бизнесът може да е всякакъв — салон за красота, барбер, грийминг за домашни любимци, козметик, маникюрист, коуч, масажист, фотограф или нещо съвсем различно.

Принципи за разпознаване:
- Търси най-близкото съвпадение по смисъл спрямо РЕАЛНИЯ списък с услуги на салона (от данните за салона по-горе).
- Съкращения, разговорни форми и правописни грешки са нормални — разбери намерението.
- Ако услугата я има в списъка — match-вай към нея, дори да е написана различно.
- Ако НЕ е ясно коя точно услуга се има предвид и в списъка има няколко сходни — избери най-логичната спрямо контекста на разговора.
- Използвай историята на разговора: ако преди беше спомената услуга и сега се казва "я", "тя", "тази", "горната" — имат предвид същата.
- При съмнение — предпочитай действие пред въпрос; ако грешиш леко, потребителят ще коригира.

═══ КОНТЕКСТ НА РАЗГОВОРА ═══

Използвай историята на съобщенията за да разбереш препратки:
- "тя", "я", "тази услуга", "горната", "последната" → последно споменатата услуга
- "него", "този клиент", "тази резервация" → последно споменатия клиент/запис
- "пак същото", "още един път" → повтори последното действие
- Никога не питай "коя услуга?" или "кой клиент?" ако отговорът е ясен от контекста.

═══ ДЕЙСТВИЯ ═══

- { "action": "create_booking", "client_name": "Виолета", "service_name": "подстригване", "date": "YYYY-MM-DD", "time": "HH:mm" }
- { "action": "bookings_day", "date": "YYYY-MM-DD" }
- { "action": "bookings_week" }  ← за "тази седмица", "следващите дни", "какво имам за правене", "какво имам", "програмата ми", "часовете ми тази седмица"
- { "action": "next_client" }
- { "action": "revenue_week" }
- { "action": "revenue_month" }
- { "action": "revenue_months", "months": 6 }
- { "action": "revenue_range", "date_from": "YYYY-MM-DD", "date_to": "YYYY-MM-DD" }
- { "action": "revenue_compare" }
- { "action": "avg_booking_value" }
- { "action": "revenue_client", "client_name": "..." }
- { "action": "client_count" }
- { "action": "inactive_clients", "months": 3 }
- { "action": "top_services" }
- { "action": "list_services" }
- { "action": "pending_bookings" }
${smsEnabled ? `- { "action": "sms_balance" }
- { "action": "send_sms_to_client", "client_name": "Диана" }  ← изпраща SMS напомняне до конкретен клиент за предстоящата му резервация` : ''}
- { "action": "complete_booking", "client_name": "..." }
- { "action": "confirm_booking", "client_name": "..." }
- { "action": "cancel_booking", "date": "YYYY-MM-DD", "time": "HH:mm" }
- { "action": "remind_tomorrow" }
- { "action": "client_phone", "client_name": "..." }
- { "action": "save_client_contact", "client_name": "...", "phone": "...", "email": "..." }
- { "action": "save_client_note", "client_name": "...", "note": "..." }
- { "action": "client_note", "client_name": "..." }
- { "action": "client_bookings", "client_name": "..." }
- { "action": "find_free_slots", "date_from": "YYYY-MM-DD", "date_to": "YYYY-MM-DD", "after_time": "HH:mm", "service_name": "...", "duration_min": 60 }
- { "action": "reschedule_booking", "client_name": "...", "from_date": "YYYY-MM-DD", "to_date": "YYYY-MM-DD", "to_time": "HH:mm" }
- { "action": "update_booking_service", "client_name": "...", "date": "YYYY-MM-DD", "time": "HH:mm", "new_service": "..." }  ← когато потребителят коригира грешна услуга на вече създадена резервация ("не маникюр а педикюр", "промени услугата на мъжко подстригване"). Използвай date/time от [ПОСЛЕДНА РЕЗЕРВАЦИЯ] ако не са посочени изрично.
- { "action": "sort_services", "by": "price_asc" }  ← by: price_asc | price_desc | duration_asc | name_asc
- { "action": "add_service", "name": "...", "duration_min": 45, "price_eur": 30, "category": "...", "variants": [{"label":"Barber","price":15},{"label":"Master","price":25}] }
- { "action": "update_service", "service_name": "...", "price_eur": 35, "duration_min": 60, "category": "...", "new_name": "..." }  ← подавай само полетата, които се променят
- { "action": "update_price", "service_name": "...", "price_eur": 18 }  ← само ако се променя ЕДИНСТВЕНО цена (legacy, предпочитай update_service)
- { "action": "update_category", "service_name": "...", "category": "..." }
- { "action": "delete_service", "service_name": "..." }
- { "action": "clarify", "question": "Имаш предвид X или Y?" }  ← само при реална двусмисленост
- { "action": "block_hours", "date": "YYYY-MM-DD", "start": "HH:mm", "end": "HH:mm", "note": "..." }
- { "action": "day_off", "date": "YYYY-MM-DD" }
- { "action": "unblock_day", "date": "YYYY-MM-DD" }
- { "action": "day_hours", "day_key": "monday", "open": "09:00", "close": "18:00" }
- { "action": "day_closed", "day_key": "sunday" }
- { "action": "work_until", "close_time": "19:00" }
- { "action": "update_phone", "phone": "..." }
- { "action": "update_instagram", "handle": "..." }
- { "action": "update_facebook", "handle": "..." }
- { "action": "update_tiktok", "handle": "..." }
- { "action": "update_google_maps", "url": "..." }
- { "action": "update_email", "email": "..." }
- { "action": "update_bio", "bio": "..." }
- { "action": "update_owner_bio", "bio": "..." }
${smsEnabled ? `- { "action": "toggle_sms", "enabled": true }` : ''}
- { "action": "chat", "reply": "естествен отговор на български" }

Само JSON, без обяснения извън полето reply.`;

  let intent: AIIntent = { action: 'chat', reply: '' };

  const history = await getHistory(chatId);
  _ms('history_load');
  await appendHistory(chatId, 'user', text);

  try {
    _ms('openrouter_start');
    const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: openRouterHeaders(),
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: text },
        ],
        temperature: 0.4,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      await sendTelegramMessage(chatId, '⚠️ AI асистентът не отговори. Пробвай пак след малко.');
      return true;
    }
    _ms('openrouter_response');

    const data = (await response.json()) as { choices?: { message?: { content?: string }; finish_reason?: string }[] };
    // Strip thinking tokens (<think>...</think>) that Gemini 2.5 Flash may prepend
    const rawContent = (data.choices?.[0]?.message?.content ?? '').trim();
    const finishReason = data.choices?.[0]?.finish_reason;
    const raw = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    const jsonStr = raw.startsWith('{') ? raw : (raw.match(/\{[\s\S]*\}/) ?? ['{}'])[0]!;

    console.log('[AI_DEBUG] raw_openrouter_response:', raw.slice(0, 500));
    console.log('[AI_DEBUG] json_string_to_parse:', jsonStr.slice(0, 300));

    let parsed: AIIntent;
    try {
      parsed = JSON.parse(jsonStr) as AIIntent;
      console.log('[AI_DEBUG] parsed_intent:', JSON.stringify(parsed));
    } catch (parseErr) {
      console.error('[AI] JSON.parse failed', { parseErr, finishReason, rawLen: raw.length, rawSnippet: raw.slice(0, 200) });
      _ms('parse_error');
      _logTiming(`AI parse_error chatId=${chatId}`, _t);
      await sendTelegramMessage(chatId, '⚠️ Грешка при свързване с AI. Пробвай отново.');
      return true;
    }

    // Guard: if parse gave us garbage (no valid action), reset history and bail
    if (!parsed.action || parsed.action === ('undefined' as string)) {
      await saveHistory(chatId, []);
      return false;
    }
    intent = parsed;
    _ms('parse_done');
    // Record the action taken so future messages have context (only for known actions)
    if (intent.action !== 'chat') {
      await appendHistory(chatId, 'assistant', `[изпълнено действие: ${intent.action}]`);
    }
  } catch (err) {
    console.error('[AI] handleWithAI error:', err);
    _ms('catch_error');
    _logTiming(`AI catch_error chatId=${chatId}`, _t);
    await sendTelegramMessage(chatId, '⚠️ Грешка при свързване с AI. Пробвай отново.');
    return true;
  }

  _ms('tool_start');
  _logTiming(`AI action=${intent.action} chatId=${chatId}`, _t);
  switch (intent.action) {
    case 'bookings_day':
      await handleBookingsForDay(chatId, salon, intent.date, intent.date === todayStr ? 'днес' : intent.date === tomorrowStr ? 'утре' : intent.date);
      return true;
    case 'bookings_week':
      await handleBookingsForWeek(chatId, salon);
      return true;
    case 'next_client':
      await handleNextClient(chatId, salon);
      return true;
    case 'revenue_week':
      await handleRevenue(chatId, salon, 'week');
      return true;
    case 'revenue_month':
      await handleRevenue(chatId, salon, 'month');
      return true;
    case 'revenue_months':
      await handleRevenueMonths(chatId, salon, intent.months ?? 6);
      return true;
    case 'revenue_client':
      await handleClientRevenue(chatId, salon, intent.client_name);
      return true;
    case 'client_count':
      await handleClientCountMonth(chatId, salon);
      return true;
    case 'top_services':
      await handleTopServices(chatId, salon);
      return true;
    case 'create_booking':
      await handleCreateBooking(chatId, salon, intent.client_name, intent.service_name, intent.date, intent.time, intent.phone ?? '', intent.email ?? '');
      return true;

    case 'list_services': {
      const services = await getSalonServices(salon.salonId);
      if (services.length === 0) {
        await sendTelegramMessage(chatId, 'ℹ️ Все още няма добавени услуги.');
      } else {
        const lines = [`✂️ <b>Услуги (${services.length}):</b>`, ''];
        let cat = '';
        for (const s of services) {
          if (s.category && s.category !== cat) { cat = s.category; lines.push(`\n<b>${cat}</b>`); }
          lines.push(`• ${s.name} — ${s.duration_min} мин — ${s.price} €`);
        }
        await sendTelegramMessage(chatId, lines.join('\n'));
      }
      return true;
    }
    case 'pending_bookings':
      await handlePendingBookings(chatId, salon);
      return true;
    case 'sort_services': {
      const services = await getSalonServices(salon.salonId);
      const sorted = [...services];
      if (intent.by === 'price_asc') sorted.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      else if (intent.by === 'price_desc') sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      else if (intent.by === 'duration_asc') sorted.sort((a, b) => (a.duration_min ?? 0) - (b.duration_min ?? 0));
      else if (intent.by === 'name_asc') sorted.sort((a, b) => a.name.localeCompare(b.name, 'bg'));
      await saveSalonServices(salon.salonId, salon.slug, sorted);
      const labelMap = { price_asc: 'цена (ниска → висока)', price_desc: 'цена (висока → ниска)', duration_asc: 'продължителност', name_asc: 'азбучен ред' };
      const sortReply = `✅ Услугите са наредени по <b>${labelMap[intent.by]}</b>`;
      await appendHistory(chatId, 'assistant', sortReply);
      await sendTelegramMessage(chatId, sortReply);
      return true;
    }
    case 'add_service': {
      const services = await getSalonServices(salon.salonId);
      const existingIdx = services.findIndex((s) => s.name.toLowerCase() === intent.name.toLowerCase());
      if (existingIdx !== -1) {
        // Service exists — if category provided, update it instead of rejecting
        if (intent.category) {
          services[existingIdx]!.category = intent.category;
          await saveSalonServices(salon.salonId, salon.slug, services);
          const catReply = `✅ <b>${services[existingIdx]!.name}</b> е в категория <b>${intent.category}</b>`;
          await appendHistory(chatId, 'assistant', catReply);
          await sendTelegramMessage(chatId, catReply);
          return true;
        }
        await sendTelegramMessage(chatId, `⚠️ Услугата <b>${intent.name}</b> вече съществува.`);
        return true;
      }
      const variants = Array.isArray(intent.variants) && intent.variants.length > 1
        ? intent.variants.map(v => ({ label: String(v.label).trim(), price: Math.round(Number(v.price) || 0) })).filter(v => v.label)
        : undefined;
      services.push({
        name: intent.name,
        price: Math.round(intent.price_eur),
        duration_min: intent.duration_min,
        ...(intent.category ? { category: intent.category } : {}),
        ...(variants ? { variants } : {}),
      });
      await saveSalonServices(salon.salonId, salon.slug, services);
      await setState(chatId, { type: 'last_service', name: intent.name, created_at: new Date().toISOString() });
      const catLine = intent.category ? ` (${intent.category})` : '';
      const variantLine = variants ? `\n${variants.map(v => `  • ${v.label} — ${v.price} €`).join('\n')}` : ` — ${Math.round(intent.price_eur)} €`;
      const addReply = `✅ Добавена в ${salon.name}:\n${intent.name}${catLine}${variantLine}`;
      await appendHistory(chatId, 'assistant', addReply);
      await sendTelegramMessage(chatId, `✅ Добавена в <b>${salon.name}</b>:\n<b>${intent.name}</b>${catLine}${variantLine}`);
      return true;
    }
    case 'update_price': {
      const services = await getSalonServices(salon.salonId);
      const idx = findServiceIndex(services, intent.service_name);
      if (idx === -1) {
        await sendTelegramMessage(chatId, `❌ Не намерих услуга <b>${intent.service_name}</b>.`);
        return true;
      }
      services[idx]!.price = Math.round(intent.price_eur);
      await saveSalonServices(salon.salonId, salon.slug, services);
      await setState(chatId, { type: 'last_service', name: services[idx]!.name, created_at: new Date().toISOString() });
      await sendTelegramMessage(chatId, `✅ Цената на <b>${services[idx]!.name}</b> е <b>${Math.round(intent.price_eur)} €</b>`);
      return true;
    }
    case 'update_service': {
      const services = await getSalonServices(salon.salonId);
      const idx = findServiceIndex(services, intent.service_name);
      if (idx === -1) {
        await sendTelegramMessage(chatId, `❌ Не намерих услуга <b>${intent.service_name}</b>.`);
        return true;
      }
      const svc = services[idx]!;
      const changes: string[] = [];
      if (intent.price_eur !== undefined) {
        svc.price = Math.round(intent.price_eur);
        changes.push(`цена: <b>${svc.price} €</b>`);
      }
      if (intent.duration_min !== undefined) {
        svc.duration_min = intent.duration_min;
        changes.push(`продължителност: <b>${svc.duration_min} мин</b>`);
      }
      if (intent.category !== undefined) {
        svc.category = intent.category;
        changes.push(`категория: <b>${svc.category}</b>`);
      }
      if (intent.new_name !== undefined) {
        changes.push(`ново име: <b>${intent.new_name}</b>`);
        svc.name = intent.new_name;
      }
      if (changes.length === 0) {
        await sendTelegramMessage(chatId, `⚠️ Не открих какво да променя за <b>${svc.name}</b>.`);
        return true;
      }
      await saveSalonServices(salon.salonId, salon.slug, services);
      const updateReply = `✅ <b>${intent.new_name ?? intent.service_name}</b> обновена:\n${changes.join('\n')}`;
      await appendHistory(chatId, 'assistant', updateReply);
      await sendTelegramMessage(chatId, updateReply);
      return true;
    }
    case 'clarify': {
      await sendTelegramMessage(chatId, `🤔 ${intent.question}`);
      return true;
    }
    case 'update_category': {
      const services = await getSalonServices(salon.salonId);
      const idx = findServiceIndex(services, intent.service_name);
      if (idx === -1) {
        await sendTelegramMessage(chatId, `❌ Не намерих услуга <b>${intent.service_name}</b>.`);
        return true;
      }
      services[idx]!.category = intent.category;
      await saveSalonServices(salon.salonId, salon.slug, services);
      const reply = `✅ <b>${services[idx]!.name}</b> е в категория <b>${intent.category}</b>`;
      await appendHistory(chatId, 'assistant', reply);
      await sendTelegramMessage(chatId, reply);
      return true;
    }
    case 'delete_service': {
      const services = await getSalonServices(salon.salonId);
      const idx = findServiceIndex(services, intent.service_name);
      if (idx === -1) {
        await sendTelegramMessage(chatId, `❌ Не намерих услуга <b>${intent.service_name}</b>.`);
        return true;
      }
      const name = services[idx]!.name;
      services.splice(idx, 1);
      await saveSalonServices(salon.salonId, salon.slug, services);
      await sendTelegramMessage(chatId, `🗑 Услугата <b>${name}</b> е изтрита.`);
      return true;
    }
    case 'block_hours': {
      await addBookingBlockForSalon(salon.salonId, salon.slug, {
        date: intent.date,
        allDay: false,
        start: intent.start,
        end: intent.end,
        ...(intent.note ? { note: intent.note } : {}),
      });
      revalidateTag(`salon-public-${salon.slug}`);
      const blockMsg = `🔒 Блокирано: <b>${formatDateBg(intent.date)}</b> от <b>${intent.start}</b> до <b>${intent.end}</b>`;
      await sendTelegramMessage(chatId, blockMsg);
      return true;
    }
    case 'day_off': {
      const existingBookings = await sql`
        SELECT client_name, client_phone, time, COALESCE(service_duration, 60) AS duration
        FROM bookings
        WHERE CAST(salon_id AS text) = ${salon.salonId}
          AND date = ${intent.date}
          AND status NOT IN ('cancelled', 'completed')
        ORDER BY time ASC
      ` as { client_name: string; client_phone: string; time: string; duration: number }[];

      if (existingBookings.length > 0) {
        // Find nearest free slots based on the longest booking's duration
        const maxDuration = Math.max(...existingBookings.map(b => b.duration));
        const freeSlots = await findNearestFreeSlots(salon.salonId, intent.date, maxDuration);

        const lines = [
          `⚠️ Имаш <b>${existingBookings.length} ${existingBookings.length === 1 ? 'резервация' : 'резервации'}</b> за <b>${formatDateBg(intent.date)}</b>:`,
          '',
        ];
        for (const b of existingBookings) {
          lines.push(`• ${b.time} — <b>${b.client_name}</b>`);
        }

        if (freeSlots.length > 0) {
          lines.push('', `📅 Най-близките свободни часове:`);
          freeSlots.forEach((s, i) => lines.push(`${i + 1}. ${s.label}`));
          lines.push('', `Напиши <b>да</b> за да блокираш деня, или кажи на кой час да преместя ${existingBookings.length === 1 ? `<b>${existingBookings[0]!.client_name}</b>` : 'клиентите'} — напр. <i>"Премести ${existingBookings[0]!.client_name} за ${freeSlots[0]!.label.split(' в ')[0]}"</i>.`);
        } else {
          lines.push('', `Напиши <b>да</b> за да потвърдиш почивния ден.`);
        }

        await setState(chatId, { type: 'waiting_block_confirm', date: intent.date, created_at: new Date().toISOString() });
        await sendTelegramMessage(chatId, lines.join('\n'));
        return true;
      }

      await blockAllDay(salon.salonId, salon.slug, intent.date);
      await sendTelegramMessage(chatId, `🔒 <b>${formatDateBg(intent.date)}</b> е блокиран — без нови резервации.`);
      return true;
    }
    case 'day_hours':
      await updateSingleDayHours(salon.salonId, salon.slug, intent.day_key, { open: intent.open, close: intent.close });
      await sendTelegramMessage(chatId, `✅ <b>${intent.day_key}</b>: ${intent.open} – ${intent.close}`);
      return true;
    case 'day_closed':
      await updateSingleDayHours(salon.salonId, salon.slug, intent.day_key, null);
      await sendTelegramMessage(chatId, `✅ <b>${intent.day_key}</b> е маркиран като затворен.`);
      return true;
    case 'work_until':
      await updateWorkingHoursClose(salon.salonId, salon.slug, intent.close_time);
      await sendTelegramMessage(chatId, `✅ Работното ви време е актуализирано до <b>${intent.close_time}</b>`);
      return true;
    case 'update_phone':
      await sql`UPDATE salons SET phone = ${intent.phone}, updated_at = now() WHERE CAST(id AS text) = ${salon.salonId}`;
      revalidateTag(`salon-public-${salon.slug}`);
      await sendTelegramMessage(chatId, `✅ Телефонът е обновен: <b>${intent.phone}</b>`);
      return true;
    case 'update_instagram':
      await sql`UPDATE salons SET instagram_username = ${intent.handle}, updated_at = now() WHERE CAST(id AS text) = ${salon.salonId}`;
      revalidateTag(`salon-public-${salon.slug}`);
      await sendTelegramMessage(chatId, `✅ Instagram: <b>@${intent.handle}</b>`);
      return true;
    case 'update_bio':
      await sql`UPDATE salons SET about = ${intent.bio}, updated_at = now() WHERE CAST(id AS text) = ${salon.salonId}`;
      revalidateTag(`salon-public-${salon.slug}`);
      await sendTelegramMessage(chatId, `✅ Описанието е обновено.`);
      return true;
    case 'revenue_range':
      await handleRevenue(chatId, salon, 'range', intent.date_from, intent.date_to);
      return true;
    case 'revenue_compare':
      await handleRevenueCompare(chatId, salon);
      return true;
    case 'avg_booking_value':
      await handleAvgBookingValue(chatId, salon);
      return true;
    case 'inactive_clients':
      await handleInactiveClients(chatId, salon, intent.months ?? 3);
      return true;
    case 'complete_booking':
      await handleCompleteBooking(chatId, salon, intent.client_name);
      return true;
    case 'unblock_day':
      await unblockDay(salon.salonId, salon.slug, intent.date);
      await sendTelegramMessage(chatId, `🔓 <b>${formatDateBg(intent.date)}</b> е деблокиран.`);
      return true;
    case 'update_facebook':
      await sql`UPDATE salons SET facebook_username = ${intent.handle}, updated_at = now() WHERE CAST(id AS text) = ${salon.salonId}`;
      revalidateTag(`salon-public-${salon.slug}`);
      await sendTelegramMessage(chatId, `✅ Facebook: <b>${intent.handle}</b>`);
      return true;
    case 'update_tiktok':
      await sql`UPDATE salons SET tiktok_username = ${intent.handle}, updated_at = now() WHERE CAST(id AS text) = ${salon.salonId}`;
      revalidateTag(`salon-public-${salon.slug}`);
      await sendTelegramMessage(chatId, `✅ TikTok: <b>@${intent.handle}</b>`);
      return true;
    case 'update_google_maps':
      await sql`UPDATE salons SET google_maps_url = ${intent.url}, updated_at = now() WHERE CAST(id AS text) = ${salon.salonId}`;
      revalidateTag(`salon-public-${salon.slug}`);
      await sendTelegramMessage(chatId, `✅ Google Maps линкът е обновен.`);
      return true;
    case 'update_email':
      await sql`UPDATE salons SET email = ${intent.email}, updated_at = now() WHERE CAST(id AS text) = ${salon.salonId}`;
      revalidateTag(`salon-public-${salon.slug}`);
      await sendTelegramMessage(chatId, `✅ Имейлът е обновен: <b>${intent.email}</b>`);
      return true;
    case 'update_owner_bio':
      await sql`UPDATE salons SET owner_public_bio = ${intent.bio}, updated_at = now() WHERE CAST(id AS text) = ${salon.salonId}`;
      revalidateTag(`salon-public-${salon.slug}`);
      await sendTelegramMessage(chatId, `✅ Личното ви bio е обновено.`);
      return true;
    case 'sms_balance':
      await handleSmsBalance(chatId, salon);
      return true;
    case 'toggle_sms':
      await sql`UPDATE salons SET sms_enabled = ${intent.enabled}, updated_at = now() WHERE CAST(id AS text) = ${salon.salonId}`;
      await sendTelegramMessage(chatId, intent.enabled ? '✅ SMS напомнянията са <b>включени</b>.' : '🔕 SMS напомнянията са <b>изключени</b>.');
      return true;
    case 'send_sms_to_client':
      await handleSendSmsToClient(chatId, salon, intent.client_name, intent.message);
      return true;
    case 'confirm_booking':
      await handleConfirmBooking(chatId, salon, intent.client_name);
      return true;
    case 'cancel_booking':
      await handleCancelBooking(chatId, salon, intent.date, intent.time);
      return true;
    case 'remind_tomorrow':
      await handleRemindTomorrow(chatId, salon);
      return true;
    case 'client_phone':
      await handleClientPhone(chatId, salon, intent.client_name);
      return true;
    case 'save_client_contact':
      await handleSaveClientContact(chatId, salon, intent.client_name, intent.phone, intent.email);
      return true;
    case 'save_client_note':
      await handleSaveClientNote(chatId, salon, intent.client_name, intent.note);
      return true;
    case 'client_note':
      await handleGetClientNote(chatId, salon, intent.client_name);
      return true;
    case 'client_bookings':
      await handleClientBookings(chatId, salon, intent.client_name);
      return true;
    case 'find_free_slots':
      await handleFindFreeSlots(chatId, salon, {
        date_from: intent.date_from,
        date_to: intent.date_to,
        after_time: intent.after_time,
        service_name: intent.service_name,
        duration_min: intent.duration_min,
      });
      return true;
    case 'confirm_day_off':
      // Handled by state machine above; AI may still emit this if confused — treat as block
      if (intent.date && /^\d{4}-\d{2}-\d{2}$/.test(intent.date)) {
        await blockAllDay(salon.salonId, salon.slug, intent.date);
        await sendTelegramMessage(chatId, `🔒 <b>${formatDateBg(intent.date)}</b> е блокиран — без нови резервации.`);
      }
      return true;
    case 'reschedule_booking': {
      // Guard: skip if AI gave us invalid dates (happens when context is lost)
      const validFrom = intent.from_date && /^\d{4}-\d{2}-\d{2}$/.test(intent.from_date);
      const validTo = intent.to_date && /^\d{4}-\d{2}-\d{2}$/.test(intent.to_date);
      if (!validFrom || !validTo) {
        await sendTelegramMessage(chatId, `⚠️ Не разбрах от коя дата на коя дата да преместя. Моля, уточни — напр. "Премести Деляна от четвъртък за вторник в 10:00".`);
        return true;
      }
      await handleRescheduleBooking(chatId, salon, intent.client_name, intent.from_date, intent.to_date, intent.to_time);
      return true;
    }
    case 'update_booking_service': {
      const services = await getSalonServices(salon.salonId);
      const svcIdx = findServiceIndex(services, intent.new_service);
      const resolvedName = svcIdx !== -1 ? services[svcIdx]!.name : intent.new_service;
      const resolvedPrice = svcIdx !== -1 ? services[svcIdx]!.price : null;
      const updated = await sql`
        UPDATE bookings
        SET service_name = ${resolvedName},
            service_price = ${resolvedPrice},
            updated_at = now()
        WHERE CAST(salon_id AS text) = ${salon.salonId}
          AND lower(client_name) = lower(${intent.client_name})
          AND date = ${intent.date}
          AND start_time = ${intent.time}
        RETURNING id
      ` as { id: string }[];
      if (updated.length === 0) {
        await sendTelegramMessage(chatId, `⚠️ Не намерих резервация на <b>${intent.client_name}</b> на ${formatDateBg(intent.date)} в ${intent.time}.`);
        return true;
      }
      revalidateTag(`salon-public-${salon.slug}`);
      await setState(chatId, { type: 'last_booking', bookingId: updated[0]!.id, clientName: intent.client_name, clientId: null, date: intent.date, time: intent.time, serviceName: resolvedName, created_at: new Date().toISOString() });
      const priceStr = resolvedPrice != null ? ` — ${resolvedPrice} €` : '';
      await sendTelegramMessage(chatId, `✅ Услугата е променена на <b>${resolvedName}</b>${priceStr} за <b>${intent.client_name}</b>.`);
      return true;
    }
    case 'chat':
      if (intent.reply) {
        // Guard: if AI hallucinated a success message for a write action, fall through so the
        // user gets the "not understood" hint instead of a fake confirmation.
        const looksLikeFakeAction = /добав[ии]|добавен[аa]?|записан[аa]?|запис[ао]|обнов[ии]|промен[ии]|изтр[ии]|запаз[ии]|резервац/i.test(intent.reply)
          && /✅|успешно|добавена|добавен|записан|записах|добавих/i.test(intent.reply);
        if (looksLikeFakeAction) return false;
        // Strip Markdown formatting (**, *, __) since Telegram uses HTML parse mode
        const cleanReply = intent.reply
          .replace(/\*\*(.+?)\*\*/g, '$1')
          .replace(/\*(.+?)\*/g, '$1')
          .replace(/__(.+?)__/g, '$1')
          .replace(/^[ \t]*\*[ \t]+/gm, '• ');
        await appendHistory(chatId, 'assistant', cleanReply);
        await sendTelegramMessage(chatId, cleanReply);
        return true;
      }
      return false;
    default:
      return false;
  }
  // unreachable, but _t is available if needed
}

function _logTiming(label: string, t: Record<string, number>): void {
  const keys = Object.keys(t);
  const rows: string[] = [];
  for (let i = 1; i < keys.length; i++) {
    const prev = keys[i - 1]!;
    const curr = keys[i]!;
    rows.push(`  ${prev}→${curr}: ${t[curr]! - t[prev]!}ms`);
  }
  const total = t[keys[keys.length - 1]!]! - t[keys[0]!]!;
  console.log(`[TIMING] ${label} | total: ${total}ms\n${rows.join('\n')}`);
}

// ─── Salon context loader ─────────────────────────────────────────────────────

async function loadSalonContext(salonId: string): Promise<string> {
  try {
    // Sequential queries to avoid exhausting Neon's concurrent connection limit.
    const salonRows = await sql`
      SELECT name, category, city, about, services, working_hours
      FROM salons WHERE CAST(id AS text) = ${salonId} LIMIT 1
    `;
    const bookingRows = await sql`
      SELECT client_name, service_name, start_time, end_time, date, status, service_price
      FROM bookings
      WHERE CAST(salon_id AS text) = ${salonId}
        AND date >= ${todayISO()}
        AND status NOT IN ('cancelled')
      ORDER BY date, start_time
      LIMIT 10
    `;
    const revenueRows = await sql`
      SELECT
        COALESCE(SUM(service_price), 0)::numeric AS month_revenue,
        COUNT(*)::int AS month_bookings
      FROM bookings
      WHERE CAST(salon_id AS text) = ${salonId}
        AND date >= ${`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`}
        AND status NOT IN ('cancelled')
    `;

    const salon = salonRows[0] as Record<string, unknown> | undefined;
    if (!salon) return '';

    const services = normalizeServices(salon.services ?? []);
    const servicesList = services.length > 0
      ? services.map((s) => `${s.name} (${s.duration_min} мин, ${(s.price * 1.95583).toFixed(0)} лв)`).join(', ')
      : 'няма добавени услуги';

    const upcomingBookings = (bookingRows as Record<string, unknown>[]).map((b) =>
      `${b.date} ${b.start_time}–${b.end_time}: ${b.client_name} — ${b.service_name} (${b.status})`
    ).join('\n') || 'няма предстоящи резервации';

    const rev = revenueRows[0] as { month_revenue: number; month_bookings: number } | undefined;
    const monthRevenueLv = rev ? (Number(rev.month_revenue) * 1.95583).toFixed(0) : '0';
    const monthBookings = rev ? Number(rev.month_bookings) : 0;

    return `
Салон: ${salon.name} (${salon.category ?? 'красота'}, ${salon.city ?? ''})
Описание: ${String(salon.about ?? '').slice(0, 300) || 'няма'}
Услуги: ${servicesList}
Оборот този месец: ${monthRevenueLv} лв (${monthBookings} резервации)
Предстоящи резервации (следващите 10):
${upcomingBookings}
`.trim();
  } catch {
    return '';
  }
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

  const systemPrompt = `Ти си асистент, който извлича информация за услуги и цени от снимки на ценоразписи на салони.
Върни САМО валиден JSON масив без markdown.

Има два формата в зависимост от ценоразписа:

1. ОБИКНОВЕН (една цена на услуга):
[{"name":string,"price":number,"duration_min":number,"category":string}]

2. С ВАРИАНТИ (ако има колони за различни нива/специалисти като Barber/Senior/Master или Junior/Senior или подобни):
[{"name":string,"price":number,"duration_min":number,"category":string,"variants":[{"label":string,"price":number},{"label":string,"price":number}]}]
В този случай "price" = цената на първия (най-евтин) вариант. Всеки вариант има "label" (напр. "Barber", "Senior Barber", "Master") и "price".

КРИТИЧНО: Извлечи ВСИЧКИ услуги без изключение. НЕ дедублирай — подобни имена са различни услуги. Преброй редовете и се увери че JSON-ът има точно толкова елементи.
Цените да са в евро (EUR). Ако са в лева, раздели на 1.95583 и закръгли до цяло число.
Ако продължителността не е посочена, прецени я по типа услуга (подстригване 30мин, боядисване 90мин, маникюр 45мин и т.н.).`;

  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: openRouterHeaders(),
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro',
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

  let parsed: { name: string; price: number; duration_min: number; category?: string; variants?: { label: string; price: number }[] }[] = [];
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

    // Parse variants if present
    const variants = Array.isArray(item.variants)
      ? item.variants
          .map((v) => ({ label: String(v.label ?? '').trim(), price: Math.max(0, Math.round(Number(v.price) || 0)) }))
          .filter((v) => v.label)
      : undefined;

    const svc: ServiceItem = {
      name,
      price: variants?.[0]?.price ?? Math.max(0, Math.round(Number(item.price) || 0)),
      duration_min: Math.max(5, Number(item.duration_min) || 30),
      ...(item.category ? { category: String(item.category).trim() } : {}),
      ...(variants && variants.length > 1 ? { variants } : {}),
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
    if (s.variants && s.variants.length > 1) {
      const variantStr = s.variants.map(v => `${v.label} ${v.price}€`).join(' / ');
      lines.push(`• ${s.name} — ${s.duration_min} мин — ${variantStr}${s.category ? ` (${s.category})` : ''}`);
    } else {
      lines.push(`• ${s.name} — ${s.duration_min} мин — ${s.price} €${s.category ? ` (${s.category})` : ''}`);
    }
  }
  lines.push('', '💡 Ако искаш да ги изтриеш, напиши <code>изтрий добавените услуги</code>');
  await sendTelegramMessage(chatId, lines.join('\n'));

  // Remember imported service names so owner can undo the import
  await setState(chatId, {
    type: 'last_imported_services',
    serviceNames: added.map(s => s.name),
    created_at: new Date().toISOString(),
  });
}

// ─── Booking handlers ────────────────────────────────────────────────────────

async function handleBookingsForDay(
  chatId: number,
  salon: SalonRef,
  date: string,
  label: string,
): Promise<void> {
  const [rows, salonRows] = await Promise.all([
    sql`
      SELECT CAST(id AS text) AS id, client_name, client_phone, time, service_name, status
      FROM bookings
      WHERE CAST(salon_id AS text) = ${salon.salonId}
        AND date = ${date}
        AND status NOT IN ('cancelled')
        AND (${salon.staffMemberId ?? null}::uuid IS NULL OR staff_member_id = ${salon.staffMemberId ?? null}::uuid)
      ORDER BY time ASC
    ` as unknown as Promise<{ id: string; client_name: string; client_phone: string; time: string; service_name: string; status: string }[]>,
    sql`SELECT opening_hours FROM salons WHERE CAST(id AS text) = ${salon.salonId} LIMIT 1`,
  ]);

  const openingHours = (salonRows[0]?.opening_hours && typeof salonRows[0].opening_hours === 'object'
    ? salonRows[0].opening_hours : {}) as Record<string, unknown>;
  const dayBlocks = normalizeBookingBlocks(openingHours.booking_blocks).filter(b => b.date === date && !b.allDay);

  const dateStr = formatDateBg(date);

  if (rows.length === 0 && dayBlocks.length === 0) {
    await sendTelegramMessage(chatId, `📅 <b>${dateStr}</b>\n\nНяма записи за ${label}.`);
    return;
  }

  const totalCount = rows.length + dayBlocks.length;
  const lines = [`📅 <b>${dateStr} — ${totalCount} ${pluralBooking(totalCount)}:</b>`, ''];

  // Merge bookings and blocks sorted by time
  type Entry = { time: string; label: string };
  const entries: Entry[] = [
    ...rows.map(r => ({
      time: r.time,
      label: `${r.status === 'confirmed' ? '✅' : '⏳'} ${r.time} — <b>${r.client_name}</b> (${r.service_name})`,
    })),
    ...dayBlocks.map(b => ({
      time: b.start!,
      label: `🔒 ${b.start}–${b.end} — <b>Зает час</b>${b.note ? ` (${b.note})` : ''}`,
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  entries.forEach((e, i) => lines.push(`${i + 1}. ${e.label}`));

  await sendTelegramMessage(chatId, lines.join('\n'));

  // Snapshot the list so follow-up references like "им", "втория", "номера на 2" resolve programmatically
  await setState(chatId, {
    type: 'last_context',
    entity_type: 'booking',
    entities: rows.map(r => ({
      id: r.id,
      name: r.client_name,
      phone: r.client_phone || undefined,
      time: r.time,
      date,
      service_name: r.service_name,
    })),
    created_at: new Date().toISOString(),
  });
}

async function handleBookingsForWeek(chatId: number, salon: SalonRef, mode: 'current' | 'last' = 'current'): Promise<void> {
  let startDate: string;
  let endDate: string;
  if (mode === 'last') {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() + mondayOffset - 7);
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    startDate = lastMonday.toISOString().slice(0, 10);
    endDate = lastSunday.toISOString().slice(0, 10);
  } else {
    startDate = todayISO();
    endDate = offsetDayISO(6);
  }

  const rows = await sql`
    SELECT CAST(id AS text) AS id, client_name, client_phone, date, time, service_name, service_price, status
    FROM bookings
    WHERE CAST(salon_id AS text) = ${salon.salonId}
      AND date >= ${startDate}
      AND date <= ${endDate}
      AND status NOT IN ('cancelled')
      AND (${salon.staffMemberId ?? null}::uuid IS NULL OR staff_member_id = ${salon.staffMemberId ?? null}::uuid)
    ORDER BY date ASC, time ASC
  ` as { id: string; client_name: string; client_phone: string; date: string; time: string; service_name: string; service_price: number | null; status: string }[];

  if (rows.length === 0) {
    await sendTelegramMessage(chatId, mode === 'last' ? `📅 Няма резервации за миналата седмица.` : `📅 Няма резервации за следващите 7 дни.`);
    return;
  }

  // Group by date
  const byDate = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byDate.get(r.date) ?? [];
    list.push(r);
    byDate.set(r.date, list);
  }

  const weekLabel = mode === 'last' ? 'миналата седмица' : 'тази седмица';
  const lines = [`📅 <b>Резервации за ${weekLabel} (${rows.length} ${pluralBooking(rows.length)}):</b>`];
  for (const [date, dayRows] of byDate) {
    lines.push('', `<b>${formatDateBg(date)}</b>`);
    for (let i = 0; i < dayRows.length; i++) {
      const r = dayRows[i]!;
      const icon = r.status === 'confirmed' ? '✅' : '⏳';
      lines.push(`${icon} <b>${r.time}</b> / ${r.client_name} - ${r.service_name}`);
      if (i < dayRows.length - 1) lines.push('· · · · · · · · · · · ·');
    }
  }
  await sendTelegramMessage(chatId, lines.join('\n'));
}

async function handleNextClient(chatId: number, salon: SalonRef): Promise<void> {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentTime = now.toTimeString().slice(0, 5);

  const rows = await sql`
    SELECT CAST(id AS text) AS id, client_name, client_phone, time, service_name, service_duration, date
    FROM bookings
    WHERE CAST(salon_id AS text) = ${salon.salonId}
      AND status NOT IN ('cancelled', 'completed')
      AND (date > ${todayStr} OR (date = ${todayStr} AND time >= ${currentTime}))
      AND (${salon.staffMemberId ?? null}::uuid IS NULL OR staff_member_id = ${salon.staffMemberId ?? null}::uuid)
    ORDER BY date ASC, time ASC
    LIMIT 1
  ` as { id: string; client_name: string; client_phone: string; time: string; service_name: string; service_duration: number | null; date: string }[];

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

  await setState(chatId, {
    type: 'last_context',
    entity_type: 'booking',
    entities: [{ id: r.id, name: r.client_name, phone: r.client_phone || undefined, time: r.time, date: r.date, service_name: r.service_name }],
    created_at: new Date().toISOString(),
  });
}

async function handleConfirmBooking(chatId: number, salon: SalonRef, clientName: string): Promise<void> {
  const tomorrow = offsetDayISO(1);
  const rows = await sql`
    SELECT CAST(id AS text) AS id, client_name, date, time, service_name
    FROM bookings
    WHERE CAST(salon_id AS text) = ${salon.salonId}
      AND status = 'pending'
      AND lower(client_name) LIKE ${`%${clientName.toLowerCase()}%`}
      AND date >= ${todayISO()}
      AND (${salon.staffMemberId ?? null}::uuid IS NULL OR staff_member_id = ${salon.staffMemberId ?? null}::uuid)
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
    WHERE CAST(salon_id AS text) = ${salon.salonId}
      AND date = ${date}
      AND time = ${time}
      AND status NOT IN ('cancelled', 'completed')
      AND (${salon.staffMemberId ?? null}::uuid IS NULL OR staff_member_id = ${salon.staffMemberId ?? null}::uuid)
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
    SELECT CAST(id AS text) AS id, client_name, client_phone, date, time, service_name, service_price
    FROM bookings
    WHERE CAST(salon_id AS text) = ${salon.salonId}
      AND status = 'pending'
      AND date >= ${todayISO()}
      AND (${salon.staffMemberId ?? null}::uuid IS NULL OR staff_member_id = ${salon.staffMemberId ?? null}::uuid)
    ORDER BY date ASC, time ASC
    LIMIT 10
  ` as { id: string; client_name: string; client_phone: string; date: string; time: string; service_name: string; service_price: number | null }[];

  if (rows.length === 0) {
    await sendTelegramMessage(chatId, '✅ Няма незатвърдени резервации.');
    return;
  }

  const lines = [`⏳ <b>Незатвърдени резервации (${rows.length}):</b>`, ''];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const priceStr = r.service_price != null ? ` — ${r.service_price} €` : '';
    lines.push(`${i + 1}. ${formatDateBg(r.date, { weekday: 'short', day: 'numeric', month: 'short' })} ${r.time} — <b>${r.client_name}</b> (${r.service_name}${priceStr})`);
  }
  const total = rows.reduce((sum, r) => sum + (Number(r.service_price) || 0), 0);
  if (total > 0) lines.push('', `💰 <b>Общо: ${total} €</b>`);
  lines.push('', '💡 Напиши <code>потвърди 1</code> (или <code>потвърди Деляна</code>) — клиентът получава потвърждение по имейл.');
  await sendTelegramMessage(chatId, lines.join('\n'));

  await setState(chatId, {
    type: 'last_context',
    entity_type: 'booking',
    entities: rows.map(r => ({
      id: r.id,
      name: r.client_name,
      phone: r.client_phone || undefined,
      time: r.time,
      date: r.date,
      service_name: r.service_name,
      price: r.service_price ?? undefined,
    })),
    created_at: new Date().toISOString(),
  });
}

async function handleRescheduleBooking(
  chatId: number,
  salon: SalonRef,
  clientName: string,
  fromDate: string,
  toDate: string,
  toTime: string | undefined,
): Promise<void> {
  const rows = await sql`
    SELECT CAST(id AS text) AS id, client_name, date, time, service_name, service_duration
    FROM bookings
    WHERE CAST(salon_id AS text) = ${salon.salonId}
      AND lower(client_name) LIKE ${`%${clientName.toLowerCase()}%`}
      AND date = ${fromDate}
      AND status NOT IN ('cancelled', 'completed')
      AND (${salon.staffMemberId ?? null}::uuid IS NULL OR staff_member_id = ${salon.staffMemberId ?? null}::uuid)
    ORDER BY time ASC
    LIMIT 1
  ` as { id: string; client_name: string; date: string; time: string; service_name: string; service_duration: number | null }[];

  if (rows.length === 0) {
    await sendTelegramMessage(chatId, `❌ Не намерих резервация на <b>${clientName}</b> за ${formatDateBg(fromDate)}.`);
    return;
  }

  const r = rows[0]!;
  const duration = r.service_duration ?? 60;

  const resolvedTime = toTime ?? r.time;

  await sql`
    UPDATE bookings
    SET date = ${toDate}, time = ${resolvedTime}
    WHERE CAST(id AS text) = ${r.id}
  `;

  // Fire the Booking Rescheduled event — email + reminders
  const { onBookingRescheduled } = await import('@/lib/booking-reschedule');
  const rescheduleResult = await onBookingRescheduled({
    bookingId: r.id,
    salonId: salon.salonId,
    oldDate: fromDate,
    oldTime: r.time,
    newDate: toDate,
    newTime: resolvedTime,
  });

  // Build owner report
  const lines = [
    `✅ <b>Резервацията е преместена</b>`,
    ``,
    `👤 <b>${r.client_name}</b>`,
    `✂️ ${r.service_name}`,
    `📅 ${formatDateBg(toDate)} в <b>${resolvedTime}</b>`,
    ``,
  ];

  if (rescheduleResult.emailSent) {
    lines.push(`📧 Изпратих имейл уведомление на клиента.`);
  } else if (rescheduleResult.emailReason === 'no_email') {
    lines.push(`⚠️ Клиентът няма имейл адрес — не беше изпратено уведомление.`);
  } else if (rescheduleResult.emailReason === 'send_failed') {
    lines.push(`⚠️ Имейлът не беше изпратен поради техническа грешка.`);
  }

  if (rescheduleResult.remindersUpdated) {
    lines.push(`⏰ Обнових автоматичните напомняния.`);
  }

  await sendTelegramMessage(chatId, lines.join('\n'));
}

async function handleClientPhone(chatId: number, salon: SalonRef, clientName: string): Promise<void> {
  const rows = await sql`
    SELECT client_name, client_phone, date, time, service_name
    FROM bookings
    WHERE CAST(salon_id AS text) = ${salon.salonId}
      AND lower(client_name) LIKE ${`%${clientName.toLowerCase()}%`}
      AND client_phone IS NOT NULL
      AND client_phone != ''
    ORDER BY date DESC, time DESC
    LIMIT 1
  ` as { client_name: string; client_phone: string; date: string; time: string; service_name: string }[];

  if (rows.length > 0) {
    const r = rows[0]!;
    await sendTelegramMessage(
      chatId,
      `👤 <b>${r.client_name}</b>\n<i>Последен запис: ${formatDateBg(r.date)} в ${r.time} — ${r.service_name}</i>`,
    );
    await sendTelegramMessage(chatId, r.client_phone);
    return;
  }

  // Fallback: check salon_clients table (phones saved via "добави телефон на X")
  try {
    const { ensureSalonClientsSchema } = await import('@/lib/ensure-salon-clients-schema');
    await ensureSalonClientsSchema();
    const clientRows = await sql`
      SELECT name, phone FROM salon_clients
      WHERE salon_id = ${salon.salonId}
        AND lower(name) LIKE ${`%${clientName.toLowerCase()}%`}
        AND phone IS NOT NULL AND phone != ''
      LIMIT 1
    ` as { name: string; phone: string }[];

    if (clientRows.length > 0) {
      const c = clientRows[0]!;
      await sendTelegramMessage(chatId, `👤 <b>${c.name}</b>`);
      await sendTelegramMessage(chatId, c.phone);
      return;
    }
  } catch {
    // non-critical
  }

  await sendTelegramMessage(chatId, `❌ Не намерих клиент с телефон за <b>${clientName}</b>.`);
}

async function upsertSalonClient(
  salonId: string,
  name: string,
  fields: { phone?: string; email?: string; notes?: string },
): Promise<{ id: string | null; isNew: boolean }> {
  const { ensureSalonClientsSchema } = await import('@/lib/ensure-salon-clients-schema');
  await ensureSalonClientsSchema();

  const existing = await sql`
    SELECT id FROM salon_clients WHERE salon_id = ${salonId} AND lower(name) = lower(${name}) LIMIT 1
  ` as { id: string }[];

  if (existing.length === 0) {
    const inserted = await sql`
      INSERT INTO salon_clients (salon_id, name, phone, email, notes)
      VALUES (${salonId}, ${name}, ${fields.phone ?? null}, ${fields.email ?? null}, ${fields.notes ?? null})
      ON CONFLICT (salon_id, name) DO UPDATE SET
        phone = COALESCE(EXCLUDED.phone, salon_clients.phone),
        email = COALESCE(EXCLUDED.email, salon_clients.email),
        notes = COALESCE(EXCLUDED.notes, salon_clients.notes),
        updated_at = now()
      RETURNING id
    ` as { id: string }[];
    return { id: inserted[0]?.id ?? null, isNew: true };
  } else {
    if (fields.phone !== undefined) await sql`UPDATE salon_clients SET phone = ${fields.phone}, updated_at = now() WHERE salon_id = ${salonId} AND lower(name) = lower(${name})`;
    if (fields.email !== undefined) await sql`UPDATE salon_clients SET email = ${fields.email}, updated_at = now() WHERE salon_id = ${salonId} AND lower(name) = lower(${name})`;
    if (fields.notes !== undefined) await sql`UPDATE salon_clients SET notes = ${fields.notes}, updated_at = now() WHERE salon_id = ${salonId} AND lower(name) = lower(${name})`;
    return { id: existing[0]?.id ?? null, isNew: false };
  }
}

async function getNextBookingForClient(salonId: string, clientName: string): Promise<{ date: string; time: string } | null> {
  const today = todayISO();
  const rows = await sql`
    SELECT date, time FROM bookings
    WHERE CAST(salon_id AS text) = ${salonId}
      AND lower(client_name) LIKE ${`%${clientName.toLowerCase()}%`}
      AND date >= ${today}
      AND status NOT IN ('cancelled', 'completed')
    ORDER BY date ASC, time ASC
    LIMIT 1
  ` as { date: string; time: string }[];
  return rows[0] ?? null;
}

async function handleSaveClientContact(chatId: number, salon: SalonRef, clientName: string, phone?: string, email?: string): Promise<void> {
  // All write operations (phone/email) go through a confirmation step.
  if (phone || email) {
    const { ensureSalonClientsSchema } = await import('@/lib/ensure-salon-clients-schema');
    await ensureSalonClientsSchema();

    // Partial name search with visit count hint — used for disambiguation display.
    // JOIN with bookings so duplicates (same name) can be told apart.
    const rawCandidates = await sql`
      SELECT
        CAST(sc.id AS text) AS id,
        sc.name,
        sc.phone AS existing_phone,
        COUNT(b.id)::int AS visit_count,
        MAX(b.date) AS last_visit
      FROM salon_clients sc
      LEFT JOIN bookings b
        ON lower(b.client_name) = lower(sc.name)
        AND CAST(b.salon_id AS text) = ${salon.salonId}
        AND b.status NOT IN ('cancelled')
      WHERE sc.salon_id = ${salon.salonId}
        AND lower(sc.name) LIKE ${`%${clientName.toLowerCase()}%`}
      GROUP BY sc.id, sc.name, sc.phone
      ORDER BY sc.name ASC
      LIMIT 5
    ` as { id: string; name: string; existing_phone: string | null; visit_count: number; last_visit: string | null }[];

    // ── If no match in salon_clients, also check bookings (older clients) ────
    // NOTE: we do NOT pre-upsert here — upsert happens only after the user confirms.
    // Pre-upserting before confirmation would create salon_clients rows even if the user says "не".
    let allCandidateRows = rawCandidates;
    if (rawCandidates.length === 0) {
      const bookingMatches = await sql`
        SELECT
          client_name AS name,
          MAX(client_phone) AS existing_phone,
          COUNT(*)::int AS visit_count,
          MAX(date) AS last_visit
        FROM bookings
        WHERE CAST(salon_id AS text) = ${salon.salonId}
          AND lower(client_name) LIKE ${`%${clientName.toLowerCase()}%`}
          AND status NOT IN ('cancelled')
        GROUP BY lower(client_name), client_name
        ORDER BY client_name ASC
        LIMIT 5
      ` as { name: string; existing_phone: string | null; visit_count: number; last_visit: string | null }[];
      // Add booking-derived candidates with id=null (id is assigned when the user confirms)
      for (const bm of bookingMatches) {
        allCandidateRows = [...allCandidateRows, {
          id: null as unknown as string,
          name: bm.name,
          existing_phone: bm.existing_phone,
          visit_count: bm.visit_count,
          last_visit: bm.last_visit,
        }];
      }
    }

    // Build hint string per candidate for disambiguation display
    const candidates = allCandidateRows.map(c => {
      const parts: string[] = [];
      if (c.existing_phone) parts.push(`тел: ${c.existing_phone.slice(-4).padStart(c.existing_phone.length, '*').slice(-8)}`);
      if (c.visit_count > 0) parts.push(`${c.visit_count} посещения`);
      if (c.last_visit) parts.push(`последно ${c.last_visit.slice(8, 10)}.${c.last_visit.slice(5, 7)}`);
      return { id: c.id, name: c.name, hint: parts.join(' · ') };
    });

    // contact encodes either a phone or "email:xxx" — preserved through all state transitions
    const contact = phone ?? (email ? `email:${email}` : '');

    // ── Multiple matches → disambiguation first ──────────────────────────────
    if (candidates.length > 1) {
      await setState(chatId, {
        type: 'waiting_disambig_save_phone',
        candidates,
        contact,
        created_at: new Date().toISOString(),
      });
      const lines = [`🔍 Намерих няколко клиента:\n`];
      candidates.forEach((c, i) => {
        lines.push(c.hint ? `${i + 1}. <b>${c.name}</b> — ${c.hint}` : `${i + 1}. <b>${c.name}</b>`);
      });
      lines.push(`\nКой имаш предвид?`);
      await sendTelegramMessage(chatId, lines.join('\n'));
      return;
    }

    // ── Single match or no match → confirmation card ─────────────────────────
    const match = allCandidateRows[0] ?? null;
    const resolvedName = match?.name ?? clientName;
    const clientId = match?.id ?? null;
    const clientExists = match !== null;
    console.log('[TG_SAVE_CONTACT] clientName:', clientName, '| match:', match?.name ?? 'null', '| clientExists:', clientExists);

    const isEmail = contact.startsWith('email:');
    const contactLabel = isEmail
      ? `✉️ Да добавя ли имейл:\n<b>${contact.slice(6)}</b>`
      : `📞 Да добавя ли телефон:\n<b>${contact}</b>`;

    if (clientExists) {
      // Existing client — confirm before overwriting their phone/email
      await setState(chatId, {
        type: 'waiting_confirm_save_phone',
        clientName: resolvedName,
        phone: contact,
        clientId,
        clientExists: true,
        created_at: new Date().toISOString(),
      });
      const existingPhoneHint = allCandidateRows[0]?.existing_phone ? ` (сега: ${allCandidateRows[0].existing_phone})` : '';
      await sendTelegramMessage(
        chatId,
        `👤 Намерих клиент:\n<b>${resolvedName}</b>${existingPhoneHint}\n\n${contactLabel}\n\n<i>Отговори да / не</i>`,
      );
    } else {
      // New client — save directly, no confirmation needed
      const isEmailContact = contact.startsWith('email:');
      const emailVal = isEmailContact ? contact.slice(6) : undefined;
      const phoneVal = isEmailContact ? undefined : contact;
      try {
        await upsertSalonClient(salon.salonId, clientName, { phone: phoneVal, email: emailVal });
      } catch (err) {
        console.error('[TG_CLIENT] new client upsert failed:', err);
        await sendTelegramMessage(chatId, `❌ Грешка при запазване на клиента. Опитай пак.`);
        return;
      }
      await setState(chatId, { type: 'last_client', clientId: null, name: clientName, created_at: new Date().toISOString() });
      const detail = phoneVal ? `телефон: <b>${phoneVal}</b>` : `имейл: <b>${emailVal}</b>`;
      await sendTelegramMessage(chatId, `✅ Добавих нов клиент <b>${clientName}</b> — ${detail}`);
      await appendHistory(chatId, 'assistant', `[save_client_contact: ${clientName}${phoneVal ? `, tel: ${phoneVal}` : ''}${emailVal ? `, email: ${emailVal}` : ''}]`);
    }
    return;
  }

  // No phone or email — just create/register the client name, no confirmation needed
  let clientId: string | null = null;
  let isNew = true;
  try {
    const result = await upsertSalonClient(salon.salonId, clientName, {});
    clientId = result.id;
    isNew = result.isNew;
  } catch (err) {
    console.error('[TG_CLIENT] upsertSalonClient failed:', err);
    await sendTelegramMessage(chatId, `❌ Грешка при запазване на клиента. Провери връзката с базата данни.`);
    return;
  }
  await setState(chatId, { type: 'last_client', clientId, name: clientName, created_at: new Date().toISOString() });
  const reply = isNew
    ? `✅ Добавен е нов клиент <b>${clientName}</b>.\n\n<i>Изпрати телефонния номер за да го запиша.</i>`
    : `✅ Клиент <b>${clientName}</b> вече е в базата.`;
  await sendTelegramMessage(chatId, reply);
  await appendHistory(chatId, 'assistant', `[save_client_contact: ${clientName}]`);
}

async function handleSaveClientNote(chatId: number, salon: SalonRef, clientName: string, note: string): Promise<void> {
  const { sendTelegramInlineKeyboard } = await import('@/lib/telegram');
  await upsertSalonClient(salon.salonId, clientName, { notes: note }); // id/isNew unused here

  const next = await getNextBookingForClient(salon.salonId, clientName);
  const dateLabel = next ? ` (${formatDateBg(next.date)} в ${next.time.slice(0, 5)})` : '';

  const reminderQ = next
    ? `🔔 Искаш ли напомняне преди следващия й час${dateLabel}?`
    : `🔔 Искаш ли напомняне преди бъдещи часове на <b>${clientName}</b>?`;

  await sendTelegramInlineKeyboard(
    chatId,
    `📝 Запазих бележка за <b>${clientName}</b>:\n<i>${note}</i>\n\n${reminderQ}`,
    [
      [
        { text: '✅ Да, напомни ми', callback_data: `cnr:day:${clientName}` },
        { text: '❌ Не', callback_data: `cnr:none:${clientName}` },
      ],
    ],
  );
}

async function handleGetClientNote(chatId: number, salon: SalonRef, clientName: string): Promise<void> {
  const { ensureSalonClientsSchema } = await import('@/lib/ensure-salon-clients-schema');
  await ensureSalonClientsSchema();
  const rows = await sql`
    SELECT name, notes, phone, email FROM salon_clients
    WHERE salon_id = ${salon.salonId} AND lower(name) LIKE ${`%${clientName.toLowerCase()}%`}
    LIMIT 1
  ` as { name: string; notes: string | null; phone: string | null; email: string | null }[];

  if (rows.length === 0 || !rows[0]!.notes) {
    await sendTelegramMessage(chatId, `📭 Нямам бележки за <b>${clientName}</b>.`);
    return;
  }
  const r = rows[0]!;
  const lines = [`👤 <b>${r.name}</b>`, '', `📝 ${r.notes}`];
  if (r.phone) lines.push(`📞 ${r.phone}`);
  if (r.email) lines.push(`✉️ ${r.email}`);
  await sendTelegramMessage(chatId, lines.join('\n'));
}

async function handleClientBookings(chatId: number, salon: SalonRef, clientName: string): Promise<void> {
  const today = todayISO();
  const rows = await sql`
    SELECT client_name, date, time, service_name, status
    FROM bookings
    WHERE CAST(salon_id AS text) = ${salon.salonId}
      AND lower(client_name) LIKE ${`%${clientName.toLowerCase()}%`}
      AND date >= ${today}
      AND status NOT IN ('cancelled', 'completed')
    ORDER BY date ASC, time ASC
    LIMIT 5
  ` as { client_name: string; date: string; time: string; service_name: string; status: string }[];

  if (rows.length === 0) {
    await sendTelegramMessage(chatId, `📭 Нямам предстоящи записи за <b>${clientName}</b>.`);
    return;
  }

  const name = rows[0]!.client_name;
  const lines = [`📅 Предстоящи записи на <b>${name}</b>:`, ''];
  for (const r of rows) {
    lines.push(`• ${formatDateBg(r.date)} в ${r.time.slice(0, 5)} — ${r.service_name}`);
  }
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
    WHERE CAST(salon_id AS text) = ${salon.salonId}
      AND date = ${tomorrow}
      AND status NOT IN ('cancelled', 'completed')
      AND (${salon.staffMemberId ?? null}::uuid IS NULL OR staff_member_id = ${salon.staffMemberId ?? null}::uuid)
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

async function handleRevenue(chatId: number, salon: SalonRef, period: 'week' | 'last_week' | 'month' | 'last_month' | 'year' | 'last_year' | 'range', rangeFrom?: string, rangeTo?: string): Promise<void> {
  let periodStart: string;
  let periodEnd: string;
  let label: string;

  const today = new Date();

  if (period === 'range' && rangeFrom && rangeTo) {
    periodStart = rangeFrom;
    periodEnd = rangeTo;
    label = `${formatDateBg(rangeFrom, { day: 'numeric', month: 'long' })} – ${formatDateBg(rangeTo, { day: 'numeric', month: 'long' })}`;
  } else if (period === 'week' || period === 'last_week') {
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset + (period === 'last_week' ? -7 : 0));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    periodStart = monday.toISOString().slice(0, 10);
    periodEnd = sunday.toISOString().slice(0, 10);
    label = `${monday.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long' })} – ${sunday.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long' })}`;
  } else if (period === 'last_month') {
    const firstOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    periodStart = firstOfLastMonth.toISOString().slice(0, 10);
    periodEnd = lastOfLastMonth.toISOString().slice(0, 10);
    label = firstOfLastMonth.toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' });
  } else if (period === 'year') {
    periodStart = `${today.getFullYear()}-01-01`;
    periodEnd = `${today.getFullYear()}-12-31`;
    label = `${today.getFullYear()} г.`;
  } else if (period === 'last_year') {
    const y = today.getFullYear() - 1;
    periodStart = `${y}-01-01`;
    periodEnd = `${y}-12-31`;
    label = `${y} г.`;
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
    WHERE CAST(salon_id AS text) = ${salon.salonId}
      AND date >= ${periodStart}
      AND date <= ${periodEnd}
      AND status NOT IN ('cancelled')
      AND (${salon.staffMemberId ?? null}::uuid IS NULL OR staff_member_id = ${salon.staffMemberId ?? null}::uuid)
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
      (
        SELECT service_name FROM bookings b2
        WHERE CAST(b2.salon_id AS text) = ${salon.salonId}
          AND lower(b2.client_name) LIKE ${`%${clientName.toLowerCase()}%`}
          AND b2.status NOT IN ('cancelled')
          AND (${salon.staffMemberId ?? null}::uuid IS NULL OR b2.staff_member_id = ${salon.staffMemberId ?? null}::uuid)
        GROUP BY service_name ORDER BY COUNT(*) DESC LIMIT 1
      ) AS top_service
    FROM bookings
    WHERE CAST(salon_id AS text) = ${salon.salonId}
      AND lower(client_name) LIKE ${`%${clientName.toLowerCase()}%`}
      AND status NOT IN ('cancelled')
      AND (${salon.staffMemberId ?? null}::uuid IS NULL OR staff_member_id = ${salon.staffMemberId ?? null}::uuid)
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
    WHERE CAST(salon_id AS text) = ${salon.salonId}
      AND date >= ${monthStart}
      AND status NOT IN ('cancelled')
      AND (${salon.staffMemberId ?? null}::uuid IS NULL OR staff_member_id = ${salon.staffMemberId ?? null}::uuid)
  ` as { total: number; unique_clients: number }[];

  const r = rows[0]!;
  const month = today.toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' });
  await sendTelegramMessage(
    chatId,
    `👥 <b>${month}:</b>\n\n📊 Резервации: ${r.total}\n👤 Уникални клиенти: ${r.unique_clients}`,
  );
}

async function handleClientCount(chatId: number, salon: SalonRef, period: 'week' | 'last_week'): Promise<void> {
  const today = new Date();
  let periodStart: string;
  let periodEnd: string;
  let label: string;

  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset + (period === 'last_week' ? -7 : 0));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  periodStart = monday.toISOString().slice(0, 10);
  periodEnd = sunday.toISOString().slice(0, 10);
  label = period === 'last_week' ? 'миналата седмица' : 'тази седмица';

  const rows = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(DISTINCT lower(client_name))::int AS unique_clients
    FROM bookings
    WHERE CAST(salon_id AS text) = ${salon.salonId}
      AND date >= ${periodStart}
      AND date <= ${periodEnd}
      AND status NOT IN ('cancelled')
      AND (${salon.staffMemberId ?? null}::uuid IS NULL OR staff_member_id = ${salon.staffMemberId ?? null}::uuid)
  ` as { total: number; unique_clients: number }[];

  const r = rows[0]!;
  await sendTelegramMessage(
    chatId,
    `👥 <b>${label.charAt(0).toUpperCase() + label.slice(1)}:</b>\n\n📊 Резервации: ${r.total}\n👤 Уникални клиенти: ${r.unique_clients}`,
  );
}

async function handleNewClients(chatId: number, salon: SalonRef): Promise<void> {
  const since = offsetDayISO(-30);

  const rows = await sql`
    SELECT lower(client_name) AS name_key, client_name, MIN(date) AS first_visit, COUNT(*)::int AS visits
    FROM bookings
    WHERE CAST(salon_id AS text) = ${salon.salonId}
      AND status NOT IN ('cancelled')
      AND (${salon.staffMemberId ?? null}::uuid IS NULL OR staff_member_id = ${salon.staffMemberId ?? null}::uuid)
    GROUP BY lower(client_name), client_name
    HAVING MIN(date) >= ${since}
    ORDER BY MIN(date) DESC
  ` as { name_key: string; client_name: string; first_visit: string; visits: number }[];

  if (rows.length === 0) {
    await sendTelegramMessage(chatId, `ℹ️ Няма нови клиенти през последните 30 дни.`);
    return;
  }

  const lines = [`🆕 <b>Нови клиенти (последните 30 дни) — ${rows.length}:</b>`, ''];
  for (const r of rows) {
    lines.push(`👤 <b>${r.client_name}</b> — първо посещение: ${formatDateBg(r.first_visit, { day: 'numeric', month: 'long' })}`);
  }
  await sendTelegramMessage(chatId, lines.join('\n'));
}

async function handleTopClients(chatId: number, salon: SalonRef): Promise<void> {
  const rows = await sql`
    SELECT
      client_name,
      COUNT(*)::int AS visits,
      COALESCE(SUM(service_price), 0)::numeric AS revenue,
      MAX(date) AS last_visit
    FROM bookings
    WHERE CAST(salon_id AS text) = ${salon.salonId}
      AND status NOT IN ('cancelled')
      AND (${salon.staffMemberId ?? null}::uuid IS NULL OR staff_member_id = ${salon.staffMemberId ?? null}::uuid)
    GROUP BY lower(client_name), client_name
    ORDER BY revenue DESC
    LIMIT 15
  ` as { client_name: string; visits: number; revenue: number; last_visit: string }[];

  if (rows.length === 0) {
    await sendTelegramMessage(chatId, 'ℹ️ Все още няма данни за клиенти.');
    return;
  }

  const lines = [`💎 <b>Топ клиенти по изхарчено:</b>`, ''];
  rows.forEach((r, i) => {
    const eur = Number(r.revenue);
    lines.push(`${i + 1}. <b>${r.client_name}</b> — ${eur.toFixed(0)} € — ${r.visits} посещ.`);
  });
  await sendTelegramMessage(chatId, lines.join('\n'));
}

async function handleTopServices(chatId: number, salon: SalonRef): Promise<void> {
  const rows = await sql`
    SELECT service_name, COUNT(*)::int AS cnt, COALESCE(SUM(service_price), 0)::numeric AS revenue
    FROM bookings
    WHERE CAST(salon_id AS text) = ${salon.salonId}
      AND status NOT IN ('cancelled')
      AND date >= ${offsetDayISO(-90)}
      AND (${salon.staffMemberId ?? null}::uuid IS NULL OR staff_member_id = ${salon.staffMemberId ?? null}::uuid)
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

// ─── Brands ───────────────────────────────────────────────────────────────────

async function getSalonBrandIds(salonId: string): Promise<string[]> {
  const rows = await sql`
    SELECT brand_domains FROM salons WHERE CAST(id AS text) = ${salonId} LIMIT 1
  ` as { brand_domains: unknown }[];
  const raw = rows[0]?.brand_domains;
  return Array.isArray(raw) ? raw.map(String) : [];
}

async function saveSalonBrandIds(salonId: string, slug: string, ids: string[]): Promise<void> {
  await sql`
    UPDATE salons SET brand_domains = ${JSON.stringify(ids)}::jsonb
    WHERE CAST(id AS text) = ${salonId}
  `;
  revalidateTag(`salon-public-${slug}`);
}

async function handleBrandsCommand(chatId: number, text: string, salon: SalonRef): Promise<void> {
  const { ALL_BRANDS } = await import('@/lib/brands');

  const currentIds = await getSalonBrandIds(salon.salonId);
  const currentSet = new Set(currentIds);

  // ── Show current brands ────────────────────────────────────────
  if (/^брандов[еи]$/i.test(text.trim())) {
    if (currentIds.length === 0) {
      await sendTelegramMessage(
        chatId,
        '🏷 Все още нямаш избрани брандове.\n\n' +
        'Напиши например:\n<code>Работя с Wella, OPI, PhiBrows</code>\n\nили\n<code>Добави бранд Olaplex</code>',
      );
    } else {
      const names = currentIds
        .map((id) => ALL_BRANDS.find((b) => b.id === id)?.name ?? id)
        .join(', ');
      await sendTelegramMessage(
        chatId,
        `🏷 <b>Твоите брандове (${currentIds.length}):</b>\n${names}\n\n` +
        'За да добавиш: <code>Работя с Kerastase, OPI</code>\n' +
        'За да махнеш: <code>Махни бранд OPI</code>',
      );
    }
    return;
  }

  // ── Remove brand ───────────────────────────────────────────────
  const removeMatch = text.match(/(?:махн[иеа]|изтри[й]?|премахн[иеа])\s+(?:бранд[а]?\s+)?(.+)/i);
  if (removeMatch) {
    const query = removeMatch[1]!.trim().toLowerCase();
    const toRemove = ALL_BRANDS.filter(
      (b) => currentSet.has(b.id) && b.name.toLowerCase().includes(query),
    );
    if (toRemove.length === 0) {
      await sendTelegramMessage(chatId, `⚠️ Не намерих бранд "${removeMatch[1]}" в твоя списък.`);
      return;
    }
    const newIds = currentIds.filter((id) => !toRemove.some((b) => b.id === id));
    await saveSalonBrandIds(salon.salonId, salon.slug, newIds);
    const removed = toRemove.map((b) => b.name).join(', ');
    await sendTelegramMessage(chatId, `✅ Махнах: <b>${removed}</b>`);
    return;
  }

  // ── Add brands ─────────────────────────────────────────────────
  const addMatch = text.match(/(?:добав[ии]|работ[яеи]|ползв[ам]|работим с|ползваме)\s+(?:бранд[а]?\s+)?(.+)/i);
  if (!addMatch) return;

  const rawNames = addMatch[1]!
    .split(/[,;и&+\/]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const found: typeof ALL_BRANDS = [];
  const notFound: string[] = [];

  for (const q of rawNames) {
    const match = ALL_BRANDS.find(
      (b) => b.name.toLowerCase().includes(q) || q.includes(b.name.toLowerCase().split(' ')[0]!),
    );
    if (match) found.push(match);
    else notFound.push(q);
  }

  if (found.length === 0) {
    await sendTelegramMessage(
      chatId,
      `⚠️ Не разпознах тези брандове: <b>${notFound.join(', ')}</b>\n\n` +
      'Провери изписването или пиши на support@clicka.bg за добавяне на нов бранд.',
    );
    return;
  }

  const newIds = [...new Set([...currentIds, ...found.map((b) => b.id)])];
  await saveSalonBrandIds(salon.salonId, salon.slug, newIds);

  const addedNames = found.map((b) => b.name).join(', ');
  const lines = [`✅ Добавих: <b>${addedNames}</b>`];
  if (notFound.length > 0) lines.push(`\n⚠️ Не разпознах: ${notFound.join(', ')}`);
  lines.push('\nЛогата им вече се показват на твоя сайт! 🎉');
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

async function addBookingBlockForSalon(salonId: string, slug: string, block: BookingBlock): Promise<void> {
  const rows = await sql`SELECT opening_hours FROM salons WHERE CAST(id AS text) = ${salonId} LIMIT 1`;
  const current = (rows[0]?.opening_hours && typeof rows[0].opening_hours === 'object'
    ? rows[0].opening_hours : {}) as Record<string, unknown>;
  const blocks = normalizeBookingBlocks(current.booking_blocks);
  blocks.push(block);
  await sql`
    UPDATE salons SET opening_hours = ${JSON.stringify({ ...current, booking_blocks: normalizeBookingBlocks(blocks) })}::jsonb, updated_at = now()
    WHERE CAST(id AS text) = ${salonId}
  `;
}

async function blockAllDay(salonId: string, slug: string, date: string): Promise<void> {
  const rows = await sql`
    SELECT opening_hours FROM salons WHERE CAST(id AS text) = ${salonId} LIMIT 1
  `;
  const current = (rows[0]?.opening_hours && typeof rows[0].opening_hours === 'object'
    ? rows[0].opening_hours : {}) as Record<string, unknown>;

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

async function unblockDay(salonId: string, slug: string, date: string): Promise<void> {
  const rows = await sql`SELECT opening_hours FROM salons WHERE CAST(id AS text) = ${salonId} LIMIT 1`;
  const current = (rows[0]?.opening_hours && typeof rows[0].opening_hours === 'object'
    ? rows[0].opening_hours : {}) as Record<string, unknown>;
  const { normalizeBookingBlocks } = await import('@/lib/booking-blocks');
  const blocks = normalizeBookingBlocks(current.booking_blocks).filter((b) => !(b.date === date && b.allDay));
  await sql`UPDATE salons SET opening_hours = ${JSON.stringify({ ...current, booking_blocks: blocks })}::jsonb, updated_at = now() WHERE CAST(id AS text) = ${salonId}`;
  revalidateTag(`salon-public-${slug}`);
}

async function handleCompleteBooking(chatId: number, salon: SalonRef, clientName: string): Promise<void> {
  const rows = await sql`
    SELECT CAST(id AS text) AS id, client_name, date, time, service_name
    FROM bookings
    WHERE salon_id = CAST(${salon.salonId} AS uuid)
      AND lower(client_name) LIKE ${`%${clientName.toLowerCase()}%`}
      AND status NOT IN ('cancelled', 'completed')
      AND date >= ${offsetDayISO(-1)}
      AND (${salon.staffMemberId ?? null}::uuid IS NULL OR staff_member_id = ${salon.staffMemberId ?? null}::uuid)
    ORDER BY date ASC, time ASC
    LIMIT 1
  ` as { id: string; client_name: string; date: string; time: string; service_name: string }[];

  if (rows.length === 0) {
    await sendTelegramMessage(chatId, `❌ Не намерих активна резервация за <b>${clientName}</b>.`);
    return;
  }
  const r = rows[0]!;
  await sql`UPDATE bookings SET status = 'completed', completed_at = now() WHERE CAST(id AS text) = ${r.id}`;
  await sendTelegramMessage(chatId, `✅ Завършена резервация:\n👤 ${r.client_name}\n🗓 ${formatDateBg(r.date)} в ${r.time}\n✂️ ${r.service_name}`);
}

async function handleRevenueMonths(chatId: number, salon: SalonRef, numMonths: number): Promise<void> {
  const today = new Date();
  const results: { label: string; revenue: number; completed: number; total: number }[] = [];

  for (let i = numMonths - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const periodStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const periodEnd = lastDay.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' });

    const rows = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
        COALESCE(SUM(service_price), 0)::numeric AS revenue
      FROM bookings
      WHERE CAST(salon_id AS text) = ${salon.salonId}
        AND date >= ${periodStart}
        AND date <= ${periodEnd}
        AND status NOT IN ('cancelled')
        AND (${salon.staffMemberId ?? null}::uuid IS NULL OR staff_member_id = ${salon.staffMemberId ?? null}::uuid)
    ` as { total: number; completed: number; revenue: number }[];

    const r = rows[0]!;
    results.push({ label, revenue: Number(r.revenue), completed: Number(r.completed), total: Number(r.total) });
  }

  const totalRev = results.reduce((s, r) => s + r.revenue, 0);
  const maxRev = Math.max(...results.map((r) => r.revenue), 1);
  const lines = [`📅 <b>Приход по месеци (последните ${numMonths}):</b>`, ''];
  for (const r of results) {
    const barLen = Math.max(1, Math.round((r.revenue / maxRev) * 8));
    const bar = r.revenue > 0 ? '▓'.repeat(barLen) : '░';
    lines.push(`<b>${r.label}</b>: ${r.revenue.toFixed(0)} € ${bar}`);
    lines.push(`  ${r.total} резерв. · ${r.completed} завършени`);
  }
  lines.push('');
  lines.push(`Общо: <b>${totalRev.toFixed(0)} €</b> (${eurToLv(totalRev)} лв)`);
  await sendTelegramMessage(chatId, lines.join('\n'));
}

async function handleRevenueCompare(chatId: number, salon: SalonRef): Promise<void> {
  const today = new Date();
  const thisMonthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthStart = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
  const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().slice(0, 10);

  const [thisRows, prevRows] = await Promise.all([
    sql`SELECT COUNT(*)::int AS total, COALESCE(SUM(service_price),0)::numeric AS revenue FROM bookings WHERE CAST(salon_id AS text) = ${salon.salonId} AND date >= ${thisMonthStart} AND status NOT IN ('cancelled')`,
    sql`SELECT COUNT(*)::int AS total, COALESCE(SUM(service_price),0)::numeric AS revenue FROM bookings WHERE CAST(salon_id AS text) = ${salon.salonId} AND date >= ${prevMonthStart} AND date <= ${prevMonthEnd} AND status NOT IN ('cancelled')`,
  ]);

  const cur = thisRows[0] as { total: number; revenue: number };
  const prev = prevRows[0] as { total: number; revenue: number };
  const curEur = Number(cur.revenue);
  const prevEur = Number(prev.revenue);
  const diff = curEur - prevEur;
  const diffPct = prevEur > 0 ? ((diff / prevEur) * 100).toFixed(0) : '—';
  const arrow = diff > 0 ? '📈' : diff < 0 ? '📉' : '➡️';

  const thisLabel = today.toLocaleDateString('bg-BG', { month: 'long' });
  const prevLabel = prevMonthDate.toLocaleDateString('bg-BG', { month: 'long' });

  await sendTelegramMessage(chatId, [
    `${arrow} <b>Сравнение месец/месец:</b>`,
    '',
    `📅 ${thisLabel} (до момента): <b>${curEur.toFixed(0)} €</b> (${Number(cur.total)} резервации)`,
    `📅 ${prevLabel}: <b>${prevEur.toFixed(0)} €</b> (${Number(prev.total)} резервации)`,
    '',
    `${diff >= 0 ? '▲' : '▼'} Разлика: <b>${Math.abs(diff).toFixed(0)} €</b> (${diffPct}%)`,
  ].join('\n'));
}

async function handleAvgBookingValue(chatId: number, salon: SalonRef): Promise<void> {
  const rows = await sql`
    SELECT
      COALESCE(AVG(service_price),0)::numeric AS avg_val,
      COUNT(*)::int AS total
    FROM bookings
    WHERE CAST(salon_id AS text) = ${salon.salonId}
      AND status NOT IN ('cancelled')
      AND date >= ${offsetDayISO(-90)}
  ` as { avg_val: number; total: number }[];

  const r = rows[0]!;
  await sendTelegramMessage(chatId, [
    `💡 <b>Средна стойност на резервация (90 дни):</b>`,
    '',
    `💵 Средно: <b>${Number(r.avg_val).toFixed(0)} €</b>`,
    `📊 Брой резервации: ${r.total}`,
  ].join('\n'));
}

async function handleInactiveClients(chatId: number, salon: SalonRef, months: number): Promise<void> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const rows = await sql`
    SELECT client_name, client_phone, MAX(date) AS last_visit, COUNT(*)::int AS total_visits
    FROM bookings
    WHERE CAST(salon_id AS text) = ${salon.salonId}
      AND status NOT IN ('cancelled')
    GROUP BY client_name, client_phone
    HAVING MAX(date) < ${cutoffStr}
    ORDER BY MAX(date) DESC
    LIMIT 15
  ` as { client_name: string; client_phone: string; last_visit: string; total_visits: number }[];

  if (rows.length === 0) {
    await sendTelegramMessage(chatId, `✅ Всички клиенти са посещавали салона в последните ${months} месеца.`);
    return;
  }

  const lines = [`😴 <b>Клиенти без посещение от ${months}+ месеца (${rows.length}):</b>`, ''];
  for (const r of rows) {
    lines.push(`• ${r.client_name} — последно: ${formatDateBg(r.last_visit, { day: 'numeric', month: 'short', year: 'numeric' })}`);
  }
  await sendTelegramMessage(chatId, lines.join('\n'));
}

async function handleSmsBalance(chatId: number, salon: SalonRef): Promise<void> {
  const rows = await sql`
    SELECT sms_balance, sms_enabled, sms_reminder_mode
    FROM salons WHERE CAST(id AS text) = ${salon.salonId} LIMIT 1
  ` as { sms_balance: number; sms_enabled: boolean; sms_reminder_mode: string }[];

  const r = rows[0]!;
  await sendTelegramMessage(chatId, [
    `📲 <b>SMS статус:</b>`,
    '',
    `💰 Кредити: <b>${Number(r.sms_balance ?? 0).toFixed(2)} лв</b>`,
    `🔔 Автоматични напомняния: ${r.sms_enabled ? '✅ включени' : '🔕 изключени'}`,
    `⚙️ Режим: ${r.sms_reminder_mode ?? 'off'}`,
  ].join('\n'));
}

async function handleSendSmsToClient(chatId: number, salon: SalonRef, clientName: string, customMessage?: string): Promise<void> {
  // Find upcoming booking for this client
  const today = new Date().toISOString().slice(0, 10);
  const rows = await sql`
    SELECT b.id, b.client_name, b.client_phone, b.date, b.time, b.service_name,
           s.sms_balance, s.name AS salon_name, s.phone AS salon_phone
    FROM bookings b
    JOIN salons s ON s.id::text = b.salon_id
    WHERE b.salon_id = ${salon.salonId}
      AND LOWER(b.client_name) ILIKE ${`%${clientName.toLowerCase()}%`}
      AND b.date >= ${today}
      AND b.status NOT IN ('cancelled', 'completed')
    ORDER BY b.date ASC, b.time ASC
    LIMIT 1
  ` as { id: string; client_name: string; client_phone: string | null; date: string; time: string; service_name: string | null; sms_balance: number; salon_name: string; salon_phone: string }[];

  if (rows.length === 0) {
    await sendTelegramMessage(chatId, `⚠️ Не намерих предстояща резервация за <b>${clientName}</b>.`);
    return;
  }

  const row = rows[0]!;

  if (!row.client_phone) {
    await sendTelegramMessage(chatId, `⚠️ <b>${row.client_name}</b> няма записан телефон.`);
    return;
  }

  if (row.sms_balance <= 0) {
    await sendTelegramMessage(chatId, `❌ Няма налични SMS кредити. Купи пакет от Admin → SMS таб.`);
    return;
  }

  const { sendSmsReminder } = await import('@/lib/smsapi');
  const result = await sendSmsReminder(
    row.client_phone,
    row.client_name,
    row.salon_name,
    row.salon_phone,
    row.service_name ?? '',
    row.date,
    row.time,
  );

  if (!result.success) {
    await sendTelegramMessage(chatId, `❌ Неуспешно изпращане до ${row.client_name}: ${result.error ?? 'неизвестна грешка'}`);
    return;
  }

  // Debit 1 credit
  await sql`
    UPDATE salons SET sms_balance = sms_balance - 1
    WHERE id::text = ${salon.salonId} AND sms_balance > 0
  `;
  await sql`
    INSERT INTO sms_transactions (salon_id, kind, delta, client_phone, note)
    VALUES (${salon.salonId}, 'manual_send', -1, ${row.client_phone}, ${'Ръчно изпращане от Telegram до ' + row.client_name})
  `;

  await sendTelegramMessage(chatId, `✅ SMS изпратен до <b>${row.client_name}</b> (${row.client_phone})\n📅 Резервация: ${formatDateBg(row.date)} в ${row.time}`);
}

// ─── Gallery photo upload ─────────────────────────────────────────────────────

export async function handleGalleryPhoto(
  chatId: number,
  imageUrl: string,
  salon: SalonRef,
  target: 'gallery' | 'cover' | 'portfolio' = 'gallery',
): Promise<void> {
  await sendTelegramMessage(chatId, '⬆️ Качвам снимката...');

  let imageBuffer: Buffer;
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error('fetch failed');
    imageBuffer = Buffer.from(await res.arrayBuffer());
  } catch {
    await sendTelegramMessage(chatId, '❌ Не успях да изтегля снимката. Пробвай отново.');
    return;
  }

  // Convert to WebP (matches admin upload pipeline) + generate LCP sidecar.
  const stamp = Date.now();
  const base = `salons/${salon.slug}/${target}/${stamp}`;
  const key = `${base}.webp`;
  const lcpKey = `${base}-lcp-640.webp`;

  let webpBuffer: Buffer;
  let lcpBuffer: Buffer;
  try {
    [webpBuffer, lcpBuffer] = await Promise.all([
      sharp(imageBuffer, { failOn: 'none' })
        .rotate()
        .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer(),
      sharp(imageBuffer, { failOn: 'none' })
        .rotate()
        .resize({ width: 640, withoutEnlargement: true, fastShrinkOnLoad: true })
        .webp({ quality: 56, effort: 2 })
        .toBuffer(),
    ]);
  } catch {
    await sendTelegramMessage(chatId, '❌ Грешка при обработка на снимката. Пробвай отново.');
    return;
  }

  let publicUrl: string;
  try {
    publicUrl = await uploadToR2(webpBuffer, key, 'image/webp');
    // Upload LCP sidecar in background — non-critical
    uploadToR2(lcpBuffer, lcpKey, 'image/webp').catch(() => undefined);
  } catch {
    await sendTelegramMessage(chatId, '❌ Грешка при качване. Провери настройките на R2 storage.');
    return;
  }

  if (target === 'cover') {
    await sql`UPDATE salons SET cover_image_url = ${publicUrl}, updated_at = now() WHERE CAST(id AS text) = ${salon.salonId}`;
    revalidateTag(`salon-public-${salon.slug}`);
    await sendTelegramMessage(chatId, '✅ Корицата е обновена!');
    return;
  }

  const rows = await sql`SELECT gallery_images, portfolio_images FROM salons WHERE CAST(id AS text) = ${salon.salonId} LIMIT 1`;
  const existingGallery = normalizeImageList(rows[0]?.gallery_images);
  const existingPortfolio = normalizeImageList(rows[0]?.portfolio_images);

  // Keep gallery_images and portfolio_images in sync — admin UI merges them, so both must have the same URLs.
  const merged = [...new Set([...existingGallery, ...existingPortfolio, publicUrl])];
  const updatedCount = merged.length;
  await sql`UPDATE salons SET gallery_images = ${JSON.stringify(merged)}::jsonb, portfolio_images = ${JSON.stringify(merged)}::jsonb, updated_at = now() WHERE CAST(id AS text) = ${salon.salonId}`;

  revalidateTag(`salon-public-${salon.slug}`);
  await sendTelegramMessage(chatId, `✅ Снимката е добавена в ${target === 'portfolio' ? 'портфолиото' : 'галерията'}! (${updatedCount} общо)\n💡 Ако искаш да я изтриеш, напиши <code>изтрий снимката</code>`);
  // Remember last uploaded photo so the owner can delete it immediately
  await setState(chatId, { type: 'last_photo', url: publicUrl, created_at: new Date().toISOString() });
}

export function photoTargetFromCaption(caption: string): 'gallery' | 'cover' | 'portfolio' | 'price_list' | 'booking' {
  const c = caption.toLowerCase();
  if (/ценоразпис|прайс|price.?list/.test(c)) return 'price_list';
  if (/корица|cover|заглавна/.test(c)) return 'cover';
  if (/галерия|gallery/.test(c)) return 'gallery';
  return 'portfolio'; // default — всяка снимка без надпис отива в портфолиото
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

// ─── Create booking from bot ─────────────────────────────────────────────────

async function handleNewClientWithBooking(
  chatId: number,
  originalText: string,
  rest: string,
  salon: SalonRef,
): Promise<boolean> {
  // 1. Extract phone
  const phoneMatch = rest.match(/(\+?(?:359|0)\d[\d\s\-]{6,12}\d)/);
  const phone = phoneMatch?.[1]?.replace(/[\s\-]/g, '');

  // 2. Extract email
  const emailMatch = rest.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
  const email = emailMatch?.[1];

  // 3. Name = text before the phone (or email if no phone)
  const separatorPos = phoneMatch
    ? rest.indexOf(phoneMatch[0])
    : emailMatch ? rest.indexOf(emailMatch[0]) : -1;

  const clientName = (separatorPos > 0
    ? rest.slice(0, separatorPos).trim()
      .replace(/^(?:телефон(?:а|ът)?\s+на\s+|тел(?:ефон)?\.?\s+на\s+|номер(?:а|ът)?\s+на\s+|тел\.\s*)/i, '').trim()
    : null) || null;

  if (!clientName) {
    return await handleWithAI(chatId, originalText, salon);
  }

  // 4. Text after the separator (phone/email)
  const separatorLen = phoneMatch ? phoneMatch[0].length : emailMatch ? emailMatch[0].length : 0;
  const afterSep = rest.slice(separatorPos + separatorLen);

  // 5. Parse date — DD.MM / DD/MM or day name
  let date: string | null = null;
  const dmMatch = afterSep.match(/(\d{1,2})[\/\.\-](\d{1,2})(?:[\/\.\-](\d{2,4}))?/);
  if (dmMatch) {
    const day = dmMatch[1]!.padStart(2, '0');
    const month = dmMatch[2]!.padStart(2, '0');
    const year = dmMatch[3]
      ? (dmMatch[3].length === 2 ? `20${dmMatch[3]}` : dmMatch[3])
      : String(new Date().getFullYear());
    date = `${year}-${month}-${day}`;
  } else {
    // "18ти" / "18-ти" / "на 18" / "18 число" — day of current (or next) month
    const dayOfMonthMatch = afterSep.match(/(?:на\s+)?(\d{1,2})\s*(?:ти|ри|ви|ми|ия|и|-ти|-ри|-ви|-ми|число)\b/i);
    if (dayOfMonthMatch) {
      const day = parseInt(dayOfMonthMatch[1]!, 10);
      const now = new Date();
      let year = now.getFullYear();
      let month = now.getMonth(); // 0-indexed
      if (day < now.getDate()) { month++; if (month > 11) { month = 0; year++; } }
      date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } else {
      for (const dn of ['утре', 'днес', 'понеделник', 'вторник', 'сряда', 'четвъртък', 'петък', 'събота', 'неделя']) {
        if (new RegExp(`\\b${dn}\\b`, 'i').test(afterSep)) {
          date = resolveDayName(dn);
          break;
        }
      }
    }
  }

  // 6. Parse time — "13ч", "13:00", "в 13", "в 13:30"
  let time: string | null = null;
  const timeMatch = afterSep.match(/(?:в\s+)?(\d{1,2}):(\d{2})/)
    ?? afterSep.match(/(?:в\s+)?(\d{1,2})\s*ч(?:аса?)?/i);
  if (timeMatch) {
    const hh = parseInt(timeMatch[1]!, 10);
    const mm = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    time = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  // 7. Service = strip phone, email, date, time, connectors — what remains
  const servicePart = afterSep
    .replace(/\d{1,2}[\/\.\-]\d{1,2}(?:[\/\.\-]\d{2,4})?/g, '')
    .replace(/(утре|днес|понеделник|вторник|сряда|четвъртък|петък|събота|неделя)/gi, '')
    .replace(/(?:в\s+)?(\d{1,2}):(\d{2})/g, '')
    .replace(/(?:в\s+)?\d{1,2}\s*ч(?:аса?)?/gi, '')
    .replace(/\b(?:час[а]?\s+за|за\s+час[а]?|запис[а]?|запиши|запази|на\s+час|в)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (date && time) {
    // Booking path — save contact silently, then create the booking.
    // No confirmation needed: the booking response itself confirms the whole action.
    await upsertSalonClient(salon.salonId, clientName, { phone, email }).catch((err: unknown) => {
      console.error('[TG_CLIENT] upsertSalonClient failed (non-fatal):', err);
    });
    if (servicePart) {
      await handleCreateBooking(chatId, salon, clientName, servicePart, date, time, phone ?? '', email ?? '');
    } else {
      await sendTelegramMessage(chatId, `✅ Клиент <b>${clientName}</b> запазен${phone ? ` (${phone})` : ''}.\n⚠️ Не разбрах услугата — запиши часа ръчно или уточни.`);
    }
  } else {
    // No booking — only contact info. Route through confirmation flow.
    await handleSaveClientContact(chatId, salon, clientName, phone, email);
  }
  return true;
}

async function handleCreateBooking(
  chatId: number,
  salon: SalonRef,
  clientName: string,
  serviceName: string,
  date: string,
  time: string,
  clientPhone = '',
  clientEmail = '',
): Promise<void> {
  const { insertBookingIfNoOverlap } = await import('@/lib/booking-insert');

  // Find matching service for price + duration
  const services = await getSalonServices(salon.salonId);
  const svcIdx = findServiceIndex(services, serviceName);
  const svc = svcIdx !== -1 ? services[svcIdx]! : null;
  const servicePrice = svc?.price ?? null;
  const serviceDuration = svc?.duration_min ?? 60;
  const resolvedServiceName = svc?.name ?? serviceName;

  const id = crypto.randomUUID();
  console.log(`[TG_BOOKING] salonId=${salon.salonId} client="${clientName}" service="${resolvedServiceName}" date=${date} time=${time}`);

  const result = await insertBookingIfNoOverlap({
    id,
    salonId: salon.salonId,
    staffMemberId: salon.staffMemberId ?? null,
    clientName,
    clientPhone,
    clientEmail,
    serviceName: resolvedServiceName,
    servicePrice,
    serviceDuration,
    date,
    time,
    notes: 'Записан от собственика',
    smsReminderConsent: false,
    offerId: null,
  });

  console.log(`[TG_BOOKING] insertResult=${result ? result.id : 'NULL (slot taken or insert failed)'}`);

  if (!result) {
    await sendTelegramMessage(chatId, `⚠️ Часът ${time} на ${formatDateBg(date)} вече е зает. Провери календара.`);
    return;
  }

  // Auto-confirm owner-created bookings
  await sql`UPDATE bookings SET status = 'confirmed' WHERE id = ${result.id}`;
  revalidateTag(`salon-public-${salon.slug}`);

  // Upsert client record — non-fatal: booking is already saved, don't let this kill the response
  let clientId: string | null = null;
  try {
    const { id, isNew: clientIsNew } = await upsertSalonClient(salon.salonId, clientName, {
      ...(clientPhone ? { phone: clientPhone } : {}),
      ...(clientEmail ? { email: clientEmail } : {}),
    });
    clientId = id;
    console.log(`[TG_BOOKING] client upsert clientId=${clientId} isNew=${clientIsNew}`);
  } catch (err) {
    console.error('[TG_BOOKING] upsertSalonClient failed (non-fatal):', err);
  }

  await setState(chatId, {
    type: 'last_booking',
    bookingId: result.id,
    clientName,
    clientId,
    date,
    time,
    serviceName: resolvedServiceName,
    created_at: new Date().toISOString(),
  });

  const priceStr = servicePrice != null ? ` — ${servicePrice} €` : '';
  await sendTelegramMessage(
    chatId,
    `✅ <b>Резервация записана:</b>\n👤 ${clientName}\n✂️ ${resolvedServiceName}${priceStr}\n📅 ${formatDateBg(date)} в ${time}`,
  );
}

// ─── Client remind callback handler ──────────────────────────────────────────

/** Called from telegram-webhook when user taps a client_remind:* inline button. */
export async function handleClientRemindCallback(
  chatId: number,
  type: string,
  salonId: string,
  clientName: string,
): Promise<void> {
  const { ensureSalonClientsSchema } = await import('@/lib/ensure-salon-clients-schema');
  await ensureSalonClientsSchema();

  if (type === 'none') {
    await sendTelegramMessage(chatId, '👍 Разбрано — няма да те безпокоя.');
    return;
  }

  await sql`
    UPDATE salon_clients
    SET remind_day_before = true, updated_at = now()
    WHERE salon_id = ${salonId} AND lower(name) = lower(${clientName})
  `;

  const labels: string[] = [];
  labels.push('1 ден преди');
  await sendTelegramMessage(chatId, `🔔 Ще те напомня <b>${labels.join(' и ')}</b> преди следващия час на <b>${clientName}</b>.`);
}
