import { Resend } from 'resend';
import { buildBookingCalendarLinks, type CalendarBookingRow } from '@/lib/calendar-ics';
import { formatSalonPrice } from '@/lib/salon-currency';
import { sleep } from '@/lib/http-retry';
import { sql } from '@/lib/db';
import { BRAND } from '@/lib/brand';
import { tryDecryptSecret } from '@/lib/encryption';
import { resolveSalonLocale, toLocaleTag } from '@/lib/salon-locale';
import type { Locale } from '@/lib/i18n';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface SalonResendConfig {
  client: Resend | null;
  /** "Display Name <email@domain>" — ready for Resend `from` field. */
  from: string;
  /** Whether per-salon credentials were used (vs platform fallback). */
  isCustom: boolean;
  locale: Locale;
}

const salonResendCache = new Map<string, { client: Resend | null; from: string; isCustom: boolean; locale: Locale; expiresAt: number }>();
const SALON_RESEND_TTL_MS = 60_000;

function senderFromSalonName(salonName?: string | null) {
  const cleanName = String(salonName || BRAND.shortName).trim().replaceAll(/\s+/g, ' ');
  return `${cleanName} <${BRAND.senderEmail}>`;
}

function extractSenderDomain(email?: string | null): string | null {
  const normalized = String(email ?? '').trim().toLowerCase();
  const atIndex = normalized.lastIndexOf('@');
  if (atIndex === -1) return null;
  return normalized.slice(atIndex + 1) || null;
}

function emailTimestamp(locale: Locale) {
  return new Date().toLocaleString(toLocaleTag(locale));
}

/**
 * Per-salon sender resolver. Default: platform RESEND_API_KEY with the salon's
 * verified-from address. Escape hatch: if the salon has stored an encrypted
 * `resend_api_key_encrypted`, send from THEIR Resend account instead.
 */
export async function getSalonResend(
  salonId: string | null | undefined,
  fallbackSalonName?: string | null,
): Promise<SalonResendConfig> {
  if (!salonId) {
    return {
      client: resend,
      from: senderFromSalonName(fallbackSalonName ?? ''),
      isCustom: false,
      locale: 'bg',
    };
  }
  const cached = salonResendCache.get(salonId);
  if (cached && cached.expiresAt > Date.now()) {
    return { client: cached.client, from: cached.from, isCustom: cached.isCustom, locale: cached.locale };
  }
  try {
    const rows = (await sql`
      SELECT name, email_from, email_from_name, resend_api_key_encrypted, language
      FROM salons WHERE id = ${salonId} LIMIT 1
    `) as Array<{
      name: string | null;
      email_from: string | null;
      email_from_name: string | null;
      resend_api_key_encrypted: string | null;
      language: string | null;
    }>;
    const row = rows[0];
    const salonName = row?.name ?? fallbackSalonName ?? null;
    const locale = resolveSalonLocale(row?.language);
    const ownKey = tryDecryptSecret(row?.resend_api_key_encrypted);
    let result: SalonResendConfig;
    if (row?.email_from) {
      const fromName = (row.email_from_name ?? salonName ?? BRAND.shortName).trim() || BRAND.shortName;
      result = {
        client: ownKey ? new Resend(ownKey) : resend,
        from: `${fromName} <${row.email_from}>`,
        isCustom: true,
        locale,
      };
    } else {
      result = {
        client: resend,
        from: senderFromSalonName(salonName ?? ''),
        isCustom: false,
        locale,
      };
    }
    salonResendCache.set(salonId, { ...result, expiresAt: Date.now() + SALON_RESEND_TTL_MS });
    return result;
  } catch {
    return {
      client: resend,
      from: senderFromSalonName(fallbackSalonName ?? ''),
      isCustom: false,
      locale: 'bg',
    };
  }
}

/** Invalidate cached Resend config for a salon (call after settings change). */
export function invalidateSalonResend(salonId: string): void {
  salonResendCache.delete(salonId);
}

