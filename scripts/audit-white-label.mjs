import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const checks = [
  {
    file: 'middleware.ts',
    mustNotExist: true,
    reason: 'Client domains must not be routed through the engine middleware.',
  },
  {
    file: 'public/widget.js',
    forbidden: ['window.clicka', 'data-clicka', '<iframe', 'iframe'],
    reason: 'The drop-in widget must stay neutral and must not iframe engine pages.',
  },
  {
    file: 'public/engine-client.js',
    forbidden: ['window.clicka', 'data-clicka', '<iframe', 'iframe'],
    reason: 'The browser helper must expose only the neutral booking client.',
  },
  {
    file: 'docs/custom-site-integration.md',
    forbidden: ['data-clicka'],
    reason: 'Custom site docs should describe the neutral integration contract.',
  },
];

const failures = [];

for (const check of checks) {
  const path = join(root, check.file);

  if (check.mustNotExist) {
    if (existsSync(path)) {
      failures.push(`${check.file}: exists. ${check.reason}`);
    }
    continue;
  }

  if (!existsSync(path)) {
    failures.push(`${check.file}: missing.`);
    continue;
  }

  const text = readFileSync(path, 'utf8');
  for (const needle of check.forbidden ?? []) {
    if (text.includes(needle)) {
      failures.push(`${check.file}: contains "${needle}". ${check.reason}`);
    }
  }
}

if (failures.length) {
  console.error('White-label audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('White-label audit passed.');
