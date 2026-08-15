import { afterEach, describe, expect, it, vi } from 'vitest';

import { register, validateOnboardingBootstrapEnvironment } from './instrumentation';

const validLocalEnvironment = {
  GT_LOCAL_SYNTHETIC_ADAPTER_ENABLED: 'true',
  GT_LOCAL_SYNTHETIC_PROJECT_ID: 'gt-selection-capstone',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'local-publishable-key',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:65421',
  NODE_ENV: 'development',
} as const;

describe('Next server onboarding bootstrap', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('leaves ordinary environments unchanged when B11B is not configured', () => {
    expect(() => validateOnboardingBootstrapEnvironment({ NODE_ENV: 'production' })).not.toThrow();
  });

  it('accepts an explicitly enabled designated local synthetic adapter', () => {
    expect(() => validateOnboardingBootstrapEnvironment(validLocalEnvironment)).not.toThrow();
  });

  it.each([
    {
      ...validLocalEnvironment,
      GT_LOCAL_SYNTHETIC_PROJECT_ID: undefined,
    },
    {
      ...validLocalEnvironment,
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    },
    {
      ...validLocalEnvironment,
      NODE_ENV: 'production',
    },
    {
      NODE_ENV: 'development',
      GT_LOCAL_SYNTHETIC_PROJECT_ID: 'gt-selection-capstone',
    },
  ])('fails bootstrap when B11B configuration is partial or unsafe', (environment) => {
    expect(() => validateOnboardingBootstrapEnvironment(environment)).toThrow();
  });

  it('fails through the actual Next instrumentation register hook', () => {
    vi.stubEnv('GT_LOCAL_SYNTHETIC_ADAPTER_ENABLED', 'true');
    vi.stubEnv('GT_LOCAL_SYNTHETIC_PROJECT_ID', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'local-publishable-key');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:65421');
    vi.stubEnv('NODE_ENV', 'development');

    expect(() => register()).toThrow();
  });
});
