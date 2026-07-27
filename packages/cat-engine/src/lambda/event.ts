/**
 * D-019 AWS Lambda event/response contract for the pure exam scoring + replay
 * engine (E-072 deterministic-replay basis).
 *
 * These types are defined LOCALLY on purpose: the package adds NO
 * `@types/aws-lambda` / `aws-sdk` dependency, so the exact same payload shape
 * runs identically in local dev (`invoke-local.ts`) and, later, inside Lambda.
 * Everything the handler returns is born-synthetic (synthetic_only=true,
 * validated=false; D-006, R9); no live data flows through this unit.
 */

import type { ReplayInput, ReplayVerification } from '../replay';
import type { ScreeningResult } from '../types';

/** The three supported engine invocation modes. */
export type ScoringLambdaMode = 'score' | 'replay-verify' | 'replay-match';

/** The Lambda request payload. */
export interface ScoringLambdaEvent {
  /** Which engine operation to run. */
  mode: ScoringLambdaMode;
  /** Everything needed to reproduce a score bit-for-bit. */
  input: ReplayInput;
  /** Required for `replay-match`: the previously recorded fingerprint to check. */
  expectedFingerprint?: string;
}

/** `mode:'score'` success: the canonical result plus its stable fingerprint. */
export interface ScoreSuccess {
  ok: true;
  mode: 'score';
  result: ScreeningResult;
  fingerprint: string;
}

/** `mode:'replay-verify'` success: the two-run verification + shared fingerprint. */
export interface ReplayVerifySuccess {
  ok: true;
  mode: 'replay-verify';
  verification: ReplayVerification;
  fingerprint: string;
}

/** `mode:'replay-match'` success: whether the re-run reproduced the expected digest. */
export interface ReplayMatchSuccess {
  ok: true;
  mode: 'replay-match';
  matches: boolean;
}

/** Any failure: a deterministic, stack-free error string. */
export interface ScoringLambdaFailure {
  ok: false;
  error: string;
}

/**
 * The Lambda response. A discriminated union on `ok` + `mode`, so each success
 * variant statically carries exactly the fields that mode produces (a
 * type-safe realization of the D-019 `{ result?; fingerprint?; verification?;
 * matches? }` contract under `exactOptionalPropertyTypes`).
 */
export type ScoringLambdaResponse =
  | ScoreSuccess
  | ReplayVerifySuccess
  | ReplayMatchSuccess
  | ScoringLambdaFailure;
