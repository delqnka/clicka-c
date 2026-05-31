import { formatSalonPrice } from '@/lib/salon-currency';
import { fetchWithRetry } from '@/lib/http-retry';

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

function formatBgDateDMY(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('bg-BG');
}

async function telegramPost(method: string, body: Record<string, unknown>): Promise<void> {
  if (!BOT_TOKEN) return;
  try {
    const response = await fetchWithRetry(`${TELEGRAM_API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      console.error('[telegram]', method, response.status, await response.text().catch(() => ''));
    }
  } catch (err) {
    console.error('[telegram]', method, err);
  }
}

export async function sendTelegramMessage(chatId: string | number, text: string): Promise<void> {
  await telegramPost('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML' });
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
}

export async function sendBookingTelegram(
  chatId: string,
  booking: BookingTelegramDetails
): Promise<void> {
  const formattedDate = formatBgDateDMY(booking.date);
  const lines: string[] = [
    `<b>📅 Нова резервация</b>`,
    `<b>${booking.salonName}</b>`,
    '',
    `👤 ${booking.clientName}`,
    `📞 ${booking.clientPhone}`,
  ];

  if (booking.clientEmail) lines.push(`✉️ ${booking.clientEmail}`);

  lines.push(`✂️ ${booking.serviceName}`);

  if (booking.servicePrice != null) lines.push(`💰 ${formatSalonPrice(booking.servicePrice)}`);
  if (booking.serviceDuration) lines.push(`⏱ ${booking.serviceDuration} мин`);

  lines.push(`🗓 ${formattedDate} в ${booking.time}`);

  if (booking.notes) lines.push(`📝 ${booking.notes}`);

  await sendTelegramMessage(chatId, lines.join('\n'));
}
