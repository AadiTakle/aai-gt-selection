// WM-gate-01 "Gatekeeper" — structured bank generator (Bucket A: grammar).
//
// Emits a STRUCTURED item bank (JSONL) conforming to EXAM_ADAPTIVE_BUILD_PLAN.md §2
// (BankItem). WORKING-MEMORY family, RUNNING-MEMORY branch: the "item" is a whole
// timed STREAM plus a schedule of surprise checkpoints. Unlike a span task there is
// no single terminal recall — the child must keep a rolling window live across
// SEVERAL probes inside one item, which is what makes this an updating/gating
// measure rather than a storage measure.
//
// Three shells, all on the same 1..20 ladder:
//   creature_lastk  — tap back the last k creatures, in order.
//   keep_track      — tap the most recent creature of each asked colour family
//                     (Yntema-style category keep-track).
//   numeric_running — a running total is updated by the stream; the probe asks
//                     for its current value (age-gated to 4-5 and 6-8).
//
// Because there are several probes per item, ONE item yields a within-item
// accuracy-by-k slope (M-UPDATECOST) and a polytomous partial-credit score
// (M-POLY) — the reason k VARIES across the probes inside an item.
//
// Governance: born-synthetic only (syntheticOnly:true, validated:false). The
// `difficulty` float is a DESIGN rung, NOT a calibrated IRT parameter.
//
// CONSTRUCT NOTE: the stream inherently contains every answer, and it must keep
// running between probes, so it can never be handed to the checkpoint UI. The
// renderer builds a SEALED stream player that owns the schedule and then deletes
// content.presentation from its served copy immediately; the checkpoint panel
// reads only `responsePhase.probePlan` (how many taps, which palette, which
// families are asked). Checkpoints are untimed.
//
// Run:  node research/exam-question-types/generators/WM-gate-01.mjs
//       writes ../banks/WM-gate-01.jsonl and prints a coverage summary.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------ *
 * Seeded RNG (xmur3 -> mulberry32).
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
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

/* ------------------------------------------------------------------ *
 * Creature vocabulary. Two shapes per colour family, so "the most recent RED
 * creature" is a real keep-track question rather than a restatement of the
 * colour. Word labels keep the palette readable (D-017 reading gate).
 * ------------------------------------------------------------------ */
export const FAMILIES = [
  { hue: 'coral', word: 'Red' },
  { hue: 'teal', word: 'Green' },
  { hue: 'blue', word: 'Blue' },
  { hue: 'gold', word: 'Yellow' },
];
export const SHAPES_PER_FAMILY = [
  ['cat', 'bird'],
  ['fish', 'bug'],
  ['rabbit', 'bear'],
  ['frog', 'turtle'],
];
const SHAPE_WORD = { cat: 'Cat', bird: 'Bird', fish: 'Fish', bug: 'Bug', rabbit: 'Rabbit', bear: 'Bear', frog: 'Frog', turtle: 'Turtle' };

export function buildPalette(paletteSize) {
  const familyCount = paletteSize / 2;
  const tokens = [];
  for (let f = 0; f < familyCount; f++)
    for (const shape of SHAPES_PER_FAMILY[f]) {
      tokens.push({
        key: `t${tokens.length + 1}`,
        shape,
        hue: FAMILIES[f].hue,
        family: FAMILIES[f].hue,
        label: `${FAMILIES[f].word} ${SHAPE_WORD[shape]}`,
      });
    }
  return tokens;
}

/* ================================================================== *
 * DIFFICULTY MODEL — from the type's declared difficulty_levers:
 *   k | probe frequency and unpredictability | stream rate | numeric step size |
 *   number of families | palette similarity.
 *
 * Grounded in Oberauer (2002): the accessible focus of attention is small, so k
 * (how many recent items must stay live) is the coarse rung. Stream rate and
 * probe density move together as one continuous PRESSURE (the fine-positioner).
 * ================================================================== */
