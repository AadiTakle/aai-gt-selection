// FLU-DEDUCE-01 "Clue Detective" — structured bank generator (Bucket A: grammar).
//
// Emits a STRUCTURED item bank (JSONL) conforming to EXAM_ADAPTIVE_BUILD_PLAN.md §2
// (BankItem) and EXAM_ITEM_SCHEMA_SPEC.md, following the FLU-MATRIX-01 reference
// vertical. Task: a lineup of candidate figures plus an ordered set of clue cards
// (positive / negated / conjunctive / relational constraints). Exactly ONE candidate
// satisfies the conjunction of every clue; the child eliminates violators and picks
// the survivor.
//
// Governance: born-synthetic only (syntheticOnly:true, validated:false). The
// `difficulty` float is a DESIGN rung (constraint-satisfaction load model), NOT a
// calibrated IRT parameter. The answer key and the lure taxonomy are SERVER-ONLY:
// `content` carries only the clues and the candidate lineup (the stimulus the child
// must reason over) and never marks which candidate survives.
//
// Difficulty derives from the type's declared difficulty_levers
// (master_types.jsonl FLU-DEDUCE-01):
//   number of clues and candidates | clue polarity (positive vs negated) and logical
//   form (single vs conjunctive) | relational/spatial clues vs simple attribute |
//   how much each clue prunes | perceptual similarity among candidates.
//
// ITEM-QUALITY INVARIANTS (audited independently by check-FLU-DEDUCE-01.mjs):
//   * every clue constrains a DISTINCT figure dimension, so no clue is implied by
//     another and "violates exactly this clue" is always constructible;
//   * every clue eliminates at least one candidate (no inert filler clue);
//   * exactly one candidate survives the conjunction of all clues.
//
// Run:  node research/exam-question-types/generators/FLU-DEDUCE-01.mjs
//       writes ../banks/FLU-DEDUCE-01.jsonl and prints a coverage summary.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------ *
 * Figure space (mirrors demos/FLU-DEDUCE-01.html rendering grammar).
 * Named tokens / ints are renderer-agnostic; the renderer maps token -> art.
 * `pos` = where the small marker dot sits relative to the shape (spatial);
 * `dots` = how many tally dots sit under the shape (ordinal).
 * ------------------------------------------------------------------ */
export const DOM = {
  shape: ['triangle', 'circle', 'square', 'star', 'hex'],
  color: ['coral', 'blue', 'mint', 'gold'],
  fill: ['solid', 'outline'],
  size: ['small', 'big'],
  tilt: ['straight', 'leaning'],
  dots: [1, 2, 3],
  pos: ['inside', 'outside'],
};
export const ALLDIMS = ['shape', 'color', 'fill', 'size', 'tilt', 'dots', 'pos'];
export const ATTR_DIMS = ['shape', 'color', 'fill', 'size', 'tilt']; // simple attributes
export const REL_DIMS = ['pos', 'dots']; // spatial / ordinal (relational) dimensions
export const figKey = (f) => ALLDIMS.map((d) => f[d]).join('|');

/* ------------------------------------------------------------------ *
 * Seeded RNG (xmur3 -> mulberry32) for reproducible, born-synthetic content.
 * ------------------------------------------------------------------ */
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRng(seed) {
  return mulberry32(xmur3(seed)());
}
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/* ------------------------------------------------------------------ *
 * KEY-POSITION BALANCE (E-073)
 * Shuffling every item's candidate lineup independently still leaves the
 * survivor's POSITION uneven over a bank, and an uneven pseudo-guessing floor
 * inflates low-ability accuracy (M-ACC) and makes raw accuracy non-comparable
 * across types. The bank builder hands each item a target slot from a
 * least-loaded allocator and the item seats its survivor there. The candidate
 * SET, the violation profiles and the difficulty levers are untouched.
 *
 * Slots are allocated uniformly WITHIN each option-count stratum first and only
 * then balanced across the whole bank. Option count is itself a difficulty
 * lever, so balancing the pooled key counts alone would make the last slot of
 * the rarer long items almost always correct — a larger exploit than the one
 * being fixed.
 * ------------------------------------------------------------------ */
