import { formatSalonPrice } from '@/lib/salon-currency';
import { fetchWithRetry } from '@/lib/http-retry';
import { resolveSalonLocale, toLocaleTag } from '@/lib/salon-locale';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export function getTelegramFileUrl(filePath: string): string {
  return `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
}

export async function getTelegramFilePath(fileId: string): Promise<string | null> {
  if (!BOT_TOKEN) return null;
  try {
    const res = await fetch(`${TELEGRAM_API}/getFile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: { file_path?: string } };
    return data.result?.file_path ?? null;
  } catch {
    return null;
  }
}

function formatDateDMY(dateStr: string, language?: string | null): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(toLocaleTag(resolveSalonLocale(language)));
}

export async function telegramPost(method: string, body: Record<string, unknown>): Promise<unknown> {
  if (!BOT_TOKEN) return null;
  try {
    const response = await fetchWithRetry(`${TELEGRAM_API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      console.error('[telegram]', method, response.status, await response.text().catch(() => ''));
      return null;
    }
    return await response.json();
  } catch (err) {
    console.error('[telegram]', method, err);
    return null;
  }
}

export async function sendTelegramMessage(chatId: string | number, text: string): Promise<void> {
  await telegramPost('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML' });
}

export async function sendTelegramInlineKeyboard(
  chatId: string | number,
  text: string,
  buttons: { text: string; callback_data: string }[][],
): Promise<void> {
  await telegramPost('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: buttons },
  });
}

export async function answerCallbackQuery(callbackQueryId: string): Promise<void> {
  await telegramPost('answerCallbackQuery', { callback_query_id: callbackQueryId });
}

export interface BookingTelegramDetails {
  clientName: string;
  clientPhone: string;
  clientEmail?: string | null;
  serviceName: string;
  servicePrice?: number | null;
  serviceDuration?: number | null;
  date: string;
  time: string;
  notes?: string | null;
  salonName: string;
  language?: string | null;
}

export async function sendBookingTelegram(
  chatId: string,
  booking: BookingTelegramDetails
): Promise<void> {
  const locale = resolveSalonLocale(booking.language);
  const formattedDate = formatDateDMY(booking.date, booking.language);
  const isEn = locale === 'en';
  const lines: string[] = [
    `<b>📅 ${isEn ? 'New booking' : 'Нова резервация'}</b>`,
    `<b>${booking.salonName}</b>`,
    '',
    `👤 ${booking.clientName}`,
    `📞 ${booking.clientPhone}`,
  ];

  if (booking.clientEmail) lines.push(`✉️ ${booking.clientEmail}`);

  lines.push(`✂️ ${booking.serviceName}`);

  if (booking.servicePrice != null) lines.push(`💰 ${formatSalonPrice(booking.servicePrice)}`);
  if (booking.serviceDuration) lines.push(`⏱ ${booking.serviceDuration} ${isEn ? 'min' : 'мин'}`);

  lines.push(`🗓 ${formattedDate} ${isEn ? 'at' : 'в'} ${booking.time}`);

  if (booking.notes) lines.push(`📝 ${booking.notes}`);

  await sendTelegramMessage(chatId, lines.join('\n'));
}
