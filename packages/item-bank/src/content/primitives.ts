import { z } from 'zod';

import { lureClassSchema } from '../enums';

/** A renderable token: text plus optional asset/audio references (§8.1). */
export const tokenSchema = z
  .object({
    text: z.string().min(1),
    assetId: z.string().optional(),
    audioId: z.string().optional(),
  })
  .strict();
export type Token = z.infer<typeof tokenSchema>;

/** Figural attribute vector used by the figural-matrix / analogy grammars. */
export const SHAPES = ['circle', 'square', 'triangle', 'star'] as const;
export const COLORS = ['red', 'blue', 'green', 'yellow'] as const;
export const figuralAttrSchema = z
  .object({
    shape: z.enum(SHAPES),
    color: z.enum(COLORS),
    count: z.int().min(1).max(5),
  })
  .strict();
export type FiguralAttr = z.infer<typeof figuralAttrSchema>;

/** A numeric option (server side carries its lure class). */
export const numericOptionSchema = z
  .object({ value: z.number(), lure: lureClassSchema })
  .strict();
/** Renderable numeric option — lure stripped. */
export const numericOptionRenderableSchema = z.object({ value: z.number() });