export const K_MIN = 2;
export const K_MAX_CEIL = 5;
const K_STEP = 2.9;
const SHELL_LOAD = { creature_lastk: 0, keep_track: 1.8, numeric_running: 3.0 };
const FAMILY_STEP = 0.45; // per palette token above 4
const PRESSURE_SPAN = 3.6;

const PACE_SLOW_MS = 1300;
const PACE_FAST_MS = 550;

export function paceMsFromPressure(p) {
  return Math.round(PACE_SLOW_MS - (PACE_SLOW_MS - PACE_FAST_MS) * clamp(p, 0, 1));
}
export function probeCountFromPressure(p) {
  return 3 + Math.round(2 * clamp(p, 0, 1)); // 3..5 checkpoints per stream
}
export function numericStepMaxFromPressure(p) {
  return 2 + Math.round(2 * clamp(p, 0, 1)); // add sizes 1..2 up to 1..4
}

function rawScore(kMax, shell, paletteSize, pressure) {
  return (
    1.0 +
    K_STEP * (kMax - K_MIN) +
    SHELL_LOAD[shell] +
    FAMILY_STEP * (paletteSize - 4) +
    PRESSURE_SPAN * clamp(pressure, 0, 1)
  );
}
const RAW_MIN = rawScore(K_MIN, 'creature_lastk', 4, 0); // 1.0
const RAW_MAX = rawScore(K_MAX_CEIL, 'numeric_running', 8, 1); // 18.1

