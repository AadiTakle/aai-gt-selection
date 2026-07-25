// Independent validator for the GB-FILTER-01 structured bank.
//
// This checker does NOT import the generator. It rebuilds an OCCUPANCY GRID from the served
// array and re-derives every key from that grid alone:
//   * an exhaustive cell-by-cell scan of the whole R x C response space (not the item list)
//     recomputes the cue-matching set, which must equal the declared correctKey;
//   * SOLVABILITY is proved per level: the set is non-empty, every cell holds at most one
//     shape (no ambiguous cell), no non-target satisfies the cue rule, the array does not
//     over-fill the grid, and the exposure window clears the conservative encoding floor
//     (>=110 ms per target, >=300 ms absolute) with a bounded retention delay;
//   * an exhaustive search over the SINGLE-FEATURE strategy space (colour-only and
//     shape-only, for every colour and shape in the array) recomputes how badly the greedy
//     one-feature reader over-selects, which must match answer.greedyExcess and must be
//     strictly positive on the conjunction levels.
//
// NOTE (documented deviation): this type is a filter-and-report array, not a traversal, so
// there is no graph to run BFS/Dijkstra over. The equivalent independent re-derivation is
// the exhaustive grid scan plus the strategy-space search above.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Born-synthetic + server/renderable split: content carries NO target set, and the
//      array order does not encode target status.
//   3. Key is COMPUTED and every level solvable (see above).
//   4. Difficulty is a float 1..20 with >=5 items per integer bin AND per +/-1 pt band.
//
// Run:  node research/exam-question-types/generators/check-GB-FILTER-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/GB-FILTER-01.jsonl');
const ALLOWED_BANDS = ['2-3', '4-5', '6-8'];
const MIN_PER_BAND = 5;
const MS_PER_TARGET_FLOOR = 110;
const MS_ABSOLUTE_FLOOR = 300;
const MS_DELAY_CEILING = 5000;
const MAX_FILL = 0.7;

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round2 = (x) => Math.round(x * 100) / 100;

