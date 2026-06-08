import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { isPlatformAdminRequest } from '@/lib/platform-admin-auth';
import { sql } from '@/lib/db';
import { generateAdminMagicLink } from '@/lib/admin-auth';
import { getPlatformPublicUrl, getPlatformAdminUrl } from '@/lib/domain-routing';

export async function POST(request: NextRequest) {
  if (!(await isPlatformAdminRequest(request))) {
    return NextResponse.json({ error: 'Нямате достъп' }, { status: 401 });
  }

  const { slug } = await request.json();
  if (!slug) return NextResponse.json({ error: 'Липсва slug' }, { status: 400 });

  const rows = await sql`
    SELECT CAST(id AS text) AS salon_id, slug, name, email, owner_name
    FROM salons WHERE slug = ${slug} LIMIT 1
  `;
  if (rows.length === 0) return NextResponse.json({ error: 'Салонът не е намерен' }, { status: 404 });

  const { salon_id: salonId, name, email, owner_name } = rows[0] as Record<string, string>;
  if (!email) return NextResponse.json({ error: 'Салонът няма имейл' }, { status: 400 });

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  if (!resend) return NextResponse.json({ error: 'RESEND_API_KEY не е конфигуриран' }, { status: 503 });

  const publicUrl = getPlatformPublicUrl(slug);
  const adminUrl = getPlatformAdminUrl(slug);
  const greeting = owner_name?.trim() ? `Здравей, ${owner_name.trim()}!` : 'Здравей!';
  const magicLink = await generateAdminMagicLink({
    salonId,
    slug,
    email,
    expiresMs: 24 * 60 * 60 * 1000,
  }).catch(() => adminUrl);

  const result = await resend.emails.send({
    from: 'Clicka.bg <noreply@clicka.bg>',
    to: email,
    subject: `Твоят сайт е готов! ✅`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000; margin: 0 0 16px;">Твоят сайт е готов!</h2>
        <p style="line-height: 1.7;">${greeting}</p>
        <p style="line-height: 1.7;">
          Сайтът на <strong>${name}</strong> вече е активен на адрес:<br>
          <a href="${publicUrl}" style="color: #000; font-weight: 700;">${publicUrl}</a>
        </p>
        <p style="margin: 24px 0 8px; line-height: 1.7;">
          Натисни бутона, за да влезеш в контролния си панел:
        </p>
        <p style="margin: 0 0 24px;">
          <a href="${magicLink}"
             style="display:inline-block;background:#000;color:#fff;text-decoration:none;
                    padding:14px 24px;border-radius:999px;font-weight:700;font-size:15px;">
            Отвори панела →
          </a>
        </p>
        <p style="line-height: 1.7; color: #6b7280; font-size: 13px;">
          Запомни адреса на твоя контролен панел: <strong>${publicUrl}/admin</strong>
        </p>
        <p style="margin-top: 24px; font-size: 13px; color: #999; line-height: 1.6;">
          Линкът е валиден 24 часа.
        </p>
      </div>
    `,
  });

  if (result.error) {
    console.error(`[pa/resend-welcome] ❌ Failed slug=${slug} to=${email}:`, JSON.stringify(result.error));
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  console.log(`[pa/resend-welcome] ✅ Sent id=${result.data?.id} slug=${slug} to=${email}`);
  return NextResponse.json({ success: true, emailId: result.data?.id, to: email });
}