async function sendResendWithRetry(
  payload: Parameters<Resend['emails']['send']>[0],
  attempts = 4,
  client: Resend | null = resend,
) {
  if (!client) return;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const { error } = await client.emails.send(payload);
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

function formatDateDMY(dateStr: string, locale: Locale): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(toLocaleTag(locale));
}

export interface RescheduleDetails {
  clientName: string;
  serviceName: string;
  oldDate: string;
  oldTime: string;
  newDate: string;
  newTime: string;
  salonName: string;
  salonPhone?: string;
  salonId?: string;
  language?: string | null;
}

export async function sendRescheduleNotification(
  clientEmail: string,
  details: RescheduleDetails,
): Promise<void> {
  const locale = resolveSalonLocale(details.language);
  const oldDateFmt = formatDateDMY(details.oldDate, locale);
  const newDateFmt = formatDateDMY(details.newDate, locale);
  const firstName = details.clientName.split(' ')[0] ?? details.clientName;
  const { client, from } = await getSalonResend(details.salonId, details.salonName);
  const isEn = locale === 'en';

  await sendResendWithRetry({
    from,
    to: clientEmail,
    subject: isEn ? `Your appointment was rescheduled — ${details.salonName}` : `Вашият час беше променен — ${details.salonName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="margin: 0 0 16px; color: #000;">${isEn ? 'Your appointment was rescheduled' : 'Вашият час беше преместен'}</h2>
        <p style="line-height: 1.7;">${isEn ? 'Hello' : 'Здравейте'}, <strong>${escapeHtml(firstName)}</strong>!</p>
        <p style="line-height: 1.7;">
          ${isEn ? `Your appointment at <strong>${escapeHtml(details.salonName)}</strong> has been moved.` : `Вашият час при <strong>${escapeHtml(details.salonName)}</strong> беше преместен.`}
        </p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          ${renderRow(isEn ? 'Old date' : 'Стара дата', isEn ? `${oldDateFmt} at ${details.oldTime}` : `${oldDateFmt} в ${details.oldTime}`)}
          ${renderRow(isEn ? 'New date' : 'Нова дата', isEn ? `${newDateFmt} at ${details.newTime}` : `${newDateFmt} в ${details.newTime}`)}
          ${renderRow(isEn ? 'Service' : 'Услуга', details.serviceName)}
          ${details.salonPhone ? renderRow(isEn ? 'Salon phone' : 'Телефон на салона', details.salonPhone) : ''}
        </table>
        <p style="margin-top: 20px; line-height: 1.7; color: #555;">
          ${isEn ? 'If you have any questions, please contact the salon directly.' : 'Ако имате въпроси, свържете се директно със салона.'}
        </p>
      </div>
    `,
  }, 4, client);
}

export interface BookingDetails {
  salonId?: string;
  salonSlug?: string;
  salonCustomDomain?: string | null;
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
  salonOwnerName?: string;
  salonEmail?: string;
  salonPhone?: string;
  salonAddress?: string;
  amountPaid?: number | null;
  paymentType?: string | null;
  bookingStatus?: 'pending' | 'confirmed';
  language?: string | null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding: 10px 12px; border: 1px solid #000; font-weight: 700; width: 34%;">${escapeHtml(label)}</td>
      <td style="padding: 10px 12px; border: 1px solid #000;">${escapeHtml(value)}</td>
    </tr>
  `;
}

export async function sendPasswordChangedNotification(
  email: string,
  context?: SalonEmailContext,
): Promise<void> {
  const { client, from, locale } = await getSalonResend(context?.salonId, context?.salonName);
  const isEn = locale === 'en';
  await sendResendWithRetry({
    from,
    to: email,
    subject: isEn ? 'Your password was changed' : 'Паролата ви беше сменена',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000; margin: 0 0 16px;">${isEn ? 'Your password was changed' : 'Паролата ви беше сменена'}</h2>
        <p style="line-height: 1.7;">
          ${isEn ? 'The password for your admin account was changed successfully.' : 'Паролата за вашия админ акаунт беше успешно сменена.'}
        </p>
        <p style="line-height: 1.7;">
          ${isEn ? 'If <strong>you did not make this change</strong>, reset your password again as soon as possible.' : 'Ако <strong>не сте направили тази промяна</strong>, сменете паролата си отново възможно най-скоро.'}
        </p>
        <p style="margin-top: 24px; font-size: 13px; color: #999; line-height: 1.5;">
          ${emailTimestamp(locale)}
        </p>
      </div>
    `,
  }, 4, client);
}

