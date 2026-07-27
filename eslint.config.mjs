import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '.cursor/**',
      '**/.next/**',
      'docs/**',
      'graphify-out/**',
      'brainlifting/**',
      'node_modules/**',
      'packages/db-types/src/database.generated.ts',
      'research/**',
      'supabase/.temp/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
);
