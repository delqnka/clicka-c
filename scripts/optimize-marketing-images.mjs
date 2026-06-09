#!/usr/bin/env node
/**
 * Resize + WebP marketing static assets for video posters and other non-next/image URLs.
 * Run: node scripts/optimize-marketing-images.mjs
 */
import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const JOBS = [
  { in: 'public/chat.png', out: 'public/marketing/chat.webp', width: 560 },
  { in: 'public/IMG_1851.jpg', out: 'public/marketing/IMG_1851.webp', width: 560 },
  { in: 'public/IMG_1852.jpg', out: 'public/marketing/IMG_1852.webp', width: 560 },
  { in: 'public/images/IMG_1821.jpg', out: 'public/marketing/IMG_1821.webp', width: 560 },
  { in: 'public/images/IMG_1822.jpg', out: 'public/marketing/IMG_1822.webp', width: 560 },
  { in: 'public/images/IMG_1823.jpg', out: 'public/marketing/IMG_1823.webp', width: 560 },
  { in: 'public/images/IMG_1826 2.jpg', out: 'public/marketing/IMG_1826-2.webp', width: 560 },
  { in: 'public/IMG_1832.jpg', out: 'public/marketing/IMG_1832.webp', width: 520 },
  { in: 'public/vid1-poster.jpg', out: 'public/vid1-poster.webp', width: 400 },
];

for (const job of JOBS) {
  const input = path.join(ROOT, job.in);
  const output = path.join(ROOT, job.out);
  try {
    await stat(input);
  } catch {
    console.warn(`skip missing ${job.in}`);
    continue;
  }
  await mkdir(path.dirname(output), { recursive: true });
  await sharp(input)
    .rotate()
    .resize({ width: job.width, withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toFile(output);
  const inStat = await stat(input);
  const outStat = await stat(output);
  console.log(
    `${job.in} → ${job.out} (${Math.round(inStat.size / 1024)}KiB → ${Math.round(outStat.size / 1024)}KiB)`,
  );
}