type SalonEmailContext = {
  salonId?: string | null;
  salonName?: string | null;
};

export async function sendEmailChangeRequestNotification(
  oldEmail: string,
  newEmail: string,
  context?: SalonEmailContext,
): Promise<void> {
  const { client, from, locale } = await getSalonResend(context?.salonId, context?.salonName);
  const isEn = locale === 'en';
  await sendResendWithRetry({
    from,
    to: oldEmail,
    subject: isEn ? 'Email change request' : 'Заявка за смяна на имейл',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000; margin: 0 0 16px;">${isEn ? 'Admin login email change requested' : 'Заявена смяна на имейл за вход'}</h2>
        <p style="line-height: 1.7;">${isEn ? 'We received a request to change the login email for your admin panel.' : 'Получихме заявка за смяна на имейла за вход към админ панела ви.'}</p>
        <p style="line-height: 1.7;">${isEn ? 'The new email is:' : 'Новият имейл е:'} <strong>${escapeHtml(newEmail)}</strong></p>
        <p style="line-height: 1.7;">${isEn ? 'We sent a verification link to the new email address. <strong>Your email will not change until you confirm it from the new address.</strong>' : 'Изпратихме верификационен линк на новия имейл адрес. <strong>Имейлът ви няма да се смени, докато не потвърдите от новия адрес.</strong>'}</p>
        <p style="line-height: 1.7;">${isEn ? 'If <strong>you did not make this request</strong>, change your password as soon as possible.' : 'Ако <strong>не сте направили тази заявка</strong>, сменете паролата си възможно най-скоро.'}</p>
        <p style="margin-top: 24px; font-size: 13px; color: #999; line-height: 1.5;">
          ${emailTimestamp(locale)}
        </p>
      </div>
    `,
  }, 4, client);
}

export async function sendEmailVerificationRequest(
  newEmail: string,
  verifyUrl: string,
  context?: SalonEmailContext,
): Promise<void> {
  const { client, from, locale } = await getSalonResend(context?.salonId, context?.salonName);
  const isEn = locale === 'en';
  await sendResendWithRetry({
    from,
    to: newEmail,
    subject: isEn ? 'Confirm your new email' : 'Потвърдете новия си имейл',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000; margin: 0 0 16px;">${isEn ? 'Confirm your new email' : 'Потвърдете новия си имейл'}</h2>
        <p style="line-height: 1.7;">${isEn ? 'Click the button below to confirm this email as your new login address.' : 'Натиснете бутона по-долу, за да потвърдите този имейл като нов адрес за вход.'}</p>
        <p style="margin: 24px 0;">
          <a href="${verifyUrl}"
             style="display:inline-block;background:#000;color:#fff;text-decoration:none;
                    padding:13px 22px;border-radius:999px;font-weight:700;font-size:15px;">
            ${isEn ? 'Confirm email →' : 'Потвърди имейл →'}
          </a>
        </p>
        <p style="font-size: 13px; color: #999; line-height: 1.5;">
          ${isEn ? 'The link is valid for <strong>30 minutes</strong>. If you did not request this change, ignore the email — your current email remains unchanged.' : 'Линкът е валиден <strong>30 минути</strong>. Ако не сте поискали тази смяна, игнорирайте имейла — текущият ви имейл остава непроменен.'}
        </p>
        <p style="margin-top: 24px; font-size: 13px; color: #999; line-height: 1.5;">
          ${emailTimestamp(locale)}
        </p>
      </div>
    `,
  }, 4, client);
}

