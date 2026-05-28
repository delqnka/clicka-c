import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { normalizeR2PublicBase } from '@/lib/image-delivery';

const r2Endpoint = process.env.R2_ENDPOINT || process.env.CLOUDFLARE_R2_ENDPOINT;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const r2Bucket = process.env.R2_BUCKET || process.env.CLOUDFLARE_R2_BUCKET;

const r2 = new S3Client({
  region: 'auto',
  endpoint: r2Endpoint,
  // Cloudflare R2 expects path-style requests with the account endpoint.
  // Without this, the SDK may try virtual-hosted style (`bucket.accountid...`) which breaks.
  forcePathStyle: true,
  credentials: {
    accessKeyId: r2AccessKeyId!,
    secretAccessKey: r2SecretAccessKey!,
  },
});

export async function uploadToR2(
  file: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: r2Bucket!,
      Key: key,
      Body: file,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  const publicBase = normalizeR2PublicBase(
    process.env.R2_PUBLIC_URL ?? process.env.CLOUDFLARE_R2_PUBLIC_URL,
  );
  if (publicBase) {
    const encoded = key
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');
    return `${publicBase}/${encoded}`;
  }

  return `/api/image?key=${encodeURIComponent(key)}`;
}
