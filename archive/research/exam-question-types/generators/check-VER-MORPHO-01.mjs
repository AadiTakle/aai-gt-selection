// Independent validator for the VER-MORPHO-01 dual-mode banks (STAGE2_QUESTION_DESIGN §9.2, U4).
//
// The picture semantics, the S3 number algebra, the partial-rule taxonomy, the difficulty
// arithmetic, the phonotactic screens and the relabelling attack are RE-IMPLEMENTED here from the
// documented model rather than imported, so a bug in the generator cannot validate itself. The
// generator is imported for exactly two things, both labelled at the import: `genItem`, to prove
// each item is byte-reproducible from its own provenance, and the frozen English word list, which
// is DATA (an enumeration of `/usr/share/dict/words`) rather than logic — re-typing 386 dictionary
// entries would not make the screen more independent. The screen's LOGIC is re-implemented, and the
// ten forms are additionally screened against a second, independently typed word list below.
//
// U4's acceptance is "independent re-derivation of the key agrees on 100% of BOTH banks", so this
// script checks the pair, not one file, and additionally checks the property that makes the pair a
// control condition rather than two banks: they are equated on every scored quantity and differ
// only in whether the hidden form->meaning mapping persists.
//
// Checks (exit nonzero on any failure):
//   1.  JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2.  Key containment: `content` names no meaning, states no mapping, carries no verdict, and
//       does not reveal which control arm it belongs to.
//   3.  KEY RE-DERIVED: applying the mapping's meanings to the reference picture reproduces exactly
//       what `correctKey` names — the option picture in the word->picture direction, and the option
//       word whose own derivation lands on the target in the picture->word direction.
//   4.  Anti-leak, three invariants (E-075/E-076), each re-derived here:
//       (a) I1 the key is never the UNIQUE option that moved furthest from the reference picture;
//       (b) I2 EVERY option is reachable by relabelling the morphemes, so a client that brute-
//           forces the mappings can eliminate nothing and the elimination attack sits on the 25%
//           four-option chance floor; and
//       (c) I3 the key is never the unique MODAL option under those mappings, so the stronger
//           vote-weighted attack cannot prefer it either. The achieved attack accuracy is reported
//           per difficulty quartile, because a bank-wide mean would hide the worst slice.
//   5.  Distractors: all four options distinct; every wrong option is the output of a named partial
//       rule, re-derived here, and its declared ruleId/kind agree (the §4.6 strategy trace).
//   6.  Word invariants: morpheme count equals depth, no morpheme repeats, the declared number-affix
//       count is right, EVERY morpheme changes the running picture, and the number affixes' net
//       effect moves the count whenever any are present.
//   7.  Difficulty equals the value re-derived from the item's own levers, and the item regenerates
//       byte-identically from its provenance.
//   8.  Difficulty is MONOTONE in every declared lever (§1.1(d)) — asserted on the model, once —
//       and the continuous minimal-pair lever is monotone IN THE BANK, per (depth, scope) cell.
//   9.  Coverage: 1..20 with >=10 items per 0.5-point rung and per +/-0.5pt band.
//   10. Band ladder: composition depth never exceeds the cap for the band the difficulty sits in,
//       the declared ageBands match the window, and K-1 is never declared anywhere (§3.3's
//       decoding floor).
//   11. Key positions uniform within tolerance, reported per option count (E-094); and the two
//       directions balanced within every rung, which is what keeps an unpriced direction effect
//       orthogonal to difficulty and therefore to trial index.
//   12. Reading load: every morpheme is a legal CVC over the declared letter sets, the ten forms in
//       play are pairwise at edit distance >=2 and survive both English screens, and no word
//       exceeds the character budget declared for its band.
//   13. Persistence: the consistent bank holds ONE system; the perTrial bank holds one per item.
//   14. Equating: the two banks match item-for-item on difficulty, key slot, direction, age band,
//       reference picture, meaning chain and strategy trace.
//
// Run:  node research/exam-question-types/generators/check-VER-MORPHO-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// genItem: reproducibility probe only. ENGLISH_CVC/ENGLISH_AFFIXES: frozen dictionary DATA, see the
// header. Nothing else is imported, and no semantics, difficulty or attack logic is.
import { BANK_PATHS, genItem, ENGLISH_CVC, ENGLISH_AFFIXES } from './VER-MORPHO-01.mjs';
import { lureLabel, normalizeBankItem } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODES = ['consistent', 'perTrial'];
// The consistent arm is the live bank under banks/; the scrambled arm sits outside the served
// directory in control-banks/. Both are read here, because U4's acceptance is BOTH banks.
const bankPath = (mode) => resolve(__dirname, BANK_PATHS[mode]);

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const round2 = (x) => Math.round(x * 100) / 100;

/* ---- independent morpheme semantics ---------------------------------------- */
const NUMBER = ['plural', 'dual', 'paucal'];
const PLAIN = ['negate', 'resize', 'swapRole'];
const ALL_MEANINGS = [...NUMBER, ...PLAIN];
const SWAP = { plural: [1, 3], dual: [1, 2], paucal: [2, 3] };
const ATTRS = ['count', 'size', 'mark', 'role'];
const KIND_SET = ['blob', 'star', 'leaf', 'drop'];
const OPTION_KEYS = ['A', 'B', 'C', 'D'];
const DIRECTIONS = ['wordToPicture', 'pictureToWord'];

