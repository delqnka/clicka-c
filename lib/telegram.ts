import { formatSalonPrice } from '@/lib/salon-currency';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

function formatBgDateDMY(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('bg-BG');
}

async function telegramPost(method: string, body: Record<string, unknown>): Promise<void> {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`${TELEGRAM_API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // Telegram notifications are best-effort
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
