/**
 * @gt-selection/cat-engine — portable, pure, structure-agnostic exam scoring +
 * deterministic-replay engine (the intended AWS Lambda payload for D-019).
 *
 * No web / DB / framework dependencies: it runs identically in local dev and in
 * Lambda. It scores whatever the sequencer produced (fixed-form, two-stage, or
 * adaptive) — it does NOT itself route or select items (that logic lived in the
 * deliberately-excluded `select.ts` / `session.ts`). All output is
 * `synthetic_only=true`, `validated=false` (D-006, R9).
 */

export * from './types';
export * from './irt';
export * from './theta';
export * from './rng';
export * from './scoring';
export * from './measurements';
export * from './rte';
export * from './item-scoring';
export * from './result';
export * from './replay';
export * from './lambda/event';
export * from './lambda/handler';