// The three number affixes are the three transpositions of S3 on {one, two, many}; the three plain
// affixes each toggle one separable attribute. Re-derived here rather than imported, because
// getting the number algebra wrong is the single most likely way the generator could be wrong about
// its own answer key.
function step(meaning, p) {
  if (NUMBER.includes(meaning)) {
    const [lo, hi] = SWAP[meaning];
    if (p.count === lo) return { ...p, count: hi };
    if (p.count === hi) return { ...p, count: lo };
    return { ...p };
  }
  if (meaning === 'negate') return { ...p, mark: p.mark === 'none' ? 'cross' : 'none' };
  if (meaning === 'resize') return { ...p, size: p.size === 'small' ? 'big' : 'small' };
  if (meaning === 'swapRole') return { ...p, role: p.role === 'doer' ? 'target' : 'doer' };
  throw new Error(`unknown meaning "${meaning}"`);
}
const run = (ms, p) => ms.reduce((state, m) => step(m, state), p);
const pkey = (p) => `${p.kind}|${p.count}|${p.size}|${p.mark}|${p.role}`;
function dist(a, b) {
  let d = 0;
  for (const attribute of ATTRS) if (a[attribute] !== b[attribute]) d += 1;
  return d;
}
function everyMorphemeBites(ms, base) {
  let state = base;
  for (const m of ms) {
    const next = step(m, state);
    if (pkey(next) === pkey(state)) return false;
    state = next;
  }
  return true;
}

/**
 * Everything a client can compute from `content` alone: for every ordered assignment of `depth`
 * distinct meanings to the word's positions, the picture it produces, counted. Re-implemented here
 * rather than imported, because this IS the attack and validating it with the generator's own
 * helper would prove nothing.
 */
function relabelVotes(depth, base) {
  const votes = new Map();
  const used = new Set();
  const walk = (position, state) => {
    if (position === depth) {
      const k = pkey(state);
      votes.set(k, (votes.get(k) ?? 0) + 1);
      return;
    }
    for (const m of ALL_MEANINGS) {
      if (used.has(m)) continue;
      used.add(m);
      walk(position + 1, step(m, state));
      used.delete(m);
    }
  };
  walk(0, base);
  return votes;
}

/* ---- independent partial-rule taxonomy ------------------------------------ */
const KIND_LURE = {
  order_error: 'order_error',
  near_miss: 'near_miss',
  wrong_operator: 'wrong_operator',
  wrong_family: 'wrong_family',
};

/** Every partial rule a morpheme sequence admits, as {ruleId, kind, meanings}. */
function rulesFor(chain) {
  const out = [];
  const label = (ms) => ms.join('>');
  const unused = ALL_MEANINGS.filter((m) => !chain.includes(m));
  for (let i = 0; i < chain.length; i++) {
    for (let j = i + 1; j < chain.length; j++) {
      const s = chain.slice();
      [s[i], s[j]] = [s[j], s[i]];
      out.push({ ruleId: `swap@${i},${j}:${label(s)}`, kind: 'order_error', meanings: s });
    }
  }
  for (let i = 0; i < chain.length; i++) {
    for (const m of unused) {
      const s = chain.slice();
      s[i] = m;
      const sameFamily = NUMBER.includes(m) === NUMBER.includes(chain[i]);
      out.push({
        ruleId: `sub@${i}:${label(s)}`,
        kind: sameFamily ? 'near_miss' : 'wrong_operator',
        meanings: s,
      });
    }
  }
  for (let i = 0; i < chain.length; i++) {
    for (let j = i + 1; j < chain.length; j++) {
      for (const a of unused) {
        for (const b of unused) {
          if (a === b) continue;
          const s = chain.slice();
          s[i] = a;
          s[j] = b;
          out.push({ ruleId: `sub2@${i},${j}:${label(s)}`, kind: 'wrong_family', meanings: s });
        }
      }
    }
  }
  return out;
}

/* ---- independent difficulty arithmetic (documented lever model) ----------- */
const DEPTH_LOAD = { 1: 0, 2: 2.4, 3: 4.4, 4: 6.0 };
const W_SCOPE = 0.9;
const W_ORDER = 1.5;
const W_MIX = 1.2;
const SIM_SPAN = 2.6;
const mixedOf = (depth, scope) => (scope > 0 && scope < depth ? 1 : 0);
const baseOf = (depth, scope) =>
  1.0 +
  DEPTH_LOAD[depth] +
  W_SCOPE * scope +
  W_ORDER * Math.max(0, scope - 1) +
  W_MIX * mixedOf(depth, scope);

const CONFIGS = (() => {
  const out = [];
  for (const depth of [1, 2, 3, 4]) {
    for (let scope = Math.max(0, depth - PLAIN.length); scope <= Math.min(depth, 2); scope++) {
      out.push({ depth, scope });
    }
  }
  return out;
})();
const BASES = CONFIGS.map((c) => baseOf(c.depth, c.scope));
const RAW_LO = Math.min(...BASES);
const RAW_HI = Math.max(...BASES) + SIM_SPAN;
const difficultyOf = (depth, scope, sim) =>
  Math.max(
    1,
    Math.min(20, 1 + ((baseOf(depth, scope) + SIM_SPAN * sim - RAW_LO) * 19) / (RAW_HI - RAW_LO)),
  );

