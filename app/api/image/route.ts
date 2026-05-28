import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { IMAGE_DELIVERY_WIDTHS, snapImageWidth } from '@/lib/image-delivery';

const r2Endpoint = process.env.R2_ENDPOINT || process.env.CLOUDFLARE_R2_ENDPOINT;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const r2Bucket = process.env.R2_BUCKET || process.env.CLOUDFLARE_R2_BUCKET;

const ALLOWED_WIDTHS = new Set<number>(IMAGE_DELIVERY_WIDTHS);

const r2 = new S3Client({
  region: 'auto',
  endpoint: r2Endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: r2AccessKeyId!,
    secretAccessKey: r2SecretAccessKey!,
  },
});

const CACHE_MAX_ENTRIES = 400;
const CACHE_MAX_BYTES = 200 * 1024 * 1024;
const processedCache = new Map<string, { buf: Buffer; type: string; size: number }>();
let cacheTotalBytes = 0;

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=31536000, immutable',
  Vary: 'Accept',
} as const;

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

function cacheAndRespond(cacheKey: string, buf: Buffer, type: string) {
  evictIfNeeded(buf.length);
  processedCache.set(cacheKey, { buf, type, size: buf.length });
  cacheTotalBytes += buf.length;
  return new NextResponse(buf as unknown as BodyInit, {
    headers: { 'Content-Type': type, ...CACHE_HEADERS },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'Липсва ключ' }, { status: 400 });
  }

  const wParam = parseInt(searchParams.get('w') ?? '', 10);
  const snapped = snapImageWidth(wParam);
  const targetWidth = ALLOWED_WIDTHS.has(snapped) ? snapped : 0;
  const qDefault =
    targetWidth > 0 && targetWidth <= 320
      ? 60
      : targetWidth > 0 && targetWidth <= 480
        ? 58
        : targetWidth > 0 && targetWidth <= 768
          ? 66
          : 72;
  const quality = Math.min(Math.max(parseInt(searchParams.get('q') ?? String(qDefault), 10), 10), 100);

  const accept = request.headers.get('accept') ?? '';
  const supportsWebp = accept.includes('image/webp');
  /** WebP only on the image API — AVIF encode is much slower on cold serverless invocations (hurts LCP). */
  const fmt = supportsWebp ? 'webp' : 'jpeg';

  const cacheKey = `${key}:${targetWidth}:${fmt}:${quality}`;
  const cached = processedCache.get(cacheKey);
  if (cached) {
    processedCache.delete(cacheKey);
    processedCache.set(cacheKey, cached);
    return new NextResponse(cached.buf as unknown as BodyInit, {
      headers: { 'Content-Type': cached.type, ...CACHE_HEADERS },
    });
  }

  try {
    const object = await r2.send(
      new GetObjectCommand({
        Bucket: r2Bucket!,
        Key: key,
      })
    );

    if (!object.Body) {
      return NextResponse.json({ error: 'Файлът не е намерен' }, { status: 404 });
    }

    const bytes = await object.Body.transformToByteArray();
    const buffer = Buffer.from(bytes);
    const contentType = object.ContentType || 'image/jpeg';
    const isImage = contentType.startsWith('image/') && !contentType.includes('svg');

    if (!isImage) {
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    if (targetWidth === 0) {
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    const meta = await sharp(buffer, { failOn: 'none' }).metadata();
    const sourceWidth = meta.width ?? 0;

    const alreadyWebp = contentType === 'image/webp';
    const skipReencode =
      sourceWidth > 0 &&
      sourceWidth <= targetWidth &&
      ((fmt === 'webp' && alreadyWebp) || (fmt === 'jpeg' && contentType === 'image/jpeg'));

    if (skipReencode) {
      return cacheAndRespond(cacheKey, buffer, contentType);
    }

    let pipeline = sharp(buffer, { failOn: 'none' }).rotate();

    if (targetWidth > 0 && (sourceWidth === 0 || sourceWidth > targetWidth)) {
      pipeline = pipeline.resize({
        width: targetWidth,
        withoutEnlargement: true,
        fastShrinkOnLoad: true,
      });
    }

    const thumbQ = targetWidth <= 320 ? Math.min(quality, 66) : quality;

    let outputType: string;
    if (supportsWebp) {
      pipeline = pipeline.webp({ quality: thumbQ, effort: 2 });
      outputType = 'image/webp';
    } else {
      pipeline = pipeline.jpeg({ quality: thumbQ, mozjpeg: true });
      outputType = 'image/jpeg';
    }

    const optimized = await pipeline.toBuffer();
    return cacheAndRespond(cacheKey, optimized, outputType);
  } catch {
    return NextResponse.json({ error: 'Грешка при зареждане на файла' }, { status: 500 });
  }
}
