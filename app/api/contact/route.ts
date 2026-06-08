import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit('contact-form', ip, 5, 10 * 60 * 1000);
  if (rl.limited) return NextResponse.json({ error: 'Твърде много заявки. Опитай след 10 минути.' }, { status: 429 });

  try {
    const { name, email, message, turnstileToken } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Всички полета са задължителни' }, { status: 400 });
    }

    const tsRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY!,
        response: turnstileToken ?? '',
        remoteip: ip,
      }),
    });
    const tsData = await tsRes.json();
    if (!tsData.success) {
      return NextResponse.json({ error: 'Провалена верификация. Опитай пак.' }, { status: 403 });
    }

    if (!resend) {
      return NextResponse.json({ error: 'Имейл услугата не е конфигурирана.' }, { status: 503 });
    }

    await resend.emails.send({
      from: 'Clicka Contact <onboarding@resend.dev>',
      to: process.env.PLATFORM_ADMIN_EMAIL!,
      reply_to: email,
      subject: `Ново запитване от ${name}`,
      text: `Име: ${name}\nИмейл: ${email}\n\nСъобщение:\n${message}`,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Грешка при изпращане' }, { status: 500 });
  }
}
