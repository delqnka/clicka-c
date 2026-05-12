import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const r2Endpoint = process.env.R2_ENDPOINT || process.env.CLOUDFLARE_R2_ENDPOINT;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const r2Bucket = process.env.R2_BUCKET || process.env.CLOUDFLARE_R2_BUCKET;

const r2 = new S3Client({
  region: 'auto',
  endpoint: r2Endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: r2AccessKeyId!,
    secretAccessKey: r2SecretAccessKey!,
  },
});

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'Липсва ключ' }, { status: 400 });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: r2Bucket!,
      // `searchParams.get()` returns a decoded string already.
      Key: key,
    });

    const object = await r2.send(command);

    if (!object.Body) {
      return NextResponse.json({ error: 'Файлът не е намерен' }, { status: 404 });
    }

    const bytes = await object.Body.transformToByteArray();

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': object.ContentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Грешка при зареждане на файла' }, { status: 500 });
  }
}