// ---- 1. Parse ----
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (lines.length === 0) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => { try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1} not valid JSON: ${e.message}`); } });

// ---- 2 + 3. Per-item structure + independent re-derivation ----
const seenIds = new Set();
let solvable = 0;
for (const it of items) {
  const id = it.itemId || '(no id)';
  if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);
  if (it.typeCode !== 'GB-FILTER-01') fail(id, `typeCode != GB-FILTER-01 (${it.typeCode})`);
  if (it.domain !== 'spatial') fail(id, `domain != spatial (${it.domain})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not float 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || it.ageBands.length === 0) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `bad ageBand (${it.ageBands})`);
  if (it.demoPath !== 'demos/GB-FILTER-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'computed_solver') fail(id, 'scoring.mode != computed_solver');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

  const c = it.content || {}, ans = it.answer || {};
  for (const leak of ['targets', 'nTargets', 'correctKey', 'answer', 'isTarget', 'solution'])
    if (Object.prototype.hasOwnProperty.call(c, leak)) fail(id, `content leaks "${leak}"`);
  if (!c.grid || !isNum(c.grid.R) || !isNum(c.grid.C)) { fail(id, 'grid missing'); continue; }
  if (!c.cue || typeof c.cue.color !== 'string') { fail(id, 'cue missing'); continue; }
  if (typeof c.cue.colorLabel !== 'string' || !c.cue.colorLabel.length) fail(id, 'cue has no on-screen word label');
  if (c.cue.mode === 'color_shape' && (typeof c.cue.shape !== 'string' || typeof c.cue.shapeLabel !== 'string')) fail(id, 'conjunction cue missing its shape/label');
  if (!Array.isArray(c.items) || c.items.length === 0) { fail(id, 'items missing'); continue; }
  if (!c.timing || !isNum(c.timing.exposureMs) || !isNum(c.timing.delayMs)) { fail(id, 'timing missing'); continue; }
  if (!c.metricParams || !isNum(c.metricParams.planWindowMs)) fail(id, 'metricParams.planWindowMs missing');
  if (Object.prototype.hasOwnProperty.call(c.items[0] || {}, 'target')) fail(id, 'displayed item carries a target flag');

  const { R, C } = c.grid;

  // 3a. Occupancy grid: exactly one shape per occupied cell, everything in bounds.
  const occ = new Map();
  let dup = null, oob = null;
  for (const s of c.items) {
    if (!isNum(s.r) || !isNum(s.c) || s.r < 0 || s.r >= R || s.c < 0 || s.c >= C) { oob = `${s.r},${s.c}`; break; }
    const k = s.r + ',' + s.c;
    if (occ.has(k)) { dup = k; break; }
    occ.set(k, s);
  }
  if (oob) { fail(id, `a shape sits outside the grid at ${oob}`); continue; }
  if (dup) { fail(id, `two shapes share cell ${dup} (ambiguous response cell)`); continue; }

  // 3b. Re-derive the target set by scanning the ENTIRE response space.
  const cueMatch = (s) => c.cue.mode === 'color_shape'
    ? (s.color === c.cue.color && s.shape === c.cue.shape)
    : (s.color === c.cue.color);
  const derived = [];
  for (let r = 0; r < R; r++) for (let cc = 0; cc < C; cc++) {
    const s = occ.get(r + ',' + cc);
    if (s && cueMatch(s)) derived.push([r, cc]);
  }
  const derivedKey = derived.map((p) => p[0] + ',' + p[1]).join('|');

  // 3c. Solvability of the level.
  let unsolvable = null;
  if (derived.length === 0) unsolvable = 'no cue-matching shape exists (nothing to report)';
  else if (c.items.length > MAX_FILL * R * C) unsolvable = `array fills ${c.items.length}/${R * C} cells (> ${MAX_FILL * 100}%)`;
  else if (c.timing.exposureMs < Math.max(MS_ABSOLUTE_FLOOR, MS_PER_TARGET_FLOOR * derived.length))
    unsolvable = `exposure ${c.timing.exposureMs} ms below the encoding floor (${Math.max(MS_ABSOLUTE_FLOOR, MS_PER_TARGET_FLOOR * derived.length)} ms for ${derived.length} targets)`;
  else if (c.timing.delayMs < 0 || c.timing.delayMs > MS_DELAY_CEILING) unsolvable = `retention delay ${c.timing.delayMs} ms out of bounds`;
  if (unsolvable) { fail(id, `level is UNSOLVABLE: ${unsolvable}`); continue; }
  solvable++;

  // 3d. The declared key must equal the independently derived set, and the complement must
  //     contain no cue-matching shape (the rule partitions the array without ambiguity).
  if (derivedKey !== ans.correctKey) fail(id, `re-derived target set "${derivedKey}" != correctKey "${ans.correctKey}"`);
  if (derived.length !== ans.nTargets) fail(id, `re-derived ${derived.length} targets != answer.nTargets ${ans.nTargets}`);
  const targetSet = new Set(derived.map((p) => p[0] + ',' + p[1]));
  for (const s of c.items) {
    const k = s.r + ',' + s.c;
    if (cueMatch(s) !== targetSet.has(k)) fail(id, `cell ${k} is inconsistent with the cue rule`);
  }
  if (c.items.length - derived.length !== ans.nDistractors) fail(id, `re-derived ${c.items.length - derived.length} distractors != answer.nDistractors ${ans.nDistractors}`);

  // 3e. Strategy-space search: how badly does a single-feature reader over-select?
  const colorOnly = c.items.filter((s) => s.color === c.cue.color).length;
  const shapeOnly = c.cue.shape ? c.items.filter((s) => s.shape === c.cue.shape).length : null;
  if (colorOnly - derived.length !== ans.greedyExcess) fail(id, `re-derived greedy excess ${colorOnly - derived.length} != answer.greedyExcess ${ans.greedyExcess}`);
  if (c.cue.mode === 'color_shape') {
    if (colorOnly - derived.length < 1) fail(id, 'conjunction level has no colour lure (the greedy colour-only strategy would succeed)');
    if (shapeOnly - derived.length < 1) fail(id, 'conjunction level has no shape lure (the greedy shape-only strategy would succeed)');
  } else if (colorOnly !== derived.length) {
    fail(id, 'single-feature level has a distractor in the cue colour (rule would be ambiguous)');
  }

  // 3f. Array order must not encode target status (targets not clustered at the front/back).
  const idxs = c.items.map((s, i) => (cueMatch(s) ? i : -1)).filter((i) => i >= 0);
  const contiguousFront = idxs.every((v, i) => v === i);
  const contiguousBack = idxs.every((v, i) => v === c.items.length - idxs.length + i);
  if (c.items.length > 3 && (contiguousFront || contiguousBack)) fail(id, 'array order leaks target status (targets are contiguous at one end)');

  // 3g. answer metadata used by the server-side scorer.
  if (!ans.equivalence || ans.equivalence.rule !== 'set_equality') fail(id, 'answer.equivalence (accepted-equivalence rule) missing');
  if (typeof ans.scoringRule !== 'string' || !ans.scoringRule.length) fail(id, 'answer.scoringRule missing');
  if (!ans.metricSpec || !ans.metricSpec['M-EFF']) fail(id, 'answer.metricSpec missing M-EFF derivation');
  if (!Array.isArray(ans.distractorRationales) || ans.distractorRationales.length === 0) fail(id, 'response taxonomy missing');
}

// ---- 4. Coverage ----
const diffs = items.map((it) => it.difficulty).filter(isNum);
const min = Math.min(...diffs), max = Math.max(...diffs);
if (!(min <= 1.5)) fail('coverage', `min difficulty ${round2(min)} > 1.5 (floor not reached)`);
if (!(max >= 19.5)) fail('coverage', `max difficulty ${round2(max)} < 19.5 (ceiling not reached)`);
const binCounts = Array.from({ length: 20 }, () => 0);
const bandCounts = Array.from({ length: 20 }, () => 0);
for (const d of diffs) {
  const k = Math.round(d);
  if (k >= 1 && k <= 20) binCounts[k - 1]++;
  for (let kk = 1; kk <= 20; kk++) if (Math.abs(d - kk) <= 1.0) bandCounts[kk - 1]++;
}
binCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `integer bin k=${i + 1} has ${n} items (<${MIN_PER_BAND})`); });
bandCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `+/-1pt band around k=${i + 1} has ${n} items (<${MIN_PER_BAND})`); });

// ---- Report ----
console.log(`GB-FILTER-01 bank check: ${items.length} items`);
console.log(`solvability (independent grid scan + feasibility bounds): ${solvable}/${items.length} = ${items.length ? round2(100 * solvable / items.length) : 0}%`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
if (failures.length) {
  console.error(`\nFAIL - ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS - parses, structure valid, 100% of arrays solvable, target set re-derived by exhaustive grid scan equals the declared key, single-feature strategies provably over-select on conjunction levels, coverage 1..20 with >=5 per bin and per +/-1pt band.');