/* ---- independent band ladder (§3.3's decoding floor, §4.3's depth cap) ---- */
const BAND_LADDER = [
  { band: '2-3', hi: 8, maxDepth: 2 },
  { band: '4-5', hi: 12, maxDepth: 3 },
  { band: '6-8', hi: 20.01, maxDepth: 4 },
];
const bandOf = (d) => BAND_LADDER.find((b) => d < b.hi) ?? BAND_LADDER[BAND_LADDER.length - 1];
/** Character budget per band, from the reading-load note in the generator header. */
const BAND_CHAR_BUDGET = { '2-3': 11, '4-5': 15, '6-8': 19 };

/* ---- independent phonotactics and a SECOND English screen ---------------- */
const CVC = /^[bdfklmnprstvz][aeiou][bdfgklmnpstvz]$/;
/**
 * A second word list, typed here rather than imported, so the ten forms are screened against two
 * independently assembled lists. The generator screens the whole 845-form candidate space against
 * the 234,456-entry web2 dictionary; this is the common-word check a human reviewer would run.
 */
const COMMON_THREE_LETTER = new Set(
  ('the and for you not but all can her was one our out day get has him his how man new now old ' +
    'see two way who boy did its let put say she too use dad mom kid cat dog pig cow bat hat mat ' +
    'rat sat fat bed red led fed leg beg peg big dig fig pig wig bit fit hit kit sit bob job mob ' +
    'rob sob cob dot got hot lot not pot rot bug dug hug jug mug rug tug bun fun gun run sun cup ' +
    'cut but gut hut nut van vet vim viz wax web wet win wig zip zap zoo tip top tap tin ten tan ' +
    'sum sun sip six set sea saw sad rub row rip rim rid ram pen pet pit pop pup pat pan pad nod ' +
    'net map mad log lip lid lap jam ink hop hen gum gas fox fix fan eye end egg ear dry cry cub ' +
    'bus box bad axe arm ant age ace').split(' '),
);
const MEANING_WORDS_2 = [
  'one', 'two', 'ten', 'all', 'few', 'lot', 'set', 'sum', 'add', 'big', 'wee', 'tot', 'fat',
  'not', 'non', 'nix', 'nay', 'nil', 'ban', 'bad', 'get', 'got', 'put', 'act', 'hit', 'own',
];
function editDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/* ========================================================================== *
 * 8. MODEL-LEVEL MONOTONICITY, asserted once before any item is read.
 *
 * §1.1(d): the fit reads `difficulty` as known, and because the targeting rule
 * serves different item subsets early and late, difficulty error that
 * correlates with subset composition correlates with trialIndex and biases
 * lambda. A monotone lever model is the weaker claim that is actually needed
 * to keep the fit unbiased, and it is the one thing about difficulty this bank
 * can prove.
 * ========================================================================== */
function checkModelMonotonicity() {
  for (const sim of [0, 0.5, 1]) {
    for (const scope of [0, 1, 2]) {
      const reachable = [1, 2, 3, 4].filter((depth) =>
        CONFIGS.some((c) => c.depth === depth && c.scope === scope),
      );
      for (let i = 1; i < reachable.length; i++) {
        if (!(difficultyOf(reachable[i], scope, sim) > difficultyOf(reachable[i - 1], scope, sim))) {
          fail(
            'monotonicity',
            `depth ${reachable[i]} not harder than ${reachable[i - 1]} at scope=${scope}`,
          );
        }
      }
    }
    for (const depth of [1, 2, 3, 4]) {
      const reachable = CONFIGS.filter((c) => c.depth === depth)
        .map((c) => c.scope)
        .sort((a, b) => a - b);
      for (let i = 1; i < reachable.length; i++) {
        if (
          !(difficultyOf(depth, reachable[i], sim) > difficultyOf(depth, reachable[i - 1], sim))
        ) {
          fail(
            'monotonicity',
            `scope ${reachable[i]} not harder than ${reachable[i - 1]} at depth=${depth}`,
          );
        }
      }
    }
  }
  for (const cfg of CONFIGS) {
    if (!(difficultyOf(cfg.depth, cfg.scope, 1) > difficultyOf(cfg.depth, cfg.scope, 0))) {
      fail('monotonicity', `similarity not monotone at depth=${cfg.depth} scope=${cfg.scope}`);
    }
  }
}
checkModelMonotonicity();

/* ========================================================================== *
 * Per-bank checks
 * ========================================================================== */
function loadBank(mode) {
  const raw = readFileSync(bankPath(mode), 'utf8').trim();
  const lines = raw.length ? raw.split('\n') : [];
  if (lines.length === 0) fail(`parse:${mode}`, 'bank is empty');
  const items = [];
  lines.forEach((line, i) => {
    try {
      items.push(JSON.parse(line));
    } catch (e) {
      fail(`parse:${mode}`, `line ${i + 1} is not valid JSON: ${e.message}`);
    }
  });
  return items;
}

