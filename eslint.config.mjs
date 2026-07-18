import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '.cursor/**',
      'docs/**',
      'graphify-out/**',
      'gt-school-counterfactual-brainlift/**',
      'node_modules/**',
      'research/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
);