export function difficultyFromLevers(kMax, shell, paletteSize, pressure) {
  const raw = rawScore(kMax, shell, paletteSize, pressure);
  return clamp(1 + ((raw - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN), 1, 20);
}
function solvePressure(kMax, shell, paletteSize, targetD) {
  const rawNeeded = RAW_MIN + ((targetD - 1) * (RAW_MAX - RAW_MIN)) / 19;
  const base = rawScore(kMax, shell, paletteSize, 0);
  return clamp((rawNeeded - base) / PRESSURE_SPAN, 0, 1);
}

/* Config constraints:
 *  - last-k needs a palette bigger than the window, or the window contains
 *    forced repeats and "the last k" stops being k separate items;
 *  - keep-track can only ask for as many families as exist;
 *  - the numeric shell is age-gated, so it is withheld below k=3 (the smallest
 *    update run worth probing at 4-5 and above). */
export const ALLOWED_CONFIGS = (() => {
  const out = [];
  for (const shell of ['creature_lastk', 'keep_track', 'numeric_running'])
    for (const paletteSize of [4, 6, 8])
      for (let kMax = K_MIN; kMax <= K_MAX_CEIL; kMax++) {
        if (shell === 'creature_lastk' && kMax > paletteSize - 1) continue;
        if (shell === 'keep_track' && kMax > paletteSize / 2) continue;
        if (shell === 'numeric_running' && kMax < 3) continue;
        out.push({ kMax, shell, paletteSize });
      }
  return out;
})();

/* ================================================================== *
 * STREAM GRAMMAR
 * ================================================================== */
const LEAD_IN_MS = 900;
const PROBE_PANEL_MS = 600; // gate-close beat before the checkpoint accepts taps

// k varies across the probes inside one item so the within-item accuracy-by-k
// slope (M-UPDATECOST) is estimable from a single administration.
function probeKs(kMax, probeCount) {
  const lo = Math.max(K_MIN, kMax - 2);
  const ks = [];
  for (let i = 0; i < probeCount; i++) ks.push(lo + (i % (kMax - lo + 1)));
  // Always exercise the ceiling at least once.
  if (!ks.includes(kMax)) ks[ks.length - 1] = kMax;
  return ks;
}

function sampleCreatureStream({ kMax, paletteSize, probeCount, palette, rng }) {
  const events = [];
  const probes = [];
  const ks = probeKs(kMax, probeCount);
  let cursor = 0;
  const pushEvent = () => {
    // No token may repeat inside the widest window, so "the last k" is always k
    // distinct creatures and the response is unambiguous.
    const banned = new Set(events.slice(-kMax).map((e) => e.tokenKey));
    const options = palette.filter((t) => !banned.has(t.key));
    const tok = pick(options.length ? options : palette, rng);
    events.push({ index: events.length, tokenKey: tok.key });
    cursor++;
  };
  // Unpredictable spacing: the child must not be able to count down to a
  // checkpoint. Drawn first so a run of identical draws can be broken.
  const gaps = [];
  for (let pi = 0; pi < probeCount; pi++) gaps.push(kMax + 1 + Math.floor(rng() * 3));
  if (new Set(gaps).size === 1) gaps[gaps.length - 1] += 1;
  for (let pi = 0; pi < probeCount; pi++) {
    for (let i = 0; i < gaps[pi]; i++) pushEvent();
    probes.push({ probeIndex: pi + 1, afterEventIndex: events.length - 1, k: ks[pi] });
  }
  return { events, probes };
}

function sampleNumericStream({ kMax, probeCount, stepMax, rng }) {
  const events = [];
  const probes = [];
  const ks = probeKs(kMax, probeCount);
  events.push({ index: 0, kind: 'set', value: 1 + Math.floor(rng() * 5), display: null });
  events[0].display = `START ${events[0].value}`;
  const runs = [];
  for (let pi = 0; pi < probeCount; pi++) runs.push(ks[pi] + Math.floor(rng() * 2)); // unpredictable run length
  if (new Set(runs).size === 1) runs[runs.length - 1] += 1;
  for (let pi = 0; pi < probeCount; pi++) {
    for (let i = 0; i < runs[pi]; i++) {
      const v = 1 + Math.floor(rng() * stepMax);
      events.push({ index: events.length, kind: 'add', value: v, display: `+ ${v}` });
    }
    probes.push({ probeIndex: pi + 1, afterEventIndex: events.length - 1, k: ks[pi], updateRun: runs[pi] });
  }
  return { events, probes };
}

/**
 * Generate ONE structured BankItem.
 * @param {{kMax:number, shell:string, paletteSize:number, pressure:number, seed:string}} lever
 */
export function genItem({ kMax, shell, paletteSize, pressure, seed }) {
  const rng = makeRng(seed);
  const paceMs = paceMsFromPressure(pressure);
  const probeCount = probeCountFromPressure(pressure);
  const palette = buildPalette(paletteSize);
  const familyHues = [...new Set(palette.map((t) => t.family))];
  const stepMax = numericStepMaxFromPressure(pressure);

  const built =
    shell === 'numeric_running'
      ? sampleNumericStream({ kMax, probeCount, stepMax, rng })
      : sampleCreatureStream({ kMax, paletteSize, probeCount, palette, rng });
  const events = built.events;
  const probes = built.probes;

  // ---- Wall-clock schedule. Every event has an onset; each checkpoint pauses
  // the stream, so later events are pushed back by the checkpoints before them.
  const dwellMs = Math.round(paceMs * 0.68);
  let t = LEAD_IN_MS;
  const probeAfter = new Map(probes.map((p) => [p.afterEventIndex, p]));
  for (const e of events) {
    e.atMs = t;
    e.dwellMs = dwellMs;
    t += paceMs;
    const pr = probeAfter.get(e.index);
    if (pr) {
      pr.gateClosesAtMs = t;
      pr.opensAtMs = t + PROBE_PANEL_MS;
      // The checkpoint is UNTIMED: the stream cannot resume until the child
      // answers, so the schedule after a probe is relative, not absolute.
      t = pr.opensAtMs;
    }
  }

  // ---- Expected response per probe (server-only), derived from the stream.
  const detail = [];
  for (const pr of probes) {
    const upto = events.slice(0, pr.afterEventIndex + 1);
    if (shell === 'creature_lastk') {
      const window = upto.slice(-pr.k).map((e) => e.tokenKey);
      detail.push({ ...pr, expectedKeys: window, windowStart: pr.afterEventIndex - pr.k + 1, windowEnd: pr.afterEventIndex });
    } else if (shell === 'keep_track') {
      // Ask for k families that have actually appeared, in a fixed asked-order.
      const appeared = familyHues.filter((h) => upto.some((e) => tokenOf(palette, e.tokenKey).family === h));
      const asked = appeared.slice(-pr.k);
      const expectedKeys = asked.map((h) => {
        for (let i = upto.length - 1; i >= 0; i--) if (tokenOf(palette, upto[i].tokenKey).family === h) return upto[i].tokenKey;
        return null;
      });
      detail.push({ ...pr, askedFamilies: asked, expectedKeys, windowStart: 0, windowEnd: pr.afterEventIndex });
    } else {
      let total = 0;
      for (const e of upto) total = e.kind === 'set' ? e.value : total + e.value;
      const lastAdd = upto[upto.length - 1].kind === 'add' ? upto[upto.length - 1].value : 0;
      detail.push({ ...pr, runningTotal: total, lastAdd, expectedKeys: [`v${total}`], windowStart: 0, windowEnd: pr.afterEventIndex });
    }
  }

  // ---- Per-probe response plan (renderable) + per-probe lures (server-only).
  const probePlan = [];
  const distractorRationales = {};
  for (const d of detail) {
    const tag = `p${d.probeIndex}`;
    if (shell === 'numeric_running') {
      const total = d.runningTotal;
      const cands = [total, total - d.lastAdd, total + 1, total - 1, total - stepMax - 1].filter((v) => v > 0);
      const uniq = [...new Set(cands)];
      while (uniq.length < 5) uniq.push(Math.max(1, total + uniq.length + 2));
      const options = uniq
        .slice(0, 5)
        .map((v) => ({ key: `v${v}`, label: String(v) }))
        .sort((a, b) => Number(a.label) - Number(b.label));
      probePlan.push({
        probeIndex: d.probeIndex,
        expectedCount: 1,
        prompt: 'What is the total right now?',
        options,
      });
      distractorRationales[`${tag}.correct`] = { lure: 'correct', probeIndex: d.probeIndex, keys: [`v${total}`], note: 'the running total after every update so far' };
      if (d.lastAdd > 0 && total - d.lastAdd > 0)
        distractorRationales[`${tag}.missed_last_update`] = {
          lure: 'gating_failure', probeIndex: d.probeIndex, keys: [`v${total - d.lastAdd}`],
          note: 'the total BEFORE the final update: the value was held but the last update was never gated in',
        };
      distractorRationales[`${tag}.off_by_one`] = {
        lure: 'arithmetic_slip', probeIndex: d.probeIndex, keys: [`v${total + 1}`],
        note: 'one off the running total: an addition slip rather than a memory failure',
      };
    } else if (shell === 'keep_track') {
      probePlan.push({
        probeIndex: d.probeIndex,
        expectedCount: d.expectedKeys.length,
        askedFamilies: d.askedFamilies.slice(),
        prompt:
          'Tap the last creature you saw of each colour, in this order: ' +
          d.askedFamilies.map((h) => (FAMILIES.find((f) => f.hue === h) || { word: h }).word).join(', ') + '.',
        options: palette.map((tk) => ({ key: tk.key, label: tk.label })),
      });
      distractorRationales[`${tag}.correct`] = { lure: 'correct', probeIndex: d.probeIndex, keys: d.expectedKeys.slice(), note: 'the most recent creature of each asked colour' };
      distractorRationales[`${tag}.stale_family`] = {
        lure: 'update_failure', probeIndex: d.probeIndex,
        keys: d.expectedKeys.map((k) => siblingInFamily(palette, k)),
        note: 'the OTHER creature of each asked colour: that family was tracked but never refreshed to its latest member',
      };
    } else {
      probePlan.push({
        probeIndex: d.probeIndex,
        expectedCount: d.k,
        prompt: `Tap the last ${d.k} creatures that went past, in the same order.`,
        options: palette.map((tk) => ({ key: tk.key, label: tk.label })),
      });
      distractorRationales[`${tag}.correct`] = { lure: 'correct', probeIndex: d.probeIndex, keys: d.expectedKeys.slice(), note: `the last ${d.k} creatures in order` };
      if (d.windowStart - 1 >= 0)
        distractorRationales[`${tag}.stale_window`] = {
          lure: 'update_failure', probeIndex: d.probeIndex,
          keys: events.slice(d.windowStart - 1, d.windowEnd).map((e) => e.tokenKey),
          note: 'the window shifted one creature too late: an older creature is still inside and the newest one never entered (a gating failure)',
        };
      if (d.k >= 2)
        distractorRationales[`${tag}.order_reversal`] = {
          lure: 'order_error', probeIndex: d.probeIndex, keys: d.expectedKeys.slice().reverse(),
          note: 'the right creatures in the wrong direction: the contents survived, the order did not',
        };
    }
  }

  const unitsTotal = detail.reduce((s, d) => s + d.expectedKeys.length, 0);
  const difficulty = round2(difficultyFromLevers(kMax, shell, paletteSize, pressure));

  return {
    itemId: seededUuid(seed),
    typeCode: 'WM-gate-01',
    domain: 'spatial',
    difficulty, // FLOAT 1..20 — DESIGN rung, not calibrated (validated:false)
    ageBands: ageBandsFor(difficulty, shell),
    demoPath: 'demos/WM-gate-01.html',
    content: {
      typeCode: 'WM-gate-01',
      shell,
      kMax,
      paletteSize,
      probeCount: probes.length,
      streamLength: events.length,
      // Renderable vocabulary: how to DRAW a token key. Identities only — it says
      // nothing about what crossed the gate or when.
      palette: shell === 'numeric_running' ? [] : palette.map((tk) => ({ key: tk.key, shape: tk.shape, hue: tk.hue, family: tk.family, label: tk.label })),
      // PRESENTATION PHASE ONLY. The renderer hands this to a sealed stream
      // player and deletes it from its served copy before the first checkpoint.
      presentation: {
        leadInMs: LEAD_IN_MS,
        paceMs,
        dwellMs,
        gatePanelMs: PROBE_PANEL_MS,
        events,
        probes: probes.map((p) => ({
          probeIndex: p.probeIndex,
          afterEventIndex: p.afterEventIndex,
          k: p.k,
          gateClosesAtMs: p.gateClosesAtMs,
          opensAtMs: p.opensAtMs,
        })),
      },
      // RESPONSE PHASE ONLY: how many taps each checkpoint wants, what may be
      // tapped, and (keep-track only) which colours are asked. Never what the
      // stream contained.
      responsePhase: {
        prompt: 'When the gate says STOP, answer the checkpoint. Then the parade keeps going.',
        probePlan,
        undoEnabled: true,
        untimed: true,
        latencyAnchor: 'probe_open',
      },
      instructions: {
        howto:
          shell === 'numeric_running'
            ? 'Numbers go past the gate and add up. When the gate says STOP, tap the total right now. The parade then keeps going, so keep adding.'
            : shell === 'keep_track'
              ? 'Creatures go past the gate. When the gate says STOP, tap the last creature you saw of each colour it asks for, in the order it lists them. The parade then keeps going.'
              : 'Creatures go past the gate. When the gate says STOP, tap the last few creatures you saw, in the same order. Use undo to fix a tap. The parade then keeps going, so stay ready.',
        readingGate: 'D-017: on-screen text only, never audio.',
      },
    },
    answer: {
      correctKey: detail.map((d) => `p${d.probeIndex}:${d.expectedKeys.join('-')}`).join('|'),
      probes: detail.map((d) => ({
        probeIndex: d.probeIndex,
        k: d.k,
        expectedKeys: d.expectedKeys.slice(),
        windowStart: d.windowStart,
        windowEnd: d.windowEnd,
        ...(d.askedFamilies ? { askedFamilies: d.askedFamilies.slice() } : {}),
        ...(d.runningTotal != null ? { runningTotal: d.runningTotal, lastAdd: d.lastAdd } : {}),
      })),
      unitsTotal,
      distractorRationales,
    },
    scoring: {
      mode: 'computed_solver',
      solver: 'wm-running-memory-multiprobe@1',
      spec: {
        unitsTotal,
        positionCredit:
          'for probe p and position i, credit iff response.probes[p].keys[i] === answer.probes[p].expectedKeys[i] (strict position match)',
        unitsCorrect: 'sum of credited positions over every probe',
        score: 'unitsCorrect / unitsTotal, rounded to 4 decimals',
        correct: 'every probe answered in full AND unitsCorrect === unitsTotal',
        probeScore: 'per probe: creditedPositions / expectedKeys.length (the polytomous M-POLY category)',
        longestCorrectRun:
          'concatenate the units in probe order, then take the longest run of consecutive credited units (spans probe boundaries)',
        updateCostSlope:
          'ordinary-least-squares slope of probeScore on probe k across the probes of this item; negative = accuracy falls as the window widens (M-UPDATECOST)',
        recencyGradient: 'per position within a probe, the credit rate ordered oldest -> newest maps the accessible window',
        errorTaxonomy: {
          none: 'exact match on every probe',
          update_failure: 'answer matches a window shifted one event earlier (the newest item never entered the window)',
          intrusion: 'a key that appeared in the stream but outside the probed window',
          novel: 'a key that never appeared in the stream before that probe',
          order_error: 'the right keys in the wrong order',
          omission: 'fewer keys submitted than expectedKeys.length',
          arithmetic_slip: 'numeric shell only: within one of the running total',
        },
        lureMatch: 'if a probe response deep-equals a distractorRationales["p<i>.*"].keys, tag M-ERRTYPE with that lure label',
      },
      clientMetrics: ['M-SPAN', 'M-DIFFREACH', 'M-RT', 'M-RTFIRST', 'M-RTVAR', 'M-REV', 'M-LAPSE', 'M-DRIFT', 'M-ENGAGE', 'M-RAPIDGUESS'],
      serverMetrics: ['M-ACC', 'M-POLY', 'M-UPDATECOST', 'M-ERRTYPE', 'M-CONSIST', 'M-LEARNRATE'],
    },
    provenance: {
      generator: 'grammar',
      generatorRef: 'wm-gate-01-running-memory-grammar@1',
      seed,
      levers: { kMax, shell, paletteSize, pressure },
    },
    syntheticOnly: true,
    validated: false,
  };
}

function tokenOf(palette, key) {
  return palette.find((t) => t.key === key) || { family: null, shape: null };
}
// The other creature that shares this creature's colour family.
function siblingInFamily(palette, key) {
  const me = tokenOf(palette, key);
  const sib = palette.find((t) => t.family === me.family && t.key !== key);
  return sib ? sib.key : key;
}

// Age-band targeting hint. This type's declared bands START at 2-3 (there is no
// K-1 band: continuous updating with surprise probes overloads most K-1
// children), and the numeric shell is age-gated to 4-5 and above.
export function ageBandsFor(difficulty, shell) {
  const bands = [];
  const add = (b) => {
    if (!bands.includes(b)) bands.push(b);
  };
  if (difficulty < 8.5) add('2-3');
  if (difficulty >= 7.5 && difficulty < 12.5) add('4-5');
  if (difficulty >= 11.5) add('6-8');
  if (bands.length === 0) add(difficulty < 8 ? '2-3' : '6-8');
  if (shell === 'numeric_running') {
    const gated = bands.filter((b) => b !== '2-3');
    return gated.length ? gated : ['4-5'];
  }
  return bands;
}

/* ================================================================== *
 * BANK BUILDER — >=perBin items in every integer bin 1..20.
 * ================================================================== */
export function buildBank({ perBin = 6 } = {}) {
  const items = [];
  for (let k = 1; k <= 20; k++) {
    const lo = Math.max(1, k - 0.45);
    const hi = Math.min(20, k + 0.45);

    const segments = [];
    for (const cfg of ALLOWED_CONFIGS) {
      const dLo = difficultyFromLevers(cfg.kMax, cfg.shell, cfg.paletteSize, 0);
      const dHi = difficultyFromLevers(cfg.kMax, cfg.shell, cfg.paletteSize, 1);
      const a = Math.max(lo, dLo);
      const b = Math.min(hi, dHi);
      if (b > a + 1e-6) segments.push({ ...cfg, tLo: a, tHi: b });
    }
    if (segments.length === 0) throw new Error(`no reachable lever config for difficulty bin k=${k}`);

    const hits = segments.map(() => 0);
    for (let i = 0; i < perBin; i++) hits[i % segments.length]++;
    const localSeen = segments.map(() => 0);

    for (let i = 0; i < perBin; i++) {
      const segIdx = i % segments.length;
      const seg = segments[segIdx];
      const li = localSeen[segIdx]++;
      const t = seg.tLo + (seg.tHi - seg.tLo) * ((li + 0.5) / hits[segIdx]);
      const pressure = solvePressure(seg.kMax, seg.shell, seg.paletteSize, t);
      const seed = `WM-gate-01|bin=${k}|i=${i}|K${seg.kMax}P${seg.paletteSize}${seg.shell[0].toUpperCase()}`;
      items.push(genItem({ kMax: seg.kMax, shell: seg.shell, paletteSize: seg.paletteSize, pressure, seed }));
    }
  }
  return items;
}

/* ------------------------------------------------------------------ *
 * CLI entrypoint.
 * ------------------------------------------------------------------ */
function isMain() {
  return process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
}
if (isMain()) {
  const perBin = Number(process.env.PER_BIN || 6);
  const items = buildBank({ perBin });
  const outPath = resolve(__dirname, '../banks/WM-gate-01.jsonl');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, items.map((it) => JSON.stringify(it)).join('\n') + '\n');

  const bins = Array.from({ length: 20 }, () => 0);
  let min = Infinity;
  let max = -Infinity;
  const shells = {};
  let probes = 0;
  let units = 0;
  for (const it of items) {
    const k = Math.round(it.difficulty);
    if (k >= 1 && k <= 20) bins[k - 1]++;
    min = Math.min(min, it.difficulty);
    max = Math.max(max, it.difficulty);
    shells[it.content.shell] = (shells[it.content.shell] || 0) + 1;
    probes += it.content.probeCount;
    units += it.answer.unitsTotal;
  }
  console.log(`WM-gate-01 bank: ${items.length} items -> ${outPath}`);
  console.log(`difficulty span: ${round2(min)} .. ${round2(max)}  (target 1..20)`);
  console.log(`shells: ${Object.entries(shells).map(([s, n]) => `${s} ${n}`).join(', ')}`);
  console.log(`checkpoints: ${probes} total (${round2(probes / items.length)} per item), scored units: ${units}`);
  console.log('per-bin counts (k: n):');
  console.log(bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join('  '));
  const short = bins.map((n, i) => ({ k: i + 1, n })).filter((b) => b.k <= 19 && b.n < 5);
  console.log(short.length ? `SHORT BINS (<5): ${short.map((b) => b.k).join(',')}` : 'all bins 1..19 >=5 OK');
}
