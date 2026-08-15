import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { num, setOverlap, type Verifier } from './types';

/**
 * Per-type verifiers for the quantitative domain, keyed by `typeCode`.
 *
 * Each entry grades a constructed response that no generic verifier can handle.
 * Re-derive the expected response from `item.content` plus `item.answer` where
 * possible, rather than trusting a stored key, and never show correctness to the
 * client beyond the boolean this returns.
 *
 * FILE OWNERSHIP, NOT DOMAIN: most of the entries below are game-based
 * (`GB-*`) types whose bank `domain` is spatial or verbal, not quantitative.
 * They live here purely so four verifier authors can work on disjoint files at
 * once. `verifiers/index.ts` merges every domain file into one `typeCode`
 * lookup, so which file an entry sits in has no effect on resolution — only the
 * key does. A duplicate `typeCode` across two domain files IS a bug.
 *
 * Every verifier here follows the same three rules:
 *   1. Re-derive or re-simulate. Where the child submits a constructed artefact
 *      (a turtle program, a tile layout, a ladder), correctness is decided by
 *      replaying that artefact against `content`, never by trusting a count,
 *      flag or digest the client computed for itself.
 *   2. `correct` means "solved it". Several banks ship an optimum for
 *      efficiency; a legal-but-wasteful solution is still correct, and the
 *      waste is reported as `M-EFF` (optimum / actual, capped at 1). The only
 *      exceptions are the types whose bank states a threshold for full credit
 *      (GB-WORDFORGE-01, whose threshold is now net of the declared non-word
 *      penalty) or an exact key (GB-TRACK-01, QUANT-MIX-01).
 *   3. Never throw. Malformed input returns `{ correct: false }`.
 */

// ---------------------------------------------------------------------------
// untrusted-JSON readers
// ---------------------------------------------------------------------------

