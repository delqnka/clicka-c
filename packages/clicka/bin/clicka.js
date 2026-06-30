#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function log(message) {
  process.stdout.write(`${message}\n`);
}

function fail(message) {
  process.stderr.write(`@clicka1/clicka: ${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = {
    command: argv[0] || '',
    targetDir: process.cwd(),
    skipInstall: false,
  };

  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--skip-install') {
      out.skipInstall = true;
      continue;
    }
    if (!arg.startsWith('-')) {
      out.targetDir = path.resolve(arg);
    }
  }

  return out;
}

function readFileSafe(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
}

function writeFileEnsured(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function detectPackageManager(rootDir) {
  if (fs.existsSync(path.join(rootDir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(rootDir, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(rootDir, 'bun.lockb'))) return 'bun';
  return 'npm';
}

function installBookingPackage(rootDir, manager) {
  const commands = {
    npm: ['install', '@clicka1/booking'],
    pnpm: ['add', '@clicka1/booking'],
    yarn: ['add', '@clicka1/booking'],
    bun: ['add', '@clicka1/booking'],
  };

  const args = commands[manager];
  if (!args) fail(`Unsupported package manager: ${manager}`);

  log(`Installing @clicka1/booking with ${manager}...`);
  const result = spawnSync(manager, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    fail('Package install failed. Re-run with --skip-install if you want file scaffolding only.');
  }
}

function detectLayout(rootDir) {
  const candidates = [
    'app/layout.tsx',
    'app/layout.jsx',
    'src/app/layout.tsx',
    'src/app/layout.jsx',
  ];

  for (const rel of candidates) {
    const abs = path.join(rootDir, rel);
    if (fs.existsSync(abs)) {
      return { abs, rel, ext: path.extname(abs) };
    }
  }

  return null;
}

function ensureEnvExample(rootDir) {
  const envPath = fs.existsSync(path.join(rootDir, '.env.example'))
    ? path.join(rootDir, '.env.example')
    : path.join(rootDir, '.env.local.example');

  const existing = readFileSafe(envPath) || '';
  const linesToAdd = [
    'NEXT_PUBLIC_ENGINE_URL=https://app.alternine.co',
    'NEXT_PUBLIC_BOOKING_API_KEY=pk_live_your_public_api_key',
    'NEXT_PUBLIC_SALON_SLUG=your-salon-slug',
    'NEXT_PUBLIC_SITE_URL=https://example.com',
  ];

  let next = existing;
  if (next && !next.endsWith('\n')) next += '\n';

  let changed = false;
  for (const line of linesToAdd) {
    if (!existing.includes(line.split('=')[0])) {
      next += `${line}\n`;
      changed = true;
    }
  }

  if (!existing) {
    next = `# Added by @clicka1/clicka init\n${linesToAdd.join('\n')}\n`;
    changed = true;
  }

  if (changed) {
    writeFileEnsured(envPath, next);
  }

  return path.basename(envPath);
}

function relativeImport(fromFile, toFile) {
  const rel = path.relative(path.dirname(fromFile), toFile).replace(/\\/g, '/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function buildProviderSource(ext) {
  const isTs = ext === '.tsx';
  const typeImport = isTs
    ? "import type { ReactNode } from 'react';\n"
    : '';
  const childType = isTs ? ': { children: ReactNode }' : '';

  return `'use client';

${typeImport}import { BookingProvider } from '@clicka1/booking';
import '@clicka1/booking/styles.css';

function buildReturnUrl(pathname${isTs ? ': string' : ''}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return undefined;
  return \`\${siteUrl.replace(/\\/$/, '')}\${pathname}\`;
}

export function ClickaProvider({ children }${childType}) {
  return (
    <BookingProvider
      salonSlug={process.env.NEXT_PUBLIC_SALON_SLUG}
      engineUrl={process.env.NEXT_PUBLIC_ENGINE_URL}
      apiKey={process.env.NEXT_PUBLIC_BOOKING_API_KEY}
      successUrl={buildReturnUrl('/booking/success')}
      cancelUrl={buildReturnUrl('/booking/cancel')}
    >
      {children}
    </BookingProvider>
  );
}
`;
}

function injectProviderIntoLayout(layoutPath, providerImportPath) {
  const original = readFileSafe(layoutPath);
  if (!original) fail(`Could not read layout: ${layoutPath}`);
  let next = original;

  if (!next.includes('ClickaProvider')) {
    const importLine = `import { ClickaProvider } from '${providerImportPath}';\n`;
    if (/^import .*;$/m.test(next)) {
      const imports = next.match(/^(import .*;\n)+/m);
      if (imports) {
        next = `${imports[0]}${importLine}${next.slice(imports[0].length)}`;
      } else {
        next = `${importLine}${next}`;
      }
    } else {
      next = `${importLine}${next}`;
    }
  }

  if (!next.includes('<ClickaProvider>{children}</ClickaProvider>')) {
    if (!next.includes('{children}')) {
      fail(`Could not find {children} in ${layoutPath}. Add ClickaProvider manually.`);
    }
    next = next.replace('{children}', '<ClickaProvider>{children}</ClickaProvider>');
  }

  if (next !== original) {
    writeFileEnsured(layoutPath, next);
  }
}

function runInit(targetDir, skipInstall) {
  const pkgJsonPath = path.join(targetDir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    fail(`No package.json found in ${targetDir}`);
  }

  const layout = detectLayout(targetDir);
  if (!layout) {
    fail('Supported target not found. `init` currently supports Next.js App Router layouts only.');
  }

  const packageManager = detectPackageManager(targetDir);
  if (!skipInstall) {
    installBookingPackage(targetDir, packageManager);
  } else {
    log('Skipping package install.');
  }

  const componentBaseDir = layout.rel.startsWith('src/')
    ? path.join(targetDir, 'src', 'components', 'clicka')
    : path.join(targetDir, 'components', 'clicka');
  const providerPath = path.join(componentBaseDir, `ClickaProvider${layout.ext}`);

  writeFileEnsured(providerPath, buildProviderSource(layout.ext));

  const envFile = ensureEnvExample(targetDir);
  const providerImportPath = relativeImport(layout.abs, providerPath).replace(/\.(tsx|jsx)$/, '');
  injectProviderIntoLayout(layout.abs, providerImportPath);

  log('');
  log('Clicka booking scaffolded.');
  log(`- Root layout updated: ${layout.rel}`);
  log(`- Provider created: ${path.relative(targetDir, providerPath)}`);
  log(`- Env example updated: ${envFile}`);
  log('');
  log('Next steps:');
  log('1. Fill in NEXT_PUBLIC_SALON_SLUG with the salon slug created from /pa.');
  log('2. Fill in NEXT_PUBLIC_BOOKING_API_KEY with the public key issued from /pa.');
  log('3. Fill in NEXT_PUBLIC_SITE_URL with the client site domain.');
  log('4. Add `data-clicka-book` to existing CTA buttons or import BookingButton from @clicka1/booking.');
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.command || args.command === '--help' || args.command === '-h') {
    log('Usage: npx @clicka1/clicka init [project-dir] [--skip-install]');
    process.exit(0);
  }

  if (args.command !== 'init') {
    fail(`Unknown command: ${args.command}`);
  }

  runInit(args.targetDir, args.skipInstall);
}

main();
