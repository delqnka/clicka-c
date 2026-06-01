import { Resend } from 'resend';
import { buildBookingCalendarLinks, type CalendarBookingRow } from '@/lib/calendar-ics';
import { formatSalonPrice } from '@/lib/salon-currency';
import { sleep } from '@/lib/http-retry';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendResendWithRetry(
  payload: Parameters<Resend['emails']['send']>[0],
  attempts = 4,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const { error } = await resend.emails.send(payload);
    if (!error) return;
    lastError = error;
    const message = String((error as { message?: string }).message ?? error).toLowerCase();
    const retryable =
      message.includes('rate') ||
      message.includes('limit') ||
      message.includes('too many') ||
      message.includes('timeout');
    if (!retryable || attempt === attempts - 1) {
      throw error;
    }
    await sleep(500 * (attempt + 1));
  }
  throw lastError;
}

function formatBgDateDMY(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('bg-BG');
}

export interface BookingDetails {
  bookingId?: string;
  manageToken?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  serviceName: string;
  servicePrice?: number | null;
  serviceDuration?: number | null;
  date: string;
  time: string;
  notes?: string;
  salonName: string;
  salonEmail?: string;
  salonPhone?: string;
  salonAddress?: string;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function senderFromSalonName(salonName: string) {
  const cleanName = String(salonName || 'Clicka').trim().replaceAll(/\s+/g, ' ');
  return `${cleanName} <bookings@clicka.bg>`;
}

function renderRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding: 10px 12px; border: 1px solid #000; font-weight: 700; width: 34%;">${escapeHtml(label)}</td>
      <td style="padding: 10px 12px; border: 1px solid #000;">${escapeHtml(value)}</td>
    </tr>
  `;
}

export async function sendPasswordChangedNotification(email: string): Promise<void> {
  await sendResendWithRetry({
    from: 'Clicka.bg <noreply@clicka.bg>',
    to: email,
    subject: 'Паролата ви беше сменена — Clicka.bg',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000; margin: 0 0 16px;">Паролата ви беше сменена</h2>
        <p style="line-height: 1.7;">
          Паролата за вашия акаунт в <strong>Clicka.bg</strong> беше успешно сменена.
        </p>
        <p style="line-height: 1.7;">
          Ако <strong>не сте направили тази промяна</strong>, незабавно се свържете с нас на
          <a href="mailto:support@clicka.bg">support@clicka.bg</a>.
        </p>
        <p style="margin-top: 24px; font-size: 13px; color: #999; line-height: 1.5;">
          Clicka.bg — ${new Date().toLocaleString('bg-BG')}
        </p>
      </div>
    `,
  });
}

export async function sendEmailChangeRequestNotification(
  oldEmail: string,
  newEmail: string,
): Promise<void> {
  await sendResendWithRetry({
    from: 'Clicka.bg <noreply@clicka.bg>',
    to: oldEmail,
    subject: 'Заявка за смяна на имейл — Clicka.bg',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000; margin: 0 0 16px;">Заявена смяна на имейл за вход</h2>
        <p style="line-height: 1.7;">
          Получихме заявка за смяна на имейла за вход към акаунта ви в <strong>Clicka.bg</strong>.
        </p>
        <p style="line-height: 1.7;">
          Новият имейл е: <strong>${escapeHtml(newEmail)}</strong>
        </p>
        <p style="line-height: 1.7;">
          Изпратихме верификационен линк на новия имейл адрес.
          <strong>Имейлът ви няма да се смени, докато не потвърдите от новия адрес.</strong>
        </p>
        <p style="line-height: 1.7;">
          Ако <strong>не сте направили тази заявка</strong>, незабавно се свържете с нас на
          <a href="mailto:support@clicka.bg">support@clicka.bg</a>.
        </p>
        <p style="margin-top: 24px; font-size: 13px; color: #999; line-height: 1.5;">
          Clicka.bg — ${new Date().toLocaleString('bg-BG')}
        </p>
      </div>
    `,
  });
}

export async function sendEmailVerificationRequest(
  newEmail: string,
  verifyUrl: string,
): Promise<void> {
  await sendResendWithRetry({
    from: 'Clicka.bg <noreply@clicka.bg>',
    to: newEmail,
    subject: 'Потвърдете новия си имейл — Clicka.bg',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000; margin: 0 0 16px;">Потвърдете новия си имейл</h2>
        <p style="line-height: 1.7;">
          Натиснете бутона по-долу, за да потвърдите този имейл като нов адрес за вход в
          <strong>Clicka.bg</strong>.
        </p>
        <p style="margin: 24px 0;">
          <a href="${verifyUrl}"
             style="display:inline-block;background:#000;color:#fff;text-decoration:none;
                    padding:13px 22px;border-radius:999px;font-weight:700;font-size:15px;">
            Потвърди имейл →
          </a>
        </p>
        <p style="font-size: 13px; color: #999; line-height: 1.5;">
          Линкът е валиден <strong>30 минути</strong>.
          Ако не сте поискали тази смяна, игнорирайте имейла — текущият ви имейл остава непроменен.
        </p>
        <p style="margin-top: 24px; font-size: 13px; color: #999; line-height: 1.5;">
          Clicka.bg — ${new Date().toLocaleString('bg-BG')}
        </p>
      </div>
    `,
  });
}

