import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const directory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.join(directory, 'src'),
      'server-only': path.join(directory, 'vitest.server-only.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    exclude: ['e2e/**', 'src/**/*.integration.test.ts', 'node_modules/**', '.next/**'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
