import { z } from 'zod';

const loopbackHosts = new Set(['127.0.0.1', 'localhost', '::1']);

/**
 * Hosted-deploy escape hatch (D-012 interim divergence — see infra/README.md).
 *
 * By DEFAULT the app fails closed on any non-loopback Supabase URL: the
 * prototype is synthetic-only and must not point at a real backend by accident.
 * Setting `GT_DEPLOY_MODE=hosted` (only ever in a real host's env) opts into a
 * cloud Supabase target. This does NOT relax the other safety guards: elevated
 * service-role keys are still forbidden in runtime env, and the local synthetic
 * adapter path stays strictly loopback:65421. Hosted mode must go through D-012
 * review before any production account is used.
 */
export function isHostedDeploy(input: Record<string, string | undefined> = process.env): boolean {
  return input.GT_DEPLOY_MODE === 'hosted';
}

const publicEnvironmentSchema = z
  .object({
    NEXT_PUBLIC_GT_RETURN_URL: z.url().optional(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    GT_DEPLOY_MODE: z.literal('hosted').optional(),
  })
  .strict()
  .superRefine(({ NEXT_PUBLIC_SUPABASE_URL, GT_DEPLOY_MODE }, context) => {
    // hosted mode permits a cloud Supabase target; otherwise stay loopback-only
    if (GT_DEPLOY_MODE === 'hosted') {
      if (new URL(NEXT_PUBLIC_SUPABASE_URL).protocol !== 'https:') {
        context.addIssue({
          code: 'custom',
          message: 'Hosted deploy requires an https Supabase URL.',
          path: ['NEXT_PUBLIC_SUPABASE_URL'],
        });
      }
      return;
    }
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
    GT_DEPLOY_MODE: input.GT_DEPLOY_MODE === 'hosted' ? 'hosted' : undefined,
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
