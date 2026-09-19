import { sendBookingCancellationNotification, type BookingCancellationDetails } from '@/lib/resend';
import { getStaffMemberById } from '@/lib/staff-members';

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

  if (salonEmail) {
    recipients.push({ email: salonEmail, salonOwnerName: input.salonOwnerName });
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
