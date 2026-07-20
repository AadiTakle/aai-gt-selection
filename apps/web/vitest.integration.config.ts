import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const directory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.join(directory, 'src'),
      'next/headers': path.join(directory, 'vitest.next-headers.ts'),
      'server-only': path.join(directory, 'vitest.server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
  },
});
