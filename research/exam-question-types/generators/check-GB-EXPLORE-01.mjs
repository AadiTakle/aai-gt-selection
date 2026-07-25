// Independent validator for the GB-EXPLORE-01 structured bank.
//
// This checker does NOT import the generator and does NOT reuse its algorithm. It re-derives
// every key from the served world alone, with a deliberately different implementation:
//   * Dijkstra (binary-heap, unit edge weights) from home and from each landmark gives the
//     all-pairs travel costs and proves SOLVABILITY (every landmark reachable);
//   * a Held-Karp bitmask DP - not permutation enumeration - recomputes the minimum open
//     tour (home -> all landmarks) and closed tour (… -> home);
//   * the stored optimalPath / explorePath are then validated as legal walks that hit every
//     landmark at exactly the recomputed cost.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Born-synthetic + server/renderable split: content carries NO optimum / route, and
//      the move budget never equals the optimal exploration leg.
//   3. Key is COMPUTED: Held-Karp optimum == correctKey; 100% of worlds solvable; witness
//      walks legal; greedy (nearest-landmark) penalty as declared; budgets sufficient.
//   4. Difficulty is a float 1..20 with >=5 items per integer bin AND per +/-1 pt band.
//
// Run:  node research/exam-question-types/generators/check-GB-EXPLORE-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/GB-EXPLORE-01.jsonl');
const ALLOWED_BANDS = ['2-3', '4-5', '6-8'];
const MIN_PER_BAND = 5;

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round2 = (x) => Math.round(x * 100) / 100;
const key = (p) => p[0] + ',' + p[1];

// ---- minimal binary heap (so the search is a real Dijkstra, not the generator's BFS) ----
class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(node) {
    this.a.push(node);
    let i = this.a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (this.a[p][0] <= this.a[i][0]) break; [this.a[p], this.a[i]] = [this.a[i], this.a[p]]; i = p; }
  }
  pop() {
    const top = this.a[0], last = this.a.pop();
    if (this.a.length) {
      this.a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < this.a.length && this.a[l][0] < this.a[m][0]) m = l;
        if (r < this.a.length && this.a[r][0] < this.a[m][0]) m = r;
        if (m === i) break;
        [this.a[m], this.a[i]] = [this.a[i], this.a[m]]; i = m;
      }
    }
    return top;
  }
}

// Dijkstra over passable cells (unit weights). Returns Int32Array of costs, -1 if unreachable.
function dijkstra(R, C, blockedSet, src) {
  const cost = new Int32Array(R * C).fill(-1);
  const idx = (r, c) => r * C + c;
  const h = new Heap();
  h.push([0, idx(src[0], src[1])]);
  while (h.size) {
    const [d, cell] = h.pop();
    if (cost[cell] >= 0) continue;
    cost[cell] = d;
    const r = (cell / C) | 0, c = cell % C;
    const nb = [];
    if (r > 0) nb.push(idx(r - 1, c));
    if (r < R - 1) nb.push(idx(r + 1, c));
    if (c > 0) nb.push(idx(r, c - 1));
    if (c < C - 1) nb.push(idx(r, c + 1));
    for (const n of nb) {
      if (blockedSet.has(((n / C) | 0) + ',' + (n % C))) continue;
      if (cost[n] < 0) h.push([d + 1, n]);
    }
  }
  return cost;
}

