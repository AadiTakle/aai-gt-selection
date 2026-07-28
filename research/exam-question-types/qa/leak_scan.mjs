#!/usr/bin/env node
/**
 * leak_scan.mjs — answer-leak audit for every bank in research/exam-question-types/banks.
 *
 * THE THREAT MODEL
 * ----------------
 * Per the build plan (docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md §2),
 *   ServedItem = BankItem minus { answer, scoring, provenance }
 * so the WHOLE of `content` reaches the browser. A leak is therefore anything in
 * `content` that lets a client pick the correct option without performing the
 * cognitive task the item is meant to measure.
 *
 * There are two classes, and only the first is findable by reading field names:
 *
 *   (a) NAMED      — `content` contains a field that says which option is right
 *                    (`lure:"correct"`, `fit:"correct"`, `isCorrect`, `solution`).
 *   (b) COMPUTABLE — `content` contains no incriminating NAME at all, but carries
 *                    enough structure to DERIVE the key: an evaluable operation
 *                    tree or formula, a stored target that one option matches, a
 *                    response function or generative model of the stimulus, an
 *                    optimal path or cost, a target set, or a positional tell.
 *
 * QUANT-WORD-01 shipped a class-(b) leak: `content.math` held the operand table
 * and the operation tree, so evaluating it recovered 220/220 keys, while every
 * field name in it looked innocent. That is why this scan does not stop at names.
 *
 * WHAT THIS SCAN PROVES vs WHAT IT FLAGS
 * --------------------------------------
 * PROVEN — the scan builds the served projection, runs a concrete attack against
 * it, and reports the measured hit rate. No judgement is involved:
 *   - marker attack:   pick the option whose own fields say "correct";
 *   - operation-tree:  evaluate a step tree found in content and match an option;
 *   - stored-target:   a content value deep-equals exactly one option;
 *   - positional:      the correct option's INDEX is far from uniform, tested
 *                      within each option-count stratum (chi-square, p<0.001);
 *   - extremum:        the correct option is systematically the max/min;
 *   - budget==optimum: a content budget exactly equals the answer's optimum in
 *                      the same unit, so the budget can be read as the answer.
 * FLAGGED — a suspicious structure a human must judge. The scan cannot tell a
 * rendering requirement from a solution shortcut:
 *   - content keys naming a response function, generative model, optimum, cost,
 *     target or budget;
 *   - a partial stored-target signal above chance but below proof;
 *   - a budget that does NOT bound its same-unit optimum (a units or solvability
 *     question, not a leak).
 * CLEAN means "no leak of the kinds tested here", which is not a proof of safety.
 *
 * Usage:
 *   node research/exam-question-types/qa/leak_scan.mjs             # all banks
 *   node research/exam-question-types/qa/leak_scan.mjs --bank=QUANT-WORD-01
 *   node research/exam-question-types/qa/leak_scan.mjs --dir=/tmp/mutants
 *   node research/exam-question-types/qa/leak_scan.mjs --json
 *
 * Exit 1 if any bank has a PROVEN leak; 0 otherwise (needs-review does not fail
 * the run — a human must resolve it). Reads bank files only; writes nothing; no
 * dependencies beyond the Node standard library.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_BANK_DIR = resolve(HERE, '../banks');

/* ================================================================== *
 * (a) NAMED-LEAK vocabulary — only tokens that speak about CORRECTNESS.
 * Display words like `label`, `title` or `name` are deliberately absent:
 * flagging them buries the real findings in noise.
 * ================================================================== */
const NAMED_KEY_TOKENS = [
  'correct', 'iscorrect', 'correctkey', 'answer', 'solution', 'rationale',
  'lure', 'misconception', 'distractor', 'verdict', 'iskey', 'isanswer',
  'groundtruth', 'keyindex',
];
// A VALUE that classifies its own option, whatever its key is called. This is
// what catches `fit:"correct"` when the field is not named `lure`.
const NAMED_VALUE_TOKENS = ['correct', 'incorrect', 'iscorrect', 'answer_key', 'the_answer'];

/* ================================================================== *
 * (b) COMPUTABLE-LEAK vocabulary
 * ================================================================== */
