import eslint from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '.cursor/**',
      '**/.next/**',
      'docs/**',
      'graphify-out/**',
      'gt-school-counterfactual-brainlift/**',
      'node_modules/**',
      'packages/db-types/src/database.generated.ts',
      'research/**',
      'supabase/.temp/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Register the react-hooks plugin repo-wide so hook dependency directives in
    // the web app resolve under the root lint (mirrors apps/web's Next config).
    plugins: { 'react-hooks': reactHooks },
    rules: { 'react-hooks/exhaustive-deps': 'warn' },
  },
);
