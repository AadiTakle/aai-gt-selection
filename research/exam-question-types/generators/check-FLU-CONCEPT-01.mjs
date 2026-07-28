// Independent validator for the FLU-CONCEPT-01 structured bank.
//
// The rule semantics, the hypothesis-space search and the difficulty arithmetic are
// RE-IMPLEMENTED here from the documented model rather than imported, so a bug in
// the generator cannot validate itself. The key is re-derived FROM THE CONTENT
// ALONE: the checker searches the hypothesis space for every rule consistent with
// the gate's accept-set over the buildable palette and confirms they all classify
// the three probes exactly as `correctKey` says. The generator is imported only to
// prove each item is byte-reproducible from its own provenance.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Key containment: content states no rule and no probe verdict — every probe
//      lies OUTSIDE the buildable palette, so no probe appears in the gate oracle.
//   3. Identifiability + key: the oracle determines one verdict string for the three
//      probes, and it equals correctKey.
//   4. Fair budget: maxTests is at least the independently computed number of
//      well-chosen tests needed to decide the probes.
//   5. Difficulty equals the value independently re-derived from the item's levers,
//      and the item regenerates byte-identically from its provenance.
//   6. Coverage: spans 1..20 with >=5 items per integer bin AND per +/-1 pt band.
//
// Run:  node research/exam-question-types/generators/check-FLU-CONCEPT-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { genItem } from './FLU-CONCEPT-01.mjs';
import { lureLabel, normalizeBankItem } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/FLU-CONCEPT-01.jsonl');
const ALLOWED_BANDS = ['2-3', '4-5', '6-8']; // this type excludes K-1 by design
const ALLOWED_LURES = ['over_general', 'over_specific', 'feature_swap', 'inverted_rule', 'inconsistent_with_evidence'];
const MIN_PER_BAND = 5;

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const round2 = (x) => Math.round(x * 100) / 100;

/* ---- independent figure space + rule semantics ---- */
const FULL = {
  shape: ['triangle', 'circle', 'star', 'square'],
  color: ['coral', 'blue', 'gold', 'mint'],
  count: [1, 2, 3, 4],
  size: ['small', 'big', 'huge'],
};
const PAL = {
  shape: ['triangle', 'circle', 'star'],
  color: ['coral', 'blue', 'gold'],
  count: [1, 2, 3],
  size: ['small', 'big'],
};
const DIMS = ['shape', 'color', 'count', 'size'];
const fkey = (f) => DIMS.map((d) => f[d]).join('|');
const holds = (a, f) => (a.kind === 'gte' ? f[a.dim] >= a.value : f[a.dim] === a.value);
const accepts = (rule, f) => rule.every((a) => holds(a, f));

function hypotheses(varyDims, maxArity) {
  const atoms = [];
  for (const d of varyDims) {
    for (const v of PAL[d]) atoms.push({ kind: 'eq', dim: d, value: v });
    if (d === 'count') for (const k of [2, 3]) atoms.push({ kind: 'gte', dim: 'count', value: k });
  }
  const rules = [];
  const walk = (start, cur, used) => {
    if (cur.length) rules.push(cur.slice());
    if (cur.length === maxArity) return;
    for (let i = start; i < atoms.length; i++) {
      if (used.has(atoms[i].dim)) continue;
      cur.push(atoms[i]);
      used.add(atoms[i].dim);
      walk(i + 1, cur, used);
      used.delete(atoms[i].dim);
      cur.pop();
    }
  };
  walk(0, [], new Set());
  return rules;
}
const verdict = (rule, probes) => probes.map((p) => (accepts(rule, p.figure) ? 'Y' : 'N')).join('');

// Greedy: how many well-chosen buildable tests settle the three probes?
function testsToDecide(candidates, oracleFigs, oracleMap, probes, truth) {
  let cand = candidates.slice();
  let tests = 0;
  while (cand.some((r) => verdict(r, probes) !== truth) && tests < oracleFigs.length) {
    let best = null;
    for (const f of oracleFigs) {
      const yes = cand.filter((r) => accepts(r, f)).length;
      const split = Math.min(yes, cand.length - yes);
      if (!best || split > best.split) best = { f, split };
    }
    if (!best || best.split === 0) break;
    const t = oracleMap.get(fkey(best.f));
    cand = cand.filter((r) => accepts(r, best.f) === t);
    tests++;
  }
  return Math.max(1, tests);
}