// Exact key names that make `content` an evaluable program, not a picture.
const EXPR_KEY_NAMES = new Set([
  'steps', 'operations', 'expression', 'expr', 'formula', 'equation',
  'program', 'responsefn', 'responsefunction', 'transferfunction', 'evalfn',
]);
// Names suggesting a stored optimum / target / model. FLAGS, not proofs: many
// are genuinely needed to render an interactive stimulus.
const SUSPECT_KEY_TOKENS = [
  'apparatus', 'weights', 'coefficient', 'payoff', 'utility', 'responsemodel',
  'optimal', 'shortest', 'mincost', 'minmoves', 'mintaps', 'target',
  'goalstate', 'expected', 'canonical', 'oracle', 'budget',
];
// A numeric scalar whose name matches this is a difficulty descriptor rather than
// a stored solution (`targetFrequencyBand`, `ideaTargetMin`, `fogRadius`).
const DESCRIPTOR_KEY_RE = /(band|level)$|targetmin|targetmax|radius$|sec$|ms$/i;

const BUDGET_KEY_RE = /budget|allowance|^limit|^max/i;
const OPTIMUM_KEY_RE = /optimal|shortest|minimum|cost|^min[A-Z]/i;
// A budget only bounds an optimum measured in the SAME unit. Without this, the
// scan pairs a tile budget against a step count and reports nonsense.
const UNIT_TOKENS = ['move', 'tile', 'step', 'tap', 'trial', 'turn', 'rot',
  'placement', 'trip', 'token', 'action', 'program', 'idea'];

const ARITH_OPS = new Set(['add', 'sub', 'mul', 'div', 'mod', 'plus', 'minus',
  'times', 'divide', '+', '-', '*', '/', '%']);

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */
const isObj = (x) => x !== null && typeof x === 'object';
const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : 'n/a');
const round2 = (x) => Math.round(x * 100) / 100;
const generalise = (p) => p.replace(/\[\d+\]/g, '[]');

// Canonical JSON with sorted keys, so deep equality is a string comparison.
function canon(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
}

function* walk(node, path = '') {
  if (!isObj(node)) return;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      yield { path: `${path}[${i}]`, key: null, value: node[i] };
      yield* walk(node[i], `${path}[${i}]`);
    }
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    const here = path ? `${path}.${k}` : k;
    yield { path: here, key: k, value: v };
    yield* walk(v, here);
  }
}

// chi-square critical values at p=0.001, df 1..12.
const CHI2_P001 = [10.83, 13.82, 16.27, 18.47, 20.52, 22.46, 24.32, 26.12, 27.88, 29.59, 31.26, 32.91];
const chi2Crit = (df) => CHI2_P001[Math.min(df, CHI2_P001.length) - 1];

function unitsOf(name) {
  const l = name.toLowerCase();
  return new Set(UNIT_TOKENS.filter((u) => l.includes(u)));
}
const shareUnit = (a, b) => { const A = unitsOf(a); return [...unitsOf(b)].some((u) => A.has(u)); };

/* ------------------------------------------------------------------ *
 * Locate the option list. An array only counts as the option list if the
 * item's own correctKey actually selects one of its entries — otherwise the
 * "options" we found are some other keyed array (scene objects, palette
 * swatches) and every option-based statistic computed on it would be noise.
 * Keys are `entry.key` when present, else the array index.
 * ------------------------------------------------------------------ */
function findOptions(content, correctKey) {
  if (correctKey === null) return null;
  const want = String(correctKey);
  const cands = [];
  for (const { path, value } of walk(content)) {
    if (!Array.isArray(value) || value.length < 2) continue;
    if (!value.every((e) => isObj(e) && !Array.isArray(e))) continue;
    const keys = value.map((e, i) => String(e.key !== undefined ? e.key : i));
    if (new Set(keys).size !== keys.length) continue;
    const idx = keys.indexOf(want);
    if (idx < 0) continue;
    cands.push({ path, options: value, keys, correctIndex: idx, named: /options$/i.test(path) });
  }
  if (!cands.length) return null;
  cands.sort((a, b) => (b.named ? 1 : 0) - (a.named ? 1 : 0) || a.path.length - b.path.length);
  return cands[0];
}

/* ------------------------------------------------------------------ *
 * (a) Marker attack: pick the option whose own fields declare it correct.
 * ------------------------------------------------------------------ */
function markerAttack(options, keys) {
  const hits = [];
  options.forEach((o, i) => {
    for (const { key, value } of walk(o)) {
      const declaresCorrect =
        (typeof value === 'string' && NAMED_VALUE_TOKENS.includes(value.toLowerCase().replace(/\s+/g, '_')))
        || (value === true && key && /correct|answer|iskey/i.test(key));
      if (declaresCorrect) { hits.push(keys[i]); return; }
    }
  });
  return hits.length === 1 ? hits[0] : null;
}

/* ------------------------------------------------------------------ *
 * (b1) Evaluate an operation tree found in `content`.
 * ------------------------------------------------------------------ */
