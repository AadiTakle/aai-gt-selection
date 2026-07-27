/**
 * D-019 AWS Lambda handler: a thin, PURE, deterministic wrapper around the
 * cat-engine scoring/replay functions (E-072).
 *
 * It adds NO web / DB / network / AWS-SDK dependency and no wall-clock or
 * randomness of its own — all randomness is seeded inside the engine — so the
 * same code path runs identically in local dev (`invoke-local.ts`) and, later,
 * in Lambda. Output is born-synthetic (synthetic_only=true, validated=false;
 * D-006, R9); no live data flows here and the deploy wiring
 * (Terraform / IAM / packaging) stays dormant — see `README.md`.
 */

import { fingerprint, matchesFingerprint, runScoring, verifyReplay } from '../replay';
import type { ScoringLambdaEvent, ScoringLambdaMode, ScoringLambdaResponse } from './event';

const VALID_MODES: readonly ScoringLambdaMode[] = ['score', 'replay-verify', 'replay-match'];

/** Reduce any thrown value to a deterministic, stack-free message. */
function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'unknown error';
}

/** Minimal structural validation of an untrusted (e.g. JSON-decoded) payload. */
function validateEvent(event: unknown): ScoringLambdaEvent {
  if (typeof event !== 'object' || event === null) {
    throw new Error('invalid event: expected an object');
  }
  const candidate = event as { mode?: unknown; input?: unknown };
  if (typeof candidate.mode !== 'string' || !(VALID_MODES as readonly string[]).includes(candidate.mode)) {
    throw new Error(`invalid event: mode must be one of ${VALID_MODES.join(' | ')}`);
  }
  if (typeof candidate.input !== 'object' || candidate.input === null) {
    throw new Error('invalid event: input is required');
  }
  return event as ScoringLambdaEvent;
}

/**
 * Route a validated event to the pure engine and shape the response. On any
 * validation error, unknown mode, or engine throw, resolve to
 * `{ ok: false, error }` with a deterministic string (never a stack), so the
 * handler itself never throws.
 */
export async function handler(event: ScoringLambdaEvent): Promise<ScoringLambdaResponse> {
  try {
    const validated = validateEvent(event);
    switch (validated.mode) {
      case 'score': {
        const result = runScoring(validated.input);
        return { ok: true, mode: 'score', result, fingerprint: fingerprint(result) };
      }
      case 'replay-verify': {
        const verification = verifyReplay(validated.input);
        return {
          ok: true,
          mode: 'replay-verify',
          verification,
          fingerprint: verification.fingerprint,
        };
      }
      case 'replay-match': {
        const expected = validated.expectedFingerprint;
        if (typeof expected !== 'string' || expected.length === 0) {
          throw new Error('invalid event: replay-match requires a non-empty expectedFingerprint');
        }
        return {
          ok: true,
          mode: 'replay-match',
          matches: matchesFingerprint(validated.input, expected),
        };
      }
      default:
        throw new Error(`invalid event: mode must be one of ${VALID_MODES.join(' | ')}`);
    }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