/* ---- independent difficulty arithmetic (documented lever model) ---- */
const FORM_LOAD = { single: 1.0, ordinal: 1.8, conj2: 2.8, conj3: 4.4 };
const FORM_ARITY = { single: 1, ordinal: 1, conj2: 2, conj3: 3 };
const SAL = { color: 0.0, shape: 0.6, size: 0.9, count: 1.4 };
const BUDGET_SPAN = 3.2;
const subsets = (arr, k) => {
  const out = [];
  const walk = (i, cur) => {
    if (cur.length === k) return out.push(cur.slice());
    for (let j = i; j < arr.length; j++) {
      cur.push(arr[j]);
      walk(j + 1, cur);
      cur.pop();
    }
  };
  walk(0, []);
  return out;
};
const baseOf = (L) =>
  1.0 +
  FORM_LOAD[L.form] +
  1.3 * (L.varyDims.length - 2) +
  1.2 * (L.ruleDims.reduce((s, d) => s + SAL[d], 0) / L.ruleDims.length) +
  (L.feedbackMode === 'batched' ? 1.4 : 0);
const ANCHORS = (() => {
  const out = [];
  for (let n = 2; n <= 4; n++)
    for (const varyDims of subsets(DIMS, n))
      for (const form of Object.keys(FORM_LOAD)) {
        if (FORM_ARITY[form] > varyDims.length - 1) continue;
        const dimChoices = form === 'ordinal' ? (varyDims.includes('count') ? [['count']] : []) : subsets(varyDims, FORM_ARITY[form]);
        for (const ruleDims of dimChoices)
          for (const feedbackMode of ['immediate', 'batched']) out.push(baseOf({ varyDims, form, ruleDims, feedbackMode }));
      }
  return out;
})();
const RAW_MIN = Math.min(...ANCHORS);
const RAW_MAX = Math.max(...ANCHORS) + BUDGET_SPAN;
const difficultyOf = (L) =>
  Math.max(1, Math.min(20, 1 + ((baseOf(L) + BUDGET_SPAN * L.budgetTightness - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN)));

// ---- 1. Parse ----
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (lines.length === 0) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => {
  try {
    items.push(JSON.parse(line));
  } catch (e) {
    fail('parse', `line ${i + 1} is not valid JSON: ${e.message}`);
  }
});