function evalTree(steps, seedVals) {
  const vals = { ...seedVals };
  const read = (o) => {
    if (o === null || o === undefined) return null;
    if (typeof o === 'number') return o;
    if (typeof o === 'string') return vals[o] !== undefined ? vals[o] : null;
    if (!isObj(o)) return null;
    for (const k of ['q', 's', 'ref', 'id']) if (typeof o[k] === 'string' && vals[o[k]] !== undefined) return vals[o[k]];
    if (typeof o.lit === 'number') return o.lit;
    if (typeof o.value === 'number') return o.value;
    return null;
  };
  for (const st of steps) {
    const a = read(st.a !== undefined ? st.a : st.left);
    const b = read(st.b !== undefined ? st.b : st.right);
    if (a === null || b === null) return null;
    const op = String(st.op || st.operator || st.fn).toLowerCase();
    let r = null;
    if (op === 'add' || op === 'plus' || op === '+') r = a + b;
    else if (op === 'sub' || op === 'minus' || op === '-') r = a - b;
    else if (op === 'mul' || op === 'times' || op === '*') r = a * b;
    else if (op === 'div' || op === 'divide' || op === '/') r = b !== 0 && a % b === 0 ? a / b : null;
    else if (op === 'mod' || op === '%') r = b !== 0 ? a % b : null;
    if (r === null || !Number.isFinite(r)) return null;
    if (st.id) vals[st.id] = r;
    vals.__last = r;
  }
  return vals;
}

function findTrees(content) {
  const trees = [];
  for (const { path, key, value } of walk(content)) {
    if (!Array.isArray(value) || !value.length || !value.every(isObj)) continue;
    const stepish = value.every((e) => !Array.isArray(e)
      && ARITH_OPS.has(String(e.op || e.operator || e.fn).toLowerCase())
      && (e.a !== undefined || e.left !== undefined));
    if (stepish || (key && EXPR_KEY_NAMES.has(String(key).toLowerCase()))) trees.push({ path, steps: value });
  }
  return trees;
}

function operationTreeAttack(content, options, keys) {
  const trees = findTrees(content);
  if (!trees.length) return { present: false, key: null, path: null };
  const seed = {};
  for (const { value } of walk(content)) {
    if (isObj(value) && !Array.isArray(value) && typeof value.id === 'string' && typeof value.value === 'number') seed[value.id] = value.value;
  }
  for (const t of trees) {
    const vals = evalTree(t.steps, seed);
    if (!vals) continue;
    // Only COMPUTED results are candidates, last step first. Seeding values are
    // excluded: a stimulus number that happens to equal an option is not a
    // derivation, and testing it first would return the wrong option.
    const stepIds = t.steps.map((s) => s.id).filter((id) => typeof id === 'string');
    const candidates = stepIds.length ? stepIds.reverse().map((id) => vals[id]) : [vals.__last];
    for (const v of candidates) {
      if (v === undefined) continue;
      const hits = [];
      options.forEach((o, i) => { if (o.value === v || o.val === v) hits.push(keys[i]); });
      if (hits.length === 1) return { present: true, key: hits[0], path: t.path };
    }
  }
  return { present: true, key: null, path: trees[0].path };
}

/* ------------------------------------------------------------------ *
 * (b2) A value stored in `content` that deep-equals exactly one option.
 * ------------------------------------------------------------------ */
function storedTargetAttack(content, optionsPath, options, keys) {
  const identities = new Map();
  const note = (v, key) => {
    const c = canon(v);
    if (c === undefined || c === 'null' || c === '""' || c === '[]' || c === '{}') return;
    if (!identities.has(c)) identities.set(c, new Set());
    identities.get(c).add(key);
  };
  options.forEach((o, i) => {
    const { key, ...rest } = o;
    if (Object.keys(rest).length) note(rest, keys[i]);
    for (const v of Object.values(rest)) note(v, keys[i]);
  });
  const hits = [];
  for (const { path, value } of walk(content)) {
    if (path === optionsPath || path.startsWith(optionsPath + '[')) continue;
    const owners = identities.get(canon(value));
    if (owners && owners.size === 1) hits.push({ path: generalise(path), key: [...owners][0] });
  }
  return hits;
}

/* ------------------------------------------------------------------ *
 * (b3) Response-model attack.
 *
 * A discovery/bench task hands the child an apparatus and asks them to find the
 * best setting by experimenting. If the apparatus's RESPONSE MODEL ships inside
 * `content`, the child never has to experiment: they evaluate the model over the
 * offered settings and read off the maximum. This recognises the declarative
 * additive form — a numeric `base`, per-factor weight arrays, and an optional
 * two-factor interaction bonus — which is the shape a generatable bench uses.
 * ------------------------------------------------------------------ */
