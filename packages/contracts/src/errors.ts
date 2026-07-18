import { z } from 'zod';

export const apiErrorCodeSchema = z.enum([
  'VALIDATION_FAILED',
  'AUTH_REQUIRED',
  'ROLE_FORBIDDEN',
  'RESOURCE_NOT_FOUND',
  'STALE_VERSION',
  'INVALID_STATE_TRANSITION',
  'SUBMISSION_LOCKED',
  'ASSIGNMENT_CONFLICT',
  'NOT_INVITED',
  'IDEMPOTENCY_KEY_REUSED',
  'INPUT_HASH_MISMATCH',
  'POLICY_HASH_MISMATCH',
  'CODE_VERSION_UNAVAILABLE',
  'FIXTURE_NOT_ALLOWLISTED',
  'NON_SYNTHETIC_INPUT',
  'FEATURE_DISABLED',
  'SERIALIZATION_RETRY_EXHAUSTED',
]);

export const apiErrorSchema = z
  .object({
    error: z
      .object({
        code: apiErrorCodeSchema,
        message: z.string().min(1),
        retryable: z.boolean(),
        correlationId: z.uuid(),
        currentState: z.string().min(1).nullable(),
        fieldErrors: z.array(
          z
            .object({
              path: z.array(z.union([z.string(), z.number().int().nonnegative()])),
              message: z.string().min(1),
            })
            .strict(),
        ),
      })
      .strict(),
  })
  .strict();

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
