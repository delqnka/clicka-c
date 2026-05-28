#!/usr/bin/env node
/**
 * Quick performance snapshot: Next.js build output sizes + optional Lighthouse CLI.
 *
 * Usage:
 *   node scripts/perf-report.mjs
 *   LIGHTHOUSE_URL=https://your-salon.clicka.bg node scripts/perf-report.mjs
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lighthouseUrl = process.env.LIGHTHOUSE_URL?.trim();

console.log('=== Clicka performance report ===\n');

console.log('1) Production build (route + first-load JS)…\n');
try {
  execSync('npm run build', { cwd: root, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
} catch {
  console.error('\nBuild failed — fix errors before measuring Web Vitals in production.\n');
  process.exit(1);
}

const nextDir = path.join(root, '.next');
if (fs.existsSync(nextDir)) {
  console.log('\n2) .next cache size:', formatBytes(dirSize(nextDir)));
}

if (lighthouseUrl) {
  console.log(`\n3) Lighthouse (mobile) for ${lighthouseUrl}…\n`);
  try {
    execSync(
      `npx --yes lighthouse "${lighthouseUrl}" --only-categories=performance,accessibility,best-practices,seo --preset=perf --output=json --output-path=${path.join(root, 'lighthouse-report.json')} --chrome-flags="--headless"`,
      { cwd: root, stdio: 'inherit' }
    );
    console.log('\nSaved lighthouse-report.json');
  } catch {
    console.warn('Lighthouse failed (install Chrome or set LIGHTHOUSE_URL to a reachable URL).');
  }
} else {
  console.log('\n3) Lighthouse skipped. Set LIGHTHOUSE_URL to run e.g.:');
  console.log('   LIGHTHOUSE_URL=https://example.clicka.bg node scripts/perf-report.mjs\n');
}

console.log('4) Real-user Web Vitals: enable Vercel Speed Insights or add web-vitals in production.\n');

function dirSize(p) {
  let total = 0;
  for (const ent of fs.readdirSync(p, { withFileTypes: true })) {
    const full = path.join(p, ent.name);
    total += ent.isDirectory() ? dirSize(full) : fs.statSync(full).size;
  }
  return total;
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
