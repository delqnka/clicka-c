import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { uploadToR2 } from '@/lib/r2';
import { getStaffMemberByPortalToken } from '@/lib/staff-members';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const PROFILE_MAX_DIMENSION = 1200;
const WEBP_QUALITY = 82;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request as unknown as Request);
  const rl = await checkRateLimit('staff-portal-upload', ip, 10, 60 * 60 * 1000);
  if (rl.limited) {
    return NextResponse.json({ error: 'Твърде много качвания. Опитайте по-късно.' }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни' }, { status: 400 });
  }

  const token = String(formData.get('token') ?? '').trim();
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Невалиден линк' }, { status: 404 });
  }

  const staff = await getStaffMemberByPortalToken(token);
  if (!staff || !staff.isActive) {
    return NextResponse.json({ error: 'Невалиден или изтекъл линк' }, { status: 404 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'Няма избран файл' }, { status: 400 });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Позволени формати: JPEG, PNG, WebP, GIF' }, { status: 400 });
  }

  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Файлът е твърде голям. Максимален размер: 10MB' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const raw = Buffer.from(bytes);

  const stamp = Date.now();
  const key = `salons/${staff.salonId}/staff/${staff.id}-${stamp}.webp`;

  const webpBuffer = await sharp(raw)
    .resize({
      width: PROFILE_MAX_DIMENSION,
      height: PROFILE_MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .rotate()
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const url = await uploadToR2(webpBuffer, key, 'image/webp');

  return NextResponse.json({ url });
}