export async function sendEmailChangedConfirmation(
  newEmail: string,
  context?: SalonEmailContext,
): Promise<void> {
  const { client, from, locale } = await getSalonResend(context?.salonId, context?.salonName);
  const isEn = locale === 'en';
  await sendResendWithRetry({
    from,
    to: newEmail,
    subject: isEn ? 'Your email was changed' : 'Имейлът ви беше сменен',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000; margin: 0 0 16px;">${isEn ? 'Your email was changed successfully' : 'Имейлът ви беше успешно сменен'}</h2>
        <p style="line-height: 1.7;">${isEn ? 'Your login email was changed to' : 'Имейлът за вход беше сменен на'} <strong>${escapeHtml(newEmail)}</strong>.</p>
        <p style="line-height: 1.7;">${isEn ? 'If <strong>you did not make this change</strong>, reset your password as soon as possible.' : 'Ако <strong>не сте направили тази промяна</strong>, сменете паролата си възможно най-скоро.'}</p>
        <p style="margin-top: 24px; font-size: 13px; color: #999; line-height: 1.5;">
          ${emailTimestamp(locale)}
        </p>
      </div>
    `,
  }, 4, client);
}

export async function sendStaffInviteEmail(
  staffEmail: string,
  staffName: string,
  salonName: string,
  onboardingCode: string,
  portalUrl: string | null,
  salonId?: string,
): Promise<void> {
  const firstName = staffName.split(' ')[0] ?? staffName;
  const { client, from, locale } = await getSalonResend(salonId, salonName);
  const isEn = locale === 'en';
  await sendResendWithRetry({
    from,
    to: staffEmail,
    subject: isEn ? `You were added as a staff member at ${salonName}` : `Добавени сте като служител в ${salonName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="margin: 0 0 16px; color: #000;">${isEn ? 'Welcome to the team!' : 'Добре дошли в екипа!'}</h2>
        <p style="line-height: 1.7;">${isEn ? 'Hello' : 'Здравейте'}, <strong>${escapeHtml(firstName)}</strong>!</p>
        <p style="line-height: 1.7;">${isEn ? `You were added as a staff member at <strong>${escapeHtml(salonName)}</strong>.` : `Бяхте добавени като служител в <strong>${escapeHtml(salonName)}</strong>.`}</p>
        <p style="line-height: 1.7;">
          За да получавате известия за резервации в Telegram, натиснете бутона по-долу — ботът ще отвори директно с вашия код:
        </p>
        <p style="margin: 20px 0; text-align: center;">
          <a href="https://t.me/${BRAND.telegramBotUsername}?start=${encodeURIComponent(onboardingCode)}" style="display:inline-block;background:#229ED9;color:#fff;font-weight:700;font-size:15px;
                       padding:14px 28px;border-radius:12px;text-decoration:none;">
            ${isEn ? 'Open Telegram assistant' : 'Отвори Telegram асистента'}
          </a>
        </p>
        <p style="font-size: 12px; line-height: 1.6; color: #999; text-align: center;">
          ${isEn ? 'If the button does not open the bot automatically, send this code manually:' : 'Ако бутонът не отвори бота автоматично, изпратете ръчно този код:'}
          <span style="display:inline-block;background:#000;color:#fff;font-weight:700;font-size:14px;
                       letter-spacing:2px;padding:6px 14px;border-radius:8px;margin-top:6px;">
            ${escapeHtml(onboardingCode)}
          </span>
        </p>
        ${portalUrl ? `
        <p style="line-height: 1.7;">
          Освен това можете да видите своя график и да добавяте резервации през личната си страница (без нужда от парола):
        </p>
        <p style="margin: 16px 0; text-align: center;">
          <a href="${escapeHtml(portalUrl)}" style="display:inline-block;background:#7C3AED;color:#fff;font-weight:700;font-size:14px;
                       padding:12px 24px;border-radius:10px;text-decoration:none;">
            ${isEn ? 'View my schedule' : 'Виж моя график'}
          </a>
        </p>
        <p style="font-size: 12px; line-height: 1.6; color: #999; word-break: break-all;">
          Или копирайте линка: ${escapeHtml(portalUrl)}
        </p>
        ` : ''}
        <p style="line-height: 1.7;">${isEn ? 'Once connected, from Telegram you will be able to:' : 'След като се свържете, директно от Telegram ще можете да:'}</p>
        <ul style="line-height: 1.8; padding-left: 20px;">
          <li>получавате известия за нови резервации в реално време;</li>
          <li>блокирате часове — напр. <i>„зает 14:00-16:00 утре"</i>;</li>
          <li>отбелязвате почивни дни — напр. <i>„утре почивам"</i>;</li>
          <li>задавате работно време — напр. <i>„работя до 19:00 тази седмица"</i>;</li>
          <li>добавяте и променяте услуги и цени;</li>
          <li>качвате ценоразпис чрез снимка;</li>
          <li>проверявате справки — напр. <i>„колко записа имам за утре"</i>, <i>„приходът ми тази седмица"</i>;</li>
          <li>препращате (forward) скрийншот на резервация от друга платформа — часовете се блокират автоматично;</li>
          <li>променяте биото и снимката на профила си.</li>
        </ul>
        <p style="font-size: 13px; line-height: 1.7; color: #666;">
          Пълният списък с команди е достъпен по всяко време с <code>/help</code> в Telegram асистента.
        </p>
      </div>
    `,
  }, 4, client);
}

export async function sendBookingNotification(
  salonEmail: string,
  booking: BookingDetails
): Promise<void> {
  const locale = resolveSalonLocale(booking.language);
  const formattedDate = formatDateDMY(booking.date, locale);
  const isEn = locale === 'en';
  const ownerGreeting = booking.salonOwnerName?.trim()
    ? `${isEn ? 'Hello' : 'Здравей'}, ${escapeHtml(booking.salonOwnerName.trim())}!`
    : `${isEn ? 'Hello' : 'Здравей'}!`;
  const salonRows = [
    renderRow(isEn ? 'Client' : 'Клиент', booking.clientName),
    renderRow(isEn ? 'Phone' : 'Телефон', booking.clientPhone),
    booking.clientEmail ? renderRow(isEn ? 'Email' : 'Имейл', booking.clientEmail) : '',
    renderRow(isEn ? 'Service' : 'Услуга', booking.serviceName),
    booking.serviceDuration ? renderRow(isEn ? 'Duration' : 'Продължителност', `${booking.serviceDuration} ${isEn ? 'min' : 'мин'}`) : '',
    booking.servicePrice != null ? renderRow(isEn ? 'Price' : 'Цена', formatSalonPrice(booking.servicePrice)) : '',
    renderRow(isEn ? 'Date' : 'Дата', formattedDate),
    renderRow(isEn ? 'Time' : 'Час', booking.time),
    booking.notes ? renderRow(isEn ? 'Notes' : 'Бележка', booking.notes) : '',
  ].join('');

  const { client, from } = await getSalonResend(booking.salonId, booking.salonName);
  await sendResendWithRetry({
    from,
    to: salonEmail,
    reply_to: booking.clientEmail || undefined,
    subject: isEn ? `New booking from ${booking.clientName}` : `Нова резервация от ${booking.clientName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="margin: 0 0 16px; color: #000;">${isEn ? 'New booking' : 'Нова резервация'}</h2>
        <p style="line-height: 1.7;">${ownerGreeting}</p>
        <p style="margin: 0 0 16px; line-height: 1.7;">
          ${isEn ? `You have a new request for <strong>${escapeHtml(booking.salonName)}</strong>.` : `Имате нова заявка за <strong>${escapeHtml(booking.salonName)}</strong>.`}
        </p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          ${salonRows}
        </table>
      </div>
    `,
  }, 4, client);
}

export async function sendGoogleReviewInvitation(
  clientEmail: string,
  clientName: string,
  salonName: string,
  googlePlaceId: string,
  salonSlug?: string,
  salonId?: string,
): Promise<void> {
  const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || BRAND.siteUrl).replace(/\/+$/, '');
  const mapsPlaceUrl = `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(googlePlaceId)}`;
  const directReviewUrl = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(googlePlaceId)}`;
  const reviewHubUrl = `${appBaseUrl}/review/google?placeid=${encodeURIComponent(googlePlaceId)}&salon=${encodeURIComponent(salonName)}${salonSlug ? `&slug=${encodeURIComponent(salonSlug)}` : ''}`;

  const { client, from, locale } = await getSalonResend(salonId, salonName);
  const isEn = locale === 'en';
  await sendResendWithRetry({
    from,
    to: clientEmail,
    subject: isEn ? `How was your visit to ${escapeHtml(salonName)}? Leave us a review` : `Как беше при ${escapeHtml(salonName)}? Остави ни отзив`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="margin: 0 0 16px; color: #000;">${isEn ? 'Thank you!' : 'Благодарим ви!'}</h2>
        <p style="line-height: 1.7;">${isEn ? 'Hello' : 'Здравейте'}, <strong>${escapeHtml(clientName)}</strong>!</p>
        <p style="line-height: 1.7;">
          ${isEn ? `We are glad you visited <strong>${escapeHtml(salonName)}</strong>. If you enjoyed the service, a short Google review would help us a lot.` : `Радваме се, че посетихте <strong>${escapeHtml(salonName)}</strong>. Ако сте доволни от услугата, ще ни помогнете много с кратък отзив в Google.`}
        </p>
        <p style="margin: 24px 0;">
          <a href="${reviewHubUrl}"
             style="display: inline-block; background: #000; color: #fff; padding: 14px 24px;
                    border-radius: 999px; text-decoration: none; font-weight: 700; font-size: 15px;">
            ${isEn ? 'Leave a Google review' : 'Остави отзив в Google'}
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
      </div>
    `,
  }, 4, client);
}

export async function sendBookingConfirmation(
  clientEmail: string,
  booking: BookingDetails
): Promise<void> {
  const locale = resolveSalonLocale(booking.language);
  const isEn = locale === 'en';
  // Manage page (`/booking/manage`) lives only on the engine, so the manage
  // link must always use the engine origin — never the salon's custom domain,
  // which routes to the client's marketing site and has no /booking/manage.
  const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || BRAND.siteUrl).replace(/\/+$/, '');
  const formattedDate = formatDateDMY(booking.date, locale);
  const { client, from } = await getSalonResend(booking.salonId, booking.salonName);
  const calendarRow: CalendarBookingRow = {
    id: booking.bookingId || `${booking.date}-${booking.time}-${booking.clientEmail || booking.clientPhone}`,
    client_name: booking.clientName,
    client_phone: booking.clientPhone,
    client_email: booking.clientEmail,
    service_name: booking.serviceName,
    service_duration: booking.serviceDuration,
    date: booking.date,
    time: booking.time,
    status: booking.bookingStatus ?? 'confirmed',
    notes: booking.notes,
  };
  const { googleUrl, icsContent } = buildBookingCalendarLinks(
    calendarRow,
    booking.salonName,
    booking.salonAddress,
    extractSenderDomain(from),
  );

  const depositPaid = booking.paymentType === 'deposit' && booking.amountPaid != null ? booking.amountPaid : null;
  const remaining = depositPaid != null && booking.servicePrice != null ? booking.servicePrice - depositPaid : null;

  const clientRows = [
    renderRow(isEn ? 'Name' : 'Име', booking.clientName),
    renderRow(isEn ? 'Service' : 'Услуга', booking.serviceName),
    booking.serviceDuration ? renderRow(isEn ? 'Duration' : 'Продължителност', `${booking.serviceDuration} ${isEn ? 'min' : 'мин'}`) : '',
    booking.servicePrice != null ? renderRow(isEn ? 'Price' : 'Цена', formatSalonPrice(booking.servicePrice)) : '',
    depositPaid != null ? renderRow(isEn ? 'Deposit paid' : 'Платен депозит', formatSalonPrice(depositPaid)) : '',
    remaining != null && remaining > 0 ? renderRow(isEn ? 'Pay at salon' : 'Доплащане на място', formatSalonPrice(remaining)) : '',
    renderRow(isEn ? 'Date' : 'Дата', formattedDate),
    renderRow(isEn ? 'Time' : 'Час', booking.time),
    booking.salonPhone ? renderRow(isEn ? 'Salon phone' : 'Телефон на салона', booking.salonPhone) : '',
    booking.salonAddress ? renderRow(isEn ? 'Address' : 'Адрес', booking.salonAddress) : '',
    booking.notes ? renderRow(isEn ? 'Notes' : 'Бележка', booking.notes) : '',
  ].join('');
  await sendResendWithRetry({
    from,
    to: clientEmail,
    reply_to: booking.salonEmail || undefined,
    subject: (booking.bookingStatus ?? 'confirmed') === 'confirmed'
      ? (isEn ? `✅ Your booking at ${booking.salonName} is confirmed` : `✅ Резервацията ви в ${booking.salonName} е потвърдена`)
      : (isEn ? `Booking request for ${booking.salonName} – ${formattedDate} ${booking.time}` : `Заявка за резервация в ${booking.salonName} – ${formattedDate} ${booking.time}`),
    attachments: [
      {
        filename: `${(booking.salonName || 'reservation').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'reservation'}-reservation.ics`,
        content: Buffer.from(icsContent).toString('base64'),
      },
    ],
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="margin: 0 0 16px; color: #000;">${(booking.bookingStatus ?? 'confirmed') === 'confirmed' ? (isEn ? `✅ Your booking at ${escapeHtml(booking.salonName)} is confirmed` : `✅ Резервацията ви в ${escapeHtml(booking.salonName)} е потвърдена`) : (isEn ? 'We received your request' : 'Получихме вашата заявка')}</h2>
        <p style="line-height: 1.7;">${isEn ? 'Hello' : 'Здравейте'}, <strong>${escapeHtml(booking.clientName)}</strong>!</p>
        <p style="line-height: 1.7;">
          ${(booking.bookingStatus ?? 'confirmed') === 'confirmed'
            ? (isEn ? `Your appointment for <strong>${formattedDate} at ${escapeHtml(booking.time)}</strong> has been booked and confirmed.` : `Вашият час на <strong>${formattedDate} в ${escapeHtml(booking.time)}</strong> е записан и потвърден.`)
            : (isEn ? `We received your request for <strong>${escapeHtml(booking.salonName)}</strong>. You will receive a confirmation from the salon.` : `Получихме вашата заявка за <strong>${escapeHtml(booking.salonName)}</strong>. Ще получите потвърждение от салона.`)
          }
        </p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          ${clientRows}
        </table>
        <p style="margin-top: 20px; line-height: 1.7; font-weight: 600;">${isEn ? 'Add to calendar:' : 'Добави в календара:'}</p>
        <p style="margin: 8px 0 0; line-height: 1.7;">
          <a href="${googleUrl}" style="color: #000; font-weight: 600;">Google Calendar</a>
          · ${isEn ? 'The attached .ics file works with Apple Calendar and Outlook.' : 'Прикрепеният .ics файл работи с Apple Calendar и Outlook.'}
        </p>
        ${booking.bookingId && booking.manageToken ? `
        <p style="margin-top: 20px; line-height: 1.7;">
          <a href="${appBaseUrl}/booking/manage?id=${encodeURIComponent(booking.bookingId)}&token=${encodeURIComponent(booking.manageToken)}"
             style="display: inline-block; background: #000; color: #fff; padding: 12px 24px;
                    border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 14px;">
            ${isEn ? 'Change or cancel booking' : 'Промени или откажи резервацията'}
          </a>
        </p>` : `
        <p style="margin-top: 16px; line-height: 1.7;">
          ${isEn ? 'If you need to make a change, reply directly to this email or contact the salon.' : 'При нужда от промяна, отговорете директно на този имейл или се свържете със салона.'}
        </p>`}
      </div>
    `,
  }, 4, client);
}