function obj(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function arr(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function int(value: unknown): number | null {
  const n = num(value);
  return n !== null && Number.isInteger(n) ? n : null;
}

/** A `[row, col]` pair out of untrusted JSON, or null when it is not one. */
function cell(value: unknown): [number, number] | null {
  const pair = arr(value);
  if (!pair || pair.length < 2) return null;
  const r = int(pair[0]);
  const c = int(pair[1]);
  return r === null || c === null ? null : [r, c];
}

function cellList(value: unknown): [number, number][] | null {
  const list = arr(value);
  if (!list) return null;
  const out: [number, number][] = [];
  for (const entry of list) {
    const p = cell(entry);
    if (!p) return null;
    out.push(p);
  }
  return out;
}

const key = (r: number, c: number): string => `${r},${c}`;

function gridOf(content: Record<string, unknown>): { R: number; C: number } | null {
  const grid = obj(content.grid);
  if (!grid) return null;
  const R = int(grid.R);
  const C = int(grid.C);
  return R === null || C === null || R < 1 || C < 1 ? null : { R, C };
}

/** `optimum / actual`, capped at 1 — the shared M-EFF shape across these banks. */
function efficiency(optimum: number | null, actual: number | null): number | null {
  if (optimum === null || actual === null || optimum <= 0) return null;
  return optimum / Math.max(actual, optimum);
}

// ---------------------------------------------------------------------------
// server-only child lexicon (GB-WORDLADDER-01, GB-WORDFORGE-01)
// ---------------------------------------------------------------------------

/**
 * The 4k-word curated child lexicon that GB-WORDLADDER-01 and GB-WORDFORGE-01
 * are defined against
 * (`research/exam-question-types/generators/lexicon-child-en.mjs`).
 *
 * It is read off disk at first use rather than imported or inlined so it can
 * never reach a client bundle: shipping it would let the browser decide whether
 * a rung is a real word, which is exactly the judgement the ladder measures.
 * `bank-loader.ts` reads the banks the same way, and like the banks this is only
 * ever reached from the Node-runtime submit route.
 *
 * The parse mirrors the source module's own curation rules: `RAW[length][band]`
 * holds space-separated words, a `-no` suffix marks a token rejected during
 * curation, a token whose length disagrees with its bucket is dropped, and the
 * highest (most common) band wins on a duplicate.
 */
const LEXICON_FROM_REPO_ROOT = path.join(
  process.cwd(),
  'research',
  'exam-question-types',
  'generators',
  'lexicon-child-en.mjs',
);
const LEXICON_FROM_APP = path.join(
  process.cwd(),
  '..',
  '..',
  'research',
  'exam-question-types',
  'generators',
  'lexicon-child-en.mjs',
);
/**
 * Literal segments, resolved once at module scope, for the same reason `bank-loader.ts` does it:
 * a path the build tracer cannot fold makes it glob the enclosing directory instead, and the
 * `...LEXICON_RELATIVE` spread this replaced was one of the two reasons a standalone build swept
 * in the whole repository. `next.config.ts` declares this file alongside the banks.
 */
const LEXICON_FILE = existsSync(LEXICON_FROM_REPO_ROOT) ? LEXICON_FROM_REPO_ROOT : LEXICON_FROM_APP;

let lexiconCache: Map<string, number> | null = null;
let lexiconTried = false;

function parseLexicon(source: string): Map<string, number> {
  const words = new Map<string, number>();
  const start = source.indexOf('const RAW = {');
  if (start < 0) return words;
  const end = source.indexOf('\n};', start);
  const body = source.slice(start, end < 0 ? source.length : end);

  // `3: {` opens a length bucket; `7: '...'` is that bucket's band-7 word blob.
  const entry = /(\d+)\s*:\s*(\{|'([^']*)')/g;
  let length = 0;
  for (let m = entry.exec(body); m !== null; m = entry.exec(body)) {
    const label = Number(m[1]);
    if (m[2] === '{') {
      length = label;
      continue;
    }
    if (length === 0) continue;
    for (const token of (m[3] ?? '').split(/\s+/)) {
      if (!token || token.endsWith('-no')) continue;
      const word = token.toUpperCase();
      if (!/^[A-Z]+$/.test(word) || word.length !== length) continue;
      const previous = words.get(word);
      if (previous === undefined || label > previous) words.set(word, label);
    }
  }
  return words;
}

/** Word -> vocabulary band 1..7, or null when the lexicon cannot be read. */
export function childLexicon(): Map<string, number> | null {
  if (lexiconTried) return lexiconCache;
  lexiconTried = true;
  try {
    const parsed = parseLexicon(readFileSync(LEXICON_FILE, 'utf8'));
    lexiconCache = parsed.size > 0 ? parsed : null;
  } catch {
    lexiconCache = null; // a missing lexicon must fail closed, never throw
  }
  return lexiconCache;
}

/**
 * A lexicon band as `M-VOCABLVL`: 1 for a child who stayed on the commonest
 * words, 7 for one who reached the rarest.
 *
 * The two scales run opposite ways and the metric's is the one that has to win
 * here. `lexicon-child-en@v1` counts DOWN in rarity (band 7 = earliest and most
 * frequent, band 1 = above-level), while `M-VOCABLVL` is declared as a lexical
 * CEILING that counts up: "ascending difficulty band (higher = rarer mastered)"
 * in `@gt-selection/exam-scoring`'s metric registry, `direction: 'higher'` over
 * 1..8 in `DEFAULT_EXAM_POLICY`, and — in GB-WORDFORGE-01's own answer key —
 * "a valid word at vocabulary band <= 3 (raises M-VOCABLVL)". Reporting the raw
 * band scored a child who reached a rare word as if they had the shallowest
 * vocabulary in the room.
 *
 * The bands themselves are provisional design estimates, not a corpus
 * measurement (RES-012 / RES-013), so this is a ranked signal and not a
 * calibrated frequency.
 */
function vocabCeiling(rarestBand: number): number {
  return 8 - rarestBand;
}

// ---------------------------------------------------------------------------
// GB-ROBOPATH-01 — execute the submitted turtle program
// ---------------------------------------------------------------------------

const HEADINGS = ['N', 'E', 'S', 'W'] as const;
const STEP: Record<string, readonly [number, number]> = {
  N: [-1, 0],
  E: [0, 1],
  S: [1, 0],
  W: [0, -1],
};
const TURTLE_COMMANDS = new Set(['F', 'L', 'R']);

/** `[{cmd,reps}]` flattened to primitive actions; null when a token is illegal. */
function expandProgram(value: unknown, maxReps: number): string[] | null {
  const tokens = arr(value);
  if (!tokens) return null;
  const out: string[] = [];
  for (const token of tokens) {
    const t = obj(token);
    if (!t) return null;
    const cmd = str(t.cmd);
    const reps = int(t.reps);
    if (cmd === null || !TURTLE_COMMANDS.has(cmd)) return null;
    if (reps === null || reps < 1 || reps > maxReps) return null;
    for (let i = 0; i < reps; i++) out.push(cmd);
  }
  return out;
}

function actionSequence(value: unknown): string[] | null {
  const list = arr(value);
  if (!list) return null;
  const out: string[] = [];
  for (const entry of list) {
    const cmd = str(entry);
    if (cmd === null || !TURTLE_COMMANDS.has(cmd)) return null;
    out.push(cmd);
  }
  return out;
}

/**
 * GB-ROBOPATH-01. The child composes a program; the server RUNS it.
 *
 * Per `answer.acceptedEquivalence`, a submission is correct iff its expanded
 * action sequence never bumps a wall or the grid edge, steps on every key, and
 * stops on the door — `answer.cost.actions` is the optimum for efficiency, not
 * the key, and `content.limits.maxProgramTokens` (= 4*R*C) is the renderer's
 * program-length budget, also not the key.
 */
const verifyRobopath: Verifier = (item, response) => {
  const content = item.content;
  const grid = gridOf(content);
  const start = obj(content.start);
  const door = cell(content.door);
  const walls = cellList(content.walls ?? []);
  const keys = cellList(content.keys ?? []);
  if (!grid || !start || !door || !walls || !keys) return { correct: false };

  const startR = int(start.r);
  const startC = int(start.c);
  const startH = str(start.h);
  if (startR === null || startC === null || startH === null) return { correct: false };
  let heading = HEADINGS.indexOf(startH as (typeof HEADINGS)[number]);
  if (heading < 0) return { correct: false };

  const instructionSet = obj(content.instructionSet);
  const repeat = instructionSet ? obj(instructionSet.repeat) : null;
  const maxReps = repeat ? (int(repeat.maxReps) ?? 1) : 1;
  const limits = obj(content.limits);
  const maxTokens = limits ? int(limits.maxProgramTokens) : null;

  const program = arr(response.program);
  const sequence = program ? expandProgram(program, maxReps) : actionSequence(response.actionSeq);
  if (!sequence) return { correct: false };
  if (program && maxTokens !== null && program.length > maxTokens) return { correct: false };

  const blocked = new Set(walls.map(([r, c]) => key(r, c)));
  const uncollected = new Set(keys.map(([r, c]) => key(r, c)));
  let r = startR;
  let c = startC;
  uncollected.delete(key(r, c));

  for (const cmd of sequence) {
    if (cmd === 'F') {
      const step = STEP[HEADINGS[heading] as string];
      if (!step) return { correct: false };
      const nr = r + step[0];
      const nc = c + step[1];
      // A bump aborts the run — the child's plan did not survive execution.
      if (nr < 0 || nr >= grid.R || nc < 0 || nc >= grid.C) return { correct: false };
      if (blocked.has(key(nr, nc))) return { correct: false };
      r = nr;
      c = nc;
      uncollected.delete(key(r, c));
    } else {
      heading = cmd === 'R' ? (heading + 1) % 4 : (heading + 3) % 4;
    }
  }

  const solved = uncollected.size === 0 && r === door[0] && c === door[1];
  const cost = obj(item.answer.cost);
  const eff = efficiency(cost ? int(cost.actions) : null, sequence.length);
  return eff === null ? { correct: solved } : { correct: solved, metrics: { 'M-EFF': eff } };
};

// ---------------------------------------------------------------------------
// GB-EXPLORE-01 — replay the walk
// ---------------------------------------------------------------------------

const EXPLORE_MOVE_KINDS = new Set(['move', 'landmark_found', 'shortcut_move']);

/** Smaller of the two ways round a compass, in degrees. */
function circularDelta(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360) + 360) % 360;
  return Math.min(d, 360 - d);
}

