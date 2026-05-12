import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { sql } from '@/lib/db';
import { Resend } from 'resend';
import {
  getPlatformAdminUrl,
  getPlatformClaimUrl,
  getPlatformPublicUrl,
} from '@/lib/domain-routing';
import { ensurePlatformSubdomain } from '@/lib/vercel-domains';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Липсва подпис' }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: 'Невалиден подпис' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { salonSlug, templateId, planType } = session.metadata ?? {};

    if (!salonSlug) {
      return NextResponse.json({ received: true });
    }

    await ensurePlatformSubdomain(String(salonSlug));

    await sql`
      UPDATE salons
      SET
        is_active = true,
        site_status = 'active',
        template_id = ${templateId ?? null},
        plan_type = ${planType ?? null},
        stripe_session_id = ${session.id},
        stripe_customer_id = ${(session.customer as string) ?? null}
      WHERE slug = ${salonSlug}
    `;

    const salons = await sql`
      SELECT email, name FROM salons WHERE slug = ${salonSlug}
    `;

    if (salons.length > 0 && salons[0].email) {
      const { email, name } = salons[0];
      const publicUrl = getPlatformPublicUrl(String(salonSlug));
      const claimUrl = getPlatformClaimUrl(String(salonSlug));
      const adminUrl = getPlatformAdminUrl(String(salonSlug));

      await resend.emails.send({
        from: 'Clicka.bg <noreply@clicka.bg>',
        to: email,
        subject: `Добре дошли в Clicka.bg – ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Вашият сайт е готов!</h2>
            <p>Здравейте,</p>
            <p>Плащането е прието успешно. Сайтът на <strong>${name}</strong> вече е активен.</p>
            <p>
              Можете да го намерите на адрес:<br>
              <a href="${publicUrl}" style="color: #0070f3;">
                ${publicUrl}
              </a>
            </p>
            <p style="margin-top: 18px;">
              Първа стъпка: claim-нете сайта си:<br>
              <a href="${claimUrl}" style="color: #0070f3; font-weight: 600;">
                ${claimUrl}
              </a>
            </p>
            <p style="margin-top: 12px;">След това ще можете да редактирате съдържанието си от dashboard-а:</p>
            <p>
              <a href="${adminUrl}" style="color: #0070f3; font-weight: 600;">
                ${adminUrl}
              </a>
            </p>
            ${planType === 'custom_domain' ? '<p style="margin-top: 12px;">Собственият домейн може да се свърже след claim от таба "Домейн".</p>' : ''}
            <p>При въпроси не се колебайте да се свържете с нас.</p>
            <p style="margin-top: 24px; color: #666; font-size: 14px;">
              Екипът на <a href="https://clicka.bg">Clicka.bg</a>
            </p>
          </div>
        `,
      });
    }
  }

  return NextResponse.json({ received: true });
}
