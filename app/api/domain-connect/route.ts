import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { sql } from '@/lib/db';
import {
  isValidDomain,
  normalizeDomainCandidate,
  requireAdminRequestAccess,
} from '@/lib/admin-auth';
import { loadAdminSiteDataBySlug } from '@/lib/admin-site';
import { ROOT_DOMAIN } from '@/lib/domain-routing';
import { ensureDomainPurchaseSchema } from '@/lib/domain-purchase';
import { syncDomainWithVercel, removeProjectDomain } from '@/lib/vercel-domains';
import { writeAuditLog } from '@/lib/audit-log';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function notifyDomainActive({
  email,
  name,
  ownerName,
  domain,
}: {
  email: string;
  name: string;
  ownerName?: string;
  domain: string;
}) {
  if (!resend || !email) return;
  const adminUrl = `https://${domain}/admin`;
  const greeting = ownerName && ownerName.trim() ? `Здравей, ${ownerName.trim()}!` : 'Здравей!';
  await resend.emails.send({
    from: `${name || 'Clicka.bg'} <noreply@clicka.bg>`,
    to: email,
    subject: `Домейнът ти е свързан успешно! ✅`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000; margin: 0 0 16px;">Домейнът е свързан успешно!</h2>
        <p style="line-height: 1.7;">${greeting}</p>
        <p style="line-height: 1.7;">
          Сайтът на <strong>${name}</strong> вече е достъпен на собствения ти домейн:<br>
          <a href="https://${domain}" style="color: #000; font-weight: 700;">${domain}</a>
        </p>
        <p style="margin: 24px 0 8px; line-height: 1.7;">
          За да влезеш в контролния си панел, отвори:
        </p>
        <p style="margin: 0 0 24px;">
          <a href="${adminUrl}"
             style="display:inline-block;background:#000;color:#fff;text-decoration:none;
                    padding:14px 24px;border-radius:999px;font-weight:700;font-size:15px;">
            ${domain}/admin →
          </a>
        </p>
        <p style="line-height: 1.7; color: #6b7280; font-size: 13px;">
          Запомни адреса на твоя контролен панел: <strong>${domain}/admin</strong>
        </p>
      </div>
    `,
  }).catch(() => {});
}

async function persistDomainState({
  slug,
  domain,
  provider,
  previousStatus,
  notify,
}: {
  slug: string;
  domain: string;
  provider: Awaited<ReturnType<typeof syncDomainWithVercel>>;
  previousStatus?: string | null;
  notify?: { email: string; name: string; ownerName?: string };
}) {
  const configJson = JSON.stringify({
    provider: provider.provider,
    dnsInstructions: provider.dnsInstructions,
    verificationInstructions: provider.verificationInstructions,
    configuredBy: provider.configuredBy,
    misconfigured: provider.misconfigured,
    verified: provider.verified,
    providerDetails: provider.details,
    checkedAt: new Date().toISOString(),
  });

  const isActive = provider.status === 'active';

  await sql`
    UPDATE salons
    SET
      custom_domain = ${domain},
      domain_status = ${provider.status},
      domain_last_checked_at = now(),
      domain_verified_at = CASE WHEN ${isActive} THEN now() ELSE domain_verified_at END,
      domain_config = ${configJson},
      updated_at = now()
    WHERE slug = ${slug}
  `;

  await ensureDomainPurchaseSchema();
  const statusForPurchase = provider.status;
  await sql`
    UPDATE domain_purchase_requests
    SET
      status = CASE
        WHEN ${statusForPurchase} = 'active' THEN 'connected'
        WHEN status IN ('paid', 'requested') THEN 'processing'
        ELSE status
      END,
      updated_at = now()
    WHERE lower(full_domain) = lower(${domain})
      AND salon_id IN (SELECT id::text FROM salons WHERE slug = ${slug} LIMIT 1)
      AND status <> 'rejected'
  `;

  if (isActive && previousStatus !== 'active' && notify?.email) {
    await notifyDomainActive({ email: notify.email, name: notify.name, ownerName: notify.ownerName, domain });
  }
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const site = await loadAdminSiteDataBySlug(auth.salon.slug);
  if (!site) {
    return NextResponse.json({ error: 'Сайтът не е намерен.' }, { status: 404 });
  }

  return NextResponse.json({
    customDomain: site.customDomain,
    domainStatus: site.domainStatus,
    domainConfig: site.domainConfig,
  });
}

export async function PATCH(request: NextRequest) {
  let body: { slug?: string; domain?: string } = {};
  try {
    body = await request.json();
  } catch {}

  const auth = await requireAdminRequestAccess(
    request,
    body.slug ?? request.nextUrl.searchParams.get('slug')
  );
  if (!auth.ok) return auth.response;

  const site = await loadAdminSiteDataBySlug(auth.salon.slug);
  if (!site || !site.customDomain) {
    return NextResponse.json({ error: 'Няма свързан домейн за проверка.' }, { status: 400 });
  }

  const provider = await syncDomainWithVercel(site.customDomain);
  await persistDomainState({
    slug: auth.salon.slug,
    domain: site.customDomain,
    provider,
    previousStatus: site.domainStatus,
    notify: { email: site.email, name: site.name, ownerName: site.ownerName },
  });

  return NextResponse.json({
    success: true,
    customDomain: site.customDomain,
    domainStatus: provider.status,
    dnsInstructions: provider.dnsInstructions,
    verificationInstructions: provider.verificationInstructions,
    provider: provider.provider,
    providerDetails: provider.details,
    configuredBy: provider.configuredBy,
    misconfigured: provider.misconfigured,
    verified: provider.verified,
  });
}

export async function DELETE(request: NextRequest) {
  let body: { slug?: string } = {};
  try { body = await request.json(); } catch {}

  const auth = await requireAdminRequestAccess(
    request,
    body.slug ?? request.nextUrl.searchParams.get('slug')
  );
  if (!auth.ok) return auth.response;

  const site = await loadAdminSiteDataBySlug(auth.salon.slug);
  if (!site) return NextResponse.json({ error: 'Сайтът не е намерен.' }, { status: 404 });

  const removedDomain = site.customDomain;
  if (removedDomain) {
    await removeProjectDomain(removedDomain);
  }

  await sql`
    UPDATE salons
    SET
      custom_domain = NULL,
      domain_status = NULL,
      domain_config = NULL,
      domain_verified_at = NULL,
      domain_last_checked_at = now(),
      updated_at = now()
    WHERE slug = ${auth.salon.slug}
  `;

  void writeAuditLog({
    salonId: auth.salon.salonId,
    ownerId: auth.session.ownerId,
    action: 'domain_disconnected',
    detail: removedDomain ? { domain: removedDomain } : undefined,
    ip: request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null,
  });

  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  let body: { slug?: string; domain?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const auth = await requireAdminRequestAccess(
    request,
    body.slug ?? request.nextUrl.searchParams.get('slug')
  );
  if (!auth.ok) return auth.response;

  const site = await loadAdminSiteDataBySlug(auth.salon.slug);
  if (!site) return NextResponse.json({ error: 'Сайтът не е намерен.' }, { status: 404 });

  const domain = normalizeDomainCandidate(body.domain ?? '');
  if (!domain || !isValidDomain(domain)) {
    return NextResponse.json({ error: 'Въведете валиден домейн.' }, { status: 400 });
  }
  if (domain === ROOT_DOMAIN || domain.endsWith(`.${ROOT_DOMAIN}`)) {
    return NextResponse.json({ error: 'Този домейн е запазен за платформата.' }, { status: 400 });
  }

  // Prevent claiming a domain already registered to another salon
  const existing = await sql`
    SELECT slug FROM salons
    WHERE lower(custom_domain) = lower(${domain})
      AND slug <> ${auth.salon.slug}
    LIMIT 1
  `;
  if (existing.length > 0) {
    return NextResponse.json(
      { error: 'Този домейн вече е свързан с друг акаунт.' },
      { status: 409 },
    );
  }

  const provider = await syncDomainWithVercel(domain);
  await persistDomainState({
    slug: auth.salon.slug,
    domain,
    provider,
    previousStatus: site.customDomain === domain ? site.domainStatus : null,
    notify: { email: site.email, name: site.name, ownerName: site.ownerName },
  });

  void writeAuditLog({
    salonId: auth.salon.salonId,
    ownerId: auth.session.ownerId,
    action: 'domain_connected',
    detail: { domain, status: provider.status },
    ip: request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null,
  });

  return NextResponse.json({
    success: true,
    customDomain: domain,
    domainStatus: provider.status,
    dnsInstructions: provider.dnsInstructions,
    verificationInstructions: provider.verificationInstructions,
    provider: provider.provider,
    providerDetails: provider.details,
    configuredBy: provider.configuredBy,
    misconfigured: provider.misconfigured,
    verified: provider.verified,
  });
}

