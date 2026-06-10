import { sendTelegramMessage } from '@/lib/telegram';

/**
 * Sends a Telegram notification to the owner when a sale is completed.
 * Fire-and-forget — never throws, never blocks the response.
 */
export function notifyOwnerNewSale(opts: {
  flow: 'new_purchase' | 'plan_renew' | 'plan_upgrade';
  salonSlug: string;
  plan: string;
  billingPeriod?: string;
  amountCents: number;
  currency?: string;
}): void {
  const chatId = process.env.CLICKA_OWNER_CHAT_ID;
  if (!chatId) return;

  const amount = (opts.amountCents / 100).toFixed(2);
  const cur = (opts.currency ?? 'EUR').toUpperCase();
  const period = opts.billingPeriod === '6m' ? '6 мес.' : '12 мес.';

  const emoji = opts.flow === 'new_purchase' ? '🎉' : opts.flow === 'plan_upgrade' ? '⬆️' : '🔄';
  const label =
    opts.flow === 'new_purchase'
      ? 'Нов абонамент'
      : opts.flow === 'plan_upgrade'
      ? 'Upgrade на план'
      : 'Подновяване';

  const lines = [
    `${emoji} <b>${label}</b>`,
    ``,
    `<b>Салон:</b> <code>${opts.salonSlug}</code>`,
    `<b>План:</b> ${opts.plan} / ${period}`,
    `<b>Сума:</b> ${amount} ${cur}`,
  ].join('\n');

  sendTelegramMessage(chatId, lines).catch(() => {});
}

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