/**
 * Mean absolute pointing error, per `answer.bearingRule`: the true bearing of a
 * landmark from the cell the child stood on is `atan2(dc, -dr)` in degrees
 * clockwise from north, and M-VIEWANG is the mean circular difference between
 * that and the raw dial angle. The renderer never scores its own angles — it
 * emits `pointings` and the server does this.
 */
function pointingError(
  pointings: unknown,
  landmarkAt: Map<string, [number, number]>,
): number | null {
  const list = arr(pointings);
  if (!list || list.length === 0) return null;
  let total = 0;
  let counted = 0;
  for (const entry of list) {
    const pointing = obj(entry);
    const id = pointing ? str(pointing.landmarkId) : null;
    const stand = pointing ? cell(pointing.standCell) : null;
    const angle = pointing ? num(pointing.angleDeg) : null;
    const target = id === null ? undefined : landmarkAt.get(id);
    if (!stand || angle === null || !target) continue;
    const bearing =
      ((((Math.atan2(target[1] - stand[1], -(target[0] - stand[0])) * 180) / Math.PI) % 360) +
        360) %
      360;
    total += circularDelta(angle, bearing);
    counted++;
  }
  return counted === 0 ? null : total / counted;
}

/**
 * GB-EXPLORE-01. Correct iff the child stood on every landmark and finished
 * back at home, re-derived by replaying `response.actions` step by step (each
 * step must be 4-adjacent, in bounds and unblocked) rather than by trusting the
 * renderer's `landmarksFound` / `reachedHome` flags.
 *
 * No budget bounds correctness. `content.moveBudget` bounds
 * `answer.optimalExploreMoves` (the outbound leg), NOT `optimalTotalMoves`
 * (the closed tour) — verified true on 120/120 bank items — so comparing total
 * travel against `moveBudget` would fail children who legitimately walked home.
 * The optimum only feeds M-EFF.
 */