function checkBank(mode, items) {
  const seenIds = new Set();
  const seenContent = new Map();
  const systemIds = new Set();
  const keyCounts = Object.fromEntries(OPTION_KEYS.map((k) => [k, 0]));
  const optionCounts = new Set();
  const formsInPlay = new Set();
  const attacks = [];
  const cells = new Map();
  const rungDirections = new Map();

  for (const it of items) {
    const id = `${mode}:${it.itemId || '(no id)'}`;

    // ---- 1. Envelope ----
    if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
    if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
    seenIds.add(it.itemId);
    // Two items with the same `content` are one item wearing two ids. `learning-block.ts` forbids
    // repeats because a repeat measures recall, and when the pair also carries different stated
    // difficulties it is the §1.1(d) structured labelling error as well.
    const fingerprint = JSON.stringify(it.content);
    if (seenContent.has(fingerprint)) {
      fail(
        id,
        `identical content to ${seenContent.get(fingerprint)} — the same stimulus served twice` +
          `, at difficulty ${it.difficulty}`,
      );
    } else {
      seenContent.set(fingerprint, it.itemId);
    }
    if (it.typeCode !== 'VER-MORPHO-01') fail(id, `typeCode != VER-MORPHO-01 (${it.typeCode})`);
    if (it.domain !== 'verbal') fail(id, `domain != verbal (${it.domain})`);
    if (it.demoPath !== 'demos/VER-MORPHO-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
    if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) {
      fail(id, `difficulty not a float in 1..20 (${it.difficulty})`);
    }
    if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
    if (it.validated !== false) fail(id, 'validated must be false');
    if (!it.scoring || it.scoring.mode !== 'deterministic_key') {
      fail(id, 'scoring.mode != deterministic_key');
    }
    if (!it.provenance || it.provenance.generator !== 'grammar') {
      fail(id, 'provenance.generator != grammar');
    }
    if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

    const c = it.content || {};
    const ans = it.answer || {};
    const lev = (it.provenance && it.provenance.levers) || {};

    // ---- 2. Key containment ----
    const contentStr = JSON.stringify(c);
    for (const leak of ['correctKey', 'affixMap', 'stemMap', 'system', 'meaningChain', 'strategyTrace', 'relabelling']) {
      if (contentStr.includes(leak)) fail(id, `content leaks "${leak}"`);
    }
    // The meaning NAMES must not appear in content either: content speaks forms and pictures only.
    for (const m of ALL_MEANINGS) {
      if (contentStr.includes(`"${m}"`)) fail(id, `content names the meaning "${m}"`);
    }
    if (contentStr.includes('perTrial') || contentStr.includes('consistent')) {
      fail(id, 'content reveals which control arm it belongs to');
    }
    if (!DIRECTIONS.includes(c.direction)) fail(id, `unknown direction "${c.direction}"`);
    if (c.direction !== lev.direction) fail(id, 'content.direction disagrees with provenance');

    // ---- 12. Reading load: the tray, the forms, and the phonotactics ----
    const tray = Array.isArray(c.morphemeTray) ? c.morphemeTray : [];
    if (tray.length !== 6) fail(id, `morphemeTray has ${tray.length} forms, expected 6`);
    if (!deepEq(tray, tray.slice().sort())) {
      fail(id, 'morphemeTray is not alphabetical by FORM — ordered by meaning it would be the key');
    }
    for (const form of [...tray, c.stem]) {
      if (typeof form !== 'string' || !CVC.test(form)) fail(id, `"${form}" is not a legal CVC`);
      else if (form[0] === form[2]) fail(id, `"${form}" has onset == coda`);
      formsInPlay.add(form);
    }

    // ---- 6. Word invariants + 3. KEY RE-DERIVED FROM THE STATED SYSTEM ----
    const affixMap = (ans.system || {}).affixMap || {};
    const stemMap = (ans.system || {}).stemMap || {};
    const base = c.stemPicture;
    const options = Array.isArray(c.options) ? c.options : [];
    optionCounts.add(options.length);
    if (options.length !== 4) fail(id, `expected 4 options, got ${options.length}`);
    if (!deepEq(options.map((o) => o.key), OPTION_KEYS.slice(0, options.length))) {
      fail(id, 'option keys are not A..D in order');
    }
    if (!base || !KIND_SET.includes(base.kind) || ![1, 2, 3].includes(base.count)) {
      fail(id, 'reference picture malformed');
      continue;
    }
    if (stemMap[c.stem] !== base.kind) {
      fail(id, `stem "${c.stem}" does not name the reference picture's kind under the stated system`);
    }

    const wordFormsOf = (word) => String(word).split('-').slice(1);
    const meaningsOf = (forms) => forms.map((f) => affixMap[f]);
    const keyForms =
      c.direction === 'wordToPicture'
        ? wordFormsOf(c.word)
        : wordFormsOf((options.find((o) => o.key === ans.correctKey) || {}).word ?? '');
    const chain = meaningsOf(keyForms);
    if (chain.some((m) => !ALL_MEANINGS.includes(m))) {
      fail(id, 'the stated mapping does not resolve every morpheme in the word');
      continue;
    }
    if (new Set(chain).size !== chain.length) {
      fail(id, `word repeats a morpheme (${chain.join('>')}) — a repeat cancels silently`);
    }
    if (chain.length !== lev.depth) {
      fail(id, `word has ${chain.length} morphemes != declared depth ${lev.depth}`);
    }
    const scopeCount = chain.filter((m) => NUMBER.includes(m)).length;
    if (scopeCount !== lev.scope) {
      fail(id, `number-affix count ${scopeCount} != declared scope ${lev.scope}`);
    }
    if (mixedOf(lev.depth, lev.scope) !== lev.mixed) {
      fail(id, `declared mixed ${lev.mixed} != derived ${mixedOf(lev.depth, lev.scope)}`);
    }
    if (!everyMorphemeBites(chain, base)) {
      fail(id, `some morpheme of ${chain.join('>')} is a no-op, so the word is shorter than it looks`);
    }
    if (!deepEq(ans.meaningChain, chain)) {
      fail(id, 'answer.meaningChain disagrees with the mapping applied to the written word');
    }

    const derived = run(chain, base);
    if (scopeCount > 0 && derived.count === base.count) {
      fail(id, `the number affixes of ${chain.join('>')} return the count to where it started`);
    }
    if (pkey(derived) === pkey(base)) fail(id, 'the word denotes its own reference picture');
    if (!deepEq(ans.keyPicture, derived)) fail(id, 'answer.keyPicture != independently derived');
    if (!isNum(ans.keyDistanceFromStem) || ans.keyDistanceFromStem !== dist(base, derived)) {
      fail(id, `answer.keyDistanceFromStem != independently computed ${dist(base, derived)}`);
    }

    // Each option's own denotation, whichever direction the item runs in.
    const optionPictures = options.map((o) =>
      c.direction === 'wordToPicture' ? o.picture : run(meaningsOf(wordFormsOf(o.word)), base),
    );
    const keyed = options.findIndex((o) => o.key === ans.correctKey);
    if (keyed < 0) fail(id, `correctKey ${ans.correctKey} names no option`);
    else if (pkey(optionPictures[keyed]) !== pkey(derived)) {
      fail(
        id,
        `solver output ${pkey(derived)} != what correctKey ${ans.correctKey} denotes ` +
          `(${pkey(optionPictures[keyed])})`,
      );
    }
    if (c.direction === 'pictureToWord' && !deepEq(c.targetPicture, derived)) {
      fail(id, 'content.targetPicture is not what the keyed word denotes');
    }

    // ---- 5. Distractors: distinct, and each a named partial rule ----
    const seenPictures = new Set(optionPictures.map(pkey));
    if (seenPictures.size !== optionPictures.length) {
      fail(id, 'two options denote the same picture — more than one option is correct');
    }
    if (c.direction === 'pictureToWord') {
      const words = options.map((o) => o.word);
      if (new Set(words).size !== words.length) fail(id, 'two options are the same word');
      const lengths = new Set(words.map((w) => w.length));
      const counts = new Set(words.map((w) => wordFormsOf(w).length));
      if (lengths.size !== 1 || counts.size !== 1) {
        fail(
          id,
          `option words differ in length (${[...lengths].join('/')} chars, ` +
            `${[...counts].join('/')} morphemes) — "count the syllables" would beat chance`,
        );
      }
    }

    const admissible = new Map();
    for (const rule of rulesFor(chain)) admissible.set(rule.ruleId, pkey(run(rule.meanings, base)));
    const rats = ans.distractorRationales || {};
    const trace = ans.strategyTrace || {};
    options.forEach((option, i) => {
      const rationale = rats[option.key];
      if (!rationale) {
        fail(id, `no rationale for option ${option.key}`);
        return;
      }
      if (option.key === ans.correctKey) {
        if (lureLabel(rationale) !== 'correct') {
          fail(id, `the key is labelled "${lureLabel(rationale)}" rather than correct`);
        }
        return;
      }
      const kind = rationale.partialRuleKind;
      if (!KIND_LURE[kind]) fail(id, `option ${option.key} has unknown partial rule kind "${kind}"`);
      else if (lureLabel(rationale) !== KIND_LURE[kind]) {
        fail(id, `option ${option.key} lure "${lureLabel(rationale)}" != ${KIND_LURE[kind]}`);
      }
      const expected = admissible.get(rationale.ruleId);
      if (expected === undefined) {
        fail(id, `option ${option.key} cites rule "${rationale.ruleId}", which this word does not admit`);
      } else if (expected !== pkey(optionPictures[i])) {
        fail(
          id,
          `option ${option.key} denotes ${pkey(optionPictures[i])}, not what rule ` +
            `"${rationale.ruleId}" produces (${expected})`,
        );
      }
      if (rationale.attributesFromKey !== dist(derived, optionPictures[i])) {
        fail(id, `option ${option.key} misreports its minimal-pair depth`);
      }
      const traced = trace[option.key];
      if (!traced || traced.ruleId !== rationale.ruleId || traced.kind !== kind) {
        fail(id, `strategyTrace for ${option.key} disagrees with its rationale`);
      }
    });
    if (!Array.isArray(ans.strategyTraceRules) || ans.strategyTraceRules.length !== 4) {
      fail(id, 'answer.strategyTraceRules does not declare the closed rule vocabulary');
    }

    // ---- 4. Anti-leak, all three invariants re-derived ----
    const votes = relabelVotes(chain.length, base);
    const optionVotes = optionPictures.map((p) => votes.get(pkey(p)) ?? 0);
    const keyVotes = optionVotes[keyed] ?? 0;
    const total = optionVotes.reduce((a, b) => a + b, 0);

    const keyBaseDistance = dist(base, derived);
    const rivalBaseDistances = optionPictures
      .filter((_, i) => i !== keyed)
      .map((p) => dist(base, p));
    if (!rivalBaseDistances.some((d) => d >= keyBaseDistance)) {
      fail(
        id,
        `I1: the key is the UNIQUE largest change from the reference picture ` +
          `(${keyBaseDistance} vs ${rivalBaseDistances.join(',')}) — "tap what changed most" ` +
          'would beat chance without the system',
      );
    }
    const viable = optionVotes.filter((v) => v > 0).length;
    if (viable < options.length) {
      fail(
        id,
        `I2: only ${viable} of ${options.length} options are consistent with ANY form->meaning ` +
          'relabelling, so a client that brute-forces the mappings can eliminate the rest',
      );
    }
    if (optionVotes.filter((v) => v === Math.max(...optionVotes)).length === 1 && keyVotes === Math.max(...optionVotes)) {
      fail(
        id,
        'I3: the key is the unique MODAL option under relabelling — the vote-weighted attack ' +
          'recovers it from content alone',
      );
    }
    const share = total === 0 ? 1 : Math.max(...optionVotes) / total;
    if (!deepEq(ans.relabelling, {
      optionVotes,
      viableOptions: viable,
      maxVoteShare: round2(share),
    })) {
      fail(id, 'answer.relabelling disagrees with the independently re-run attack');
    }
    attacks.push({ difficulty: it.difficulty, viable, share });

    if (OPTION_KEYS.includes(ans.correctKey)) keyCounts[ans.correctKey]++;

    // ---- 7. Difficulty + reproducibility ----
    const derivedDifficulty = round2(difficultyOf(lev.depth, lev.scope, lev.distractorSimilarity));
    if (Math.abs(derivedDifficulty - it.difficulty) > 0.01) {
      fail(id, `difficulty ${it.difficulty} != derived-from-levers ${derivedDifficulty}`);
    }

    // ---- 10. Band ladder, and the K-1 exclusion ----
    if (isNum(it.difficulty)) {
      const band = bandOf(it.difficulty);
      if (lev.depth > band.maxDepth) {
        fail(
          id,
          `depth ${lev.depth} exceeds the ${band.band} cap of ${band.maxDepth} at difficulty ${it.difficulty}`,
        );
      }
      if (!deepEq(it.ageBands, [band.band])) {
        fail(id, `ageBands ${JSON.stringify(it.ageBands)} != ["${band.band}"] for ${it.difficulty}`);
      }
      if (it.ageBands.includes('K-1')) {
        fail(id, 'K-1 is declared — §3.3 excludes it, because at K-1 this measures decoding');
      }
      const longest = Math.max(
        ...(c.direction === 'wordToPicture'
          ? [String(c.word).length]
          : options.map((o) => String(o.word).length)),
      );
      if (longest > BAND_CHAR_BUDGET[band.band]) {
        fail(
          id,
          `a ${longest}-character word at band ${band.band}, over the ` +
            `${BAND_CHAR_BUDGET[band.band]}-character reading budget`,
        );
      }
    }

    // ---- 11. Direction balance is per RUNG, not bank-wide ----
    const rung = round2(Math.round(it.difficulty * 2) / 2);
    const tally = rungDirections.get(rung) ?? { wordToPicture: 0, pictureToWord: 0 };
    tally[c.direction] += 1;
    rungDirections.set(rung, tally);

    // ---- 8b. The continuous lever, measured in the bank ----
    const cellKey = `D${lev.depth}S${lev.scope}`;
    const meanDistance =
      options
        .filter((o) => o.key !== ans.correctKey)
        .reduce((a, o) => a + (rats[o.key]?.attributesFromKey ?? 0), 0) / (options.length - 1);
    if (!cells.has(cellKey)) cells.set(cellKey, []);
    cells.get(cellKey).push({ sim: lev.distractorSimilarity, meanDistance });

    // ---- 13. Persistence ----
    if (lev.systemPersistence !== mode) {
      fail(id, `provenance levers say persistence ${lev.systemPersistence}, bank is ${mode}`);
    }
    if (ans.system && typeof ans.system.systemId === 'string') systemIds.add(ans.system.systemId);
    else fail(id, 'answer.system.systemId missing');
    if (new Set(Object.values(affixMap)).size !== ALL_MEANINGS.length) {
      fail(id, 'affixMap is not a bijection onto the meaning vocabulary');
    }
    if (new Set(Object.values(stemMap)).size !== KIND_SET.length) {
      fail(id, 'stemMap is not a bijection onto the kind vocabulary');
    }

    try {
      const regen = normalizeBankItem(genItem({ ...lev, seed: it.provenance.seed }));
      if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from its provenance (grammar drift)');
    } catch (e) {
      fail(id, `regeneration threw: ${e.message}`);
    }
  }

  // ---- 12b. The ten forms, screened twice ----
  if (formsInPlay.size !== 10) {
    fail(`forms:${mode}`, `${formsInPlay.size} distinct forms in play, expected exactly 10`);
  }
  const forms = [...formsInPlay].sort();
  for (const form of forms) {
    if (ENGLISH_CVC.has(form)) fail(`forms:${mode}`, `"${form}" is an English word (web2)`);
    if (ENGLISH_AFFIXES.has(form)) fail(`forms:${mode}`, `"${form}" is an English affix`);
    if (COMMON_THREE_LETTER.has(form)) {
      fail(`forms:${mode}`, `"${form}" is a common English word (second, independent list)`);
    }
    for (const word of MEANING_WORDS_2) {
      if (editDistance(form, word) <= 1) {
        fail(`forms:${mode}`, `"${form}" is one edit from "${word}", which names a meaning`);
      }
    }
  }
  let closest = Infinity;
  for (let i = 0; i < forms.length; i++) {
    for (let j = i + 1; j < forms.length; j++) {
      closest = Math.min(closest, editDistance(forms[i], forms[j]));
    }
  }
  if (closest < 2) {
    fail(`forms:${mode}`, `two forms are ${closest} edit apart — a one-letter morpheme contrast`);
  }

  // ---- 9. Coverage: 0.5-point grain across the whole scale ----
  const diffs = items.map((it) => it.difficulty).filter(isNum);
  const min = Math.min(...diffs);
  const max = Math.max(...diffs);
  if (!(min <= 1.25)) fail(`coverage:${mode}`, `min difficulty ${round2(min)} does not reach the floor`);
  if (!(max >= 19.75)) fail(`coverage:${mode}`, `max difficulty ${round2(max)} does not reach the ceiling`);

  const rungs = [];
  for (let d = 1; d <= 20 + 1e-9; d += 0.5) rungs.push(round2(d));
  const rungCounts = rungs.map((r) => diffs.filter((d) => Math.abs(d - r) <= 0.25).length);
  const bandCounts = rungs.map((r) => diffs.filter((d) => Math.abs(d - r) <= 0.5).length);
  rungs.forEach((r, i) => {
    if (rungCounts[i] < 10) fail(`coverage:${mode}`, `0.5-point rung ${r} has ${rungCounts[i]} items (<10)`);
    if (bandCounts[i] < 10) fail(`coverage:${mode}`, `+/-0.5pt band around ${r} has ${bandCounts[i]} items (<10)`);
  });

  // ---- 11. Key balance (E-094: report per option count, never pooled across formats) ----
  const total = items.length;
  const worst = Math.max(...OPTION_KEYS.map((k) => (100 * keyCounts[k]) / total));
  const floor = 100 / OPTION_KEYS.length;
  if (worst - floor > 5) {
    fail(`keybalance:${mode}`, `modal key beats the ${floor}% floor by ${(worst - floor).toFixed(1)}pt (>5pt)`);
  }
  if (optionCounts.size !== 1) {
    fail(
      `keybalance:${mode}`,
      `bank mixes option counts (${[...optionCounts].join(',')}) — E-094 forbids pooling formats`,
    );
  }
  for (const [rung, tally] of rungDirections) {
    if (Math.abs(tally.wordToPicture - tally.pictureToWord) > 1) {
      fail(
        `direction:${mode}`,
        `rung ${rung} is ${tally.wordToPicture}/${tally.pictureToWord} on direction — an unpriced ` +
          'direction effect would correlate with difficulty, and therefore with trial index',
      );
    }
  }

  // ---- 8b. The continuous lever must be monotone IN THE BANK, per cell ----
  for (const [cellKey, rows] of cells) {
    const sorted = rows.slice().sort((a, b) => a.sim - b.sim);
    const third = Math.floor(sorted.length / 3);
    if (third < 2) continue;
    const mean = (arr) => arr.reduce((a, x) => a + x.meanDistance, 0) / arr.length;
    const lo = mean(sorted.slice(0, third));
    const mid = mean(sorted.slice(third, 2 * third));
    const hi = mean(sorted.slice(2 * third));
    if (!(lo >= mid - 1e-9 && mid >= hi - 1e-9)) {
      fail(
        `lever:${mode}`,
        `${cellKey}: mean distractor distance is not monotone in the similarity lever ` +
          `(${lo.toFixed(2)} / ${mid.toFixed(2)} / ${hi.toFixed(2)} by tercile)`,
      );
    }
  }

  // ---- 13. Persistence, at bank level ----
  if (mode === 'consistent' && systemIds.size !== 1) {
    fail(`persistence:${mode}`, `consistent bank holds ${systemIds.size} systems, expected exactly 1`);
  }
  if (mode === 'perTrial' && systemIds.size !== items.length) {
    fail(
      `persistence:${mode}`,
      `perTrial bank holds ${systemIds.size} systems for ${items.length} items, expected one each`,
    );
  }

  return { items, rungCounts, keyCounts, systemIds, min, max, worstKeyAdvantage: worst - floor, attacks, forms };
}

