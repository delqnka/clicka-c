import type { BookingDetails } from '@/lib/resend';
import { sendBookingConfirmation, sendBookingNotification } from '@/lib/resend';
import { sendBookingTelegram, type BookingTelegramDetails } from '@/lib/telegram';

export async function dispatchBookingNotifications({
  salonEmail,
  clientEmail,
  telegramChatId,
  bookingDetails,
  telegramDetails,
  // When a booking is assigned to a staff member, their contact details
  // take priority over the salon-level ones for owner notifications.
  staffEmail,
  staffTelegramChatId,
}: {
  salonEmail?: string | null;
  clientEmail: string;
  telegramChatId?: string | null;
  bookingDetails: BookingDetails;
  telegramDetails: BookingTelegramDetails;
  staffEmail?: string | null;
  staffTelegramChatId?: string | null;
}) {
  // Normalize empty strings to null so ?? correctly falls back to salon-level values.
  const notifyEmail = (staffEmail || null) ?? salonEmail;
  const notifyTelegram = (staffTelegramChatId || null) ?? telegramChatId;

  const tasks: Promise<void>[] = [
    sendBookingConfirmation(clientEmail, bookingDetails),
  ];

  if (notifyEmail) {
    tasks.push(sendBookingNotification(notifyEmail, bookingDetails));
  }

  if (notifyTelegram) {
    tasks.push(sendBookingTelegram(notifyTelegram, telegramDetails));
  }

  await Promise.allSettled(tasks);
}
