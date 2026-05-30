import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { uploadToR2 } from '@/lib/r2';
import { requireAdminRequestAccess } from '@/lib/admin-auth';

const MAX_DIMENSION = 2048;
const PROFILE_MAX_DIMENSION = 1200;
const WEBP_QUALITY = 82;

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const salonSlug =
    request.headers.get('x-salon-slug') ||
    searchParams.get('slug');
  const isProfile = searchParams.get('kind') === 'profile';

  if (!salonSlug) {
    return NextResponse.json(
      { error: 'Неидентифициран салон' },
      { status: 400 }
    );
  }

  if (!salonSlug.startsWith('draft-')) {
    const auth = await requireAdminRequestAccess(request, salonSlug);
    if (!auth.ok) return auth.response;
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'Няма избран файл' }, { status: 400 });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Позволени формати: JPEG, PNG, WebP, GIF' },
      { status: 400 }
    );
  }

  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'Файлът е твърде голям. Максимален размер: 10MB' },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  const raw = Buffer.from(bytes);

  const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  const stamp = Date.now();
  const key = `salons/${salonSlug}/${stamp}-${baseName}.webp`;
  const lcpKey = `salons/${salonSlug}/${stamp}-${baseName}-lcp-640.webp`;

  const [webpBuffer, lcpBuffer] = await Promise.all([
    sharp(raw)
      .resize({
        width: isProfile ? PROFILE_MAX_DIMENSION : MAX_DIMENSION,
        height: isProfile ? PROFILE_MAX_DIMENSION : MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .rotate()
      .webp({ quality: WEBP_QUALITY })
      .toBuffer(),
    isProfile
      ? Promise.resolve<Buffer | null>(null)
      : sharp(raw)
          .rotate()
          .resize({ width: 640, withoutEnlargement: true, fastShrinkOnLoad: true })
          .webp({ quality: 56, effort: 2 })
          .toBuffer(),
  ]);

  const url = await uploadToR2(webpBuffer, key, 'image/webp');
  let lcpUrl: string | undefined;
  if (lcpBuffer) {
    try {
      lcpUrl = await uploadToR2(lcpBuffer, lcpKey, 'image/webp');
    } catch {
      lcpUrl = undefined;
    }
  }

  return NextResponse.json({ url, ...(lcpUrl ? { lcpUrl } : {}) });
}
