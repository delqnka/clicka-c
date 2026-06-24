import { getCustomDomainAdminUrl } from '@/lib/domain-routing';
import { generateAdminMagicLink, getActiveCustomDomain } from '@/lib/admin-auth';
import { getSalonResend } from '@/lib/resend';

export async function sendSiteReadyEmail(opts: { salonId: string; slug: string; email: string; name: string; ownerName?: string }) {
  const { salonId, slug, email, name, ownerName } = opts;
  const customDomain = await getActiveCustomDomain(salonId).catch(() => null);
  if (!customDomain) {
    console.warn('[site-ready-email] skipped — salon has no active custom domain', { salonId, slug });
    return;
  }
  const { client, from, locale } = await getSalonResend(salonId, name);
  if (!client) return;
  const isEn = locale === 'en';
  const greeting = ownerName && ownerName.trim() ? `${isEn ? 'Hello' : 'Здравей'}, ${ownerName.trim()}!` : `${isEn ? 'Hello' : 'Здравей'}!`;
  const publicUrl = `https://${customDomain}`;
  const adminUrl = `${getCustomDomainAdminUrl(customDomain)}/admin`;
  const magicLink = await generateAdminMagicLink({
    salonId,
    slug,
    email,
    customDomain,
    expiresMs: 24 * 60 * 60 * 1000,
  });
  const displayName = name && name.trim() ? name.trim() : 'твоят салон';

  await client.emails.send({
    from,
    to: email,
    subject: isEn ? 'Your site is ready! ✅' : `Твоят сайт е готов! ✅`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000; margin: 0 0 16px;">${isEn ? 'Your site is ready!' : 'Твоят сайт е готов!'}</h2>
        <p style="line-height: 1.7;">${greeting}</p>
        <p style="line-height: 1.7;">
          ${isEn ? `The site for <strong>${displayName}</strong> is now live at:` : `Сайтът на <strong>${displayName}</strong> вече е активен на адрес:`}<br>
          <a href="${publicUrl}" style="color: #000; font-weight: 700;">${publicUrl}</a>
        </p>
        <p style="margin: 24px 0 8px; line-height: 1.7;">
          ${isEn ? 'Use the button below to open your control panel and customize the site:' : 'Натисни бутона, за да влезеш в контролния си панел и да персонализираш сайта:'}
        </p>
        <p style="margin: 0 0 24px;">
          <a href="${magicLink}"
             style="display:inline-block;background:#000;color:#fff;text-decoration:none;
                    padding:14px 24px;border-radius:999px;font-weight:700;font-size:15px;">
            ${isEn ? 'Open the panel →' : 'Отвори панела →'}
          </a>
        </p>
        <p style="line-height: 1.7; color: #6b7280; font-size: 13px;">
          ${isEn ? 'Keep this control panel address:' : 'Запомни адреса на твоя контролен панел:'} <strong>${adminUrl.replace(/^https?:\/\//, '')}</strong>
        </p>
        <p style="margin-top: 24px; font-size: 13px; color: #999; line-height: 1.6;">
          ${isEn ? 'The link is valid for 24 hours. If you did not order this site, please ignore the email.' : 'Линкът е валиден 24 часа. Ако не сте поръчали сайт, игнорирайте имейла.'}
        </p>
      </div>
    `,
  }).catch((err) => console.error('[site-ready-email] failed to send', err));
}
