import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Всички полета са задължителни' }, { status: 400 });
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