function findResponseModels(content) {
  const out = [];
  for (const { path, value } of walk(content)) {
    if (!isObj(value) || Array.isArray(value)) continue;
    if (typeof value.base !== 'number' || !isObj(value.weights)) continue;
    const w = Object.values(value.weights);
    if (!w.length || !w.every((a) => Array.isArray(a) && a.every((x) => typeof x === 'number'))) continue;
    out.push({ path, model: value });
  }
  return out;
}

function scoreSetting(model, setting) {
  let v = model.base;
  for (const [factor, level] of Object.entries(setting)) {
    const w = model.weights[factor];
    if (Array.isArray(w) && typeof w[level] === 'number') v += w[level];
  }
  const I = model.interaction;
  if (isObj(I) && typeof I.bonus === 'number' && setting[I.factorA] === I.levelA && setting[I.factorB] === I.levelB) v += I.bonus;
  return v;
}

function responseModelAttack(content, options, keys) {
  const models = findResponseModels(content);
  if (!models.length) return { present: false, key: null, path: null };
  const settings = options.map((o) => (isObj(o.setting) ? o.setting : null));
  if (settings.some((s) => s === null)) return { present: true, key: null, path: models[0].path };
  for (const m of models) {
    const scores = settings.map((s) => scoreSetting(m.model, s));
    const best = Math.max(...scores);
    const winners = scores.map((v, i) => (v === best ? keys[i] : null)).filter(Boolean);
    if (winners.length === 1) return { present: true, key: winners[0], path: m.path };
  }
  return { present: true, key: null, path: models[0].path };
}

/* ------------------------------------------------------------------ *
 * (b4b) Target-set positional tell, for constructed-response types that have no
 * option list. Two genuinely different questions hide here, and conflating them
 * manufactures false positives:
 *
 *   SELECTION (targets are a strict subset of the rendered array) — is the
 *     subset always at the FRONT? Then "tap the first few" beats the search.
 *   ORDERING  (targets cover the whole array, so nothing is being selected) —
 *     the sorted index set is trivially [0..n-1] and says nothing. The real
 *     question is whether the required ORDER is just the rendered order. That is
 *     tested against the 1/n! chance baseline, and only for arrays of 3+, since
 *     a one- or two-element array matches by luck far too often.
 *
 * A target entry resolves to an index by deep equality, by `id`, or by an
 * [r,c] / [x,y] coordinate pair.
 * ------------------------------------------------------------------ */
function resolveTargetIndices(targets, arr) {
  const idx = [];
  for (const t of targets) {
    let at = -1;
    const ct = canon(t);
    for (let i = 0; i < arr.length; i++) {
      const e = arr[i];
      if (canon(e) === ct) { at = i; break; }
      if (isObj(e) && !Array.isArray(e)) {
        if (e.id !== undefined && e.id === t) { at = i; break; }
        if (Array.isArray(t) && t.length === 2
          && ((e.r === t[0] && e.c === t[1]) || (e.x === t[0] && e.y === t[1]))) { at = i; break; }
      }
    }
    if (at < 0) return null;
    idx.push(at);
  }
  return idx;   // in TARGET order; the caller sorts when it wants the set
}

const factorial = (n) => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; };

/* ------------------------------------------------------------------ *
 * Scan one bank.
 * ------------------------------------------------------------------ */
