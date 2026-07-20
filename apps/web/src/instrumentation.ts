import { validateLocalSyntheticAdapterEnvironment } from '@/lib/env';

const adapterBootstrapKeys = [
  'GT_LOCAL_SYNTHETIC_ADAPTER_ENABLED',
  'GT_LOCAL_SYNTHETIC_PROJECT_ID',
] as const;

export function validateOnboardingBootstrapEnvironment(
  environment: Record<string, string | undefined>,
) {
  const adapterConfigured = adapterBootstrapKeys.some((key) => environment[key] !== undefined);
  if (!adapterConfigured) {
    return;
  }

  validateLocalSyntheticAdapterEnvironment(environment);
}

export function register() {
  validateOnboardingBootstrapEnvironment(process.env);
}
