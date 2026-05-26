import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

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

const ALLOWED_WIDTHS = new Set([128, 320, 480, 640, 768, 1024, 1280]);

const CACHE_MAX_ENTRIES = 200;
const CACHE_MAX_BYTES = 150 * 1024 * 1024;
const processedCache = new Map<string, { buf: Buffer; type: string; size: number }>();
let cacheTotalBytes = 0;

function evictIfNeeded(needed: number) {
  while (
    (processedCache.size >= CACHE_MAX_ENTRIES || cacheTotalBytes + needed > CACHE_MAX_BYTES) &&
    processedCache.size > 0
  ) {
    const oldest = processedCache.keys().next().value!;
    const entry = processedCache.get(oldest)!;
    cacheTotalBytes -= entry.size;
    processedCache.delete(oldest);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'Липсва ключ' }, { status: 400 });
  }

  const wParam = parseInt(searchParams.get('w') ?? '', 10);
  const targetWidth = ALLOWED_WIDTHS.has(wParam) ? wParam : 0;
  const quality = Math.min(Math.max(parseInt(searchParams.get('q') ?? '70', 10), 10), 100);

  const accept = request.headers.get('accept') ?? '';
  const supportsAvif = accept.includes('image/avif');
  const supportsWebp = accept.includes('image/webp');
  const fmt = supportsAvif ? 'avif' : supportsWebp ? 'webp' : 'jpeg';

  const cacheKey = `${key}:${targetWidth}:${fmt}:${quality}`;
  const cached = processedCache.get(cacheKey);
  if (cached) {
    processedCache.delete(cacheKey);
    processedCache.set(cacheKey, cached);
    return new NextResponse(cached.buf as unknown as BodyInit, {
      headers: {
        'Content-Type': cached.type,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Vary': 'Accept',
      },
    });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: r2Bucket!,
      Key: key,
    });

    const object = await r2.send(command);

    if (!object.Body) {
      return NextResponse.json({ error: 'Файлът не е намерен' }, { status: 404 });
    }

    const bytes = await object.Body.transformToByteArray();
    const contentType = object.ContentType || 'image/jpeg';
    const isImage = contentType.startsWith('image/') && !contentType.includes('svg');

    if (!isImage) {
      return new NextResponse(Buffer.from(bytes), {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    let pipeline = sharp(Buffer.from(bytes));

    if (targetWidth > 0) {
      pipeline = pipeline.resize({ width: targetWidth, withoutEnlargement: true });
    }

    let outputType: string;
    if (supportsAvif) {
      pipeline = pipeline.avif({ quality });
      outputType = 'image/avif';
    } else if (supportsWebp) {
      pipeline = pipeline.webp({ quality });
      outputType = 'image/webp';
    } else {
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      outputType = 'image/jpeg';
    }

    const optimized = await pipeline.toBuffer();

    evictIfNeeded(optimized.length);
    processedCache.set(cacheKey, { buf: optimized, type: outputType, size: optimized.length });
    cacheTotalBytes += optimized.length;

    return new NextResponse(optimized as unknown as BodyInit, {
      headers: {
        'Content-Type': outputType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Vary': 'Accept',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Грешка при зареждане на файла' }, { status: 500 });
  }
}
