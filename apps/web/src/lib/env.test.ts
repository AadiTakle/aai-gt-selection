import { describe, expect, it } from 'vitest';

import {
  assertNoElevatedRuntimeKeys,
  validateLocalSyntheticAdapterEnvironment,
  validatePublicEnvironment,
} from './env';

describe('synthetic runtime environment', () => {
  it('accepts local Supabase configuration', () => {
    expect(
      validatePublicEnvironment({
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'local-publishable-key',
        NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:65421',
      }),
    ).toBeDefined();
  });

  it('rejects a remote Supabase target', () => {
    expect(() =>
      validatePublicEnvironment({
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
        NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      }),
    ).toThrow(/non-loopback/i);
  });

  it.each(['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'])(
    'rejects elevated runtime key %s',
    (key) => {
      expect(() => assertNoElevatedRuntimeKeys({ [key]: 'forbidden' })).toThrow(/forbidden/i);
    },
  );

  it('enables the local adapter only for the designated synthetic project', () => {
    expect(
      validateLocalSyntheticAdapterEnvironment({
        GT_LOCAL_SYNTHETIC_ADAPTER_ENABLED: 'true',
        GT_LOCAL_SYNTHETIC_PROJECT_ID: 'gt-selection-capstone',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'local-publishable-key',
        NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:65421',
        NODE_ENV: 'test',
      }),
    ).toBeDefined();
  });

  it.each([
    {
      GT_LOCAL_SYNTHETIC_ADAPTER_ENABLED: undefined,
      GT_LOCAL_SYNTHETIC_PROJECT_ID: 'gt-selection-capstone',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'local-publishable-key',
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:65421',
      NODE_ENV: 'test',
    },
    {
      GT_LOCAL_SYNTHETIC_ADAPTER_ENABLED: 'true',
      GT_LOCAL_SYNTHETIC_PROJECT_ID: 'gt-selection-capstone',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'local-publishable-key',
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:65421',
      NODE_ENV: 'production',
    },
    {
      GT_LOCAL_SYNTHETIC_ADAPTER_ENABLED: 'true',
      GT_LOCAL_SYNTHETIC_PROJECT_ID: 'another-project',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'local-publishable-key',
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:65421',
      NODE_ENV: 'test',
    },
  ])('fails closed for an undesignated local adapter environment', (environment) => {
    expect(() => validateLocalSyntheticAdapterEnvironment(environment)).toThrow();
  });
});
