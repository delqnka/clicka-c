import { Suspense } from 'react';
import { sql } from '@/lib/db';
import Stripe from 'stripe';
import crypto from 'crypto';
import { Resend } from 'resend';
import { ensurePlatformSubdomain } from '@/lib/vercel-domains';
import { sendTelegramMessage } from '@/lib/telegram';
import SuccessClient from './SuccessClient';
import { SuccessLoadingShell } from './SuccessLoadingShell';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function alertProvisioningFailure(detail: { sessionId: string; email: string; reason: string }) {
  const text =
    `⚠️ <b>Провизиране на салон гръмна след плащане</b>\n` +
    `Сесия: <code>${detail.sessionId}</code>\n` +
    `Имейл: ${detail.email || '—'}\n` +
    `Причина: ${detail.reason}`;

  await Promise.allSettled([
    process.env.CLICKA_OWNER_CHAT_ID
      ? sendTelegramMessage(process.env.CLICKA_OWNER_CHAT_ID, text)
      : Promise.resolve(),
    process.env.PLATFORM_ADMIN_EMAIL && resend
      ? resend.emails.send({
          from: 'Clicka Alerts <onboarding@resend.dev>',
          to: process.env.PLATFORM_ADMIN_EMAIL,
          subject: `⚠️ Провизиране гръмна — ${detail.email || detail.sessionId}`,
          text: `Сесия: ${detail.sessionId}\nИмейл: ${detail.email || '—'}\nПричина: ${detail.reason}`,
        })
      : Promise.resolve(),
  ]);
}

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Липсва STRIPE_SECRET_KEY');
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

const TRANSLIT: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',
  и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',
  р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',
  ш:'sh',щ:'sht',ъ:'a',ь:'',ю:'yu',я:'ya',
};

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .split('')
    .map(c => TRANSLIT[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 32) || 'salon';
}

async function generateUniqueSalonSlug(base: string) {
  const slug = toSlug(base);
  for (let attempt = 0; attempt < 100; attempt++) {
    const suffix = attempt === 0 ? '' : String(attempt + 1);
    const candidate = `${slug.slice(0, 32 - suffix.length)}${suffix}`;
    const rows = await sql`SELECT slug FROM salons WHERE slug = ${candidate} LIMIT 1`;
    if (rows.length === 0) return candidate;
  }
  throw new Error('Не успяхме да генерираме свободен адрес');
}

const DEFAULT_HOURS = {
  monday:    { open: '09:00', close: '18:00', closed: false },
  tuesday:   { open: '09:00', close: '18:00', closed: false },
  wednesday: { open: '09:00', close: '18:00', closed: false },
  thursday:  { open: '09:00', close: '18:00', closed: false },
  friday:    { open: '09:00', close: '18:00', closed: false },
  saturday:  { open: '10:00', close: '16:00', closed: false },
  sunday:    { open: '',      close: '',      closed: true  },
};

