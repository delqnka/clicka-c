import { sendBookingCancellationNotification, type BookingCancellationDetails } from '@/lib/resend';
import { getStaffMemberById } from '@/lib/staff-members';
import { loadOwnerNotificationEmails, mergeEmailRecipients } from '@/lib/notification-emails';

type CancellationEmailInput = BookingCancellationDetails & {
  salonEmail?: string | null;
  staffMemberId?: string | null;
};

function normalizeEmail(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}

export async function sendBookingCancellationEmails(input: CancellationEmailInput): Promise<void> {
  const staffMember = input.staffMemberId
    ? await getStaffMemberById(input.staffMemberId).catch(() => null)
    : null;

  const recipients: Array<{ email: string; salonOwnerName?: string }> = [];
  const salonEmail = normalizeEmail(input.salonEmail);
  const staffEmail = normalizeEmail(staffMember?.email);
  const ownerNotificationEmails = await loadOwnerNotificationEmails(input.salonId);

  for (const email of mergeEmailRecipients(salonEmail, ownerNotificationEmails)) {
    recipients.push({ email, salonOwnerName: input.salonOwnerName });
  }
  if (staffEmail && staffEmail !== salonEmail) {
    recipients.push({ email: staffEmail, salonOwnerName: staffMember?.name || input.salonOwnerName });
  }

  await Promise.allSettled(
    recipients.map(({ email, salonOwnerName }) =>
      sendBookingCancellationNotification(email, { ...input, salonOwnerName }),
    ),
  );
}
