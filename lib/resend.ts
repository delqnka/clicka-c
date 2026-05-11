import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface BookingDetails {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  serviceName: string;
  date: string;
  time: string;
  salonName: string;
}

export async function sendBookingNotification(
  salonEmail: string,
  booking: BookingDetails
): Promise<void> {
  await resend.emails.send({
    from: 'Clicka.bg <noreply@clicka.bg>',
    to: salonEmail,
    subject: `Нова резервация от ${booking.clientName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Нова резервация</h2>
        <p>Имате нова резервация за <strong>${booking.salonName}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Клиент</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${booking.clientName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Телефон</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${booking.clientPhone}</td>
          </tr>
          ${booking.clientEmail ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Имейл</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${booking.clientEmail}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Услуга</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${booking.serviceName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Дата</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${booking.date}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Час</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${booking.time}</td>
          </tr>
        </table>
        <p style="margin-top: 24px; color: #666; font-size: 14px;">
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
  await resend.emails.send({
    from: 'Clicka.bg <noreply@clicka.bg>',
    to: clientEmail,
    subject: `Потвърждение на резервация – ${booking.salonName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Вашата резервация е потвърдена</h2>
        <p>Здравейте, <strong>${booking.clientName}</strong>!</p>
        <p>Резервацията Ви в <strong>${booking.salonName}</strong> е приета успешно.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Услуга</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${booking.serviceName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Дата</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${booking.date}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Час</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${booking.time}</td>
          </tr>
        </table>
        <p style="margin-top: 16px;">
          При нужда от промяна, моля свържете се директно с нас.
        </p>
        <p style="margin-top: 24px; color: #666; font-size: 14px;">
          Това съобщение е изпратено автоматично от <a href="https://clicka.bg">Clicka.bg</a>.
        </p>
      </div>
    `,
  });
}
