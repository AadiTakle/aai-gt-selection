import { describe, expect, it } from 'vitest';

import { assertNoElevatedRuntimeKeys, validatePublicEnvironment } from './env';

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
});