async function ProvisionedSuccess({
  sessionId,
  legacySlug,
}: {
  sessionId: string;
  legacySlug: string;
}) {
  let salonEmail = '';
  let salonSlug = legacySlug;
  let ownerName = '';
  let purchaseValue = 0;
  let provisionError = false;

  if (legacySlug) {
    try {
      const rows = await sql`SELECT email FROM salons WHERE slug = ${legacySlug} LIMIT 1`;
      if (rows.length > 0) salonEmail = String(rows[0].email ?? '');
    } catch { /* ignore */ }
  } else if (sessionId) {
    try {
      const existing = await sql`
        SELECT slug, email, owner_name FROM salons WHERE stripe_session_id = ${sessionId} LIMIT 1
      `;

      if (existing.length > 0) {
        salonSlug = String(existing[0].slug);
        salonEmail = String(existing[0].email ?? '');
        ownerName = String(existing[0].owner_name ?? '');
      } else {
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status === 'paid') {
          const email = session.customer_details?.email ?? '';
          ownerName = (session.metadata?.ownerName ?? '').trim();
          const salonName = (session.metadata?.salonName ?? '').trim();
          const desiredSlug = toSlug((session.metadata?.salonSlug ?? '').trim());
          const planType = session.metadata?.planType ?? 'solo';
          const billingPeriod = session.metadata?.billingPeriod ?? '12m';
          const prices: Record<string, Record<string, number>> = { solo: { '12m': 299, '6m': 169 }, team: { '12m': 499, '6m': 279 } };
          purchaseValue = prices[planType]?.[billingPeriod] ?? (session.amount_total ? session.amount_total / 100 : 0);
          const billingMonths = billingPeriod === '6m' ? 6 : 12;

          if (email) {
            const emailPrefix = email.split('@')[0].replace(/[^a-z0-9]/gi, '').slice(0, 16) || 'salon';
            const base = desiredSlug || salonName || emailPrefix;
            const salonId = crypto.randomUUID();

            await sql`CREATE UNIQUE INDEX IF NOT EXISTS salons_slug_uniq ON salons (slug)`.catch(() => {});
            let insertedSlug = '';

            for (let attempt = 0; attempt < 5 && !insertedSlug; attempt++) {
              const slug = attempt === 0
                ? await generateUniqueSalonSlug(base)
                : await generateUniqueSalonSlug(`${base}${crypto.randomBytes(2).toString('hex')}`);
              try {
                await sql`
                  INSERT INTO salons (
                    id, slug, name, category, phone, email,
                    city, address, about,
                    cover_image_url, logo_image_url, gallery_images,
                    instagram_username, facebook_username,
                    google_maps_url,
                    working_hours, services,
                    template_id, primary_color, primary_color_light,
                    plan_type, plan, is_active, site_status,
                    billing_period, plan_expires_at,
                    onboarding_code, stripe_session_id,
                    owner_name
                  ) VALUES (
                    ${salonId}, ${slug}, ${salonName}, ${''}, ${''}, ${email},
                    ${''}, ${''}, ${''},
                    ${''}, ${''}, ${'[]'}::jsonb,
                    ${''}, ${''},
                    ${''},
                    ${JSON.stringify(DEFAULT_HOURS)}::jsonb, ${'[]'}::jsonb,
                    ${1}, ${'#111111'}, ${'#f3f4f6'},
                    ${planType}, ${planType === 'ekip' ? 'team' : planType}, true, ${'setup'},
                    ${billingPeriod}, now() + (${String(billingMonths)} || ' months')::interval,
                    ${crypto.randomBytes(4).toString('hex').toUpperCase()},
                    ${sessionId},
                    ${ownerName}
                  )
                `;
                insertedSlug = slug;
              } catch (insertErr) {
                const msg = insertErr instanceof Error ? insertErr.message : String(insertErr);
                if (!/duplicate key|unique constraint/i.test(msg)) throw insertErr;
              }
            }

            if (!insertedSlug) throw new Error('Не успяхме да резервираме уникален адрес след няколко опита');

            ensurePlatformSubdomain(insertedSlug).catch(() => {});

            salonSlug = insertedSlug;
            salonEmail = email;
          } else {
            provisionError = true;
            await alertProvisioningFailure({ sessionId, email, reason: 'Платена сесия без имейл от Stripe — не може да се създаде салон.' });
          }
        }
      }
    } catch (err) {
      console.error('[success] Failed to process Stripe session:', err);
      provisionError = true;
      const reason = err instanceof Error ? err.message : String(err);
      await alertProvisioningFailure({ sessionId, email: salonEmail, reason }).catch(() => {});
    }
  }

  return (
    <SuccessClient
      slug={salonSlug || ''}
      email={salonEmail}
      ownerName={ownerName}
      purchaseValue={purchaseValue}
      provisionError={!salonSlug && provisionError}
      sessionRef={sessionId || ''}
    />
  );
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams?: { session_id?: string | string[]; salon?: string | string[] };
}) {
  const sessionId =
    typeof searchParams?.session_id === 'string'
      ? searchParams.session_id
      : Array.isArray(searchParams?.session_id)
        ? searchParams.session_id[0]
        : '';

  const legacySlug =
    typeof searchParams?.salon === 'string'
      ? searchParams.salon
      : Array.isArray(searchParams?.salon)
        ? searchParams.salon[0]
        : '';

  return (
    <Suspense fallback={<SuccessLoadingShell />}>
      <ProvisionedSuccess sessionId={sessionId} legacySlug={legacySlug} />
    </Suspense>
  );
}
