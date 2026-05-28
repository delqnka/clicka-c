import { Resend } from 'resend';
import { formatSalonPrice } from '@/lib/salon-currency';

const resend = new Resend(process.env.RESEND_API_KEY);

function formatBgDateDMY(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('bg-BG');
}

export interface BookingDetails {
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

  await resend.emails.send({
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
  googlePlaceId: string
): Promise<void> {
  const mapsPlaceUrl = `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(googlePlaceId)}`;
  const directReviewUrl = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(googlePlaceId)}`;

  await resend.emails.send({
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
          <a href="${directReviewUrl}"
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
          <a href="${directReviewUrl}" style="color: #000;">${directReviewUrl}</a>
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
  const formattedDate = formatBgDateDMY(booking.date);
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

  await resend.emails.send({
    from: senderFromSalonName(booking.salonName),
    to: clientEmail,
    reply_to: booking.salonEmail || undefined,
    subject: `Резервация в ${booking.salonName} – ${formattedDate} ${booking.time}`,
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
        <p style="margin-top: 16px; line-height: 1.7;">
          При нужда от промяна, отговорете директно на този имейл или се свържете със салона.
        </p>
        <p style="margin-top: 24px; font-size: 14px; line-height: 1.7;">
          Това съобщение е изпратено автоматично от <a href="https://clicka.bg">Clicka.bg</a>.
        </p>
      </div>
    `,
  });
}