const banks = {};
for (const mode of MODES) banks[mode] = checkBank(mode, loadBank(mode));

/* ---- 14. Equating: the two banks differ ONLY in persistence ---------------- */
{
  const a = banks.consistent.items;
  const b = banks.perTrial.items;
  if (a.length !== b.length) fail('equating', `item counts differ (${a.length} vs ${b.length})`);
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i].difficulty !== b[i].difficulty) fail('equating', `item ${i}: difficulty differs`);
    if (a[i].answer.correctKey !== b[i].answer.correctKey) fail('equating', `item ${i}: key slot differs`);
    if (!deepEq(a[i].ageBands, b[i].ageBands)) fail('equating', `item ${i}: age band differs`);
    if (a[i].content.direction !== b[i].content.direction) fail('equating', `item ${i}: direction differs`);
    if (!deepEq(a[i].content.stemPicture, b[i].content.stemPicture)) {
      fail('equating', `item ${i}: reference picture differs`);
    }
    if (!deepEq(a[i].answer.meaningChain, b[i].answer.meaningChain)) {
      fail('equating', `item ${i}: meaning chain differs`);
    }
    if (!deepEq(a[i].answer.keyPicture, b[i].answer.keyPicture)) {
      fail('equating', `item ${i}: key picture differs`);
    }
    if (!deepEq(a[i].answer.strategyTrace, b[i].answer.strategyTrace)) {
      fail('equating', `item ${i}: strategy trace differs`);
    }
    if (!deepEq(a[i].answer.relabelling, b[i].answer.relabelling)) {
      fail('equating', `item ${i}: relabelling audit differs`);
    }
    if (a[i].content.options.length !== b[i].content.options.length) {
      fail('equating', `item ${i}: option count differs`);
    }
  }
  // And they must NOT be the same bank: the spelling has to move somewhere.
  const spelt = (item) =>
    item.content.direction === 'wordToPicture'
      ? item.content.word
      : item.content.options.map((o) => o.word).join(' ');
  const differing = a.filter((item, i) => b[i] && spelt(item) !== spelt(b[i])).length;
  if (differing === 0) fail('equating', 'the two banks are identical — the perTrial arm re-drew nothing');
}