function scanBank(file) {
  const code = basename(file).replace(/\.jsonl$/, '');
  const raw = readFileSync(file, 'utf8').trim();
  const items = [];
  let parseErrors = 0;
  for (const line of (raw ? raw.split('\n') : [])) { try { items.push(JSON.parse(line)); } catch { parseErrors++; } }

  const r = {
    code, items: items.length, parseErrors,
    proven: [], review: [], notes: [], budget: [], optionsPath: null,
  };
  if (!items.length) { r.notes.push('bank is empty or unparseable'); r.verdict = 'NEEDS REVIEW'; return r; }

  const namedSeen = new Map();
  const suspectSeen = new Map();
  const exprSeen = new Map();
  const storedStats = new Map();
  const budgetPairs = new Map();
  const strata = new Map();               // optionCount -> index histogram
  const targetSets = new Map();           // "answer.f -> content.path" -> stats
  let withOptions = 0, markerHit = 0, markerItems = 0, treeItems = 0, treeHit = 0;
  let modelItems = 0, modelHit = 0, modelPath = null;
  const argmax = { hit: 0, n: 0 }, argmin = { hit: 0, n: 0 };

  for (const it of items) {
    const content = it.content || {};
    const answer = it.answer || {};
    const correctKey = answer.correctKey === null || answer.correctKey === undefined ? null : String(answer.correctKey);

    /* ---- name / value scan over `content` ---- */
    for (const { path, key, value } of walk(content)) {
      const gp = generalise(path);
      if (key) {
        const lk = String(key).toLowerCase();
        for (const t of NAMED_KEY_TOKENS) {
          if (lk.includes(t) && !namedSeen.has(gp)) namedSeen.set(gp, { path: gp, token: t, sample: canon(value).slice(0, 60) });
        }
        if (EXPR_KEY_NAMES.has(lk) && isObj(value) && !exprSeen.has(gp)) {
          exprSeen.set(gp, { path: gp, sample: canon(value).slice(0, 70) });
        }
        for (const t of SUSPECT_KEY_TOKENS) {
          if (!lk.includes(t)) continue;
          if (typeof value === 'number' && DESCRIPTOR_KEY_RE.test(lk)) continue;   // difficulty descriptor
          if (!suspectSeen.has(gp)) suspectSeen.set(gp, { path: gp, token: t, sample: canon(value).slice(0, 70) });
        }
        if (BUDGET_KEY_RE.test(lk) && typeof value === 'number') {
          for (const { path: apath, key: akey, value: av } of walk(answer)) {
            // An optimum may be nested (`cost.tokens`), so match on the whole path.
            if (typeof av !== 'number' || !akey) continue;
            if (!OPTIMUM_KEY_RE.test(apath)) continue;
            if (!shareUnit(key, apath)) continue;
            const ak = generalise(apath);
            const pk = `content.${generalise(path)} vs answer.${ak}`;
            if (!budgetPairs.has(pk)) budgetPairs.set(pk, { n: 0, minSlack: Infinity, sumSlack: 0, below: 0, equal: 0 });
            const s = budgetPairs.get(pk);
            const slack = value - av;
            s.n++; s.sumSlack += slack; s.minSlack = Math.min(s.minSlack, slack);
            if (slack < 0) s.below++; else if (slack === 0) s.equal++;
          }
        }
      }
      if (typeof value === 'string' && NAMED_VALUE_TOKENS.includes(value.toLowerCase().replace(/\s+/g, '_'))) {
        if (!namedSeen.has(gp)) namedSeen.set(gp, { path: gp, token: `the VALUE "${value}"`, sample: JSON.stringify(value) });
      }
    }

    /* ---- target-set position (works with or without an option list) ---- */
    for (const [af, av] of Object.entries(answer)) {
      if (!Array.isArray(av) || av.length === 0 || av.length > 40) continue;
      for (const { path, value } of walk(content)) {
        if (!Array.isArray(value) || value.length < 3 || value.length < av.length) continue;
        if (!value.every(isObj)) continue;
        const order = resolveTargetIndices(av, value);
        if (!order) continue;
        const pk = `answer.${af} -> content.${generalise(path)}`;
        if (!targetSets.has(pk)) {
          targetSets.set(pk, { sel: 0, prefix: 0, contiguous: 0, sumNormPos: 0, nPos: 0, ord: 0, identity: 0, expIdentity: 0 });
        }
        const s = targetSets.get(pk);
        if (order.length === value.length) {
          // ORDERING case: nothing is selected, so only the permutation matters.
          if (value.length >= 3) {
            s.ord++;
            s.expIdentity += 1 / factorial(value.length);
            if (order.every((v, k) => v === k)) s.identity++;
          }
        } else {
          // SELECTION case: where does the chosen subset sit?
          const idx = order.slice().sort((a, b) => a - b);
          s.sel++;
          if (idx.every((v, k) => v === k)) s.prefix++;
          if (idx.every((v, k) => k === 0 || v === idx[k - 1] + 1)) s.contiguous++;
          if (value.length > 1) for (const i of idx) { s.sumNormPos += i / (value.length - 1); s.nPos++; }
        }
      }
    }

    /* ---- option-dependent attacks ---- */
    const found = findOptions(content, correctKey);
    if (!found) continue;
    withOptions++;
    r.optionsPath = r.optionsPath || `content.${generalise(found.path)}`;
    const { options, keys, correctIndex, path: optPath } = found;

    markerItems++;
    if (markerAttack(options, keys) === correctKey) markerHit++;

    const tree = operationTreeAttack(content, options, keys);
    if (tree.present) { treeItems++; if (tree.key === correctKey) treeHit++; }

    const model = responseModelAttack(content, options, keys);
    if (model.present) { modelItems++; modelPath = modelPath || model.path; if (model.key === correctKey) modelHit++; }

    for (const h of storedTargetAttack(content, optPath, options, keys)) {
      if (!storedStats.has(h.path)) storedStats.set(h.path, { matched: 0, correct: 0 });
      const s = storedStats.get(h.path);
      s.matched++;
      if (h.key === correctKey) s.correct++;
    }

    const n = options.length;
    if (!strata.has(n)) strata.set(n, Array.from({ length: n }, () => 0));
    strata.get(n)[correctIndex]++;

    const nums = options.map((o) => (typeof o.value === 'number' ? o.value : null));
    if (nums.every((v) => v !== null) && new Set(nums).size === nums.length) {
      argmax.n++; argmin.n++;
      if (nums[correctIndex] === Math.max(...nums)) argmax.hit++;
      if (nums[correctIndex] === Math.min(...nums)) argmin.hit++;
    }
  }

  /* ---- (a) named ---- */
  const named = [...namedSeen.values()];
  if (markerItems && markerHit / markerItems >= 0.5) {
    r.proven.push({
      cls: 'a', text: `MARKER ATTACK: picking the option whose own fields declare it correct recovers the key on `
        + `${markerHit}/${markerItems} items (${pct(markerHit, markerItems)}) — the served item labels its own answer`,
    });
  }
  for (const v of named) {
    r.proven.push({ cls: 'a', text: `content names an answer field at "${v.path}" (matched ${v.token}) e.g. ${v.sample}` });
  }

  /* ---- (b1) operation tree ---- */
  if (treeItems) {
    if (treeHit / treeItems >= 0.5) {
      r.proven.push({
        cls: 'b', text: `OPERATION-TREE ATTACK: an evaluable step tree in content recomputes the key on `
          + `${treeHit}/${treeItems} items (${pct(treeHit, treeItems)})`,
      });
    } else {
      r.review.push(`content holds an expression-shaped array on ${treeItems} items; the generic evaluator solved ${treeHit} — check whether a type-aware evaluator would do better`);
    }
  }

  /* ---- (b3) response model ---- */
  if (modelItems) {
    if (modelHit / modelItems >= 0.5) {
      r.proven.push({
        cls: 'b', text: `RESPONSE-MODEL ATTACK: the model served at "content.${modelPath}" predicts the outcome of every `
          + `offered setting, so evaluating it and taking the maximum recovers the key on ${modelHit}/${modelItems} items `
          + `(${pct(modelHit, modelItems)}) WITHOUT running a single experiment`,
      });
    } else {
      r.review.push(`content serves a response model at "${modelPath}" on ${modelItems} items; the generic evaluator recovered ${modelHit} — check whether a type-aware evaluator would do better`);
    }
  }

  /* ---- (b2) stored target ---- */
  for (const [path, s] of storedStats) {
    if (s.matched < 20) continue;
    const rate = s.correct / s.matched, coverage = s.matched / withOptions;
    if (rate >= 0.9 && coverage >= 0.5) {
      r.proven.push({
        cls: 'b', text: `STORED-TARGET ATTACK: the content value at "${path}" deep-equals exactly one option, and that `
          + `option is the correct one on ${s.correct}/${s.matched} items (${pct(s.correct, s.matched)}, coverage ${pct(s.matched, withOptions)})`,
      });
    } else if (rate >= 0.6 && coverage >= 0.4) {
      r.review.push(`content value at "${path}" pins a single option on ${pct(s.matched, withOptions)} of items and is right ${pct(s.correct, s.matched)} of the time — partial stored-target signal`);
    }
  }

  /* ---- (b4) positional, stratified by option count ---- */
  for (const [n, hist] of [...strata].sort((a, b) => b[1].reduce((x, y) => x + y, 0) - a[1].reduce((x, y) => x + y, 0))) {
    const total = hist.reduce((a, b) => a + b, 0);
    r.notes.push(`option-count ${n}: ${total} items, correct-index histogram [${hist.join(',')}]`);
    if (total < 30) continue;
    const exp = total / n;
    const chi2 = hist.reduce((s, o) => s + ((o - exp) ** 2) / exp, 0);
    const crit = chi2Crit(n - 1);
    if (chi2 > crit) {
      r.proven.push({
        cls: 'b', text: `POSITIONAL LEAK: among the ${total} items with ${n} options, the correct index is far from `
          + `uniform (histogram [${hist.join(',')}], chi2=${round2(chi2)} > ${crit} at p<0.001) — a client beats chance by always picking the favoured slot`,
      });
    }
    const first = hist[0] / total, last = hist[n - 1] / total;
    if (first >= 0.6) r.proven.push({ cls: 'b', text: `POSITIONAL LEAK: with ${n} options the correct one is FIRST on ${pct(hist[0], total)} of items (chance ${pct(1, n)})` });
    else if (last >= 0.6) r.proven.push({ cls: 'b', text: `POSITIONAL LEAK: with ${n} options the correct one is LAST on ${pct(hist[n - 1], total)} of items (chance ${pct(1, n)})` });
  }
  for (const [label, s] of [['largest', argmax], ['smallest', argmin]]) {
    if (s.n >= 30 && s.hit / s.n >= 0.6) {
      r.proven.push({ cls: 'b', text: `EXTREMUM LEAK: the correct option carries the ${label} numeric value on ${pct(s.hit, s.n)} of items — a client can sort instead of reason` });
    }
  }

  /* ---- (b4b) target-set position ---- */
  for (const [pair, s] of targetSets) {
    if (s.sel >= 30) {
      const meanPos = s.nPos ? s.sumNormPos / s.nPos : null;
      r.notes.push(`${pair}: SELECTION on ${s.sel} items, prefix=${pct(s.prefix, s.sel)} contiguous=${pct(s.contiguous, s.sel)} meanNormalisedPosition=${meanPos === null ? 'n/a' : round2(meanPos)}`);
      if (s.prefix / s.sel >= 0.6) {
        r.proven.push({ cls: 'b', text: `TARGET-SET POSITIONAL LEAK: ${pair} — the selected targets are the LEADING entries of the rendered array on ${pct(s.prefix, s.sel)} of items; "take the first few" beats the intended search` });
      } else if (s.contiguous / s.sel >= 0.8) {
        r.review.push(`${pair}: selected targets are contiguous in the rendered array on ${pct(s.contiguous, s.sel)} of items — check whether ordering is a tell`);
      }
      if (meanPos !== null && (meanPos < 0.3 || meanPos > 0.7)) {
        r.review.push(`${pair}: selected targets sit at mean normalised position ${round2(meanPos)} (0.5 = evenly spread) — possible ordering tell`);
      }
    }
    if (s.ord >= 30) {
      // Chance identity rate is the mean of 1/n! over the arrays actually seen.
      const chance = s.expIdentity / s.ord;
      r.notes.push(`${pair}: ORDERING on ${s.ord} items (arrays of 3+, whole array covered), required order == rendered order on ${pct(s.identity, s.ord)} vs chance ${pct(s.expIdentity, s.ord)}`);
      if (s.identity / s.ord >= 0.6 && s.identity >= 3 * s.expIdentity) {
        r.proven.push({ cls: 'b', text: `ORDERING LEAK: ${pair} — the required order is simply the rendered order on ${pct(s.identity, s.ord)} of items (chance ${pct(s.expIdentity, s.ord)}); a client can replay the list as given` });
      } else if (s.identity / s.ord >= 0.3 && s.identity >= 3 * s.expIdentity) {
        r.review.push(`${pair}: the required order matches the rendered order on ${pct(s.identity, s.ord)} of items vs chance ${round2(chance * 100)}% — above chance, worth a look`);
      }
    }
  }

  /* ---- (b5) budget vs same-unit optimum ---- */
  for (const [pair, s] of budgetPairs) {
    r.budget.push({ pair, n: s.n, minSlack: s.minSlack, meanSlack: round2(s.sumSlack / s.n), below: s.below, equal: s.equal });
    if (s.equal / s.n >= 0.5) {
      r.proven.push({ cls: 'b', text: `BUDGET==OPTIMUM: ${pair} are equal on ${s.equal}/${s.n} items (${pct(s.equal, s.n)}) — the budget IS the answer` });
    } else if (s.equal) {
      r.review.push(`${pair}: budget equals the optimum on ${s.equal}/${s.n} items — on those the budget gives the answer away`);
    }
    if (s.below) {
      r.review.push(`${pair}: budget is BELOW the optimum on ${s.below}/${s.n} items (minSlack ${s.minSlack}) — not a leak, but either the units do not correspond or those items are unsolvable within budget`);
    }
  }

  /* ---- flags ---- */
  for (const v of exprSeen.values()) r.review.push(`content declares an expression-shaped field "${v.path}" e.g. ${v.sample}`);
  for (const v of suspectSeen.values()) r.review.push(`content carries "${v.path}" (matched "${v.token}") e.g. ${v.sample} — needed to RENDER, or does it encode the solution?`);

  if (!withOptions) r.notes.push('no option list in content is selected by answer.correctKey (open-ended / constructed response) — option-matching attacks not applicable');
  const hasA = r.proven.some((p) => p.cls === 'a');
  const hasB = r.proven.some((p) => p.cls === 'b');
  r.verdict = hasA ? 'NAMED LEAK' : hasB ? 'COMPUTABLE LEAK' : r.review.length ? 'NEEDS REVIEW' : 'CLEAN';
  return r;
}

