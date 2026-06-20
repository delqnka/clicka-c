import { defineConfig } from 'tsup';
import path from 'node:path';
import fs from 'node:fs/promises';
import { preserveDirectivesPlugin } from 'esbuild-plugin-preserve-directives';

// Resolve `@/*` to the engine repo root so tsup follows the same import graph
// the Next.js app uses (lib/*, components/*, locales/*).
const repoRoot = path.resolve(__dirname, '..', '..');

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: false,
  treeshake: true,
  target: 'es2020',
  platform: 'browser',
  external: ['react', 'react-dom', 'lucide-react'],
  loader: { '.json': 'json' },
  esbuildOptions(options) {
    options.alias = {
      ...(options.alias ?? {}),
      '@': repoRoot,
    };
    options.jsx = 'automatic';
  },
  // Preserve `'use client'` on every chunk so Next.js App Router consumers
  // pick up the correct server/client boundary.
  esbuildPlugins: [
    // Silences the "module level directive ignored" warning. Doesn't itself
    // emit the banner in concatenated bundles — that happens in `onSuccess`.
    preserveDirectivesPlugin({
      directives: ['use client'],
      include: /\.(js|ts|jsx|tsx)$/,
      exclude: /node_modules/,
    }),
  ],
  async onSuccess() {
    const dir = path.resolve(__dirname, 'dist');
    const files = await fs.readdir(dir);
    for (const f of files) {
      if (!f.endsWith('.js')) continue;
      const p = path.join(dir, f);
      const src = await fs.readFile(p, 'utf8');
      if (src.startsWith("'use client';") || src.startsWith('"use client";')) continue;
      await fs.writeFile(p, `'use client';\n${src}`);
    }
  },
});
