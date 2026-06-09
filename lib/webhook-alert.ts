import { sendTelegramMessage } from '@/lib/telegram';

/**
 * Sends a Telegram alert to the owner when a critical webhook failure occurs.
 * Fire-and-forget — never throws, never blocks the response.
 */
export function alertOwnerWebhookFailure(opts: {
  label: string;
  eventId?: string;
  detail?: string;
  amountCents?: number;
}): void {
  const chatId = process.env.CLICKA_OWNER_CHAT_ID;
  if (!chatId) return;

  const lines = [
    `🚨 <b>Webhook грешка</b>`,
    ``,
    `<b>Проблем:</b> ${opts.label}`,
    opts.detail ? `<b>Детайл:</b> ${opts.detail}` : null,
    opts.eventId ? `<b>Stripe event:</b> <code>${opts.eventId}</code>` : null,
    opts.amountCents ? `<b>Сума:</b> ${(opts.amountCents / 100).toFixed(2)} EUR` : null,
    ``,
    `Stripe ще опита отново. Провери Sentry за stack trace.`,
  ].filter(Boolean).join('\n');

  sendTelegramMessage(chatId, lines).catch(() => {});
}
