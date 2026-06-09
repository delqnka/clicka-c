import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { uploadToR2 } from '@/lib/r2';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit('support-chat-upload', ip, 10, 60 * 60 * 1000);
  if (rl.limited) {
    return NextResponse.json({ error: 'Твърде много качвания.' }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file || !file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Невалиден файл' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Файлът е твърде голям (макс 10 МБ)' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const webpBuffer = await sharp(buffer)
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const key = `support-chat/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
    const url = await uploadToR2(webpBuffer, key, 'image/webp');

    return NextResponse.json({ url });
  } catch (e) {
    console.error('[support-chat/upload]', e);
    return NextResponse.json({ error: 'Грешка при качване' }, { status: 500 });
  }
}
