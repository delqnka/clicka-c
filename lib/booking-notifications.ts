import type { BookingDetails } from '@/lib/resend';
import { sendBookingConfirmation, sendBookingNotification } from '@/lib/resend';
import { sendBookingTelegram, type BookingTelegramDetails } from '@/lib/telegram';

export async function dispatchBookingNotifications({
  salonId,
  salonEmail,
  clientEmail,
  telegramChatId,
  bookingDetails,
  telegramDetails,
  // When a booking is assigned to a staff member, their contact details
  // take priority over the salon-level ones for owner notifications.
  staffEmail,
  staffTelegramChatId,
  staffName,
}: {
  salonId?: string | null;
  salonEmail?: string | null;
  clientEmail: string;
  telegramChatId?: string | null;
  bookingDetails: BookingDetails;
  telegramDetails: BookingTelegramDetails;
  staffEmail?: string | null;
  staffTelegramChatId?: string | null;
  staffName?: string | null;
}) {
  // Resolve per-salon Resend creds via bookingDetails.salonId. Callers may
  // pass salonId at the top level for convenience; merge it in if missing.
  if (salonId && !bookingDetails.salonId) {
    bookingDetails = { ...bookingDetails, salonId };
  }
  // Normalize empty strings to null so ?? correctly falls back to salon-level values.
  const notifyEmail = (staffEmail || null) ?? salonEmail;
  const notifyTelegram = (staffTelegramChatId || null) ?? telegramChatId;

  const tasks: Promise<void>[] = [
    sendBookingConfirmation(clientEmail, bookingDetails),
  ];

  if (notifyEmail) {
    // When the booking is routed to a specific staff member, greet them by
    // their own name instead of the salon owner's.
    const ownerNameForNotification = (staffEmail || null) && staffName?.trim()
      ? staffName.trim()
      : bookingDetails.salonOwnerName;
    tasks.push(sendBookingNotification(notifyEmail, { ...bookingDetails, salonOwnerName: ownerNameForNotification }));
  }

  if (notifyTelegram) {
    tasks.push(sendBookingTelegram(notifyTelegram, telegramDetails));
  }

  await Promise.allSettled(tasks);
}
