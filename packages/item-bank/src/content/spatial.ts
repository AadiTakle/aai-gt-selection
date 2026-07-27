import { z } from 'zod';

import { lureClassSchema } from '../enums';

/* ────────────────────────── SPA-ROLL-01 ───────────────────────────────────
 * Rolling Cube — a labelled cube tips square-by-square along a path; pick the
 * face that ends up on top. deterministic_key; the solver simulates the rolls. */
export const ROLL_DIRECTIONS = ['N', 'S', 'E', 'W'] as const;
export const cubeFacesSchema = z
  .object({
    top: z.string().min(1),
    bottom: z.string().min(1),
    north: z.string().min(1),
    south: z.string().min(1),
    east: z.string().min(1),
    west: z.string().min(1),
  })
  .strict();
export const rollContentSchema = z
  .object({
    typeCode: z.literal('SPA-ROLL-01'),
    faces: cubeFacesSchema, // initial orientation (fully visible)
    path: z.array(z.enum(ROLL_DIRECTIONS)).min(1).max(8),
    options: z
      .array(z.object({ face: z.string().min(1), lure: lureClassSchema }).strict())
      .min(3)
      .max(5),
  })
  .strict();
export const rollRenderableSchema = z.object({
  typeCode: z.literal('SPA-ROLL-01'),
  faces: cubeFacesSchema,
  path: z.array(z.enum(ROLL_DIRECTIONS)),
  options: z.array(z.object({ face: z.string().min(1) })),
});

/* ────────────────────────── SPA-MAZE-01 ───────────────────────────────────
 * Plan-the-Path — navigate start→exit. computed_solver, partial credit. The
 * optimal path/length is the answer (canonicalSolution, server-only); the
 * renderable exposes only the grid, walls, start, and goal. */
const coordSchema = z.tuple([z.int().nonnegative(), z.int().nonnegative()]);
export const mazeContentSchema = z
  .object({
    typeCode: z.literal('SPA-MAZE-01'),
    width: z.int().min(3).max(9),
    height: z.int().min(3).max(9),
    walls: z.array(coordSchema),
    start: coordSchema,
    goal: coordSchema,
  })
  .strict();
export const mazeRenderableSchema = z.object({
  typeCode: z.literal('SPA-MAZE-01'),
  width: z.int().min(3).max(9),
  height: z.int().min(3).max(9),
  walls: z.array(coordSchema),
  start: coordSchema,
  goal: coordSchema,
});
