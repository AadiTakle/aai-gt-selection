import { z } from 'zod';

const loopbackHosts = new Set(['127.0.0.1', 'localhost', '::1']);

const publicEnvironmentSchema = z
  .object({
    NEXT_PUBLIC_GT_RETURN_URL: z.url().optional(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
  })
  .strict()
  .superRefine(({ NEXT_PUBLIC_SUPABASE_URL }, context) => {
    if (!loopbackHosts.has(new URL(NEXT_PUBLIC_SUPABASE_URL).hostname)) {
      context.addIssue({
        code: 'custom',
        message: 'The synthetic prototype refuses non-loopback Supabase URLs.',
        path: ['NEXT_PUBLIC_SUPABASE_URL'],
      });
    }
  });

const elevatedKeyNamePattern = /^(?:NEXT_PUBLIC_)?SUPABASE_(?:SECRET|SERVICE_ROLE)_KEY$/;
const localSyntheticAdapterSchema = z
  .object({
    GT_LOCAL_SYNTHETIC_ADAPTER_ENABLED: z.literal('true'),
    GT_LOCAL_SYNTHETIC_PROJECT_ID: z.literal('gt-selection-capstone'),
    NODE_ENV: z.enum(['development', 'test']),
  })
  .strict();

export function validatePublicEnvironment(input: Record<string, string | undefined>) {
  return publicEnvironmentSchema.parse({
    NEXT_PUBLIC_GT_RETURN_URL: input.NEXT_PUBLIC_GT_RETURN_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: input.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: input.NEXT_PUBLIC_SUPABASE_URL,
  });
}

export function assertNoElevatedRuntimeKeys(input: Record<string, string | undefined>) {
  const elevated = Object.keys(input).filter(
    (key) => elevatedKeyNamePattern.test(key) && input[key],
  );
  if (elevated.length > 0) {
    throw new Error(`Elevated Supabase keys are forbidden in app runtime: ${elevated.join(', ')}`);
  }
}

export function getPublicEnvironment() {
  return validatePublicEnvironment(process.env);
}

export function getServerEnvironment() {
  assertNoElevatedRuntimeKeys(process.env);
  return getPublicEnvironment();
}

export function validateLocalSyntheticAdapterEnvironment(
  input: Record<string, string | undefined>,
) {
  assertNoElevatedRuntimeKeys(input);
  const publicEnvironment = validatePublicEnvironment(input);
  const adapterEnvironment = localSyntheticAdapterSchema.parse({
    GT_LOCAL_SYNTHETIC_ADAPTER_ENABLED: input.GT_LOCAL_SYNTHETIC_ADAPTER_ENABLED,
    GT_LOCAL_SYNTHETIC_PROJECT_ID: input.GT_LOCAL_SYNTHETIC_PROJECT_ID,
    NODE_ENV: input.NODE_ENV,
  });
  const databaseUrl = new URL(publicEnvironment.NEXT_PUBLIC_SUPABASE_URL);
  if (databaseUrl.protocol !== 'http:' || databaseUrl.port !== '65421') {
    throw new Error(
      'The local synthetic adapter only permits the designated loopback project port.',
    );
  }

  return {
    ...publicEnvironment,
    ...adapterEnvironment,
  };
}

export function getLocalSyntheticAdapterEnvironment() {
  return validateLocalSyntheticAdapterEnvironment(process.env);
}

export function getReturnUrl() {
  return getPublicEnvironment().NEXT_PUBLIC_GT_RETURN_URL ?? 'http://127.0.0.1:3000';
}
