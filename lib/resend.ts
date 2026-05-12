import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
  const salonRows = [
    renderRow('Клиент', booking.clientName),
    renderRow('Телефон', booking.clientPhone),
    booking.clientEmail ? renderRow('Имейл', booking.clientEmail) : '',
    renderRow('Услуга', booking.serviceName),
    booking.serviceDuration ? renderRow('Продължителност', `${booking.serviceDuration} мин`) : '',
    booking.servicePrice != null ? renderRow('Цена', `${booking.servicePrice} лв.`) : '',
    renderRow('Дата', booking.date),
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

export async function sendBookingConfirmation(
  clientEmail: string,
  booking: BookingDetails
): Promise<void> {
  const clientRows = [
    renderRow('Име', booking.clientName),
    renderRow('Услуга', booking.serviceName),
    booking.serviceDuration ? renderRow('Продължителност', `${booking.serviceDuration} мин`) : '',
    booking.servicePrice != null ? renderRow('Цена', `${booking.servicePrice} лв.`) : '',
    renderRow('Дата', booking.date),
    renderRow('Час', booking.time),
    booking.salonPhone ? renderRow('Телефон на салона', booking.salonPhone) : '',
    booking.salonAddress ? renderRow('Адрес', booking.salonAddress) : '',
    booking.notes ? renderRow('Бележка', booking.notes) : '',
  ].join('');

  await resend.emails.send({
    from: senderFromSalonName(booking.salonName),
    to: clientEmail,
    reply_to: booking.salonEmail || undefined,
    subject: `Резервация в ${booking.salonName} – ${booking.date} ${booking.time}`,
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
