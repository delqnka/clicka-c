import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2 } from '@/lib/r2';
import { requireAdminRequestAccess } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const salonSlug =
    request.headers.get('x-salon-slug') ||
    searchParams.get('slug');

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
  const buffer = Buffer.from(bytes);

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `salons/${salonSlug}/${Date.now()}-${safeName}`;

  const url = await uploadToR2(buffer, key, file.type);

  return NextResponse.json({ url });
}