const verifyExplore: Verifier = (item, response) => {
  const content = item.content;
  const grid = gridOf(content);
  const home = cell(content.home);
  const blockedCells = cellList(content.blocked ?? []);
  const landmarks = arr(content.landmarks);
  if (!grid || !home || !blockedCells || !landmarks || landmarks.length === 0) {
    return { correct: false };
  }

  const landmarkKeys: string[] = [];
  const landmarkAt = new Map<string, [number, number]>();
  for (const entry of landmarks) {
    const landmark = obj(entry);
    const r = landmark ? int(landmark.r) : null;
    const c = landmark ? int(landmark.c) : null;
    if (r === null || c === null) return { correct: false };
    landmarkKeys.push(key(r, c));
    const id = str(landmark?.id);
    if (id !== null) landmarkAt.set(id, [r, c]);
  }

  const blocked = new Set(blockedCells.map(([r, c]) => key(r, c)));
  const visited = new Set<string>([key(home[0], home[1])]);
  let at: [number, number] = [home[0], home[1]];
  let moves = 0;

  const actions = arr(response.actions);
  if (actions) {
    for (const entry of actions) {
      const action = obj(entry);
      if (!action) return { correct: false };
      const kind = str(action.kind);
      if (kind === null || !EXPLORE_MOVE_KINDS.has(kind)) continue; // blocked tries, pointings
      const to = cell(action.to) ?? cell(action.cell);
      if (!to) return { correct: false };
      if (to[0] < 0 || to[0] >= grid.R || to[1] < 0 || to[1] >= grid.C) return { correct: false };
      if (blocked.has(key(to[0], to[1]))) return { correct: false };
      if (Math.abs(to[0] - at[0]) + Math.abs(to[1] - at[1]) !== 1) return { correct: false };
      at = to;
      visited.add(key(at[0], at[1]));
      moves++;
    }
  } else {
    // No action log: fall back to the reported trail, still re-deriving the
    // verdict from cells rather than from the renderer's own booleans.
    const trail = arr(response.cellsVisited);
    const endCell = cell(response.endCell);
    if (!trail || !endCell) return { correct: false };
    for (const entry of trail) {
      const k = str(entry) ?? (cell(entry) ? key(...(cell(entry) as [number, number])) : null);
      if (k === null) return { correct: false };
      visited.add(k);
    }
    at = endCell;
    const cost = obj(response.cost);
    moves = cost ? (int(cost.actual) ?? 0) : 0;
  }

  const solved =
    landmarkKeys.every((k) => visited.has(k)) && at[0] === home[0] && at[1] === home[1];

  const metrics: Record<string, number> = {};
  const eff = efficiency(int(item.answer.optimalTotalMoves), moves);
  if (eff !== null) metrics['M-EFF'] = eff;
  const viewAngle = pointingError(response.pointings, landmarkAt);
  if (viewAngle !== null) metrics['M-VIEWANG'] = viewAngle;
  return Object.keys(metrics).length > 0 ? { correct: solved, metrics } : { correct: solved };
};

// ---------------------------------------------------------------------------
// GB-TRACK-01 — replay the motion script
// ---------------------------------------------------------------------------

