import type { BookingDetails } from '@/lib/resend';
import { sendBookingConfirmation, sendBookingNotification } from '@/lib/resend';
import { sendBookingTelegram, type BookingTelegramDetails } from '@/lib/telegram';

export async function dispatchBookingNotifications({
  salonEmail,
  clientEmail,
  telegramChatId,
  bookingDetails,
  telegramDetails,
}: {
  salonEmail?: string | null;
  clientEmail: string;
  telegramChatId?: string | null;
  bookingDetails: BookingDetails;
  telegramDetails: BookingTelegramDetails;
}) {
  const tasks: Promise<void>[] = [
    sendBookingConfirmation(clientEmail, bookingDetails),
  ];

  if (salonEmail) {
    tasks.push(sendBookingNotification(salonEmail, bookingDetails));
  }

  if (telegramChatId) {
    tasks.push(sendBookingTelegram(telegramChatId, telegramDetails));
  }

  await Promise.allSettled(tasks);
}
