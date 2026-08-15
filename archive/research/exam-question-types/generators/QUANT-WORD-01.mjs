#!/usr/bin/env node
/**
 * QUANT-WORD-01 — "Story Model" structured word-problem bank generator.
 *
 * Emits a JSONL bank of BankItem rows conforming to the Adaptive Exam item
 * contract (docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md §2). Every item is
 * born-synthetic (syntheticOnly:true, validated:false); `difficulty` is a design
 * rung (FLOAT 1..20), NOT a calibrated IRT parameter.
 *
 * DEEP STRUCTURE vs SURFACE STORY
 * -------------------------------
 * The mathematics is produced by a deterministic grammar: a latent situation
 * graph (quantities + an ordered operation tree) is built first, then rendered
 * into English. The surface narrative — names, objects, containers, places,
 * verbs — is sampled from curated, reading-level-tagged word lists, so two items
 * with the same deep structure read as different stories while remaining exactly
 * as hard. Difficulty is therefore driven by
 *
 *   (a) number of reasoning steps            (1 -> 4)
 *   (b) relational complexity                (result-unknown -> change -> start /
 *                                             compare-referent -> multiplicative
 *                                             compare -> multi-step inverse)
 *   (c) presence of irrelevant information   (a distractor quantity in the story)
 *   (d) inverse / compare structure          (the arithmetic runs opposite to the
 *                                             keyword the story surface suggests)
 *
 * and NOT by arithmetic magnitude: every operand stays small and every division
 * is exact (or an explicit remainder question).
 *
 * READING GATE (D-017)
 * --------------------
 * Reading is a REQUIRED baseline-literacy capability, so the stimulus is on-screen
 * TEXT (never audio). The reading load must not exceed the item's target age band:
 * word lists are level-tagged (1 = grades 2-3, 2 = grades 4-5, 3 = grades 6-8) and
 * every item is re-measured (sentence count, word count, longest word) against the
 * caps for the LOWEST band it targets. Items over the cap are rejected and retried.
 *
 * KEY SAFETY
 * ----------
 * `ServedItem = BankItem minus { answer, scoring, provenance }` (BUILD_PLAN §2), so
 * EVERYTHING in `content` reaches the browser. `content` therefore carries only what
 * the renderer draws: the story text, the question, the four option values and the
 * reading-load metadata. The solvable math skeleton (quantities, operation tree,
 * answer step) lives in `answer.math`, which is stripped before serving.
 *
 * This is deliberate. An earlier revision kept the operation tree in `content.math`
 * on the grounds that it named no answer and stored no answer VALUE — but the tree
 * is *evaluable*, so any client could recompute the key without reading the story.
 * Absence of answer-ish field NAMES is not key safety; non-derivability is. The
 * checker loses nothing: it reads the full BankItem from the bank file, so it still
 * re-derives every answer from `answer.math` without trusting `answer.correctKey`.
 *
 * Usage:  node QUANT-WORD-01.mjs [--seed=<str>] [--per=<n>] [--out=<path>]
 * Default: seed "quant-word-01-v1", 11 items per rung x 20 rungs -> 220 items.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TYPE_CODE = 'QUANT-WORD-01';
const DOMAIN = 'quantitative';
const DEMO_PATH = 'demos/QUANT-WORD-01.html';
const GENERATOR_REF = 'QUANT-WORD-01-grammar@1';
const OPTION_KEYS = ['A', 'B', 'C', 'D'];
const VALUE_CAP = 999;                    // no option value may exceed this

/* ------------------------------------------------------------------ *
 * Seeded PRNG (deterministic, reproducible per provenance.seed)
 * ------------------------------------------------------------------ */