/**
 * GB-TRACK-01. The final target set is re-derived here by applying each
 * `content.motion.phases[i].swaps` to `content.initialTargets` as one
 * simultaneous permutation; the child is correct iff the submitted jar set
 * equals it. The client's own `motionDigest` is never consulted.
 *
 * This type is knowingly computable from the stimulus alone (recorded as
 * E-075); grading it is still the server's job, and it is graded here.
 */
const verifyTrack: Verifier = (item, response) => {
  const content = item.content;
  const jarCount = int(content.jarCount);
  const motion = obj(content.motion);
  const phases = motion ? arr(motion.phases) : null;
  const initialTargets = arr(content.initialTargets);
  if (jarCount === null || jarCount < 2 || !phases || !initialTargets) return { correct: false };

  const jarInSlot: number[] = Array.from({ length: jarCount }, (_, slot) => slot);
  for (const entry of phases) {
    const phase = obj(entry);
    const swaps = phase ? arr(phase.swaps) : null;
    if (!swaps) return { correct: false };
    const next = jarInSlot.slice();
    for (const swapEntry of swaps) {
      const pair = cell(swapEntry);
      if (!pair) return { correct: false };
      const [a, b] = pair;
      if (a < 0 || a >= jarCount || b < 0 || b >= jarCount) return { correct: false };
      next[a] = jarInSlot[b] as number;
      next[b] = jarInSlot[a] as number;
    }
    for (let slot = 0; slot < jarCount; slot++) jarInSlot[slot] = next[slot] as number;
  }

  const slotOfJar = new Array<number>(jarCount).fill(-1);
  for (let slot = 0; slot < jarCount; slot++) slotOfJar[jarInSlot[slot] as number] = slot;

  const finalSlots: number[] = [];
  for (const entry of initialTargets) {
    const jar = int(entry);
    if (jar === null || jar < 0 || jar >= jarCount) return { correct: false };
    const slot = slotOfJar[jar] as number;
    if (slot < 0) return { correct: false };
    finalSlots.push(slot);
  }
  finalSlots.sort((a, b) => a - b);

  const submitted = arr(response.selectedSlots);
  if (!submitted) return { correct: false };
  const chosen: number[] = [];
  for (const entry of submitted) {
    const slot = int(entry);
    if (slot === null) return { correct: false };
    if (!chosen.includes(slot)) chosen.push(slot);
  }
  chosen.sort((a, b) => a - b);

  const correct =
    chosen.length === finalSlots.length && chosen.every((slot, i) => slot === finalSlots[i]);

  const metrics: Record<string, number> = {
    // scoring.partialCredit = true: how much of the target set survived tracking.
    'M-PROG': setOverlap(finalSlots, chosen),
  };
  const cost = obj(item.answer.cost);
  const eff = efficiency(cost ? int(cost.taps) : null, int(response.taps));
  if (eff !== null) metrics['M-EFF'] = eff;
  return { correct, metrics };
};

// ---------------------------------------------------------------------------
// GB-WORDLADDER-01 — walk the submitted ladder
// ---------------------------------------------------------------------------

/**
 * GB-WORDLADDER-01. Correct iff the submitted ladder is legal: it starts at
 * `content.start`, ends at `content.goal`, every rung is a lexicon word of the
 * item's length, and each consecutive pair differs in exactly one position.
 *
 * The bank's credit table is full at `optimalRungs`, PARTIAL (not zero) for a
 * longer legal ladder, and zero only for an illegal step, a non-word rung or a
 * ladder that never reaches the goal — so a long legal climb is `correct` with
 * `M-EFF = optimalRungs / submittedRungs`.
 *
 * WORD RARITY. A ladder through uncommon words is more evidence than the same
 * climb through the commonest ones, so `M-VOCABLVL` reports the rarest band the
 * child's own rungs reached, on the metric's ascending scale (`vocabCeiling`).
 * Two boundaries make it a bonus rather than a second verdict: it is computed
 * AFTER legality, so it can never turn an illegal ladder into a legal one, and
 * it is bounded to the 1..7 the lexicon's bands span. The start word is served,
 * so it is excluded — its rarity is a property of the item, not of the child.
 */