function makeSlotAllocator(maxSlots) {
  const globalUse = new Array(maxSlots).fill(0);
  const byOptionCount = new Map();
  let tick = 0;
  return (n) => {
    if (!byOptionCount.has(n)) byOptionCount.set(n, new Array(n).fill(0));
    const localUse = byOptionCount.get(n);
    let best = tick % n;
    for (let k = 1; k < n; k++) {
      const i = (tick + k) % n;
      if (localUse[i] < localUse[best] || (localUse[i] === localUse[best] && globalUse[i] < globalUse[best])) best = i;
    }
    tick++;
    localUse[best]++;
    globalUse[best]++;
    return best;
  };
}
// Seat the correct entry of an already-shuffled list at `slot`, leaving the
// distractors in their shuffled relative order. `slot` is either a resolved
// index or the allocator callback, which is handed this item's option count.
function seatCorrect(list, isCorrect, slot) {
  const ci = list.findIndex(isCorrect);
  const at = typeof slot === 'function' ? slot(list.length) : slot;
  if (ci < 0 || !Number.isInteger(at) || at < 0 || at >= list.length) return { list, slot: ci };
  const rest = list.filter((_, i) => i !== ci);
  return { list: [...rest.slice(0, at), list[ci], ...rest.slice(at)], slot: at };
}

