import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    setupFiles: ['./tests/setup-env.ts'],
    testTimeout: 30000,
  },
});