// ---- 2..5. Per-item checks ----
const seenIds = new Set();
for (const it of items) {
  const id = it.itemId || '(no id)';

  if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);

  if (it.typeCode !== 'FLU-CONCEPT-01') fail(id, `typeCode != FLU-CONCEPT-01 (${it.typeCode})`);
  if (it.domain !== 'fluid_reasoning') fail(id, `domain != fluid_reasoning (${it.domain})`);
  if (it.demoPath !== 'demos/FLU-CONCEPT-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20)
    fail(id, `difficulty not a float in 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || it.ageBands.length === 0) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `bad ageBand (${it.ageBands})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'deterministic_key') fail(id, 'scoring.mode != deterministic_key');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

  const c = it.content || {};
  const ans = it.answer || {};
  const varyDims = c.varyDims || [];
  if (varyDims.length < 2 || varyDims.length > 4 || !varyDims.every((d) => DIMS.includes(d)))
    fail(id, `varyDims malformed (${varyDims})`);

  // ---- 2. Key containment ----
  const contentStr = JSON.stringify(c);
  for (const leak of ['correctKey', 'probeVerdicts', 'rule', 'distractorRationales', 'accepts":null'])
    if (contentStr.includes(leak) && leak !== 'rule') fail(id, `content leaks "${leak}"`);
  if (c.rule !== undefined || c.answer !== undefined) fail(id, 'content states the hidden rule');

  const oracle = c.gateOracle || [];
  const oracleMap = new Map(oracle.map((o) => [fkey(o.figure), o.accepts]));
  // The oracle must be exactly the buildable palette product (complete evidence).
  let expected = [{ ...(c.fixedAttributes || {}) }];
  for (const d of varyDims) {
    const next = [];
    for (const b of expected) for (const v of PAL[d]) next.push({ ...b, [d]: v });
    expected = next;
  }
  if (oracle.length !== expected.length) fail(id, `gateOracle covers ${oracle.length} figures, expected ${expected.length}`);
  for (const f of expected) if (!oracleMap.has(fkey(f))) fail(id, `gateOracle missing buildable figure ${fkey(f)}`);
  if (oracle.every((o) => o.accepts) || oracle.every((o) => !o.accepts))
    fail(id, 'the gate accepts everything or nothing (no rule to find)');

  const probes = c.probes || [];
  if (probes.length !== 3) fail(id, `expected 3 probes, got ${probes.length}`);
  for (const p of probes) {
    if (oracleMap.has(fkey(p.figure))) fail(id, `probe ${p.key} appears in the gate oracle (verdict leak)`);
    if (!varyDims.some((d) => !PAL[d].includes(p.figure[d])))
      fail(id, `probe ${p.key} is buildable — it must carry an untestable value`);
    for (const d of DIMS) {
      if (!varyDims.includes(d) && p.figure[d] !== (c.fixedAttributes || {})[d])
        fail(id, `probe ${p.key} changes the fixed dimension ${d}`);
      if (!FULL[d].includes(p.figure[d])) fail(id, `probe ${p.key} has an undrawable ${d}`);
    }
  }
  if (!c.hintFigure || !oracleMap.get(fkey(c.hintFigure))) fail(id, 'hintFigure is not a buildable accepted example');

  // ---- 3. KEY RE-DERIVED FROM CONTENT ALONE ----
  const hyps = hypotheses(varyDims, Math.min(3, Math.max(1, varyDims.length - 1)));
  const consistent = hyps.filter((r) => expected.every((f) => accepts(r, f) === oracleMap.get(fkey(f))));
  if (!consistent.length) fail(id, 'no rule in the hypothesis space matches the gate oracle');
  else {
    const strings = new Set(consistent.map((r) => verdict(r, probes)));
    if (strings.size !== 1) fail(id, `the evidence does not decide the probes (${strings.size} rival verdict strings)`);
    else if (!strings.has(ans.correctKey)) fail(id, `solver verdict ${[...strings][0]} != declared correctKey ${ans.correctKey}`);
  }
  if (!/^[YN]{3}$/.test(ans.correctKey || '')) fail(id, `correctKey "${ans.correctKey}" is not a 3-probe verdict string`);
  if (/^Y{3}$|^N{3}$/.test(ans.correctKey || '')) fail(id, 'probe set is degenerate (all the same verdict)');
  if (!deepEq((ans.probeVerdicts || []).map((v) => (v.opens ? 'Y' : 'N')).join(''), ans.correctKey))
    fail(id, 'probeVerdicts disagree with correctKey');

  // ---- 4. Fair budget ----
  if (consistent.length && /^[YN]{3}$/.test(ans.correctKey || '')) {
    const need = testsToDecide(hyps, expected, oracleMap, probes, ans.correctKey);
    if (!isNum(c.maxTests) || c.maxTests < need)
      fail(id, `maxTests ${c.maxTests} is below the ${need} tests needed to decide the probes`);
    if (!isNum(ans.greedyTestsToDecide) || ans.greedyTestsToDecide !== need)
      fail(id, `answer.greedyTestsToDecide ${ans.greedyTestsToDecide} != independently computed ${need}`);
  }
  if (!c.feedback || !['immediate', 'batched'].includes(c.feedback.mode)) fail(id, 'feedback mode malformed');

  // Distractor taxonomy: every rival verdict string is labelled.
  const rats = ans.distractorRationales || {};
  for (let m = 0; m < 8; m++) {
    const vs = [4, 2, 1].map((bit) => (m & bit ? 'Y' : 'N')).join('');
    if (vs === ans.correctKey) continue;
    if (!rats[vs]) fail(id, `no rationale for rival verdict string ${vs}`);
    else if (!ALLOWED_LURES.includes(lureLabel(rats[vs]))) fail(id, `unknown lure label "${lureLabel(rats[vs])}"`);
  }
  if (rats[ans.correctKey]) fail(id, 'the correct verdict string is listed as a distractor');

  // ---- 5. Difficulty + reproducibility ----
  const lev = (it.provenance && it.provenance.levers) || {};
  const derived = round2(difficultyOf(lev));
  if (Math.abs(derived - it.difficulty) > 0.01) fail(id, `difficulty ${it.difficulty} != derived-from-levers ${derived}`);
  try {
    const regen = normalizeBankItem(genItem({ ...lev, seed: it.provenance.seed }));
    if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from its provenance (grammar drift)');
  } catch (e) {
    fail(id, `regeneration threw: ${e.message}`);
  }
}

// ---- 6. Coverage ----
const diffs = items.map((it) => it.difficulty).filter(isNum);
const min = Math.min(...diffs);
const max = Math.max(...diffs);
if (!(min <= 1.5)) fail('coverage', `min difficulty ${round2(min)} > 1.5 (does not reach the floor)`);
if (!(max >= 19.5)) fail('coverage', `max difficulty ${round2(max)} < 19.5 (does not reach the ceiling)`);

const binCounts = Array.from({ length: 20 }, () => 0);
const bandCounts = Array.from({ length: 20 }, () => 0);
for (const d of diffs) {
  const k = Math.round(d);
  if (k >= 1 && k <= 20) binCounts[k - 1]++;
  for (let kk = 1; kk <= 20; kk++) if (Math.abs(d - kk) <= 1.0) bandCounts[kk - 1]++;
}
binCounts.forEach((n, i) => {
  if (n < MIN_PER_BAND) fail('coverage', `integer bin k=${i + 1} has ${n} items (<${MIN_PER_BAND})`);
});
bandCounts.forEach((n, i) => {
  if (n < MIN_PER_BAND) fail('coverage', `+/-1pt band around k=${i + 1} has ${n} items (<${MIN_PER_BAND})`);
});

// ---- Report ----
console.log(`FLU-CONCEPT-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS — parses, no probe verdict in content, key re-derived from the gate evidence alone, budget >= disambiguation target, coverage 1..20 with >=5 per bin and per +/-1pt band.');
