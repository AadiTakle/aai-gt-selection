/**
 * Differential harness: does the database grade a response the same way the app tier does?
 *
 * For every served question type it takes real bank items, builds three responses per item —
 * the one a correct taker would give (derived from the server-only answer key), a wrong one,
 * and a skipped one — and runs each through BOTH verifiers:
 *
 *   * `verify()` from `apps/web/src/lib/exam/verifiers` (the app tier's per-type verifiers);
 *   * `app.exam_verify_response()` in the local database (the plpgsql port, D-027).
 *
 * The two must return the same `correct` verdict, and the same metric map wherever the app
 * tier emits one. Continuous metrics are compared to a tolerance rather than exactly: both
 * sides compute in IEEE-754 binary64 in the same order, but `Math.hypot`, `Math.atan2` and
 * `**` are implementation-defined at the last unit in the last place, so an exact comparison
 * would be asserting something neither language guarantees. `correct` is compared exactly.
 *
 * Every type is reported, and a type whose per-type verifier has NOT been ported yet is
 * reported as PENDING rather than passing quietly — coverage is meant to be visibly partial
 * while the port is in progress and complete when it finishes.
 *
 * Run it with `pnpm exam:verify:diff` against a running local Supabase. It writes nothing:
 * the bank items it needs are inserted inside a transaction that is always rolled back.
 *
 * Born-synthetic throughout: every bank item already carries `syntheticOnly=true`,
 * `validated=false`, and every response here is generated, never observed.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { Client } from 'pg';

import type { RawBankItem } from '../src/lib/exam/bank-loader';
import { EXAM_TYPE_REGISTRY } from '../src/lib/exam/registry.generated';
import { perTypeVerifiers, verify, type Verdict } from '../src/lib/exam/verifiers/index';

/** Absolute tolerance for a continuous metric. See the header on why this is not zero. */
const METRIC_EPSILON = 1e-9;

/** Bank items sampled per type, spread evenly across the file so difficulty varies. */
const DEFAULT_ITEMS_PER_TYPE = 12;

type Domain = RawBankItem['domain'];

interface Case {
  caseId: string;
  typeCode: string;
  itemId: string;
  kind: 'correct' | 'wrong' | 'skipped';
  raw: Record<string, unknown>;
  expected: Verdict;
}

interface TypeReport {
  typeCode: string;
  domain: Domain;
  appVerifier: string;
  dbVerifier: string;
  status: 'PORTED' | 'PENDING' | 'GENERIC';
  cases: number;
  agree: number;
  /** Cases BOTH sides called correct. Anti-vacuity: agreement on all-false proves nothing. */
  bothCorrect: number;
  metricMismatches: number;
  examples: string[];
}

/* ------------------------------------------------------------------ *
 * repo layout
 * ------------------------------------------------------------------ */