const verifyWordladder: Verifier = (item, response) => {
  const lexicon = childLexicon();
  if (!lexicon) return { correct: false }; // no lexicon => cannot judge a rung; fail closed

  const content = item.content;
  const start = str(content.start);
  const goal = str(content.goal);
  const wordLength = int(content.wordLength);
  const stepLimit = int(content.stepLimit);
  if (start === null || goal === null || wordLength === null) return { correct: false };

  const submitted = arr(response.path);
  if (!submitted || submitted.length < 2) return { correct: false };
  const ladder: string[] = [];
  for (const entry of submitted) {
    const word = str(entry);
    if (word === null) return { correct: false };
    ladder.push(word.toUpperCase());
  }

  const rungs = ladder.length - 1;
  if (stepLimit !== null && rungs > stepLimit) return { correct: false };
  if (ladder[0] !== start.toUpperCase()) return { correct: false };
  if (ladder[rungs] !== goal.toUpperCase()) return { correct: false };

  let rarestTypedBand = 7;
  for (let i = 0; i < ladder.length; i++) {
    const word = ladder[i] as string;
    if (word.length !== wordLength) return { correct: false };
    const band = lexicon.get(word);
    if (band === undefined) return { correct: false };
    if (i === 0) continue;
    if (band < rarestTypedBand) rarestTypedBand = band;
    const previous = ladder[i - 1] as string;
    let changed = 0;
    for (let k = 0; k < wordLength; k++) if (previous[k] !== word[k]) changed++;
    if (changed !== 1) return { correct: false };
  }

  const metrics: Record<string, number> = { 'M-VOCABLVL': vocabCeiling(rarestTypedBand) };
  const eff = efficiency(int(item.answer.optimalRungs), rungs);
  if (eff !== null) metrics['M-EFF'] = eff;
  return { correct: true, metrics };
};

// ---------------------------------------------------------------------------
// GB-WORDFORGE-01 — credit every forgeable word, less the declared non-word cost
// ---------------------------------------------------------------------------

/**
 * What one distinct made-up word costs, counted in credited words.
 *
 * HALF, not one. The lexicon is a curated 4k child list rather than a
 * dictionary, so a real word its curation never took in is indistinguishable
 * here from an invented one; at 1:1 that curation gap would cost a child a word
 * they genuinely knew. At a half, two junk entries still cancel one real word,
 * which is enough that typing letters at random cannot pay, while a single
 * near-miss on a word the child believed in costs them less than the word they
 * got right.
 *
 * The number is only defensible because the child is TOLD it before they play:
 * the demo's play gate states that made-up words take points off. An
 * unannounced penalty measures whether a child guessed the rules rather than
 * what words they know.
 */
const WORDFORGE_NONWORD_COST = 0.5;

/**
 * GB-WORDFORGE-01. `answer.validWords` is the exact set of lexicon words the
 * rack affords, enumerated when the bank was built: a submission is credited iff
 * it is in that set (case-insensitively), and repeats score once.
 *
 * The bank's credit table makes full credit a THRESHOLD — credited words >=
 * `answer.referenceTarget` — with the ratio as partial credit, so unlike the
 * search types `correct` here is not merely "produced one word". The threshold
 * and the ratio are now met NET of the non-word penalty.
 *
 * WHICH UNCREDITED ENTRIES ARE PENALISED. Only the ones that are not words at
 * all, which is the only thing the child was warned about. A real word that
 * broke a rule — shorter than `content.minWordLength`, or not spellable from the
 * rack — earns nothing and costs nothing, because it is a rule slip rather than
 * the "randomly inputting words" behaviour the penalty exists to price. Telling
 * those two apart needs the lexicon, so this is the second type that reads it;
 * if it cannot be read there is NO penalty, since a file the server failed to
 * open must not take points off a child.
 *
 * The score stays monotone and bounded. Every real word adds 1 and every junk
 * entry subtracts a half, so submitting only real words can never score below
 * submitting nothing, and the net is floored at 0 — the same floor the bank's
 * credit table already allows ("no credited word forged") — so no barrage of
 * junk can push a child below it.
 */
