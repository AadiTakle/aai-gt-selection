/**
 * App-local glue for the adaptive exam UI.
 *
 * The engine / scoring / item SHAPES are owned by the real packages
 * (`@gt-selection/exam-engine`, `@gt-selection/exam-scoring`,
 * `@gt-selection/contracts`) — those are the source of truth. This file only
 * holds UI-facing constants (grade bands) + a synthetic-id helper, and re-exports
 * the canonical adaptive types so UI modules import them from one place.
 *
 * Born-synthetic only: every served/scored artefact carries `syntheticOnly=true`
 * / `validated=false`. Difficulty is a FLOAT 1..20 (design-estimated, provisional).
 */

// Canonical adaptive types (source of truth = the engine + scoring packages).
export type {
  ServedItem,
  ItemResult,
  ScoredItem,
  TelemetryEvent,
  SessionState,
  Area,
  AgeBand,
} from '@gt-selection/exam-engine';
export type { ExamScore, AreaScore } from '@gt-selection/exam-scoring';

export type { ExamDomain } from './bank';
export { EXAM_DOMAINS, domainLabel } from './bank';

// ---------------------------------------------------------------------------
// Grade bands — the adaptive battery seeds difficulty from the requested band.
// A subset of the engine's AgeBand (the engine also models an `above-level` band
// that the intake UI never offers). (BUILD_PLAN §0: K-1≈1–4 … 6-8≈12–16.)
// ---------------------------------------------------------------------------

export const GRADE_BANDS = ['K-1', '2-3', '4-5', '6-8'] as const;
export type GradeBand = (typeof GRADE_BANDS)[number];

export const GRADE_BAND_LABEL: Record<GradeBand, string> = {
  'K-1': 'Kindergarten – 1st grade',
  '2-3': '2nd – 3rd grade',
  '4-5': '4th – 5th grade',
  '6-8': '6th – 8th grade',
};

/** Born-synthetic id (uuid when available), prefixed and PII-free. */
export function syntheticId(prefix: string): string {
  const raw =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2);
  return `${prefix}-SYN-${raw.slice(0, 10).toUpperCase()}`;
}
