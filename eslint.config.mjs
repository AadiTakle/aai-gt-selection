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
      // `apps/web` owns `apps/web/eslint.config.mjs` (Next core-web-vitals +
      // typescript) and lints itself via `pnpm -r run lint`. Linting it from here
      // too would apply THIS config, which has no react plugins, so every
      // `eslint-disable react-hooks/*` comment in the app becomes a
      // "rule not found" error. Workspace packages are deliberately NOT ignored:
      // they have no own config file and resolve to this one.
      'apps/web/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // `ignoreRestSiblings` allows the `const { omit, ...rest } = obj` pattern used to
    // drop a field while keeping the rest (e.g. the sync script omits `html` from its
    // JSON output); the underscore patterns allow deliberately unused bindings. Both
    // are standard and keep this class of false-positive from re-reddening CI.
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          ignoreRestSiblings: true,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // Repo-root Node scripts. `eslint.configs.recommended` declares no
    // environment, so `process`/`console`/`fetch` read as undefined globals.
    files: ['scripts/**/*.{mjs,cjs,js,ts}', '*.{mjs,cjs,js}'],
    languageOptions: {
      globals: {
        console: 'readonly',
        fetch: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
  },
);
