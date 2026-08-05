import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: r('./apps/web'),
  plugins: [react()],
  resolve: {
    alias: {
      '@gt/contracts': r('./packages/contracts/src/index.ts'),
      '@gt/item-library': r('./packages/item-library/src/index.ts'),
      '@gt/engine': r('./packages/engine/src/index.ts'),
      '@gt/stats': r('./packages/stats/src/index.ts'),
      '@gt/practice': r('./packages/practice/src/index.ts'),
    },
  },
  server: {
    port: 5180,
    proxy: {
      '/api': 'http://localhost:5181',
    },
  },
  build: {
    outDir: r('./dist'),
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: 'node',
    include: [r('./packages/**/*.test.ts'), r('./apps/**/*.test.ts')],
  },
});