function xfnv1a(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
class Rng {
  constructor(seedStr) { this.seed = seedStr; this._r = mulberry32(xfnv1a(seedStr)); }
  next() { return this._r(); }
  int(lo, hi) { return lo + Math.floor(this.next() * (hi - lo + 1)); }
  pick(arr) { return arr[this.int(0, arr.length - 1)]; }
  chance(p) { return this.next() < p; }
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = this.int(0, i);[a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  uuid() {
    const b = Array.from({ length: 16 }, () => this.int(0, 255));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = b.map((x) => x.toString(16).padStart(2, '0'));
    return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10, 16).join('')}`;
  }
}

/* ================================================================== *
 * CURATED SURFACE WORD LISTS (level 1 = grades 2-3 reading, 2 = 4-5, 3 = 6-8)
 * Only the SURFACE varies here. None of these words changes the mathematics.
 * ================================================================== */
const NAMES = [
  { w: 'Mia', lvl: 1 }, { w: 'Ben', lvl: 1 }, { w: 'Ana', lvl: 1 }, { w: 'Sam', lvl: 1 },
  { w: 'Leo', lvl: 1 }, { w: 'Zoe', lvl: 1 }, { w: 'Kai', lvl: 1 }, { w: 'Ivy', lvl: 1 },
  { w: 'Max', lvl: 1 }, { w: 'Eve', lvl: 1 }, { w: 'Tom', lvl: 1 }, { w: 'Ruby', lvl: 1 },
  { w: 'Finn', lvl: 1 }, { w: 'Rosa', lvl: 1 }, { w: 'Nora', lvl: 1 }, { w: 'Omar', lvl: 1 },
  { w: 'Lily', lvl: 1 }, { w: 'Cleo', lvl: 1 }, { w: 'Hugo', lvl: 1 }, { w: 'June', lvl: 1 },
  { w: 'Theo', lvl: 1 }, { w: 'Nina', lvl: 1 }, { w: 'Amir', lvl: 1 }, { w: 'Jade', lvl: 1 },
  { w: 'Noah', lvl: 1 }, { w: 'Hana', lvl: 1 }, { w: 'Dev', lvl: 1 }, { w: 'Skye', lvl: 1 },
  { w: 'Priya', lvl: 2 }, { w: 'Diego', lvl: 2 }, { w: 'Yusuf', lvl: 2 }, { w: 'Elena', lvl: 2 },
  { w: 'Mateo', lvl: 2 }, { w: 'Aisha', lvl: 2 }, { w: 'Simone', lvl: 3 }, { w: 'Katarina', lvl: 3 },
];
const OBJECTS = [
  { s: 'shell', p: 'shells', lvl: 1 }, { s: 'rock', p: 'rocks', lvl: 1 },
  { s: 'bead', p: 'beads', lvl: 1 }, { s: 'card', p: 'cards', lvl: 1 },
  { s: 'coin', p: 'coins', lvl: 1 }, { s: 'apple', p: 'apples', lvl: 1 },
  { s: 'block', p: 'blocks', lvl: 1 }, { s: 'stamp', p: 'stamps', lvl: 1 },
  { s: 'seed', p: 'seeds', lvl: 1 }, { s: 'marble', p: 'marbles', lvl: 1 },
  { s: 'pencil', p: 'pencils', lvl: 1 }, { s: 'button', p: 'buttons', lvl: 1 },
  { s: 'ribbon', p: 'ribbons', lvl: 1 }, { s: 'acorn', p: 'acorns', lvl: 1 },
  { s: 'grape', p: 'grapes', lvl: 1 }, { s: 'pebble', p: 'pebbles', lvl: 1 },
  { s: 'crayon', p: 'crayons', lvl: 1 }, { s: 'ticket', p: 'tickets', lvl: 1 },
  { s: 'sticker', p: 'stickers', lvl: 1 }, { s: 'tile', p: 'tiles', lvl: 1 },
  { s: 'cube', p: 'cubes', lvl: 1 }, { s: 'petal', p: 'petals', lvl: 1 },
  { s: 'postcard', p: 'postcards', lvl: 2 }, { s: 'seashell', p: 'seashells', lvl: 2 },
  { s: 'notebook', p: 'notebooks', lvl: 2 }, { s: 'magnet', p: 'magnets', lvl: 2 },
  { s: 'feather', p: 'feathers', lvl: 2 }, { s: 'bracelet', p: 'bracelets', lvl: 2 },
  { s: 'token', p: 'tokens', lvl: 2 }, { s: 'sample', p: 'samples', lvl: 2 },
  { s: 'photograph', p: 'photographs', lvl: 3 }, { s: 'crystal', p: 'crystals', lvl: 3 },
  { s: 'canister', p: 'canisters', lvl: 3 }, { s: 'fossil', p: 'fossils', lvl: 3 },
];
const CONTAINERS = [
  { s: 'box', p: 'boxes', lvl: 1 }, { s: 'bag', p: 'bags', lvl: 1 },
  { s: 'jar', p: 'jars', lvl: 1 }, { s: 'cup', p: 'cups', lvl: 1 },
  { s: 'tray', p: 'trays', lvl: 1 }, { s: 'bin', p: 'bins', lvl: 1 },
  { s: 'basket', p: 'baskets', lvl: 1 }, { s: 'pack', p: 'packs', lvl: 1 },
  { s: 'row', p: 'rows', lvl: 1 }, { s: 'crate', p: 'crates', lvl: 2 },
  { s: 'folder', p: 'folders', lvl: 2 }, { s: 'carton', p: 'cartons', lvl: 2 },
  { s: 'bundle', p: 'bundles', lvl: 2 }, { s: 'case', p: 'cases', lvl: 2 },
];
// Every place must read naturally after "at the ...".
const PLACES = [
  { w: 'park', lvl: 1 }, { w: 'yard', lvl: 1 }, { w: 'shop', lvl: 1 }, { w: 'camp', lvl: 1 },
  { w: 'beach', lvl: 1 }, { w: 'farm', lvl: 1 }, { w: 'lake', lvl: 1 }, { w: 'fair', lvl: 1 },
  { w: 'garden', lvl: 1 }, { w: 'market', lvl: 2 }, { w: 'library', lvl: 2 }, { w: 'museum', lvl: 2 },
  { w: 'workshop', lvl: 3 },
];
const IRRELEVANT_NOUNS = [
  { p: 'hats', lvl: 1 }, { p: 'socks', lvl: 1 }, { p: 'caps', lvl: 1 }, { p: 'cups', lvl: 1 },
  { p: 'maps', lvl: 1 }, { p: 'keys', lvl: 1 }, { p: 'bells', lvl: 1 }, { p: 'kites', lvl: 1 },
  { p: 'pens', lvl: 1 }, { p: 'mugs', lvl: 1 }, { p: 'flags', lvl: 1 }, { p: 'boots', lvl: 1 },
  { p: 'plants', lvl: 2 }, { p: 'posters', lvl: 2 }, { p: 'puzzles', lvl: 2 },
];
// base = bare form (used in questions), s = present, past = past tense. Stories
// that open in the past ("had some at the start") must stay in the past.
const GAIN_VERBS = [
  { base: 'find', s: 'finds', past: 'found', lvl: 1 },
  { base: 'get', s: 'gets', past: 'got', lvl: 1 },
  { base: 'buy', s: 'buys', past: 'bought', lvl: 1 },
  { base: 'win', s: 'wins', past: 'won', lvl: 1 },
  { base: 'make', s: 'makes', past: 'made', lvl: 1 },
  { base: 'collect', s: 'collects', past: 'collected', lvl: 2 },
];

/* Reading-load caps by the LOWEST age band an item targets (D-017). */
const READING_CAPS = {
  '2-3': { maxSentences: 5, maxWords: 45, maxWordLength: 9 },
  '4-5': { maxSentences: 7, maxWords: 75, maxWordLength: 11 },
  '6-8': { maxSentences: 9, maxWords: 115, maxWordLength: 14 },
};

function atLevel(pool, lvl) { return pool.filter((x) => x.lvl <= lvl); }

function makeSurface(rng, lvl) {
  const names = rng.shuffle(atLevel(NAMES, lvl)).slice(0, 4).map((n) => n.w);
  const obj = rng.pick(atLevel(OBJECTS, lvl));
  // cont = the container the base situation groups into; cont2 = a DIFFERENT
  // container used by a re-packing clause, so a story never repacks a thing
  // into the same kind of container it is already in.
  const conts = rng.shuffle(atLevel(CONTAINERS, lvl)).slice(0, 2);
  const irr = rng.pick(atLevel(IRRELEVANT_NOUNS, lvl).filter((n) => n.p !== obj.p));
  return {
    A: names[0], B: names[1], C: names[2],
    names, obj, cont: conts[0], cont2: conts[1], irr,
    gain: rng.pick(atLevel(GAIN_VERBS, lvl)),
    place: rng.pick(atLevel(PLACES, lvl)).w,
  };
}
function partnerOf(su, holder) { return su.names.find((n) => n !== holder) || su.B; }
// A clause that STATES a second person's quantity must introduce someone whose
// amount the story has not already fixed, or the story contradicts itself
// ("Leo has 10 shells ... Leo has 6 shells").
function freshName(su, text) {
  return su.names.find((n) => !new RegExp(`\\b${n}\\b`).test(text)) || null;
}

/* ================================================================== *
 * SITUATION-GRAPH BUILDER (the deterministic mathematical deep structure)
 * Operands are ONLY {q:<quantityId>} or {s:<stepId>} — never literals — so every
 * number used by the mathematics is also a number printed in the story.
 * ================================================================== */
const Q = (id) => ({ q: id });
const S = (id) => ({ s: id });

function mkGraph() {
  const quantities = [], steps = [], vals = {};
  const st = { bad: false };
  let qi = 0, si = 0;
  const val = (o) => (o.q !== undefined ? vals[o.q] : o.s !== undefined ? vals[o.s] : o.lit);
  return {
    quantities, steps, vals,
    isBad: () => st.bad,
    valueOf: (o) => val(o),
    q(value, label, role = 'relevant') {
      if (!Number.isInteger(value) || value < 0) st.bad = true;
      const id = 'q' + (++qi);
      quantities.push({ id, value, role, label });
      vals[id] = value;
      return id;
    },
    step(op, a, b) {
      const id = 's' + (++si);
      const A = val(a), B = val(b);
      let r = NaN;
      if (op === 'add') r = A + B;
      else if (op === 'sub') r = A - B;
      else if (op === 'mul') r = A * B;
      else if (op === 'div') { if (B === 0 || A % B !== 0) st.bad = true; else r = A / B; }
      else if (op === 'mod') { if (B === 0) st.bad = true; else r = A % B; }
      if (!Number.isFinite(r) || r < 0 || r > VALUE_CAP) st.bad = true;
      steps.push({ id, op, a, b });
      vals[id] = r;
      return id;
    },
  };
}

/* ------------------------------------------------------------------ *
 * BASE SCHEMAS — one situation each (CGI semantic classes).
 * Each returns { schema, unknownPosition, relationalDepth, relational,
 *                chainable, sentences[], question, holder, unit, last }
 * or null when a numeric constraint cannot be met (caller retries).
 * ------------------------------------------------------------------ */
const BASES = {
  join_result(rng, cfg, su, g) {
    const n1 = rng.int(2, cfg.numMax), n2 = rng.int(2, cfg.numMax);
    if (n1 === n2) return null;
    const q1 = g.q(n1, `${su.A} at the start`), q2 = g.q(n2, `${su.A} gains`);
    const last = g.step('add', Q(q1), Q(q2));
    const open = rng.pick([
      `${su.A} has ${n1} ${su.obj.p}.`,
      `${su.A} starts with ${n1} ${su.obj.p}.`,
      `At the ${su.place}, ${su.A} has ${n1} ${su.obj.p}.`,
    ]);
    return {
      schema: 'join_result', unknownPosition: 'result', relationalDepth: 1,
      relational: false, chainable: true,
      sentences: [open, `${su.A} ${su.gain.s} ${n2} more ${su.obj.p}.`],
      question: rng.pick([
        `How many ${su.obj.p} does ${su.A} have now?`,
        `How many ${su.obj.p} does ${su.A} have in all?`,
      ]),
      holder: su.A, unit: su.obj, last,
    };
  },

  separate_result(rng, cfg, su, g) {
    const n1 = rng.int(4, cfg.numMax + 4), n2 = rng.int(2, Math.max(2, n1 - 2));
    if (n1 - n2 < 1 || n1 === n2) return null;
    const q1 = g.q(n1, `${su.A} at the start`), q2 = g.q(n2, `${su.A} loses`);
    const last = g.step('sub', Q(q1), Q(q2));
    const use = rng.pick([
      { ev: `${su.A} gives ${n2} ${su.obj.p} to ${su.B}.`, qn: `How many ${su.obj.p} does ${su.A} have left?` },
      { ev: `${su.A} uses ${n2} of the ${su.obj.p}.`, qn: `How many ${su.obj.p} are left?` },
      { ev: `${su.A} loses ${n2} ${su.obj.p} at the ${su.place}.`, qn: `How many ${su.obj.p} does ${su.A} have left?` },
    ]);
    return {
      schema: 'separate_result', unknownPosition: 'result', relationalDepth: 1,
      relational: false, chainable: true,
      sentences: [`${su.A} has ${n1} ${su.obj.p}.`, use.ev],
      question: use.qn, holder: su.A, unit: su.obj, last,
    };
  },

  compare_difference(rng, cfg, su, g) {
    const n1 = rng.int(5, cfg.numMax + 4), n2 = rng.int(2, Math.max(2, n1 - 2));
    if (n1 <= n2) return null;
    const q1 = g.q(n1, `${su.A} has`), q2 = g.q(n2, `${su.B} has`);
    const last = g.step('sub', Q(q1), Q(q2));
    return {
      schema: 'compare_difference', unknownPosition: 'difference', relationalDepth: 2,
      relational: true, chainable: false,
      sentences: [`${su.A} has ${n1} ${su.obj.p}.`, `${su.B} has ${n2} ${su.obj.p}.`],
      question: rng.pick([
        `How many more ${su.obj.p} does ${su.A} have than ${su.B}?`,
        `How many fewer ${su.obj.p} does ${su.B} have than ${su.A}?`,
      ]),
      holder: su.A, unit: su.obj, last,
    };
  },

  join_change(rng, cfg, su, g) {
    const n1 = rng.int(2, cfg.numMax), gainAmt = rng.int(2, cfg.numMax);
    const now = n1 + gainAmt;
    if (now > VALUE_CAP || gainAmt === n1) return null;
    const q1 = g.q(n1, `${su.A} at the start`), q2 = g.q(now, `${su.A} now`);
    const last = g.step('sub', Q(q2), Q(q1));
    return {
      schema: 'join_change', unknownPosition: 'change', relationalDepth: 2,
      relational: true, chainable: false,
      sentences: [
        `${su.A} had ${n1} ${su.obj.p}.`,
        `${su.A} ${su.gain.past} some more ${su.obj.p} at the ${su.place}.`,
        `Now ${su.A} has ${now} ${su.obj.p}.`,
      ],
      question: `How many ${su.obj.p} did ${su.A} ${su.gain.base}?`,
      holder: su.A, unit: su.obj, last,
    };
  },

  separate_change(rng, cfg, su, g) {
    const n1 = rng.int(6, cfg.numMax + 6), lost = rng.int(2, Math.max(2, n1 - 3));
    const now = n1 - lost;
    if (now < 1 || lost === now) return null;
    const q1 = g.q(n1, `${su.A} at the start`), q2 = g.q(now, `${su.A} now`);
    const last = g.step('sub', Q(q1), Q(q2));
    return {
      schema: 'separate_change', unknownPosition: 'change', relationalDepth: 2,
      relational: true, chainable: false,
      sentences: [
        `${su.A} had ${n1} ${su.obj.p}.`,
        `${su.A} gave some ${su.obj.p} to ${su.B}.`,
        `Now ${su.A} has ${now} ${su.obj.p}.`,
      ],
      question: `How many ${su.obj.p} did ${su.A} give to ${su.B}?`,
      holder: su.A, unit: su.obj, last,
    };
  },

  join_start(rng, cfg, su, g) {
    const start = rng.int(2, cfg.numMax), gainAmt = rng.int(2, cfg.numMax);
    const now = start + gainAmt;
    if (gainAmt === start || now > VALUE_CAP) return null;
    const q1 = g.q(gainAmt, `${su.A} gains today`), q2 = g.q(now, `${su.A} now`);
    const last = g.step('sub', Q(q2), Q(q1));
    return {
      schema: 'join_start', unknownPosition: 'start', relationalDepth: 3,
      relational: true, chainable: false,
      sentences: [
        `${su.A} ${su.gain.past} ${gainAmt} more ${su.obj.p} today.`,
        `Now ${su.A} has ${now} ${su.obj.p}.`,
      ],
      question: `How many ${su.obj.p} did ${su.A} have before today?`,
      holder: su.A, unit: su.obj, last,
    };
  },

  separate_start(rng, cfg, su, g) {
    const given = rng.int(2, cfg.numMax), now = rng.int(2, cfg.numMax + 4);
    if (given === now) return null;
    const q1 = g.q(given, `${su.A} gives away today`), q2 = g.q(now, `${su.A} now`);
    const last = g.step('add', Q(q2), Q(q1));
    return {
      schema: 'separate_start', unknownPosition: 'start', relationalDepth: 3,
      relational: true, chainable: false,
      sentences: [
        `${su.A} gave ${given} ${su.obj.p} to ${su.B} today.`,
        `Now ${su.A} has ${now} ${su.obj.p}.`,
      ],
      question: `How many ${su.obj.p} did ${su.A} have before today?`,
      holder: su.A, unit: su.obj, last,
    };
  },

  compare_referent_more(rng, cfg, su, g) {
    const n1 = rng.int(7, cfg.numMax + 6), d = rng.int(2, Math.max(2, n1 - 3));
    if (n1 - d < 1 || d === n1 - d) return null;
    const q1 = g.q(n1, `${su.A} has`), q2 = g.q(d, `${su.A} minus ${su.B}`);
    const last = g.step('sub', Q(q1), Q(q2));
    return {
      schema: 'compare_referent_more', unknownPosition: 'referent', relationalDepth: 3,
      relational: true, chainable: true,
      sentences: [`${su.A} has ${n1} ${su.obj.p}.`, `${su.A} has ${d} more ${su.obj.p} than ${su.B}.`],
      question: `How many ${su.obj.p} does ${su.B} have?`,
      holder: su.B, unit: su.obj, last,
    };
  },

  compare_referent_fewer(rng, cfg, su, g) {
    const n1 = rng.int(3, cfg.numMax), d = rng.int(2, cfg.numMax);
    if (d === n1 || n1 + d > VALUE_CAP) return null;
    const q1 = g.q(n1, `${su.A} has`), q2 = g.q(d, `${su.B} minus ${su.A}`);
    const last = g.step('add', Q(q1), Q(q2));
    return {
      schema: 'compare_referent_fewer', unknownPosition: 'referent', relationalDepth: 3,
      relational: true, chainable: true,
      sentences: [`${su.A} has ${n1} ${su.obj.p}.`, `${su.A} has ${d} fewer ${su.obj.p} than ${su.B}.`],
      question: `How many ${su.obj.p} does ${su.B} have?`,
      holder: su.B, unit: su.obj, last,
    };
  },

  equal_groups_product(rng, cfg, su, g) {
    const groups = rng.int(2, cfg.gMax), size = rng.int(2, cfg.sMax);
    if (groups === size) return null;
    const q1 = g.q(groups, `number of ${su.cont.p}`), q2 = g.q(size, `${su.obj.p} per ${su.cont.s}`);
    const last = g.step('mul', Q(q1), Q(q2));
    return {
      schema: 'equal_groups_product', unknownPosition: 'result', relationalDepth: 2,
      relational: false, chainable: true,
      sentences: [
        `${su.A} fills ${groups} ${su.cont.p} with ${su.obj.p}.`,
        `Each ${su.cont.s} holds ${size} ${su.obj.p}.`,
      ],
      question: `How many ${su.obj.p} does ${su.A} have in all?`,
      holder: su.A, unit: su.obj, last,
    };
  },

  equal_groups_size(rng, cfg, su, g) {
    const groups = rng.int(2, cfg.gMax), size = rng.int(2, cfg.sMax);
    const total = groups * size;
    if (groups === size || total > VALUE_CAP) return null;
    const q1 = g.q(total, `total ${su.obj.p}`), q2 = g.q(groups, `number of ${su.cont.p}`);
    const last = g.step('div', Q(q1), Q(q2));
    return {
      schema: 'equal_groups_size', unknownPosition: 'group_size', relationalDepth: 3,
      relational: false, chainable: true,
      sentences: [
        `${su.A} has ${total} ${su.obj.p}.`,
        `${su.A} puts the same number of ${su.obj.p} in each of ${groups} ${su.cont.p}.`,
      ],
      question: `How many ${su.obj.p} are in each ${su.cont.s}?`,
      holder: su.A, unit: su.obj, last,
    };
  },

  equal_groups_number(rng, cfg, su, g) {
    const groups = rng.int(2, cfg.gMax), size = rng.int(2, cfg.sMax);
    const total = groups * size;
    if (groups === size || total > VALUE_CAP) return null;
    const q1 = g.q(total, `total ${su.obj.p}`), q2 = g.q(size, `${su.obj.p} per ${su.cont.s}`);
    const last = g.step('div', Q(q1), Q(q2));
    return {
      schema: 'equal_groups_number', unknownPosition: 'group_count', relationalDepth: 3,
      relational: false, chainable: true,
      sentences: [
        `${su.A} has ${total} ${su.obj.p}.`,
        `${su.A} puts ${size} ${su.obj.p} in each ${su.cont.s}.`,
      ],
      question: `How many ${su.cont.p} does ${su.A} fill?`,
      holder: su.A, unit: su.cont, last,
    };
  },

  mult_compare_result(rng, cfg, su, g) {
    const n1 = rng.int(3, cfg.numMax), k = rng.int(2, 5);
    if (n1 * k > VALUE_CAP || n1 === k) return null;
    const q1 = g.q(n1, `${su.B} has`), q2 = g.q(k, 'times as many');
    const last = g.step('mul', Q(q1), Q(q2));
    return {
      schema: 'mult_compare_result', unknownPosition: 'result', relationalDepth: 2,
      relational: true, chainable: true,
      sentences: [`${su.B} has ${n1} ${su.obj.p}.`, `${su.A} has ${k} times as many ${su.obj.p} as ${su.B}.`],
      question: `How many ${su.obj.p} does ${su.A} have?`,
      holder: su.A, unit: su.obj, last,
    };
  },

  mult_compare_referent(rng, cfg, su, g) {
    const k = rng.int(2, 5), base = rng.int(2, Math.max(3, cfg.numMax - 6));
    const n1 = base * k;
    if (n1 > VALUE_CAP || base === k || n1 === k) return null;
    const q1 = g.q(n1, `${su.A} has`), q2 = g.q(k, 'times as many');
    const last = g.step('div', Q(q1), Q(q2));
    return {
      schema: 'mult_compare_referent', unknownPosition: 'referent', relationalDepth: 4,
      relational: true, chainable: true,
      sentences: [`${su.A} has ${n1} ${su.obj.p}.`, `${su.A} has ${k} times as many ${su.obj.p} as ${su.B}.`],
      question: `How many ${su.obj.p} does ${su.B} have?`,
      holder: su.B, unit: su.obj, last,
    };
  },

  rate_total(rng, cfg, su, g) {
    const rate = rng.int(2, cfg.sMax), days = rng.int(2, cfg.gMax);
    if (rate === days || rate * days > VALUE_CAP) return null;
    const q1 = g.q(rate, `${su.obj.p} per day`), q2 = g.q(days, 'days');
    const last = g.step('mul', Q(q1), Q(q2));
    return {
      schema: 'rate_total', unknownPosition: 'result', relationalDepth: 2,
      relational: false, chainable: true,
      sentences: [`${su.A} makes ${rate} ${su.obj.p} each day.`, `${su.A} works for ${days} days.`],
      question: `How many ${su.obj.p} does ${su.A} make in all?`,
      holder: su.A, unit: su.obj, last,
    };
  },

  remainder(rng, cfg, su, g) {
    const size = rng.int(3, cfg.sMax), groups = rng.int(2, cfg.gMax);
    const left = rng.int(1, size - 1);
    const total = groups * size + left;
    if (total > VALUE_CAP || total === size) return null;
    const q1 = g.q(total, `total ${su.obj.p}`), q2 = g.q(size, `${su.obj.p} per ${su.cont.s}`);
    const last = g.step('mod', Q(q1), Q(q2));
    return {
      schema: 'remainder', unknownPosition: 'remainder', relationalDepth: 3,
      relational: false, chainable: false,
      sentences: [
        `${su.A} has ${total} ${su.obj.p}.`,
        `${su.A} packs ${size} ${su.obj.p} into each ${su.cont.s}.`,
      ],
      question: `How many ${su.obj.p} are left over?`,
      holder: su.A, unit: su.obj, last,
    };
  },

  // Multi-step INVERSE: the story runs forward from an unknown start; the child
  // must undo every event in reverse order. Step count == number of events.
  inverse_chain(rng, cfg, su, g) {
    const events = cfg.events || 2;
    const start = rng.int(4, cfg.numMax);
    let cur = start;
    const plan = [];
    for (let i = 0; i < events; i++) {
      const wantGain = i === 0 ? rng.chance(0.6) : rng.chance(0.5);
      if (wantGain) {
        const m = rng.int(2, cfg.numMax);
        cur += m;
        plan.push({ kind: 'gain', m });
      } else {
        const m = rng.int(2, Math.max(2, cur - 2));
        if (cur - m < 1) return null;
        cur -= m;
        plan.push({ kind: 'lose', m });
      }
      if (cur > VALUE_CAP) return null;
    }
    if (cur < 1) return null;
    // A long chain of identical events reads as a list and only tests addition;
    // require both directions so the child must undo a mixed sequence.
    if (events >= 3 && !(plan.some((p) => p.kind === 'gain') && plan.some((p) => p.kind === 'lose'))) return null;
    const amounts = plan.map((p) => p.m);
    if (new Set([...amounts, cur, start]).size !== amounts.length + 2) return null; // keep every printed number distinct

    const qNow = g.q(cur, `${su.A} now`);
    const qEvents = plan.map((p, i) => g.q(p.m, `event ${i + 1} amount`));
    let last = qNow, lastRef = Q(qNow);
    for (let i = plan.length - 1; i >= 0; i--) {
      const op = plan[i].kind === 'gain' ? 'sub' : 'add';
      last = g.step(op, lastRef, Q(qEvents[i]));
      lastRef = S(last);
    }
    const sentences = [`${su.A} had some ${su.obj.p} at the start.`];
    plan.forEach((p, i) => {
      const lead = i === 0 ? '' : rng.pick(LEAD_INS);
      // A fresh verb per event keeps a four-event chain from reading as a list.
      const verb = rng.pick(atLevel(GAIN_VERBS, cfg.lvl)).past;
      sentences.push(p.kind === 'gain'
        ? `${lead}${su.A} ${verb} ${p.m} more ${su.obj.p}.`
        : `${lead}${su.A} gave ${p.m} ${su.obj.p} to ${partnerOf(su, su.A)}.`);
    });
    sentences.push(`Now ${su.A} has ${cur} ${su.obj.p}.`);
    return {
      schema: 'inverse_chain', unknownPosition: 'start', relationalDepth: 3 + events,
      relational: true, chainable: false,
      sentences,
      question: `How many ${su.obj.p} did ${su.A} have at the start?`,
      holder: su.A, unit: su.obj, last,
    };
  },
};

/* ------------------------------------------------------------------ *
 * CONTINUATION CLAUSES — append one reasoning step to a running quantity.
 * `terminal:true` clauses change the tracked unit or close the story, so they
 * may only be used as the LAST clause.
 * ------------------------------------------------------------------ */
// Lead-ins keep a chain of clauses from reading as the same sentence repeated.
const LEAD_INS = ['Then ', 'After that, ', 'Later, ', 'Next, '];

const EXTRAS = {
  gain: {
    terminal: false,
    apply(rng, cfg, su, st, g) {
      const m = rng.int(2, cfg.numMax);
      const qid = g.q(m, `${st.holder} gains`);
      const last = g.step('add', S(st.last), Q(qid));
      return {
        sentence: `${rng.pick(LEAD_INS)}${st.holder} ${su.gain.s} ${m} more ${st.unit.p}.`,
        question: `How many ${st.unit.p} does ${st.holder} have now?`,
        last, relational: false,
      };
    },
  },
  lose: {
    terminal: false,
    apply(rng, cfg, su, st, g) {
      const cap = Math.min(cfg.numMax, st.value - 1);
      if (cap < 2) return null;
      const m = rng.int(2, cap);
      const other = partnerOf(su, st.holder);
      const qid = g.q(m, `${st.holder} loses`);
      const last = g.step('sub', S(st.last), Q(qid));
      const verb = rng.pick([`gives ${m} ${st.unit.p} to ${other}`, `hands ${m} ${st.unit.p} to ${other}`, `uses ${m} ${st.unit.p}`]);
      return {
        sentence: `${rng.pick(LEAD_INS)}${st.holder} ${verb}.`,
        question: `How many ${st.unit.p} does ${st.holder} have left?`,
        last, relational: false,
      };
    },
  },
  times: {
    terminal: false,
    apply(rng, cfg, su, st, g) {
      const k = rng.int(2, 4);
      if (st.value * k > VALUE_CAP) return null;
      const other = st.fresh;
      if (!other) return null;
      const qid = g.q(k, 'times as many');
      const last = g.step('mul', S(st.last), Q(qid));
      return {
        sentence: `${other} has ${k} times as many ${st.unit.p} as ${st.holder}.`,
        question: `How many ${st.unit.p} does ${other} have?`,
        last, relational: true, holder: other,
      };
    },
  },
  combine: {
    terminal: true,
    apply(rng, cfg, su, st, g) {
      const m = rng.int(2, cfg.numMax);
      const other = st.fresh;
      if (!other) return null;
      const qid = g.q(m, `${other} brings`);
      const last = g.step('add', S(st.last), Q(qid));
      return {
        sentence: `${other} brings ${m} more ${st.unit.p}.`,
        question: `How many ${st.unit.p} do ${st.holder} and ${other} have in all?`,
        last, relational: false,
      };
    },
  },
  diffAgainst: {
    terminal: true,
    apply(rng, cfg, su, st, g) {
      const cap = Math.min(cfg.numMax, st.value - 1);
      if (cap < 2) return null;
      const m = rng.int(2, cap);
      const other = st.fresh;
      if (!other) return null;
      const qid = g.q(m, `${other} has`);
      const last = g.step('sub', S(st.last), Q(qid));
      return {
        sentence: `${other} has ${m} ${st.unit.p}.`,
        question: `How many more ${st.unit.p} does ${st.holder} have than ${other}?`,
        last, relational: true,
      };
    },
  },
  shareInto: {
    terminal: true,
    apply(rng, cfg, su, st, g) {
      const divisors = [];
      for (let d = 2; d <= 8; d++) if (st.value % d === 0 && st.value / d >= 1) divisors.push(d);
      if (!divisors.length) return null;
      const gcount = rng.pick(divisors);
      const qid = g.q(gcount, `number of ${su.cont2.p}`);
      const last = g.step('div', S(st.last), Q(qid));
      return {
        sentence: `Then ${st.holder} shares all of the ${st.unit.p} evenly among ${gcount} ${su.cont2.p}.`,
        question: `How many ${st.unit.p} are in each ${su.cont2.s}?`,
        last, relational: false,
      };
    },
  },
  packInto: {
    terminal: true,
    apply(rng, cfg, su, st, g) {
      const divisors = [];
      for (let d = 2; d <= 9; d++) if (st.value % d === 0 && st.value / d >= 2) divisors.push(d);
      if (!divisors.length) return null;
      const size = rng.pick(divisors);
      const qid = g.q(size, `${st.unit.p} per ${su.cont2.s}`);
      const last = g.step('div', S(st.last), Q(qid));
      return {
        sentence: `Then ${st.holder} moves all of the ${st.unit.p} into ${su.cont2.p}, with ${size} in each ${su.cont2.s}.`,
        question: `How many ${su.cont2.p} does ${st.holder} fill?`,
        last, relational: false,
      };
    },
  },
  leftover: {
    terminal: true,
    apply(rng, cfg, su, st, g) {
      const sizes = [];
      for (let d = 3; d <= 9; d++) if (st.value % d >= 1 && st.value > d) sizes.push(d);
      if (!sizes.length) return null;
      const size = rng.pick(sizes);
      const qid = g.q(size, `${st.unit.p} per ${su.cont2.s}`);
      const last = g.step('mod', S(st.last), Q(qid));
      return {
        sentence: `Then ${st.holder} moves the ${st.unit.p} into ${su.cont2.p}, with ${size} in each ${su.cont2.s}.`,
        question: `How many ${st.unit.p} are left over?`,
        last, relational: false,
      };
    },
  },
};

/* ------------------------------------------------------------------ *
 * IRRELEVANT-INFORMATION CLAUSE (never referenced by any step)
 * ------------------------------------------------------------------ */
const IRRELEVANT_TEMPLATES = [
  (su, x) => `${su.A} also has ${x} ${su.irr.p}.`,
  (su, x) => `${su.B} has ${x} ${su.irr.p} at home.`,
  (su, x) => `There are ${x} ${su.irr.p} on the shelf.`,
  (su, x) => `${su.A} keeps ${x} ${su.irr.p} in a drawer at home.`,
];

/* ================================================================== *
 * DIFFICULTY LADDER — rung (1..20) -> structural configuration.
 * The ramp is driven by step count, relational complexity, irrelevant
 * information and inverse/compare structure; operand size stays small.
 * ================================================================== */
const RUNGS = {
  1: { bases: ['join_result', 'separate_result'], extras: 0, irr: false, numMax: 5, lvl: 1 },
  2: { bases: ['join_result', 'separate_result'], extras: 0, irr: false, numMax: 9, lvl: 1 },
  3: { bases: ['join_result', 'separate_result', 'compare_difference'], extras: 0, irr: false, numMax: 12, lvl: 1 },
  4: { bases: ['join_result', 'separate_result', 'compare_difference'], extras: 0, irr: true, numMax: 12, lvl: 1 },
  5: { bases: ['join_change', 'separate_change'], extras: 0, irr: false, numMax: 14, lvl: 1 },
  6: { bases: ['join_start', 'separate_start'], extras: 0, irr: false, numMax: 16, lvl: 1 },
  7: { bases: ['compare_referent_more', 'compare_referent_fewer'], extras: 0, irr: false, numMax: 16, lvl: 1 },
  8: {
    bases: ['join_change', 'separate_change', 'compare_referent_more', 'compare_referent_fewer'],
    extras: 0, irr: true, numMax: 18, lvl: 2,
  },
  9: { bases: ['equal_groups_product', 'mult_compare_result', 'rate_total'], extras: 0, irr: false, numMax: 14, gMax: 5, sMax: 6, lvl: 2 },
  10: {
    bases: ['join_result', 'separate_result'], extras: 1,
    inter: ['gain', 'lose'], fin: ['gain', 'lose', 'diffAgainst', 'combine'],
    irr: false, numMax: 15, lvl: 2,
  },
  11: { bases: ['equal_groups_size', 'equal_groups_number'], extras: 0, irr: false, gMax: 6, sMax: 8, numMax: 16, lvl: 2 },
  12: {
    bases: ['join_result', 'separate_result'], extras: 1,
    inter: ['gain', 'lose'], fin: ['gain', 'lose', 'diffAgainst', 'combine'],
    irr: true, numMax: 15, lvl: 2,
  },
  13: {
    bases: ['equal_groups_product', 'rate_total'], extras: 1,
    inter: ['gain', 'lose'], fin: ['gain', 'lose', 'diffAgainst'],
    irr: false, numMax: 15, gMax: 5, sMax: 7, lvl: 2,
  },
  14: { bases: ['mult_compare_referent', 'equal_groups_size', 'equal_groups_number'], extras: 0, irr: true, gMax: 6, sMax: 9, numMax: 18, lvl: 2 },
  15: {
    bases: ['join_result', 'separate_result', 'equal_groups_product'], extras: 2,
    inter: ['gain', 'lose', 'times'], fin: ['gain', 'lose', 'diffAgainst', 'shareInto'],
    irr: false, numMax: 14, gMax: 4, sMax: 6, lvl: 3,
  },
  16: {
    bases: ['remainder', 'equal_groups_product', 'rate_total'], extras: 1,
    inter: ['gain'], fin: ['leftover', 'packInto', 'shareInto'],
    irr: false, numMax: 16, gMax: 5, sMax: 8, lvl: 3,
  },
  17: {
    bases: ['join_result', 'separate_result', 'equal_groups_product', 'mult_compare_result'], extras: 2,
    inter: ['gain', 'lose', 'times'], fin: ['gain', 'lose', 'diffAgainst', 'shareInto'],
    irr: true, numMax: 14, gMax: 4, sMax: 6, lvl: 3,
  },
  18: {
    bases: ['inverse_chain', 'mult_compare_referent', 'compare_referent_more'], extras: 1, events: 2,
    inter: ['gain', 'lose'], fin: ['gain', 'lose', 'diffAgainst', 'shareInto'],
    irr: false, numMax: 18, gMax: 5, sMax: 8, lvl: 3,
  },
  19: {
    bases: ['inverse_chain'], extras: 0, events: 3,
    irr: true, numMax: 20, lvl: 3,
  },
  20: {
    bases: ['inverse_chain'], extras: 0, events: 4,
    irr: true, numMax: 22, lvl: 3,
  },
};

function cfgFor(rung) {
  const base = RUNGS[rung];
  return Object.assign({ numMax: 12, gMax: 5, sMax: 6, events: 2, extras: 0, irr: false, lvl: 1 }, base);
}

// Age-band targeting hint. NOTE: the QUANT-WORD-01 catalog spec declares
// age_bands ["2-3","4-5","6-8"] — this type has NO K-1 band (constructing a
// situation model while holding a story relation is above the K-1 assumption).
// The 1..20 difficulty ladder still spans the full range; the floor rungs are
// simply the easiest items a grade 2-3 reader can take.
function ageBandsFor(rung) {
  if (rung <= 7) return ['2-3'];
  if (rung === 8) return ['2-3', '4-5'];
  if (rung <= 11) return ['4-5'];
  if (rung === 12) return ['4-5', '6-8'];
  return ['6-8'];
}

/* ------------------------------------------------------------------ *
 * Reading-load measurement (recomputed identically by the validator)
 * ------------------------------------------------------------------ */
function measureReading(sentences) {
  const text = sentences.join(' ');
  const words = text.split(/\s+/).filter(Boolean);
  const alpha = text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  return {
    sentences: sentences.length,
    words: words.length,
    maxWordLength: alpha.reduce((m, w) => Math.max(m, w.length), 0),
  };
}

/* ------------------------------------------------------------------ *
 * DISTRACTOR CONSTRUCTION — every lure carries a RECOMPUTABLE derivation.
 * A derivation is { steps:[...], value:<operand> } evaluated against the item's
 * quantity table; the validator re-evaluates it and must reproduce the option
 * value exactly. Lure taxonomy (M-LURETYPE / M-ERRTYPE):
 *   wrong_operation            — applied the wrong arithmetic operation
 *   off_by_one_step            — stopped one step short, or ran one step too far
 *   used_the_irrelevant_number — folded the story's irrelevant quantity in
 *   reversed_comparison        — ran the stated relation in the wrong direction
 *   miscount_by_one            — correct structure, slipped by one (fallback)
 * ------------------------------------------------------------------ */
const FLIP = { add: 'sub', sub: 'add', mul: 'div', div: 'mul', mod: 'div' };
const SECONDARY = { add: 'mul', sub: 'mul', mul: 'add', div: 'sub', mod: 'sub' };

function evalDerivation(quantities, derivation) {
  const vals = {};
  for (const q of quantities) vals[q.id] = q.value;
  const read = (o) => (o.q !== undefined ? vals[o.q] : o.s !== undefined ? vals[o.s] : o.lit);
  for (const st of derivation.steps) {
    const a = read(st.a), b = read(st.b);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    let r;
    if (st.op === 'add') r = a + b;
    else if (st.op === 'sub') r = a - b;
    else if (st.op === 'mul') r = a * b;
    else if (st.op === 'div') { if (b === 0 || a % b !== 0) return null; r = a / b; }
    else if (st.op === 'mod') { if (b === 0) return null; r = a % b; }
    else return null;
    vals[st.id] = r;
  }
  const v = read(derivation.value);
  return Number.isFinite(v) ? v : null;
}

function candidateLures(graph, ctx) {
  const { steps, quantities } = graph;
  const final = steps[steps.length - 1];
  const prefix = steps.slice(0, -1);
  const relational = ctx.relational;
  const irrId = ctx.irrelevantId;
  const answerValue = ctx.answerValue;
  // Plausibility ceiling: a distractor a child could actually land on. The sum
  // of the story's own quantities is the natural bound (combining everything is
  // the largest sensible slip); without a ceiling, "multiplied instead of added"
  // produces absurd options that are trivially eliminated and would flatter the
  // accuracy estimate.
  const quantitySum = quantities.reduce((s, q) => s + q.value, 0);
  const plausible = Math.max(4 * answerValue, quantitySum, 30);
  const out = [];

  // Candidates are added most-diagnostic-first within each lure class, and that
  // order is preserved during selection: "applied the inverse operation" beats
  // "multiplied instead" as an explanation of the same wrong-operation slip.
  const add = (lure, misconception, note, derivation) => {
    const value = evalDerivation(quantities, derivation);
    if (value === null || !Number.isInteger(value)) return;
    if (value < 1 || value > Math.min(VALUE_CAP, plausible)) return;
    out.push({ lure, misconception, note, derivation, value, order: out.length });
  };

  // --- operation errors -------------------------------------------------
  // On a relational story the flipped operation IS the reversed-relation error
  // (the child follows the surface keyword instead of the relation), so the two
  // labels never claim the same value.
  const flipD = (a, b) => ({ steps: [...prefix, { id: 'd1', op: FLIP[final.op], a, b }], value: S('d1') });
  const secondD = { steps: [...prefix, { id: 'd1', op: SECONDARY[final.op], a: final.a, b: final.b }], value: S('d1') };
  if (relational) {
    add('reversed_comparison', 'relation_direction_reversed',
      'ran the stated relation backwards (followed the comparison keyword instead of the relation)',
      flipD(final.a, final.b));
    add('reversed_comparison', 'relation_operands_swapped',
      'compared the two quantities in the wrong order', flipD(final.b, final.a));
    add('wrong_operation', 'substituted_unrelated_operation',
      `applied ${SECONDARY[final.op]} where the situation calls for ${final.op}`, secondD);
  } else {
    add('wrong_operation', 'inverse_operation_applied',
      `applied ${FLIP[final.op]} where the situation calls for ${final.op}`, flipD(final.a, final.b));
    add('wrong_operation', 'inverse_operation_applied_reversed',
      `applied ${FLIP[final.op]} to the two quantities in the other order`, flipD(final.b, final.a));
    add('wrong_operation', 'substituted_unrelated_operation',
      `applied ${SECONDARY[final.op]} where the situation calls for ${final.op}`, secondD);
  }

  // --- step-count errors -------------------------------------------------
  if (steps.length >= 2) {
    add('off_by_one_step', 'stopped_one_step_short',
      'reported the intermediate result and never completed the last step',
      { steps: prefix, value: S(prefix[prefix.length - 1].id) });
  }
  add('off_by_one_step', 'ran_one_step_too_far',
    'repeated the final operation once more than the story asks for',
    { steps: [...steps, { id: 'd1', op: final.op, a: S(final.id), b: final.b }], value: S('d1') });
  if (final.a.q !== undefined) {
    add('off_by_one_step', 'read_off_a_given_number',
      'answered with a number lifted straight from the story instead of operating on it',
      { steps: [], value: final.a });
  }

  // --- irrelevant-information errors ------------------------------------
  if (irrId) {
    add('used_the_irrelevant_number', 'irrelevant_quantity_substituted',
      'used the story number that plays no part in the question',
      { steps: [...prefix, { id: 'd1', op: final.op, a: final.a, b: Q(irrId) }], value: S('d1') });
    add('used_the_irrelevant_number', 'irrelevant_quantity_added',
      'added the unrelated story quantity onto an otherwise correct answer',
      { steps: [...steps, { id: 'd1', op: 'add', a: S(final.id), b: Q(irrId) }], value: S('d1') });
  }

  // --- counting slips (fallback only, keeps 4 options always fillable) ---
  add('miscount_by_one', 'counted_one_too_many',
    'correct structure, counted one too many', { steps: [...steps, { id: 'd1', op: 'add', a: S(final.id), b: { lit: 1 } }], value: S('d1') });
  add('miscount_by_one', 'counted_one_too_few',
    'correct structure, counted one too few', { steps: [...steps, { id: 'd1', op: 'sub', a: S(final.id), b: { lit: 1 } }], value: S('d1') });
  add('miscount_by_one', 'counted_two_too_many',
    'correct structure, counted two too many', { steps: [...steps, { id: 'd1', op: 'add', a: S(final.id), b: { lit: 2 } }], value: S('d1') });

  return out;
}

// Pick three distinct-valued lures. The primary taxonomy is preferred and the
// preference order rotates across the bank so every lure class stays well
// represented (M-LURETYPE needs a spread, not a single dominant class).
const PRIMARY_LURES = ['wrong_operation', 'off_by_one_step', 'used_the_irrelevant_number', 'reversed_comparison'];
function chooseDistractors(rng, cands, answerValue, ordinal) {
  const rot = ordinal % PRIMARY_LURES.length;
  const order = [...PRIMARY_LURES.slice(rot), ...PRIMARY_LURES.slice(0, rot)];
  const rank = (c) => {
    const i = order.indexOf(c.lure);
    return i === -1 ? 90 : i;
  };
  const pool = cands.slice().sort((a, b) => rank(a) - rank(b) || a.order - b.order);
  const chosen = [];
  const usedValues = new Set([answerValue]);
  const usedLures = new Set();
  // first pass: one per distinct lure class, in the rotated preference order
  for (const c of pool) {
    if (chosen.length >= 3) break;
    if (usedValues.has(c.value) || usedLures.has(c.lure)) continue;
    chosen.push(c); usedValues.add(c.value); usedLures.add(c.lure);
  }
  // second pass: allow a repeated lure class with a different misconception
  for (const c of pool) {
    if (chosen.length >= 3) break;
    if (usedValues.has(c.value)) continue;
    chosen.push(c); usedValues.add(c.value);
  }
  return chosen.length === 3 ? chosen : null;
}

/* ------------------------------------------------------------------ *
 * Build one verified BankItem for a difficulty rung
 * ------------------------------------------------------------------ */
function buildItem(masterSeed, rung, ordinal, seenStories) {
  const MAX_TRIES = 900;
  const bands = ageBandsFor(rung);
  const caps = READING_CAPS[bands[0]];

  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const seed = `${masterSeed}:${TYPE_CODE}:d${rung}:i${ordinal}:a${attempt}`;
    const rng = new Rng(seed);
    const cfg = cfgFor(rung);
    const su = makeSurface(rng, cfg.lvl);
    const g = mkGraph();

    // --- base situation ---
    const baseId = rng.pick(cfg.bases);
    const base = BASES[baseId](rng, cfg, su, g);
    if (!base || g.isBad()) continue;
    // A situation that closes itself (a difference, a remainder, a recovered
    // start value) cannot take a continuation clause without reading oddly.
    const extrasCount = base.chainable ? cfg.extras : 0;

    const sentences = base.sentences.slice();
    let question = base.question;
    let relational = base.relational;
    const state = { holder: base.holder, unit: base.unit, last: base.last, value: g.vals[base.last] };

    // --- continuation clauses ---
    let ok = true;
    for (let e = 0; e < extrasCount; e++) {
      const isLast = e === extrasCount - 1;
      const pool = (isLast ? cfg.fin : cfg.inter) || [];
      const usable = pool.filter((n) => EXTRAS[n] && (isLast || !EXTRAS[n].terminal));
      if (!usable.length) { ok = false; break; }
      state.fresh = freshName(su, sentences.join(' '));
      const applied = EXTRAS[rng.pick(usable)].apply(rng, cfg, su, state, g);
      if (!applied || g.isBad()) { ok = false; break; }
      sentences.push(applied.sentence);
      question = applied.question;
      if (applied.relational) relational = true;
      if (applied.holder) state.holder = applied.holder;
      state.last = applied.last;
      state.value = g.vals[applied.last];
    }
    if (!ok || g.isBad()) continue;

    const answerStep = state.last;
    const answerValue = g.vals[answerStep];
    if (!Number.isInteger(answerValue) || answerValue < 1 || answerValue > VALUE_CAP) continue;

    // --- irrelevant information ---
    let irrelevantId = null;
    if (cfg.irr) {
      const used = new Set(g.quantities.map((q) => q.value));
      let x = null;
      for (let t = 0; t < 30; t++) {
        const c = rng.int(2, Math.max(4, cfg.numMax));
        if (!used.has(c) && c !== answerValue) { x = c; break; }
      }
      if (x === null) continue;
      irrelevantId = g.q(x, 'unrelated story quantity', 'irrelevant');
      // Placed on a clause boundary — after the base situation or at the end of
      // the story — so it never splits a coupled pair of setup sentences.
      const spots = [base.sentences.length, sentences.length];
      if (base.schema === 'inverse_chain') spots.push(1);
      sentences.splice(rng.pick([...new Set(spots)]), 0, rng.pick(IRRELEVANT_TEMPLATES)(su, x));
    }

    // --- text <-> structure invariant: the numerals printed in the story are a
    //     BIJECTION onto the declared quantities, and the question prints none ---
    const storyText = [...sentences, question].join(' ');
    const printed = (storyText.match(/\d+/g) || []).map(Number).sort((a, b) => a - b);
    const declared = g.quantities.map((q) => q.value).sort((a, b) => a - b);
    if (printed.length !== declared.length) continue;
    if (printed.some((v, i) => v !== declared[i])) continue;
    if (new Set(printed).size !== printed.length) continue;
    if (/\d/.test(question)) continue;

    // --- reading gate (D-017): load must not exceed the target band ---
    const reading = measureReading([...sentences, question]);
    if (reading.sentences > caps.maxSentences) continue;
    if (reading.words > caps.maxWords) continue;
    if (reading.maxWordLength > caps.maxWordLength) continue;

    // --- surface uniqueness across the whole bank ---
    if (seenStories.has(storyText)) continue;

    // --- distractors ---
    const cands = candidateLures(g, { relational, irrelevantId, answerValue });
    const distractors = chooseDistractors(rng, cands, answerValue, ordinal + rung);
    if (!distractors) continue;

    // --- options (correct + 3 lures, shuffled; keys by final position) ---
    const optDefs = rng.shuffle([
      { value: answerValue, _correct: true },
      ...distractors.map((d) => ({ value: d.value, lure: d })),
    ]);
    const options = optDefs.map((o, i) => ({ key: OPTION_KEYS[i], value: o.value }));
    if (new Set(options.map((o) => o.value)).size !== 4) continue;
    const correctKey = OPTION_KEYS[optDefs.findIndex((o) => o._correct)];
    const distractorRationales = {};
    optDefs.forEach((o, i) => {
      if (o._correct) return;
      distractorRationales[OPTION_KEYS[i]] = {
        lure: o.lure.lure,
        misconception: o.lure.misconception,
        note: o.lure.note,
        derivation: o.lure.derivation,
      };
    });

    // --- difficulty float: rung + jitter (|jitter| < 0.5 keeps the bin stable)
    const jitter = (rng.next() - 0.5) * 0.84;
    const difficulty = Math.min(20, Math.max(1, Math.round((rung + jitter) * 100) / 100));

    // content = the ServedItem payload: exactly what the renderer draws. It holds
    // no operation tree, no operand table and no answer value, so the key cannot be
    // derived from it — the child must build the situation model from the prose.
    const content = {
      typeCode: TYPE_CODE,
      presentation: 'text',                       // D-017: on-screen text, never audio
      prompt: 'Read the story. Then choose the number that answers the question.',
      storyText,
      storySentences: sentences.slice(),
      question,
      options,
      readingLoad: { ...reading, band: bands[0] },
    };

    // Server-only solvable skeleton. Lives under `answer` so it is stripped from the
    // ServedItem, while the validator (which reads whole BankItems) still recomputes
    // every key from it independently.
    const math = {
      schema: base.schema,
      unknownPosition: base.unknownPosition,
      stepCount: g.steps.length,
      relationalDepth: base.relationalDepth + extrasCount,
      quantities: g.quantities.map((q) => ({ id: q.id, value: q.value })),
      operations: g.steps.map((s) => s.op),
      steps: g.steps.map((s) => ({ id: s.id, op: s.op, a: s.a, b: s.b })),
      answerStep,
    };

    seenStories.add(storyText);
    return {
      itemId: rng.uuid(),
      typeCode: TYPE_CODE,
      domain: DOMAIN,
      difficulty,
      ageBands: bands,
      demoPath: DEMO_PATH,
      content,
      answer: { correctKey, math, distractorRationales },
      scoring: { mode: 'deterministic_key' },
      provenance: {
        generator: 'grammar',
        generatorRef: GENERATOR_REF,
        seed,
        rung,
        schema: base.schema,
        levers: {
          difficultyRung: rung,
          stepCount: g.steps.length,
          unknownPosition: base.unknownPosition,
          relationalDepth: base.relationalDepth + extrasCount,
          relational,
          irrelevantCount: irrelevantId ? 1 : 0,
          readingLevel: cfg.lvl,
          aboveLevel: rung >= 16,
          surface: { object: su.obj.p, container: su.cont.p, actors: su.names.slice(0, 2) },
        },
        quantityRoles: g.quantities.map((q) => ({ id: q.id, role: q.role, label: q.label })),
        validator: [
          { check: 'unique_answer', status: 'pass', detail: 'operation tree evaluates to exactly one value' },
          { check: 'key_matches_solver', status: 'pass' },
          { check: 'text_matches_structure', status: 'pass', detail: 'printed numerals == declared quantities' },
          {
            check: 'no_key_leak', status: 'pass',
            detail: 'content names no answer field AND carries no operation tree, so the key is not derivable from the ServedItem',
          },
          { check: 'lure_taxonomy_ok', status: 'pass' },
          {
            check: 'reading_load_ok', status: 'pass',
            detail: `band ${bands[0]}: ${reading.sentences} sentences / ${reading.words} words / longest ${reading.maxWordLength}`,
          },
        ],
      },
      syntheticOnly: true,
      validated: false,
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/); return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  }));
  const masterSeed = args.seed || 'quant-word-01-v1';
  const perRung = parseInt(args.per || '11', 10);
  const outPath = resolve(HERE, args.out || '../banks/QUANT-WORD-01.jsonl');
  mkdirSync(dirname(outPath), { recursive: true });

  const items = [];
  const perRungCount = {};
  const seenStories = new Set();
  for (let rung = 1; rung <= 20; rung++) {
    let made = 0;
    for (let ordinal = 0; ordinal < perRung; ordinal++) {
      const it = buildItem(masterSeed, rung, ordinal, seenStories);
      if (it) { items.push(it); made++; }
    }
    perRungCount[rung] = made;
  }

  writeFileSync(outPath, serializeBank(items), 'utf8');

  // Density contract: a SLIDING WINDOW two points wide. For every point k in 1..20,
  // the items within +/-1.0 of k must number >= 5. (The per-integer-bin count below
  // is a stricter one-point-wide bin, reported for information only.)
  const bins = Array.from({ length: 20 }, () => 0);
  const bands = Array.from({ length: 20 }, () => 0);
  for (const it of items) {
    bins[Math.round(it.difficulty) - 1]++;
    for (let k = 1; k <= 20; k++) if (Math.abs(it.difficulty - k) <= 1.0) bands[k - 1]++;
  }
  const schemas = {}, lures = {}, stepHist = {};
  for (const it of items) {
    schemas[it.provenance.schema] = (schemas[it.provenance.schema] || 0) + 1;
    stepHist[it.answer.math.stepCount] = (stepHist[it.answer.math.stepCount] || 0) + 1;
    for (const r of Object.values(it.answer.distractorRationales)) lures[r.lure] = (lures[r.lure] || 0) + 1;
  }

  console.log(`\nQUANT-WORD-01 bank written: ${outPath}`);
  console.log(`items: ${items.length}  (target ${perRung}/rung x 20 rungs)`);
  console.log('\nrung -> made:');
  console.log('  ' + Array.from({ length: 20 }, (_, i) => `${i + 1}:${perRungCount[i + 1]}`).join('  '));
  console.log('\n+/-1pt sliding window (CONTRACT, need >=5):');
  console.log('  ' + bands.map((n, i) => `${i + 1}:${n}`).join('  '));
  console.log('\ninteger difficulty bins (informational, stricter):');
  console.log('  ' + bins.map((n, i) => `${i + 1}:${n}`).join('  '));
  console.log('\nschemas: ' + JSON.stringify(schemas));
  console.log('step counts: ' + JSON.stringify(stepHist));
  console.log('lure classes: ' + JSON.stringify(lures));
  console.log('unique story texts: ' + seenStories.size);

  const thin = bands.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < 5);
  if (thin.length) {
    console.log(`\nFAIL thin +/-1pt windows (<5): ${thin.map((b) => `${b.k}:${b.n}`).join(', ')}`);
    process.exitCode = 1;
    return;
  }
  console.log('\nOK: every +/-1pt window around 1..20 holds >=5 items. Run check-QUANT-WORD-01.mjs to validate.');
}

main();