function repoRoot(): string {
  let dir = process.cwd();
  for (let depth = 0; depth < 8; depth++) {
    if (existsSync(path.join(dir, 'research', 'exam-question-types', 'banks'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('verifier-differential: could not locate research/exam-question-types/banks.');
}

const ROOT = repoRoot();
const BANKS_DIR = path.join(ROOT, 'research', 'exam-question-types', 'banks');
/**
 * Scrambled-system control arms, which are deliberately NOT in the served directory.
 *
 * A Stage 2 learning-block type is generated in two equated arms and only the `consistent` one is
 * ever administered — but U7's acceptance is that the two tiers agree "on every item x response
 * across BOTH banks" (STAGE2_QUESTION_DESIGN §9.2). The point of that is not coverage for its own
 * sake: §4.1.1 requires one verifier to serve both arms, and the only way to show a verifier has no
 * arm branch is to run it on both. Reading a bank here serves nothing to anybody.
 */
const CONTROL_BANKS_DIR = path.join(ROOT, 'research', 'exam-question-types', 'control-banks');
const NOT_SERVABLE = path.join(ROOT, 'research', 'exam-question-types', 'qa', 'NOT_SERVABLE.json');

/**
 * Type codes that have a bank but must never be treated as served. `loadRealBanks()` in
 * `packages/exam-engine` wires all 66 catalog types including these, which is why this harness
 * drives the generated registry instead and asserts the two do not overlap.
 */
function blockedTypeCodes(): Set<string> {
  const parsed = JSON.parse(readFileSync(NOT_SERVABLE, 'utf8')) as {
    blocked?: { typeCode?: unknown }[];
  };
  const blocked = new Set<string>();
  for (const entry of parsed.blocked ?? []) {
    if (typeof entry.typeCode === 'string') blocked.add(entry.typeCode);
  }
  return blocked;
}

function readBankFile(file: string): RawBankItem[] {
  if (!existsSync(file)) return [];
  const items: RawBankItem[] = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      items.push(JSON.parse(trimmed) as RawBankItem);
    } catch {
      continue;
    }
  }
  return items;
}

/** One bank a type is graded over: the served one, plus any control arm it was generated with. */
interface BankArm {
  /** Row label — the bare type code for the served arm, `<CODE> (perTrial)` for a control arm. */
  label: string;
  items: RawBankItem[];
}

function loadArms(typeCode: string): BankArm[] {
  const arms: BankArm[] = [
    { label: typeCode, items: readBankFile(path.join(BANKS_DIR, `${typeCode}.jsonl`)) },
  ];
  if (!existsSync(CONTROL_BANKS_DIR)) return arms;
  for (const file of readdirSync(CONTROL_BANKS_DIR).sort()) {
    if (!file.startsWith(`${typeCode}.`) || !file.endsWith('.jsonl')) continue;
    const arm = file.slice(typeCode.length + 1, -'.jsonl'.length);
    arms.push({
      label: `${typeCode} (${arm})`,
      items: readBankFile(path.join(CONTROL_BANKS_DIR, file)),
    });
  }
  return arms;
}

/** Evenly spaced sample, so the slice spans the bank's difficulty ladder deterministically. */
function sample<T>(items: readonly T[], count: number): T[] {
  if (items.length <= count) return [...items];
  const step = items.length / count;
  const out: T[] = [];
  for (let i = 0; i < count; i++) {
    const picked = items[Math.floor(i * step)];
    if (picked !== undefined) out.push(picked);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * response builders
 *
 * A "correct" response is derived from the item's SERVER-ONLY answer block, which is exactly
 * what a taker who solved the item would submit. A "wrong" one perturbs it minimally, so the
 * two verifiers are compared on a near miss rather than on garbage.
 * ------------------------------------------------------------------ */

type Responses = { correct: Record<string, unknown>; wrong: Record<string, unknown> };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function keyedResponses(item: RawBankItem): Responses {
  const key = item.answer?.correctKey;
  if (typeof key === 'number') {
    return { correct: { selectedIndex: key }, wrong: { selectedIndex: key + 1 } };
  }
  return {
    correct: { selectedKey: String(key ?? '') },
    wrong: { selectedKey: `${String(key ?? '')}~not-the-key` },
  };
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function numbers(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is number => typeof entry === 'number')
    : [];
}

const PER_TYPE_RESPONSES: Record<string, (item: RawBankItem) => Responses> = {
  'FLU-CONCEPT-01': (item) => {
    const verdicts = Array.isArray(item.answer.probeVerdicts) ? item.answer.probeVerdicts : [];
    const answers = verdicts.map((entry) => {
      const record = asRecord(entry) ?? {};
      return { key: record.key, opens: record.opens === true };
    });
    // The child's own gate tests, so M-HYP (hypothesis-space elimination) is exercised too.
    const oracle = Array.isArray(item.content.gateOracle) ? item.content.gateOracle : [];
    const tests = oracle.slice(0, 3).map((entry) => ({ figure: (asRecord(entry) ?? {}).figure }));
    return {
      correct: { probeAnswers: answers, tests },
      wrong: {
        probeAnswers: answers.map((a) => ({ key: a.key, opens: !a.opens })),
        tests,
      },
    };
  },
  'FLU-OPCHAIN-01': (item) => {
    const key = String(item.answer.correctKey ?? '');
    // The NEAREST wrong option, chosen off the bank's own strategy trace rather than by picking
    // whatever sits next in the list: `order_error` is "applied two badges the other way round",
    // the miss a child who has the vocabulary but not the composition rule actually makes. It is
    // also the top of the M-ERRTYPE nearness axis, so this case exercises the branch of the port
    // that a random wrong option would leave at the floor.
    const trace = asRecord(item.answer.strategyTrace) ?? {};
    const nearness: Record<string, number> = {
      order_error: 1,
      over_application: 0.85,
      omission: 0.7,
      wrong_operator: 0.55,
      first_step_only: 0.25,
      identity_copy: 0,
    };
    let wrongKey = '';
    let best = -1;
    for (const [optionKey, entry] of Object.entries(trace)) {
      if (optionKey === key) continue;
      const kind = String((asRecord(entry) ?? {}).kind ?? '');
      const score = nearness[kind] ?? -1;
      if (score > best) {
        best = score;
        wrongKey = optionKey;
      }
    }
    return {
      correct: { selectedKey: key },
      wrong: { selectedKey: wrongKey || `${key}~no` },
    };
  },
  'FLU-DEDUCE-01': (item) => {
    // Built from `answer.distractorRationales[key].cluesViolated`, so the trace is independent
    // of the content-only derivation both verifiers run — a real cross-check, not a tautology.
    const rationales = asRecord(item.answer.distractorRationales) ?? {};
    const violatedBy = new Map<string, Set<string>>();
    for (const [key, entry] of Object.entries(rationales)) {
      const clues = list((asRecord(entry) ?? {}).cluesViolated).map(String);
      violatedBy.set(key, new Set(clues));
    }
    const seen = new Set<string>();
    const steps = list(item.content.clues).map((raw) => {
      const clueId = String((asRecord(raw) ?? {}).clueId ?? '');
      for (const [key, clues] of violatedBy) if (clues.has(clueId)) seen.add(key);
      return { clueId, eliminated: [...seen] };
    });
    const last = steps.at(-1);
    return {
      correct: { steps },
      // One suspect left standing at the end: the commonest real near miss.
      wrong: {
        steps: steps.map((step) =>
          step === last ? { ...step, eliminated: step.eliminated.slice(0, -1) } : step,
        ),
      },
    };
  },
  'VER-EVIDENCE-01': (item) => {
    const [answerKey = '', evidenceKey = ''] = String(item.answer.correctKey).split('+');
    return {
      // A wrong option with the right sentence: the weighted-partial-credit path, which is
      // the whole reason this type carries a two-part key.
      correct: { answerKey, evidenceKey },
      wrong: { answerKey: `${answerKey}~no`, evidenceKey },
    };
  },
  'QUANT-MIX-01': (item) => {
    const counts = asRecord(item.answer.correctCounts) ?? {};
    const a = typeof counts.A === 'number' ? counts.A : 0;
    const b = typeof counts.B === 'number' ? counts.B : 0;
    return { correct: { counts: { A: a, B: b } }, wrong: { counts: { A: a, B: b + 1 } } };
  },
  'SPA-XPLANE-01': (item) => {
    const plane = asRecord(item.answer.correctPlane) ?? {};
    const h = typeof plane.h === 'number' ? plane.h : 0;
    return {
      correct: { plane },
      // Same angle of cut, a different height: the bank's own `cut_too_low`/`cut_too_high`
      // near-miss family, not a malformed response.
      wrong: { plane: { ...plane, h: h >= 50 ? h - 40 : h + 40 } },
    };
  },
  'SPA-VIEW-01': (item) => {
    const heading = item.answer.correctHeadingDeg;
    if (item.content.optionKind === 'heading_dial' || typeof heading === 'number') {
      const target = typeof heading === 'number' ? heading : 0;
      const tolerance = typeof item.answer.toleranceDeg === 'number' ? item.answer.toleranceDeg : 0;
      return {
        correct: { headingDeg: target },
        // Half a turn past the target and outside the band. It also drives the dial across
        // the +/-180 seam, so the circular comparison is what the two sides must agree on.
        wrong: { headingDeg: target + 180 + tolerance + 1 },
      };
    }
    const key = String(item.answer.correctKey ?? '');
    const mirror = item.answer.mirrorFoilKey;
    return {
      correct: { selectedKey: key },
      // The station that sees the strip exactly reversed, where the bank names one: the
      // case M-MIRRORFA exists to report.
      wrong: { selectedKey: typeof mirror === 'string' ? mirror : `${key}~no` },
    };
  },
  'SPA-HIDDENCUBE-01': (item) => {
    const total =
      typeof item.answer.correctCount === 'number'
        ? item.answer.correctCount
        : Number(item.answer.correctKey);
    const view = asRecord(item.content.view) ?? {};
    const yaw = typeof view.yawDeg === 'number' ? view.yawDeg : 0;
    return {
      correct: { count: total, finalYawDeg: yaw },
      wrong: { count: total - 1, finalYawDeg: yaw },
    };
  },
  'WM-corsi-01': (item) => {
    const expected = numbers(item.answer.expectedSequence);
    return {
      correct: { tappedCells: expected, tapCount: expected.length },
      // The trail replayed in the other direction: the bank's own `direction_error` lure.
      wrong: { tappedCells: [...expected].reverse(), tapCount: expected.length },
    };
  },
  'WM-bind-01': (item) => {
    const bindings = asRecord(item.answer.bindings) ?? {};
    const ids = Object.keys(bindings);
    const swapped: Record<string, unknown> = { ...bindings };
    if (ids.length >= 2) {
      // The confusable-pair swap: both houses were held, the association was not, so
      // M-POLY has to report partial credit rather than zero.
      swapped[ids[0]!] = bindings[ids[1]!];
      swapped[ids[1]!] = bindings[ids[0]!];
    } else if (ids.length === 1) {
      swapped[ids[0]!] = -1;
    }
    return { correct: { placements: bindings }, wrong: { placements: swapped } };
  },
  'WM-bubble-01': (item) => {
    // `answer.correctKey` is the target steps per channel, "w:2,7|s:3". The verifier
    // re-derives them from the stream instead, so driving the response off the key keeps the
    // two sides independent.
    const content = item.content as {
      streamLength?: unknown;
      n?: unknown;
      channels?: unknown;
    };
    const streamLength = typeof content.streamLength === 'number' ? content.streamLength : 0;
    const n = typeof content.n === 'number' ? content.n : 0;
    const targetSteps = new Map<string, Set<number>>();
    for (const part of String(item.answer.correctKey ?? '').split('|')) {
      const [channel, steps] = part.split(':');
      if (!channel) continue;
      const set = targetSteps.get(channel) ?? new Set<number>();
      for (const step of (steps ?? '').split(',')) {
        const stepIndex = Number(step);
        if (Number.isInteger(stepIndex)) set.add(stepIndex);
      }
      targetSteps.set(channel, set);
    }
    // One seen/new answer per lane per decidable bubble, in presentation order, plus the
    // "seen" steps reduced to the `pops` shape the plpgsql port still reads.
    const judgements: { channel: string; stepIndex: number; choice: 'seen' | 'new' }[] = [];
    for (const entry of list(content.channels)) {
      const channel = (asRecord(entry) ?? {}).id;
      if (typeof channel !== 'string') continue;
      const targets = targetSteps.get(channel) ?? new Set<number>();
      for (let stepIndex = n; stepIndex < streamLength; stepIndex++) {
        judgements.push({ channel, stepIndex, choice: targets.has(stepIndex) ? 'seen' : 'new' });
      }
    }
    const pops = (
      answers: { channel: string; stepIndex: number; choice: 'seen' | 'new' }[],
    ): { channel: string; stepIndex: number }[] =>
      answers
        .filter((j) => j.choice === 'seen')
        .map((j) => ({ channel: j.channel, stepIndex: j.stepIndex }));
    // One target called "new": the hit rate falls, the false-alarm rate does not.
    const missedIndex = judgements.findIndex((j) => j.choice === 'seen');
    const missed = judgements.map((j, i) =>
      i === missedIndex ? { ...j, choice: 'new' as const } : j,
    );
    return {
      correct: {
        judgements,
        pops: pops(judgements),
        stepsShown: streamLength,
        completed: true,
      },
      wrong: { judgements: missed, pops: pops(missed), stepsShown: streamLength, completed: true },
    };
  },
  'CX-check-01': (item) => {
    const trueBin = asRecord(item.answer.trueBin) ?? {};
    const binKeys = list(item.content.bins)
      .map((entry) => (asRecord(entry) ?? {}).key)
      .filter((k): k is string => typeof k === 'string');
    // Move the tile the sorter planted a slip on into a third place: still wrong, and it
    // drives M-ERRTYPE's "caught" count to zero rather than leaving it at one.
    const slipped = asRecord(list(item.answer.plantedErrors)[0]) ?? {};
    const target = typeof slipped.tokenId === 'string' ? slipped.tokenId : Object.keys(trueBin)[0];
    const wrong = { ...trueBin };
    if (target !== undefined) {
      const other = binKeys.find((k) => k !== trueBin[target]);
      if (other !== undefined) wrong[target] = other;
    }
    return { correct: { finalPlacement: trueBin }, wrong: { finalPlacement: wrong } };
  },
  'VER-SENSE-01': (item) => {
    const order = String(item.answer.correctKey)
      .split(',')
      .map((part) => Number(part));
    // One adjacent pair swapped: the bank's `near_order` foil, which is also the response
    // that separates adjacent-pair credit from positional overlap.
    const wrong = [...order];
    if (wrong.length >= 2) [wrong[0], wrong[1]] = [wrong[1] as number, wrong[0] as number];
    return { correct: { order }, wrong: { order: wrong } };
  },
  'GB-WORDFORGE-01': (item) => {
    const words = list(item.answer.validWords)
      .map((entry) => (asRecord(entry) ?? {}).word)
      .filter((w): w is string => typeof w === 'string');
    const target =
      typeof item.answer.referenceTarget === 'number' ? item.answer.referenceTarget : 0;
    return {
      correct: { submissions: words },
      // One word short of the threshold plus a nonword: full credit is a threshold here, so
      // this is the case that proves the port is not just checking "produced a word".
      wrong: { submissions: [...words.slice(0, Math.max(0, target - 1)), 'ZZZQX'] },
    };
  },
  'GB-TRACK-01': (item) => {
    const canonical = asRecord(item.answer.canonicalSolution) ?? {};
    const slots = list(canonical.targetSlots).filter((s): s is number => typeof s === 'number');
    const jarCount = typeof item.content.jarCount === 'number' ? item.content.jarCount : 0;
    const decoy = [...Array(jarCount).keys()].find((slot) => !slots.includes(slot));
    return {
      correct: { selectedSlots: slots, taps: slots.length },
      // The bank's `start_position_error` shape: one target dropped, one never-lit jar added,
      // which keeps M-PROG partial instead of zero.
      wrong: {
        selectedSlots: decoy === undefined ? slots.slice(1) : [...slots.slice(1), decoy],
        taps: slots.length + 1,
      },
    };
  },
  'SPA-SCENE-01': (item) => {
    const order = list(item.answer.correctOrder).filter((v): v is number => typeof v === 'number');
    const nearestId = item.answer.nearestId;
    return {
      // The egocentric left-right reversal is the foil every item ships, and it is the only
      // wrong answer that lights M-MIRRORFA.
      correct: { order, nearestId },
      wrong: { order: [...order].reverse(), nearestId },
    };
  },
  'SPA-MAZE-01': (item) => {
    const path = list(item.answer.optimalPath);
    return {
      correct: { path },
      // Stops one cell short of the goal: an `incomplete` route, still a legal walk, so the
      // port has to reject it on the goal test rather than on a malformed-input guard.
      wrong: { path: path.slice(0, Math.max(1, path.length - 1)) },
    };
  },
  'GB-ROBOPATH-01': (item) => {
    const canonical = asRecord(item.answer.canonicalSolution) ?? {};
    const program = list(canonical.program);
    return {
      correct: { program },
      // One step too many: either it bumps (the run aborts with NO metrics) or it overshoots
      // the door (wrong, with M-EFF). Both asymmetries have to survive the port.
      wrong: { program: [...program, { cmd: 'F', reps: 1 }] },
    };
  },
  'GB-EXPLORE-01': (item) => {
    const path = list(item.answer.optimalPath);
    const actions = path.slice(1).map((to) => ({ kind: 'move', to }));
    const home = list(item.content.home);
    const pointings = list(item.content.landmarks).map((entry) => ({
      landmarkId: (asRecord(entry) ?? {}).id,
      standCell: home,
      // A raw dial angle, not the true bearing: M-VIEWANG is a circular mean error, so a
      // non-zero one is what actually exercises the atan2 parity the inventory flags.
      angleDeg: 12.5,
    }));
    return {
      correct: { actions, pointings },
      wrong: { actions: actions.slice(0, Math.max(0, actions.length - 1)), pointings },
    };
  },

  'FLU-GRIDCOPY-01': (item) => {
    const target = (item.answer.targetGrid as number[][] | undefined) ?? [];
    return {
      correct: { finalGrid: target },
      // One cell of the derived target flipped, so the search still has to run and M-POLY
      // lands just short of 1 rather than at 0.
      wrong: {
        finalGrid: target.map((row, r) =>
          row.map((value, c) => (r === 0 && c === 0 ? (value === 0 ? 1 : 0) : value)),
        ),
      },
    };
  },

  'SPA-PUNCH-01': (item) => {
    const cells = (item.answer.trueCells as { x: number; y: number }[] | undefined) ?? [];
    return {
      correct: { markedCells: cells.map((cell) => [cell.x, cell.y]) },
      // The pattern reflected in the leading diagonal: the chirality slip the type reports as
      // M-MIRRORFA, so the mirror branch is exercised rather than only the overlap.
      wrong: { markedCells: cells.map((cell) => [cell.y, cell.x]) },
    };
  },

  'SPA-TANGRAM-01': (item) => {
    const solution = (item.answer.referenceSolution as unknown[] | undefined) ?? [];
    return {
      // A legal-but-incomplete cover: still inside the outline, still non-overlapping, so
      // the verdict turns on coverage and M-POLY reports how much was covered.
      correct: { placements: solution },
      wrong: { placements: solution.slice(0, -1) },
    };
  },

  'SPA-PIPES-01': (item) => {
    const clockwise: Record<string, string> = { N: 'E', E: 'S', S: 'W', W: 'N' };
    const orients =
      (item.answer.solutionOrients as { r: number; c: number; dirs: string[] }[] | undefined) ?? [];
    return {
      correct: { finalOrients: orients },
      // One tile turned one quarter too far: a legal rotation of the served tile that breaks
      // the road, so the rotation check passes and the flood decides.
      wrong: {
        finalOrients: orients.map((tile, i) =>
          i === 0 ? { ...tile, dirs: tile.dirs.map((d) => clockwise[d] ?? d) } : tile,
        ),
      },
    };
  },

  'GB-WORDLADDER-01': (item) => {
    const path = (item.answer.optimalPath as string[] | undefined) ?? [];
    return {
      correct: { path },
      // The goal word climbed twice: start and goal still land, every rung is still a word,
      // and the last step changes no letter at all.
      wrong: { path: [...path, path[path.length - 1] ?? ''] },
    };
  },
};

function responsesFor(item: RawBankItem): Responses {
  const builder = PER_TYPE_RESPONSES[item.typeCode];
  if (builder) return builder(item);
  switch (item.scoring?.rule) {
    case 'placement_tolerance': {
      const target = Number(item.answer.targetRatio ?? 0);
      const tolerance = Number(item.answer.tolerance ?? 0);
      return {
        correct: { placedRatio: target },
        wrong: { placedRatio: target + tolerance * 10 + 1 },
      };
    }
    case 'constructed_value_equals_optimum': {
      const optimal =
        typeof item.answer.optimalValue === 'number'
          ? item.answer.optimalValue
          : Number(item.answer.correctKey);
      return { correct: { value: optimal }, wrong: { value: optimal + 1 } };
    }
    default:
      return keyedResponses(item);
  }
}

/* ------------------------------------------------------------------ *
 * verdict comparison
 * ------------------------------------------------------------------ */

interface DbVerdict {
  correct: boolean;
  score: number;
  mode: string;
  metrics: Record<string, number>;
  verifier: string;
}

function metricsDiffer(expected: Record<string, number> | undefined, got: Record<string, number>) {
  const want = expected ?? {};
  const wantKeys = Object.keys(want).sort();
  const gotKeys = Object.keys(got).sort();
  if (wantKeys.join(',') !== gotKeys.join(',')) {
    return `metric keys [${gotKeys.join(' ')}] != [${wantKeys.join(' ')}]`;
  }
  for (const key of wantKeys) {
    const a = want[key] as number;
    const b = got[key] as number;
    if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a - b) > METRIC_EPSILON) {
      return `${key} ${b} != ${a}`;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * database side
 * ------------------------------------------------------------------ */

function localDatabaseUrl(): string {
  const fromEnv = process.env.EXAM_DIFF_DB_URL ?? process.env.SUPABASE_DB_URL;
  if (fromEnv) return fromEnv;
  const status = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  // pnpm and the CLI both write advisory lines to stdout ahead of the payload, and some of
  // them contain braces, so the field is read directly rather than by parsing the whole blob.
  const found = /"DB_URL"\s*:\s*"([^"]+)"/.exec(status);
  if (!found?.[1]) {
    throw new Error('verifier-differential: `supabase status -o json` reported no DB_URL.');
  }
  return found[1];
}

/** Refuse to touch anything but a loopback database — this inserts bank rows. */
function assertLocal(url: string): void {
  const host = new URL(url).hostname;
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    throw new Error(`verifier-differential refuses a non-loopback database (${host}).`);
  }
}

async function main(): Promise<void> {
  const itemsPerType = Number(
    process.argv.find((a) => a.startsWith('--items='))?.slice('--items='.length) ??
      DEFAULT_ITEMS_PER_TYPE,
  );
  // `--baseline` runs the identical cases through the DEMOTED app.exam_score_response, which
  // is what the database used to answer with. It is how the size of the defect D-027 closes
  // gets measured rather than asserted.
  const baseline = process.argv.includes('--baseline');
  const dbFunction = baseline ? 'app.exam_score_response' : 'app.exam_verify_response';

  const blocked = blockedTypeCodes();
  const served = EXAM_TYPE_REGISTRY.filter((entry) => !blocked.has(entry.typeCode));
  const wronglyServed = EXAM_TYPE_REGISTRY.filter((entry) => blocked.has(entry.typeCode));
  if (wronglyServed.length > 0) {
    throw new Error(
      `blocked types are in the served registry: ${wronglyServed.map((e) => e.typeCode).join(', ')}`,
    );
  }

  const url = localDatabaseUrl();
  assertLocal(url);
  const client = new Client({ connectionString: url });
  await client.connect();

  // Which per-type verifiers the database actually has. Everything else falls through to the
  // generic chain, which is exactly what makes an unported type visible as PENDING.
  const ported = new Set<string>(
    (
      await client.query<{ type_code: string }>('select type_code from app.exam_verifier_registry')
    ).rows.map((row) => row.type_code),
  );

  const reports: TypeReport[] = [];
  let failures = 0;

  await client.query('begin');
  try {
    for (const entry of served) {
      for (const arm of loadArms(entry.typeCode)) {
        const bank = sample(arm.items, itemsPerType);
        const hasPerType = entry.typeCode in perTypeVerifiers;
        const status: TypeReport['status'] = !hasPerType
          ? 'GENERIC'
          : ported.has(entry.typeCode)
            ? 'PORTED'
            : 'PENDING';

        const report: TypeReport = {
          typeCode: arm.label,
          domain: entry.domain as Domain,
          appVerifier: hasPerType ? 'per_type' : entry.verifier,
          dbVerifier: '-',
          status,
          cases: 0,
          agree: 0,
          bothCorrect: 0,
          metricMismatches: 0,
          examples: [],
        };
        reports.push(report);
        if (bank.length === 0) continue;

        // Register the type and the sampled items exactly as api.exam_register_item would.
        await client.query(
          `insert into app.exam_question_type (type_code, domain, name, demo_path, metric_ids)
         values ($1, $2, $1, $1 || '.html', '{}'::text[])
         on conflict (type_code) do nothing`,
          [entry.typeCode, entry.domain],
        );
        await client.query(
          `insert into app.exam_item (
           item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
         )
         select
           (i ->> 'itemId')::uuid, $1, $2, (i ->> 'difficulty')::numeric,
           coalesce((select array_agg(b) from jsonb_array_elements_text(i -> 'ageBands') b), '{4-5}'::text[]),
           coalesce(i -> 'content', '{}'::jsonb),
           coalesce(i -> 'answer', '{}'::jsonb),
           case when jsonb_typeof(i -> 'scoring') = 'object' then i -> 'scoring' else '{}'::jsonb end,
           case when jsonb_typeof(i -> 'provenance') = 'object' then i -> 'provenance' else '{}'::jsonb end
         from jsonb_array_elements($3::jsonb) i
         on conflict (item_id) do nothing`,
          [entry.typeCode, entry.domain, JSON.stringify(bank)],
        );

        const cases: Case[] = [];
        for (const item of bank) {
          const { correct, wrong } = responsesFor(item);
          cases.push({
            caseId: `${item.itemId}:correct`,
            typeCode: item.typeCode,
            itemId: item.itemId,
            kind: 'correct',
            raw: correct,
            expected: verify(item, correct),
          });
          cases.push({
            caseId: `${item.itemId}:wrong`,
            typeCode: item.typeCode,
            itemId: item.itemId,
            kind: 'wrong',
            raw: wrong,
            expected: verify(item, wrong),
          });
          // `/api/exam-submit` short-circuits `verify()` on a skip and drops the verdict's
          // metrics, then persists the raw answer with `skipped: true`. Driving the CORRECT
          // body with that flag proves the database does not credit an abandoned item.
          cases.push({
            caseId: `${item.itemId}:skipped`,
            typeCode: item.typeCode,
            itemId: item.itemId,
            kind: 'skipped',
            raw: { ...correct, skipped: true },
            expected: { correct: false },
          });
        }

        const { rows } = await client.query<{ case_id: string; verdict: DbVerdict }>(
          `select c.case_id, ${dbFunction}(c.item_id, c.raw) as verdict
         from jsonb_to_recordset($1::jsonb) as c(case_id text, item_id uuid, raw jsonb)`,
          [
            JSON.stringify(
              cases.map((c) => ({ case_id: c.caseId, item_id: c.itemId, raw: c.raw })),
            ),
          ],
        );
        const byCase = new Map(rows.map((row) => [row.case_id, row.verdict]));

        for (const testCase of cases) {
          const got = byCase.get(testCase.caseId);
          if (!got) throw new Error(`no database verdict for ${testCase.caseId}`);
          if (report.dbVerifier === '-') report.dbVerifier = got.verifier ?? 'exam_score_response';
          report.cases += 1;

          const verdictAgrees = got.correct === testCase.expected.correct;
          if (verdictAgrees && got.correct) report.bothCorrect += 1;
          // Metrics are only compared where the app tier is the authority the port must match:
          // an unported type is graded by a different verifier on each side by construction.
          const metricProblem =
            baseline || status === 'PENDING' || testCase.kind === 'skipped'
              ? null
              : metricsDiffer(testCase.expected.metrics, got.metrics ?? {});

          if (verdictAgrees && metricProblem === null) {
            report.agree += 1;
          } else {
            if (metricProblem !== null && verdictAgrees) report.metricMismatches += 1;
            if (report.examples.length < 2) {
              report.examples.push(
                `${testCase.kind} ${testCase.itemId.slice(0, 8)}: ` +
                  (verdictAgrees
                    ? (metricProblem ?? '')
                    : `correct ${got.correct} != ${testCase.expected.correct}`),
              );
            }
          }
        }

        if (!baseline && status !== 'PENDING' && report.agree !== report.cases) failures += 1;
      }
    }
  } finally {
    await client.query('rollback');
    await client.end();
  }

  printReport(reports, itemsPerType, ported, dbFunction);
  process.exitCode = failures > 0 ? 1 : 0;
}

function printReport(
  reports: TypeReport[],
  itemsPerType: number,
  ported: Set<string>,
  dbFunction: string,
): void {
  const pad = (value: string, width: number) => value.padEnd(width);
  const padStart = (value: string | number, width: number) => String(value).padStart(width);

  console.log('');
  console.log(`TypeScript verifier vs ${dbFunction}`);
  console.log(
    `${reports.length} bank arms across ${new Set(reports.map((r) => r.typeCode.split(' ')[0])).size} ` +
      `served types - up to ${itemsPerType} bank items each - ` +
      `3 responses per item (correct / wrong / skipped)`,
  );
  console.log('');
  console.log(
    `${pad('TYPE', 20)}${pad('DOMAIN', 17)}${pad('APP', 20)}${pad('DATABASE', 32)}` +
      `${pad('STATUS', 9)}${padStart('CASES', 6)}${padStart('AGREE', 7)}${padStart('BOTH-OK', 9)}` +
      `${padStart('METRIC!', 8)}`,
  );
  console.log('-'.repeat(128));

  for (const report of [...reports].sort(
    (a, b) => a.domain.localeCompare(b.domain) || a.typeCode.localeCompare(b.typeCode),
  )) {
    const flag =
      report.status === 'PENDING' ? 'PENDING' : report.agree === report.cases ? 'ok' : 'FAIL';
    console.log(
      `${pad(report.typeCode, 20)}${pad(report.domain, 17)}${pad(report.appVerifier, 20)}` +
        `${pad(report.dbVerifier, 32)}${pad(flag, 9)}${padStart(report.cases, 6)}` +
        `${padStart(report.agree, 7)}${padStart(report.bothCorrect, 9)}` +
        `${padStart(report.metricMismatches, 8)}`,
    );
    for (const example of report.examples) console.log(`${' '.repeat(20)}  ${example}`);
  }

  const perType = reports.filter((r) => r.status !== 'GENERIC');
  const portedCount = new Set(
    perType.filter((r) => r.status === 'PORTED').map((r) => r.typeCode.split(' ')[0]),
  ).size;
  const generic = reports.filter((r) => r.status === 'GENERIC');
  const failing = reports.filter((r) => r.status !== 'PENDING' && r.agree !== r.cases);
  const pendingAgreement = perType
    .filter((r) => r.status === 'PENDING')
    .reduce((sum, r) => sum + r.agree, 0);
  const pendingCases = perType
    .filter((r) => r.status === 'PENDING')
    .reduce((sum, r) => sum + r.cases, 0);

  const portedReports = perType.filter((r) => r.status === 'PORTED');
  const total = (rs: TypeReport[], pick: (r: TypeReport) => number) =>
    rs.reduce((sum, r) => sum + pick(r), 0);

  console.log('-'.repeat(128));
  const perTypeCodes = new Set(perType.map((r) => r.typeCode.split(' ')[0]));
  console.log(
    `per-type verifiers ported: ${portedCount}/${perTypeCodes.size} served ` +
      `(${portedCount + 1}/${String(perTypeCodes.size + 1)} including the blocked CX-achieve-02)`,
  );
  console.log(
    `generic verifiers: ${generic.length} types, ` +
      `${total(generic, (r) => r.agree)}/${total(generic, (r) => r.cases)} cases agree, ` +
      `${total(generic, (r) => r.bothCorrect)} of them scored correct on both sides`,
  );
  console.log(
    `ported per-type: ${total(portedReports, (r) => r.agree)}/` +
      `${total(portedReports, (r) => r.cases)} cases agree, ` +
      `${total(portedReports, (r) => r.bothCorrect)} of them scored correct on both sides`,
  );
  console.log(
    `PENDING (database still falls back to the keyed default): ` +
      `${pendingAgreement}/${pendingCases} cases happen to agree`,
  );
  console.log(
    `WHOLE RUN: ${total(reports, (r) => r.agree)}/${total(reports, (r) => r.cases)} cases agree ` +
      `across all ${reports.length} bank arms`,
  );
  console.log(
    failing.length === 0
      ? 'RESULT: every ported and generic type agrees.'
      : `RESULT: ${failing.length} type(s) DISAGREE: ${failing.map((r) => r.typeCode).join(', ')}`,
  );
  console.log(`registry rows: ${[...ported].sort().join(', ')}`);
  console.log('');
}

await main();
