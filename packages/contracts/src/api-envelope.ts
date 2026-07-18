import { z } from 'zod';

export const apiMetaSchema = z
  .object({
    correlationId: z.uuid(),
    idempotencyKey: z.uuid().nullable(),
    idempotentReplay: z.boolean(),
  })
  .strict();

export const apiSuccessSchema = <Schema extends z.ZodType>(dataSchema: Schema) =>
  z
    .object({
      apiVersion: z.literal('v1'),
      syntheticOnly: z.literal(true),
      data: dataSchema,
      meta: apiMetaSchema,
    })
    .strict();

export type ApiMeta = z.infer<typeof apiMetaSchema>;
