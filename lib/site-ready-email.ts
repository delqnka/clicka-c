import {
  getCustomDomainAdminUrl,
  getPlatformAdminUrl,
  getPlatformPublicUrl,
} from '@/lib/domain-routing';
import { generateAdminMagicLink, getActiveCustomDomain } from '@/lib/admin-auth';
import { getSalonResend } from '@/lib/resend';

export async function sendSiteReadyEmail(opts: { salonId: string; slug: string; email: string; name: string; ownerName?: string; planType: string }) {
  const { salonId, slug, email, name, ownerName, planType } = opts;
  const { client, from } = await getSalonResend(salonId, name);
  if (!client) return;
  const greeting = ownerName && ownerName.trim() ? `Здравей, ${ownerName.trim()}!` : 'Здравей!';
  const customDomain = await getActiveCustomDomain(salonId).catch(() => null);
  const publicUrl = customDomain ? `https://${customDomain}` : getPlatformPublicUrl(slug);
  const adminUrl = customDomain ? `${getCustomDomainAdminUrl(customDomain)}/admin` : getPlatformAdminUrl(slug);
  const magicLink = await generateAdminMagicLink({ salonId, slug, email, customDomain, expiresMs: 24 * 60 * 60 * 1000 }).catch(() => adminUrl);
  const displayName = name && name.trim() ? name.trim() : 'твоят салон';

  await client.emails.send({
    from,
    to: email,
    subject: `Твоят сайт е готов! ✅`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000; margin: 0 0 16px;">Твоят сайт е готов!</h2>
        <p style="line-height: 1.7;">${greeting}</p>
        <p style="line-height: 1.7;">
          Сайтът на <strong>${displayName}</strong> вече е активен на адрес:<br>
          <a href="${publicUrl}" style="color: #000; font-weight: 700;">${publicUrl}</a>
        </p>
        <p style="margin: 24px 0 8px; line-height: 1.7;">
          Натисни бутона, за да влезеш в контролния си панел и да персонализираш сайта:
        </p>
        <p style="margin: 0 0 24px;">
          <a href="${magicLink}"
             style="display:inline-block;background:#000;color:#fff;text-decoration:none;
                    padding:14px 24px;border-radius:999px;font-weight:700;font-size:15px;">
            Отвори панела →
          </a>
        </p>
        <p style="line-height: 1.7; color: #6b7280; font-size: 13px;">
          Запомни адреса на твоя контролен панел: <strong>${adminUrl.replace(/^https?:\/\//, '')}</strong>
        </p>
        ${planType === 'custom_domain' ? '<p style="line-height: 1.7;">Собственият домейн може да се свърже от таба „Домейн" в панела.</p>' : ''}
        <p style="margin-top: 24px; font-size: 13px; color: #999; line-height: 1.6;">
          Линкът е валиден 24 часа. Ако не сте поръчали сайт, игнорирайте имейла.
        </p>
      </div>
    `,
  }).catch((err) => console.error('[site-ready-email] failed to send', err));
}