/* ------------------------------------------------------------------ */
function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/); return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  }));
  const dir = args.dir ? resolve(String(args.dir)) : DEFAULT_BANK_DIR;
  if (!existsSync(dir)) { console.error(`no such bank directory: ${dir}`); process.exit(2); }
  let files = readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort();
  if (args.bank) files = files.filter((f) => f.replace(/\.jsonl$/, '') === args.bank);
  if (!files.length) { console.error('no bank files matched'); process.exit(2); }

  const results = files.map((f) => scanBank(join(dir, f)));

  if (args.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    const bar = '='.repeat(78);
    console.log(bar);
    console.log('ANSWER-LEAK SCAN — ServedItem = BankItem minus {answer, scoring, provenance}');
    console.log(`bank directory: ${dir}`);
    console.log(`banks scanned: ${results.length}   items: ${results.reduce((s, x) => s + x.items, 0)}`);
    console.log(bar);

    const order = { 'NAMED LEAK': 0, 'COMPUTABLE LEAK': 1, 'NEEDS REVIEW': 2, CLEAN: 3 };
    for (const r of [...results].sort((a, b) => order[a.verdict] - order[b.verdict] || a.code.localeCompare(b.code))) {
      if (r.verdict === 'CLEAN' && !args.verbose) continue;
      console.log(`\n### ${r.code}  [${r.verdict}]  ${r.items} items`);
      for (const p of r.proven) console.log(`  PROVEN (${p.cls})  ${p.text}`);
      for (const v of r.review) console.log(`  flag        ${v}`);
      for (const b of r.budget) {
        console.log(`  budget data ${b.pair}: n=${b.n} minSlack=${b.minSlack} meanSlack=${b.meanSlack} below=${b.below} equal=${b.equal}`
          + ` -> ${b.below || b.equal ? 'budget does NOT strictly exceed the optimum on every item' : 'budget strictly exceeds the optimum on every item'}`);
      }
      if (args.notes) for (const n of r.notes) console.log(`  note        ${n}`);
    }

    // Budget-vs-optimum evidence is reported for EVERY bank that has such a pair,
    // clean ones included: "the budget always exceeds the optimum" is a claim
    // reviewers make about game types, and it needs data either way.
    const withBudget = results.filter((x) => x.budget.length);
    if (withBudget.length) {
      console.log('\n' + bar);
      console.log('BUDGET vs SAME-UNIT OPTIMUM (all banks that declare a budget in content)');
      for (const r of withBudget) {
        for (const b of r.budget) {
          console.log(`  ${r.code.padEnd(18)} ${b.pair}`);
          console.log(`  ${''.padEnd(18)}   n=${b.n} minSlack=${b.minSlack} meanSlack=${b.meanSlack} below=${b.below} equal=${b.equal}`
            + ` -> ${b.below || b.equal ? 'does NOT strictly exceed on every item' : 'strictly exceeds on every item'}`);
        }
      }
    }

    console.log('\n' + bar);
    console.log('SUMMARY BY LEAK CLASS');
    for (const v of ['NAMED LEAK', 'COMPUTABLE LEAK', 'NEEDS REVIEW', 'CLEAN']) {
      const list = results.filter((x) => x.verdict === v);
      console.log(`\n  ${v} (${list.length})`);
      for (const x of list) console.log(`      ${x.code}`);
    }
    console.log('\n' + bar);
    console.log('PROVEN (a) = a named answer field, or the marker attack recovered the key.');
    console.log('PROVEN (b) = a computable leak: an attack was run against the served');
    console.log('             projection and its measured hit rate is reported above.');
    console.log('flag        = a suspicious structure a human must judge. The scan cannot');
    console.log('             tell a rendering requirement from a solution shortcut.');
    console.log('CLEAN       = no leak of the kinds tested here. NOT a proof of safety.');
    console.log('Re-run with --notes for per-stratum option-position histograms.');
    console.log(bar);
  }

  process.exit(results.some((x) => x.verdict === 'NAMED LEAK' || x.verdict === 'COMPUTABLE LEAK') ? 1 : 0);
}

main();