// Held-Karp: minimum open tour (home -> all landmarks) and closed tour (… -> home).
function heldKarp(d, n) {
  // d[i][j] with index 0 = home, 1..n = landmarks.
  const FULL = (1 << n) - 1;
  const dp = Array.from({ length: 1 << n }, () => new Array(n).fill(Infinity));
  for (let i = 0; i < n; i++) dp[1 << i][i] = d[0][i + 1];
  for (let mask = 1; mask <= FULL; mask++) {
    for (let i = 0; i < n; i++) {
      if (!(mask & (1 << i)) || dp[mask][i] === Infinity) continue;
      for (let j = 0; j < n; j++) {
        if (mask & (1 << j)) continue;
        const nm = mask | (1 << j), cand = dp[mask][i] + d[i + 1][j + 1];
        if (cand < dp[nm][j]) dp[nm][j] = cand;
      }
    }
  }
  let open = Infinity, closed = Infinity;
  for (let i = 0; i < n; i++) {
    open = Math.min(open, dp[FULL][i]);
    closed = Math.min(closed, dp[FULL][i] + d[i + 1][0]);
  }
  return { open, closed };
}

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
  if (it.typeCode !== 'GB-EXPLORE-01') fail(id, `typeCode != GB-EXPLORE-01 (${it.typeCode})`);
  if (it.domain !== 'spatial') fail(id, `domain != spatial (${it.domain})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not float 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || it.ageBands.length === 0) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `bad ageBand (${it.ageBands})`);
  if (it.demoPath !== 'demos/GB-EXPLORE-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'computed_solver') fail(id, 'scoring.mode != computed_solver');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

  const c = it.content || {}, ans = it.answer || {};
  for (const leak of ['optimalTotalMoves', 'optimalExploreMoves', 'optimalPath', 'explorePath', 'optimalOrder', 'greedyExcess', 'answer', 'solution'])
    if (Object.prototype.hasOwnProperty.call(c, leak)) fail(id, `content leaks "${leak}"`);
  if (!c.grid || !isNum(c.grid.R) || !isNum(c.grid.C)) { fail(id, 'grid missing'); continue; }
  if (!Array.isArray(c.home) || !Array.isArray(c.landmarks) || c.landmarks.length === 0) { fail(id, 'home/landmarks missing'); continue; }
  if (!isNum(c.fogRadius) || c.fogRadius < 1) fail(id, `fogRadius must be >=1 (${c.fogRadius})`);
  if (!isNum(c.moveBudget) || !isNum(c.shortcutBudget)) fail(id, 'budgets missing');
  if (!Array.isArray(c.pointing) || c.pointing.length === 0) fail(id, 'pointing prompts missing');
  for (const pid of (c.pointing || [])) if (!c.landmarks.some((l) => l.id === pid)) fail(id, `pointing prompt ${pid} is not a landmark`);
  for (const l of c.landmarks) if (typeof l.label !== 'string' || !l.label.length) fail(id, `landmark ${l.id} has no on-screen text label`);
  if (!c.metricParams || !isNum(c.metricParams.planWindowMs)) fail(id, 'metricParams.planWindowMs missing');

  const { R, C } = c.grid;
  const blockedSet = new Set((c.blocked || []).map(key));
  if (blockedSet.has(key(c.home))) fail(id, 'home sits on a wall');

  // 3a. SOLVABILITY: every landmark reachable from home (Dijkstra, our own).
  const nodes = [c.home, ...c.landmarks.map((l) => [l.r, l.c])];
  const costs = nodes.map((n) => dijkstra(R, C, blockedSet, n));
  const at = (ci, node) => costs[ci][node[0] * C + node[1]];
  let unreachable = null;
  for (let i = 1; i < nodes.length; i++) if (at(0, nodes[i]) < 0) unreachable = c.landmarks[i - 1].id;
  if (unreachable) { fail(id, `world is UNSOLVABLE: landmark ${unreachable} is walled off from home`); continue; }
  solvable++;

  // 3b. Optimum via Held-Karp over the Dijkstra distance matrix.
  const n = c.landmarks.length;
  const d = nodes.map((_, i) => nodes.map((nd) => at(i, nd)));
  const hk = heldKarp(d, n);
  if (String(hk.closed) !== ans.correctKey) fail(id, `recomputed closed tour ${hk.closed} != correctKey ${ans.correctKey}`);
  if (hk.closed !== ans.optimalTotalMoves) fail(id, `recomputed closed tour ${hk.closed} != answer.optimalTotalMoves ${ans.optimalTotalMoves}`);
  if (hk.open !== ans.optimalExploreMoves) fail(id, `recomputed open tour ${hk.open} != answer.optimalExploreMoves ${ans.optimalExploreMoves}`);

  // 3c. Budgets must make the world completable without stating the optimum.
  if (!(c.moveBudget > hk.open)) fail(id, `moveBudget ${c.moveBudget} does not exceed the optimal exploration leg ${hk.open}`);
  let ecc = 0;
  for (let cell = 0; cell < R * C; cell++) if (costs[0][cell] > ecc) ecc = costs[0][cell];
  if (c.shortcutBudget < ecc) fail(id, `shortcutBudget ${c.shortcutBudget} < worst-case walk home ${ecc}`);

  // 3d. Greedy (nearest-landmark) route penalty, recomputed.
  let cur = 0, remaining = c.landmarks.map((_, i) => i + 1), greedy = 0;
  while (remaining.length) {
    let bi = 0, bd = Infinity;
    remaining.forEach((nd, i) => { if (d[cur][nd] < bd) { bd = d[cur][nd]; bi = i; } });
    greedy += bd; cur = remaining[bi]; remaining.splice(bi, 1);
  }
  greedy += d[cur][0];
  if (greedy !== ans.greedyClosedMoves) fail(id, `recomputed greedy tour ${greedy} != answer.greedyClosedMoves ${ans.greedyClosedMoves}`);
  if (greedy - hk.closed !== ans.greedyExcess) fail(id, `recomputed greedy excess ${greedy - hk.closed} != answer.greedyExcess ${ans.greedyExcess}`);

  // 3e. Witness walks: legal, landmark-covering, exactly optimal.
  const checkWalk = (path, wantMoves, mustEndHome, tag) => {
    if (!Array.isArray(path) || path.length !== wantMoves + 1) return `${tag}: length ${path && path.length} != ${wantMoves + 1}`;
    if (key(path[0]) !== key(c.home)) return `${tag}: does not start at home`;
    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      if (p[0] < 0 || p[0] >= R || p[1] < 0 || p[1] >= C) return `${tag}: cell ${i} off the world`;
      if (blockedSet.has(key(p))) return `${tag}: cell ${i} is a wall`;
      if (i > 0 && Math.abs(p[0] - path[i - 1][0]) + Math.abs(p[1] - path[i - 1][1]) !== 1) return `${tag}: step ${i} not 4-adjacent`;
    }
    const seen = new Set(path.map(key));
    for (const l of c.landmarks) if (!seen.has(l.r + ',' + l.c)) return `${tag}: landmark ${l.id} never reached`;
    if (mustEndHome && key(path[path.length - 1]) !== key(c.home)) return `${tag}: does not end at home`;
    return null;
  };
  const e1 = checkWalk(ans.optimalPath, hk.closed, true, 'optimalPath');
  const e2 = checkWalk(ans.explorePath, hk.open, false, 'explorePath');
  if (e1) fail(id, e1);
  if (e2) fail(id, e2);

  // 3f. answer metadata used by the server-side scorer.
  if (!ans.equivalence || ans.equivalence.rule !== 'any_minimal_tour') fail(id, 'answer.equivalence (accepted-equivalence rule) missing');
  if (typeof ans.bearingRule !== 'string' || !ans.bearingRule.length) fail(id, 'answer.bearingRule missing (M-VIEWANG not computable server-side)');
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
for (const dd of diffs) {
  const k = Math.round(dd);
  if (k >= 1 && k <= 20) binCounts[k - 1]++;
  for (let kk = 1; kk <= 20; kk++) if (Math.abs(dd - kk) <= 1.0) bandCounts[kk - 1]++;
}
binCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `integer bin k=${i + 1} has ${n} items (<${MIN_PER_BAND})`); });
bandCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `+/-1pt band around k=${i + 1} has ${n} items (<${MIN_PER_BAND})`); });

// ---- Report ----
console.log(`GB-EXPLORE-01 bank check: ${items.length} items`);
console.log(`solvability (independent Dijkstra reachability): ${solvable}/${items.length} = ${items.length ? round2(100 * solvable / items.length) : 0}%`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
if (failures.length) {
  console.error(`\nFAIL - ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS - parses, structure valid, 100% of worlds solvable, optimum re-derived by Dijkstra + Held-Karp equals the declared key, witness walks legal, budgets sufficient, coverage 1..20 with >=5 per bin and per +/-1pt band.');