/* ---- Report --------------------------------------------------------------- */
for (const mode of MODES) {
  const b = banks[mode];
  console.log(
    `VER-MORPHO-01.${mode}: ${b.items.length} items, difficulty ${round2(b.min)}..${round2(b.max)}, ` +
      `${b.systemIds.size} hidden system(s)`,
  );
  console.log(
    `  key positions (4-option stratum): ` +
      OPTION_KEYS.map((k) => `${k}:${b.keyCounts[k]}`).join(' ') +
      `  — modal advantage over the 25.0% floor: +${b.worstKeyAdvantage.toFixed(1)}pt`,
  );
  console.log(`  forms in play (all CVC, screened twice): ${b.forms.join(' ')}`);
  console.log(`  per 0.5pt rung (1.0 -> 20.0): ${b.rungCounts.join(' ')}`);

  const sorted = b.attacks.slice().sort((x, y) => x.difficulty - y.difficulty);
  const sliceSize = Math.ceil(sorted.length / 4);
  const lines = [];
  for (let q = 0; q < 4; q++) {
    const slice = sorted.slice(q * sliceSize, (q + 1) * sliceSize);
    if (slice.length === 0) continue;
    const determined = slice.filter((x) => x.viable <= 1).length;
    const viable = slice.reduce((a, x) => a + x.viable, 0) / slice.length;
    const attack = slice.reduce((a, x) => a + x.share, 0) / slice.length;
    lines.push(
      `Q${q + 1} ${round2(slice[0].difficulty)}..${round2(slice[slice.length - 1].difficulty)}: ` +
        `${determined} determined, ${viable.toFixed(2)}/4 viable, best attack ${(100 * attack).toFixed(1)}%`,
    );
  }
  console.log(`  anti-leak by difficulty quartile (chance floor 25.0%):`);
  for (const line of lines) console.log(`    ${line}`);
}

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(
  '\nPASS — both banks parse; the key is re-derived from the stated system on 100% of items in both\n' +
    'directions; every option is reachable by SOME form->meaning relabelling and the key is never\n' +
    'the unique modal one, so brute-forcing every mapping eliminates nothing and cannot prefer the\n' +
    'key; the key is never the unique largest change from the reference picture; every distractor is\n' +
    'a named partial rule that reproduces its own picture; no two items share a `content`, so no\n' +
    'stimulus is served twice under two ids; no word repeats a morpheme, contains a\n' +
    'morpheme that does nothing, or lets its number affixes cancel; difficulty is monotone in every\n' +
    'lever on the model AND in the bank; coverage is 1..20 with >=10 items per 0.5-point rung; depth\n' +
    'respects the band ladder and K-1 is never declared; key positions sit at the 4-option floor and\n' +
    'the two directions are balanced within every rung; all ten forms are legal CVC, pairwise two\n' +
    'edits apart, and absent from both English screens; the consistent bank holds one hidden system\n' +
    'and the perTrial bank one per item; and the two banks are equated on every scored property.\n\n' +
    'NOT GATED, and the construct claim is NOT established. This says the instrument is well formed.\n' +
    'Whether it loads on verbal rather than fluid reasoning is A-S2-3 and is untested; whether it\n' +
    'measures learning at all is Gate B and needs ~128 real children (STAGE2_QUESTION_DESIGN §4.1.3).',
);