function seededUuid(seed) {
  const rng = makeRng('uuid|' + seed);
  const hex = [];
  for (let i = 0; i < 32; i++) hex.push(Math.floor(rng() * 16).toString(16));
  hex[12] = '4';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const h = hex.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const round2 = (x) => Math.round(x * 100) / 100;

/* ================================================================== *
 * CLUE SEMANTICS — a clue is a predicate over a figure.
 * forms: is | not | and | atleast | atmost
 * ================================================================== */
export function clueHolds(clue, f) {
  switch (clue.form) {
    case 'is':
      return f[clue.dim] === clue.value;
    case 'not':
      return f[clue.dim] !== clue.value;
    case 'and':
      return clue.terms.every((t) => f[t.dim] === t.value);
    case 'atleast':
      return f[clue.dim] >= clue.value;
    case 'atmost':
      return f[clue.dim] <= clue.value;
    default:
      throw new Error(`unknown clue form ${clue.form}`);
  }
}
export const clueDims = (c) => (c.form === 'and' ? c.terms.map((t) => t.dim) : [c.dim]);

// Short on-screen wording for the clue card (D-017: on-screen TEXT, never audio).
const WORD = {
  solid: 'filled in',
  outline: 'not filled in',
  inside: 'dot inside',
  outside: 'dot outside',
  small: 'small',
  big: 'big',
  straight: 'standing straight',
  leaning: 'leaning over',
};
function termWord(dim, value) {
  if (dim === 'dots') return `${value} dot${value === 1 ? '' : 's'}`;
  if (WORD[value]) return WORD[value];
  return String(value);
}
function clueLabel(c) {
  if (c.form === 'and') return c.terms.map((t) => termWord(t.dim, t.value)).join(' and ');
  if (c.form === 'not') return 'not ' + termWord(c.dim, c.value);
  if (c.form === 'atleast') return `${c.value} dots or more`;
  if (c.form === 'atmost') return `${c.value} dot${c.value === 1 ? '' : 's'} or fewer`;
  return termWord(c.dim, c.value);
}

/* ================================================================== *
 * DIFFICULTY MODEL — from the type's difficulty_levers. Grounded in
 * mental-model theory (Johnson-Laird 1983; Markovits & Barrouillet 2002):
 * load grows with the number of constraints held at once, with negation
 * (an extra model to falsify), with conjunctive clues (two bindings on one
 * card), with relational/spatial predicates, and with candidate similarity
 * (single-clue near-misses are far harder to reject than obvious violators).
 * Mapped linearly onto a FLOAT 1..20 rung (gradual ramp, BUILD_PLAN §0).
 * ================================================================== */
const clueTerm = (nClues) => 1.3 * (nClues - 2);
const candTerm = (nCands) => 0.7 * (nCands - 4);
const negTerm = (negCount) => 1.1 * negCount;
const conjTerm = (conjCount) => 1.6 * conjCount;
const relTerm = (relCount) => 1.0 * relCount;
const SIM_SPAN = 3.0; // candidate-similarity lever contributes 0..3.0
const simTerm = (similarity) => SIM_SPAN * similarity;

export const MIN_CLUES = 2;
export const MAX_CLUES = 5;
export const MIN_CANDS = 4;
export const MAX_CANDS = 8;
const MAX_NEG = 2;
const MAX_CONJ = 2;
const MAX_REL = 2;

function baseScore({ nClues, nCands, negCount, conjCount, relCount }) {
  return 1.0 + clueTerm(nClues) + candTerm(nCands) + negTerm(negCount) + conjTerm(conjCount) + relTerm(relCount);
}

// Allowed lever configs: special-form clues cannot outnumber the clues themselves.
export const ALLOWED_CONFIGS = (() => {
  const out = [];
  for (let nClues = MIN_CLUES; nClues <= MAX_CLUES; nClues++)
    for (let nCands = MIN_CANDS; nCands <= MAX_CANDS; nCands++)
      for (let negCount = 0; negCount <= MAX_NEG; negCount++)
        for (let conjCount = 0; conjCount <= MAX_CONJ; conjCount++)
          for (let relCount = 0; relCount <= MAX_REL; relCount++) {
            if (negCount + conjCount + relCount > nClues) continue;
            out.push({ nClues, nCands, negCount, conjCount, relCount });
          }
  return out;
})();

const ALL_BASES = ALLOWED_CONFIGS.map(baseScore);
const RAW_MIN = Math.min(...ALL_BASES) + simTerm(0);
const RAW_MAX = Math.max(...ALL_BASES) + simTerm(1);

export function difficultyFromLevers(cfg, similarity) {
  const raw = baseScore(cfg) + simTerm(similarity);
  return clamp(1 + ((raw - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN), 1, 20);
}
// Invert: candidate similarity that lands `cfg` on targetD.
function solveSimilarity(cfg, targetD) {
  const rawNeeded = RAW_MIN + ((targetD - 1) * (RAW_MAX - RAW_MIN)) / 19;
  return clamp((rawNeeded - baseScore(cfg)) / SIM_SPAN, 0, 1);
}

/* ================================================================== *
 * GRAMMAR — clue set (one distinct dimension per clue) + candidate lineup.
 * ================================================================== */
const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function buildClues({ nClues, negCount, conjCount, relCount }, target, rng) {
  const usedDims = new Set();
  const take = (prefs) => {
    for (const d of prefs) if (!usedDims.has(d)) return (usedDims.add(d), d);
    return null;
  };
  const attrOrder = shuffle(ATTR_DIMS, rng);
  const relOrder = shuffle(REL_DIMS, rng);
  const clues = [];

  // Relational / spatial clues own the pos + dots dimensions (allocated first).
  for (let i = 0; i < relCount; i++) {
    const d = take(relOrder);
    if (d === 'pos') clues.push({ form: 'is', dim: 'pos', value: target.pos, kind: 'relational' });
    else if (target.dots >= 2) clues.push({ form: 'atleast', dim: 'dots', value: target.dots, kind: 'relational' });
    else clues.push({ form: 'atmost', dim: 'dots', value: target.dots, kind: 'relational' });
  }
  // Negated attribute clues ("not blue") — the polarity lever. Prefer many-valued
  // dimensions so the negation genuinely leaves several possibilities open.
  const negPrefs = attrOrder.slice().sort((a, b) => DOM[b].length - DOM[a].length);
  for (let i = 0; i < negCount; i++) {
    const d = take(negPrefs) ?? take(attrOrder);
    if (!d) throw new Error('out of dimensions for a negated clue');
    const others = DOM[d].filter((v) => v !== target[d]);
    clues.push({ form: 'not', dim: d, value: others[Math.floor(rng() * others.length)], kind: 'attribute' });
  }
  // Conjunctive clues (two bindings on one card) — the logical-form lever. The
  // second term prefers a free spatial dimension, making the card attribute+spatial.
  for (let i = 0; i < conjCount; i++) {
    const d1 = take(attrOrder);
    const d2 = take(relOrder) ?? take(attrOrder);
    if (!d1 || !d2) throw new Error('out of dimensions for a conjunctive clue');
    clues.push({
      form: 'and',
      terms: [
        { dim: d1, value: target[d1] },
        { dim: d2, value: target[d2] },
      ],
      kind: 'conjunctive',
    });
  }
  // Plain positive attribute clues fill the remainder.
  while (clues.length < nClues) {
    const d = take(attrOrder) ?? take(relOrder);
    if (!d) throw new Error('out of dimensions for a plain clue');
    clues.push({ form: 'is', dim: d, value: target[d], kind: REL_DIMS.includes(d) ? 'relational' : 'attribute' });
  }

  // Reveal order is shuffled so a clue's logical form is not positionally predictable.
  return shuffle(clues, rng).map((c, i) => ({ clueId: `C${i + 1}`, ...c, label: clueLabel(c) }));
}

// A figure that violates EXACTLY the clues in `set` (possible because each clue
// owns its own dimension). `variant` walks alternative violating values so several
// distractors can share a violation profile without repeating a figure.
function makeViolator(target, clues, set, variant, keepNeutral, neutralDims) {
  const f = { ...target };
  if (!keepNeutral) {
    // Far distractors also drift on the unconstrained dimensions (visually looser).
    neutralDims.forEach((d, i) => {
      f[d] = DOM[d][(variant + i + 1) % DOM[d].length];
    });
  }
  set.forEach((clueId, i) => {
    const c = clues.find((x) => x.clueId === clueId);
    const v = variant + i;
    if (c.form === 'is') {
      const alts = DOM[c.dim].filter((x) => x !== c.value);
      f[c.dim] = alts[v % alts.length];
    } else if (c.form === 'not') {
      f[c.dim] = c.value;
    } else if (c.form === 'and') {
      const t = c.terms[v % c.terms.length];
      const alts = DOM[t.dim].filter((x) => x !== t.value);
      f[t.dim] = alts[Math.floor(v / c.terms.length) % alts.length];
    } else if (c.form === 'atleast') {
      f[c.dim] = c.value - 1;
    } else if (c.form === 'atmost') {
      f[c.dim] = c.value + 1;
    }
  });
  return f;
}

// Violation profiles for the distractor slots: coverage of every clue first
// (no inert clue), then as many single-clue near-misses as the similarity lever asks.
function planViolationSets(clues, nDistract, wantNear) {
  const ids = clues.map((c) => c.clueId);
  let singles = clamp(wantNear, 0, nDistract);
  if (ids.length > singles && singles >= nDistract) singles = nDistract - 1; // keep a slot for the rest
  const sets = [];
  for (let i = 0; i < singles; i++) sets.push([ids[i % ids.length]]);
  const uncovered = ids.filter((id) => !sets.some((s) => s.includes(id)));
  const rest = nDistract - singles;
  for (let i = 0; i < rest; i++) sets.push([]);
  uncovered.forEach((id, i) => sets[singles + (i % Math.max(1, rest))].push(id));
  // Every remaining slot must be a genuine multi-clue violator (size >= 2).
  for (let i = singles; i < sets.length; i++) {
    let j = 0;
    while (sets[i].length < 2 && j < ids.length * 2) {
      const id = ids[(i + j) % ids.length];
      if (!sets[i].includes(id)) sets[i].push(id);
      j++;
    }
  }
  return sets;
}

/**
 * Generate ONE structured BankItem.
 * @param {{nClues,nCands,negCount,conjCount,relCount,candidateSimilarity,keyPosition,seed}} lever
 */
export function genItem({ nClues, nCands, negCount, conjCount, relCount, candidateSimilarity, keyPosition, seed }) {
  const rng = makeRng(seed);
  const target = {};
  for (const d of ALLDIMS) target[d] = DOM[d][Math.floor(rng() * DOM[d].length)];

  const clues = buildClues({ nClues, negCount, conjCount, relCount }, target, rng);
  const constrained = new Set(clues.flatMap(clueDims));
  const neutralDims = ALLDIMS.filter((d) => !constrained.has(d));

  const nDistract = nCands - 1;
  const wantNear = clamp(Math.round(candidateSimilarity * nDistract), 0, nDistract);
  const sets = planViolationSets(clues, nDistract, wantNear);

  const taken = new Set([figKey(target)]);
  const distractors = [];
  const allIds = clues.map((c) => c.clueId);
  for (let i = 0; i < sets.length; i++) {
    // Preferred profile first; if the figure space cannot supply another DISTINCT
    // figure with that profile (e.g. a two-valued dimension already used), widen the
    // profile by one more clue rather than repeating a candidate.
    const attempts = [sets[i]];
    for (const extra of allIds) if (!sets[i].includes(extra)) attempts.push([...sets[i], extra]);
    let chosen = null;
    for (const set of attempts) {
      for (const keepNeutral of set.length === 1 ? [true, false] : [false, true]) {
        for (let variant = i; variant < i + 40 && !chosen; variant++) {
          const cand = makeViolator(target, clues, set, variant, keepNeutral, neutralDims);
          const actual = clues.filter((c) => !clueHolds(c, cand)).map((c) => c.clueId);
          if (actual.slice().sort().join(',') !== set.slice().sort().join(',')) continue;
          if (taken.has(figKey(cand))) continue;
          chosen = { f: cand, v: set.slice() };
        }
        if (chosen) break;
      }
      if (chosen) break;
    }
    if (!chosen) throw new Error(`could not build a distractor violating ${sets[i].join('+')} (seed ${seed})`);
    taken.add(figKey(chosen.f));
    distractors.push(chosen);
  }

  // Display order: seeded shuffle, then the survivor is seated on the allocated
  // slot so the key's position carries no signal across the bank either.
  const seated = seatCorrect(shuffle([{ f: target, v: [] }, ...distractors], rng), (x) => x.v.length === 0, keyPosition);
  const lineup = seated.list;
  const candidates = lineup.map((x, i) => ({ key: OPTION_KEYS[i], figure: x.f }));

  let correctKey = null;
  const distractorRationales = {};
  lineup.forEach((x, i) => {
    const key = OPTION_KEYS[i];
    if (x.v.length === 0) {
      correctKey = key;
      distractorRationales[key] = {
        lure: 'correct',
        cluesViolated: [],
        note: 'the unique survivor: satisfies the conjunction of every clue',
      };
      return;
    }
    const violated = clues.filter((c) => x.v.includes(c.clueId));
    const first = violated[0];
    let lure = 'multi_clue_miss';
    if (x.v.length === 1) {
      if (first.form === 'not') lure = 'negation_trap';
      else if (first.form === 'and') lure = 'conjunction_partial';
      else if (first.kind === 'relational') lure = 'relational_miss';
      else lure = 'single_clue_miss';
    }
    distractorRationales[key] = {
      lure,
      cluesViolated: x.v.slice(),
      note:
        x.v.length === 1
          ? `near-miss: violates ${first.clueId} only (${first.label})`
          : `violates ${x.v.length} clues (${x.v.join(', ')})`,
    };
  });

  const cfg = { nClues, nCands, negCount, conjCount, relCount };
  const difficulty = round2(difficultyFromLevers(cfg, candidateSimilarity));

  return {
    itemId: seededUuid(seed),
    typeCode: 'FLU-DEDUCE-01',
    domain: 'fluid_reasoning',
    difficulty, // FLOAT 1..20 — DESIGN rung, not calibrated (validated:false)
    ageBands: ageBandsFor(difficulty),
    demoPath: 'demos/FLU-DEDUCE-01.html',
    content: {
      typeCode: 'FLU-DEDUCE-01',
      clueCount: nClues,
      candidateCount: nCands,
      // Clues in reveal order. Renderable stimulus: the child applies them one by
      // one. Nothing here names the survivor or ranks the candidates.
      clues: clues.map((c) => ({
        clueId: c.clueId,
        form: c.form,
        kind: c.kind,
        ...(c.form === 'and' ? { terms: c.terms.map((t) => ({ ...t })) } : { dim: c.dim, value: c.value }),
        label: c.label,
      })),
      candidates, // display order; renderable subset (no violation/answer data)
    },
    answer: {
      correctKey,
      targetFigure: { ...target },
      distractorRationales, // keyed by candidate key -> elimination-error taxonomy
    },
    scoring: { mode: 'deterministic_key' },
    provenance: {
      generator: 'grammar',
      generatorRef: 'flu-deduce-01-grammar@1',
      seed,
      levers: {
        nClues,
        nCands,
        negCount,
        conjCount,
        relCount,
        keyPosition: seated.slot, // resolved slot; replays the balanced key position
        // Full precision (not rounded): enables exact, reproducible regeneration.
        candidateSimilarity,
      },
    },
    syntheticOnly: true,
    validated: false,
  };
}

// Age-band targeting hint. This type EXCLUDES K-1 by design (spec age_rationale:
// negation + accumulating conjunction is unreliable in K-1); declared bands are
// 2-3 | 4-5 | 6-8. Boundary overlap is a targeting hint, not a hard cut.
export function ageBandsFor(difficulty) {
  const bands = [];
  const add = (b) => {
    if (!bands.includes(b)) bands.push(b);
  };
  if (difficulty < 9) add('2-3');
  if (difficulty >= 7.5 && difficulty < 13.5) add('4-5');
  if (difficulty >= 12) add('6-8');
  if (bands.length === 0) add(difficulty < 8 ? '2-3' : '6-8');
  return bands;
}

/* ================================================================== *
 * BANK BUILDER — fill each integer difficulty bin k=1..20 with >=perBin items
 * (BUILD_PLAN §0: >=5 per +/-1 pt band, gradual 1..20). Items in a bin spread
 * across reachable lever configs; candidate similarity is the continuous
 * fine-positioner within a bin.
 * ================================================================== */
export function buildBank({ perBin = 6 } = {}) {
  const items = [];
  const keyPosition = makeSlotAllocator(OPTION_KEYS.length);
  for (let k = 1; k <= 20; k++) {
    const lo = Math.max(1, k - 0.45);
    const hi = Math.min(20, k + 0.45);

    const segments = [];
    for (const cfg of ALLOWED_CONFIGS) {
      const a = Math.max(lo, difficultyFromLevers(cfg, 0));
      const b = Math.min(hi, difficultyFromLevers(cfg, 1));
      if (b > a + 1e-6) segments.push({ cfg, tLo: a, tHi: b });
    }
    if (segments.length === 0) throw new Error(`no reachable lever config for difficulty bin k=${k}`);

    // Stride through the segment list so a bin samples diverse clue/candidate mixes.
    const stride = Math.max(1, Math.floor(segments.length / perBin));
    const hits = segments.map(() => 0);
    for (let i = 0; i < perBin; i++) hits[(i * stride) % segments.length]++;
    const localSeen = segments.map(() => 0);

    for (let i = 0; i < perBin; i++) {
      const segIdx = (i * stride) % segments.length;
      const seg = segments[segIdx];
      const li = localSeen[segIdx]++;
      const t = seg.tLo + (seg.tHi - seg.tLo) * ((li + 0.5) / hits[segIdx]);
      const similarity = solveSimilarity(seg.cfg, t);
      const c = seg.cfg;
      const seed = `FLU-DEDUCE-01|bin=${k}|i=${i}|L${c.nClues}C${c.nCands}N${c.negCount}J${c.conjCount}R${c.relCount}`;
      items.push(genItem({ ...c, candidateSimilarity: similarity, keyPosition, seed }));
    }
  }
  return items;
}

/* ------------------------------------------------------------------ *
 * CLI entrypoint: write the bank + print a coverage summary.
 * ------------------------------------------------------------------ */
function isMain() {
  return process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
}
if (isMain()) {
  const perBin = Number(process.env.PER_BIN || 6);
  const items = buildBank({ perBin });
  const outPath = resolve(__dirname, '../banks/FLU-DEDUCE-01.jsonl');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, serializeBank(items));

  const bins = Array.from({ length: 20 }, () => 0);
  let min = Infinity;
  let max = -Infinity;
  for (const it of items) {
    const k = Math.round(it.difficulty);
    if (k >= 1 && k <= 20) bins[k - 1]++;
    min = Math.min(min, it.difficulty);
    max = Math.max(max, it.difficulty);
  }
  console.log(`FLU-DEDUCE-01 bank: ${items.length} items -> ${outPath}`);
  console.log(`difficulty span: ${round2(min)} .. ${round2(max)}  (target 1..20)`);
  console.log('per-bin counts (k: n):');
  console.log(bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join('  '));
  const short = bins.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < 5);
  console.log(short.length ? `SHORT BINS (<5): ${short.map((b) => b.k).join(',')}` : 'all bins >=5 OK');
}
