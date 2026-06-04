import { NextRequest, NextResponse } from 'next/server';
import { telegramPost } from '@/lib/telegram';

// GET /api/telegram-setup — registers bot commands so they appear in Telegram's menu.
// Call this once after deploy (open the URL in browser while logged in as admin).
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (!secret || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const commands = [
    { command: 'стоп',    description: 'Излез от чат режим → пиши команди на бота' },
    { command: 'чат',     description: 'Върни се в чат режим с последния клиент' },
    { command: 'help',    description: 'Покажи всички команди' },
    { command: 'unblock', description: 'Деблокирай час: /unblock 14:00 утре' },
  ];

  const result = await telegramPost('setMyCommands', { commands });
  return NextResponse.json({ ok: true, result });
}