const verifyWordforge: Verifier = (item, response) => {
  const entries = arr(item.answer.validWords);
  if (!entries) return { correct: false };
  const bandOf = new Map<string, number>();
  for (const entry of entries) {
    const valid = obj(entry);
    const word = valid ? str(valid.word) : null;
    if (word === null) continue;
    bandOf.set(word.toUpperCase(), (valid ? int(valid.band) : null) ?? 0);
  }

  const submissions = arr(response.submissions);
  if (!submissions) return { correct: false };

  const lexicon = childLexicon();
  const credited = new Set<string>();
  const nonwords = new Set<string>();
  for (const entry of submissions) {
    const word = str(entry) ?? str(obj(entry)?.word);
    if (word === null || word.length === 0) continue;
    const normalised = word.toUpperCase();
    if (bandOf.has(normalised)) credited.add(normalised);
    else if (lexicon && !lexicon.has(normalised)) nonwords.add(normalised);
  }

  let rarestBand = 0;
  for (const word of credited) {
    const band = bandOf.get(word) ?? 0;
    if (rarestBand === 0 || (band > 0 && band < rarestBand)) rarestBand = band;
  }

  const netCredit = Math.max(0, credited.size - WORDFORGE_NONWORD_COST * nonwords.size);
  const judged = credited.size + nonwords.size;
  const target = int(item.answer.referenceTarget);
  const metrics: Record<string, number> = { 'M-IDEAFLU': credited.size };
  if (rarestBand > 0) metrics['M-VOCABLVL'] = vocabCeiling(rarestBand);
  // The share of judged entries that were real words: the bank declares
  // M-ERRTYPE for this type, and this is the signal that separates a child
  // reaching for words from one typing letters. Absent when nothing was judged,
  // rather than a free 1 for an abandoned round.
  if (judged > 0) metrics['M-ERRTYPE'] = credited.size / judged;
  if (target !== null && target > 0) metrics['M-EFF'] = Math.min(1, netCredit / target);
  return { correct: target !== null && netCredit >= target, metrics };
};

// ---------------------------------------------------------------------------
// QUANT-MIX-01 — ratio equivalence under the served constraint
// ---------------------------------------------------------------------------

/**
 * QUANT-MIX-01 (`scoring.rule = ratio_equivalence_with_constraint`). Straight
 * from the bank's own scoring description: correct iff
 * `counts.A * targetBowl.B === counts.B * targetBowl.A` with both counts > 0
 * AND the served constraint holds (`given_row`: the locked row still equals the
 * served amount; `fixed_total`: the two counts sum to the capacity).
 *
 * The generator's checker proves exactly one reachable mixture satisfies both,
 * so re-deriving the rule is equivalent to matching `answer.correctCounts`
 * while staying independent of the stored key. `M-PAE` is the continuous
 * concentration error, 0 for an equivalent mix.
 */
const verifyQuantMix: Verifier = (item, response) => {
  const content = item.content;
  const targetBowl = obj(content.targetBowl);
  const workBowl = obj(content.workBowl);
  const constraint = obj(content.constraint);
  const limits = obj(content.limits);
  if (!targetBowl || !workBowl || !constraint) return { correct: false };

  const targetA = int(targetBowl.A);
  const targetB = int(targetBowl.B);
  if (targetA === null || targetB === null || targetA + targetB <= 0) return { correct: false };

  const counts = obj(response.counts);
  const a = counts ? int(counts.A) : null;
  const b = counts ? int(counts.B) : null;
  if (a === null || b === null || a < 0 || b < 0) return { correct: false };

  const cap = limits ? int(limits.maxPerIngredient) : null;
  if (cap !== null && (a > cap || b > cap)) return { correct: false };

  const pae = a + b > 0 ? Math.abs(a / (a + b) - targetA / (targetA + targetB)) : 1;
  const metrics = { 'M-PAE': pae };

  let constraintHolds = false;
  const kind = str(constraint.kind);
  if (kind === 'given_row') {
    const row = str(constraint.row);
    const served = row === null ? null : int(workBowl[row]);
    const submitted = row === 'A' ? a : row === 'B' ? b : null;
    constraintHolds = served !== null && submitted !== null && submitted === served;
  } else if (kind === 'fixed_total') {
    const total = int(constraint.total);
    constraintHolds = total !== null && a + b === total;
  }

  const equivalent = a > 0 && b > 0 && a * targetB === b * targetA;
  return { correct: equivalent && constraintHolds, metrics };
};

// ---------------------------------------------------------------------------

export const quantitativeVerifiers: Record<string, Verifier> = {
  'GB-EXPLORE-01': verifyExplore,
  'GB-ROBOPATH-01': verifyRobopath,
  'GB-TRACK-01': verifyTrack,
  'GB-WORDFORGE-01': verifyWordforge,
  'GB-WORDLADDER-01': verifyWordladder,
  'QUANT-MIX-01': verifyQuantMix,
};