export async function sendEmailChangedConfirmation(newEmail: string): Promise<void> {
  await sendResendWithRetry({
    from: 'Clicka.bg <noreply@clicka.bg>',
    to: newEmail,
    subject: 'Имейлът ви беше сменен — Clicka.bg',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000; margin: 0 0 16px;">Имейлът ви беше успешно сменен</h2>
        <p style="line-height: 1.7;">
          Имейлът за вход в <strong>Clicka.bg</strong> беше сменен на <strong>${escapeHtml(newEmail)}</strong>.
        </p>
        <p style="line-height: 1.7;">
          Ако <strong>не сте направили тази промяна</strong>, незабавно се свържете с нас на
          <a href="mailto:support@clicka.bg">support@clicka.bg</a>.
        </p>
        <p style="margin-top: 24px; font-size: 13px; color: #999; line-height: 1.5;">
          Clicka.bg — ${new Date().toLocaleString('bg-BG')}
        </p>
      </div>
    `,
  });
}

export async function sendBookingNotification(
  salonEmail: string,
  booking: BookingDetails
): Promise<void> {
  const formattedDate = formatBgDateDMY(booking.date);
  const salonRows = [
    renderRow('Клиент', booking.clientName),
    renderRow('Телефон', booking.clientPhone),
    booking.clientEmail ? renderRow('Имейл', booking.clientEmail) : '',
    renderRow('Услуга', booking.serviceName),
    booking.serviceDuration ? renderRow('Продължителност', `${booking.serviceDuration} мин`) : '',
    booking.servicePrice != null ? renderRow('Цена', formatSalonPrice(booking.servicePrice)) : '',
    renderRow('Дата', formattedDate),
    renderRow('Час', booking.time),
    booking.notes ? renderRow('Бележка', booking.notes) : '',
  ].join('');

  await sendResendWithRetry({
    from: senderFromSalonName(booking.salonName),
    to: salonEmail,
    reply_to: booking.clientEmail || undefined,
    subject: `Нова резервация от ${booking.clientName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="margin: 0 0 16px; color: #000;">Нова резервация</h2>
        <p style="margin: 0 0 16px; line-height: 1.7;">
          Имате нова заявка за <strong>${escapeHtml(booking.salonName)}</strong>.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          ${salonRows}
        </table>
        <p style="margin-top: 24px; font-size: 14px; line-height: 1.7;">
          Това съобщение е изпратено автоматично от <a href="https://clicka.bg">Clicka.bg</a>.
        </p>
      </div>
    `,
  });
}

export async function sendGoogleReviewInvitation(
  clientEmail: string,
  clientName: string,
  salonName: string,
  googlePlaceId: string,
  salonSlug?: string
): Promise<void> {
  const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://clicka.bg').replace(/\/+$/, '');
  const mapsPlaceUrl = `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(googlePlaceId)}`;
  const directReviewUrl = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(googlePlaceId)}`;
  const reviewHubUrl = `${appBaseUrl}/review/google?placeid=${encodeURIComponent(googlePlaceId)}&salon=${encodeURIComponent(salonName)}${salonSlug ? `&slug=${encodeURIComponent(salonSlug)}` : ''}`;

  await sendResendWithRetry({
    from: senderFromSalonName(salonName),
    to: clientEmail,
    subject: `Как беше при ${escapeHtml(salonName)}? Остави ни отзив`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="margin: 0 0 16px; color: #000;">Благодарим ви!</h2>
        <p style="line-height: 1.7;">Здравейте, <strong>${escapeHtml(clientName)}</strong>!</p>
        <p style="line-height: 1.7;">
          Радваме се, че посетихте <strong>${escapeHtml(salonName)}</strong>.
          Ако сте доволни от услугата, ще ни помогнете много с кратък отзив в Google.
        </p>
        <p style="margin: 24px 0;">
          <a href="${reviewHubUrl}"
             style="display: inline-block; background: #000; color: #fff; padding: 14px 24px;
                    border-radius: 999px; text-decoration: none; font-weight: 700; font-size: 15px;">
            Остави отзив в Google
          </a>
        </p>
        <p style="font-size: 14px; line-height: 1.7; color: #555;">
          Линкът отваря директно формата за отзив на точния Google профил.
        </p>
        <p style="font-size: 13px; line-height: 1.7; color: #666;">
          Ако бутонът не работи в приложението за поща, отворете този линк в Chrome/Safari:
          <br />
          <a href="${reviewHubUrl}" style="color: #000;">${reviewHubUrl}</a>
        </p>
        <p style="font-size: 13px; line-height: 1.7; color: #666;">
          Алтернативно отворете директно Google Maps профила:
          <br />
          <a href="${mapsPlaceUrl}" style="color: #000;">${mapsPlaceUrl}</a>
        </p>
        <p style="margin-top: 24px; font-size: 13px; line-height: 1.7; color: #999;">
          Изпратено автоматично от <a href="https://clicka.bg" style="color: #999;">Clicka.bg</a>.
        </p>
      </div>
    `,
  });
}

export async function sendBookingConfirmation(
  clientEmail: string,
  booking: BookingDetails
): Promise<void> {
  const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://clicka.bg').replace(/\/+$/, '');
  const formattedDate = formatBgDateDMY(booking.date);
  const calendarRow: CalendarBookingRow = {
    id: booking.bookingId || `${booking.date}-${booking.time}-${booking.clientEmail || booking.clientPhone}`,
    client_name: booking.clientName,
    client_phone: booking.clientPhone,
    client_email: booking.clientEmail,
    service_name: booking.serviceName,
    service_duration: booking.serviceDuration,
    date: booking.date,
    time: booking.time,
    status: 'pending',
    notes: booking.notes,
  };
  const { googleUrl, icsContent } = buildBookingCalendarLinks(
    calendarRow,
    booking.salonName,
    booking.salonAddress,
  );

  const clientRows = [
    renderRow('Име', booking.clientName),
    renderRow('Услуга', booking.serviceName),
    booking.serviceDuration ? renderRow('Продължителност', `${booking.serviceDuration} мин`) : '',
    booking.servicePrice != null ? renderRow('Цена', formatSalonPrice(booking.servicePrice)) : '',
    renderRow('Дата', formattedDate),
    renderRow('Час', booking.time),
    booking.salonPhone ? renderRow('Телефон на салона', booking.salonPhone) : '',
    booking.salonAddress ? renderRow('Адрес', booking.salonAddress) : '',
    booking.notes ? renderRow('Бележка', booking.notes) : '',
  ].join('');

  await sendResendWithRetry({
    from: senderFromSalonName(booking.salonName),
    to: clientEmail,
    reply_to: booking.salonEmail || undefined,
    subject: `Резервация в ${booking.salonName} – ${formattedDate} ${booking.time}`,
    attachments: [
      {
        filename: 'reservacia-clicka.ics',
        content: Buffer.from(icsContent).toString('base64'),
      },
    ],
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="margin: 0 0 16px; color: #000;">Получихме вашата резервация</h2>
        <p style="line-height: 1.7;">Здравейте, <strong>${escapeHtml(booking.clientName)}</strong>!</p>
        <p style="line-height: 1.7;">
          Получихме вашата заявка за <strong>${escapeHtml(booking.salonName)}</strong>.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          ${clientRows}
        </table>
        <p style="margin-top: 20px; line-height: 1.7; font-weight: 600;">Добави в календара:</p>
        <p style="margin: 8px 0 0; line-height: 1.7;">
          <a href="${googleUrl}" style="color: #000; font-weight: 600;">Google Calendar</a>
          · Прикрепеният .ics файл работи с Apple Calendar и Outlook.
        </p>
        ${booking.bookingId && booking.manageToken ? `
        <p style="margin-top: 20px; line-height: 1.7;">
          <a href="${appBaseUrl}/booking/manage?id=${encodeURIComponent(booking.bookingId)}&token=${encodeURIComponent(booking.manageToken)}"
             style="display: inline-block; background: #000; color: #fff; padding: 12px 24px;
                    border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Промени или откажи резервацията
          </a>
        </p>` : `
        <p style="margin-top: 16px; line-height: 1.7;">
          При нужда от промяна, отговорете директно на този имейл или се свържете със салона.
        </p>`}
        <p style="margin-top: 24px; font-size: 14px; line-height: 1.7;">
          Това съобщение е изпратено автоматично от <a href="https://clicka.bg">Clicka.bg</a>.
        </p>
      </div>
    `,
  });
}
