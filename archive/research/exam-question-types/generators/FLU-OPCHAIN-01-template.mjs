// FLU-OPCHAIN-01 "Machine Chain" — the TEMPLATE bank, for the serve-time materialisation path.
//
// This is the same task as `FLU-OPCHAIN-01.mjs` builds — a row of badges, a figure, five candidate
// outputs, one tap — emitted in the form STAGE2_REDESIGN_SPEC.md §2.1 requires: a template that names
// no meaning, from which the SERVER materialises a finished item once it has drawn the session's
// symbol->operator mapping.
//
// ---------------------------------------------------------------------------
// WHY THERE ARE TWO BANKS OF THE SAME TYPE, AND WHICH ONE IS LIVE
//
// `banks/FLU-OPCHAIN-01.jsonl` is the shipped bank and is untouched by this file. It holds one hidden
// system for its whole life, its options are baked, and it is what the live block serves today.
//
// `templates/FLU-OPCHAIN-01.jsonl` is what this file writes. It is read only by
// `stage2-serve-time-materialisation.mjs` and, behind a flag, by the app's materialised serve path.
// It is deliberately NOT in `banks/`: `bank-loader.ts` builds every path it reads inside that
// directory and `scripts/sync-exam-demos.mjs` globs it to decide what is wired, so a template file
// there would be parsed as a finished bank — with no `answer` — and would either wire a keyless type
// or fail the loader. The directory split is the same guarantee the scrambled control arm gets from
// `control-banks/`, and for the same reason: a filename convention is not a boundary.
//
// ---------------------------------------------------------------------------
// WHAT COVERAGE MEANS NOW, WHICH IS NOT WHAT IT MEANT
//
// The shipped bank guarantees ">=5 items on every 0.5-point rung of 1..20", and `buildBank` fills the
// rungs by solving for a difficulty a stored number then records. A template cannot do that, because
// under §3 an item's difficulty is partly a function of the child's evidence so far and therefore is
// not a property of the file (§2.1's stated cost).
//
// So the coverage this emitter owes is over the STRUCTURE that difficulty is priced on and that a
// file can hold: chain length, which slots are in play, and the input figure. It fills every
// (chain length, band) cell the developmental cap admits, with distinct slot sets and distinct
// inputs. Whether that structural spread actually lets a session hit its difficulty target at every
// trial is a measured property of the SESSION, not of the bank, and it is measured in
// `stage2-serve-time-materialisation-probe.mjs` (§4) rather than asserted here.
//
// Run:  node research/exam-question-types/generators/FLU-OPCHAIN-01-template.mjs
//       writes ../templates/FLU-OPCHAIN-01.jsonl and prints a coverage summary.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertNoMeaningNames, templateProblems } from '../stage2-item-template.mjs';
import {
  BADGE_SYMBOLS,
  GLYPHS,
  OPERATORS,
  figureKey,
  makeRng,
  relabelVotes,
  shuffle,
} from './FLU-OPCHAIN-01-algebra.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const TEMPLATE_PATH = '../templates/FLU-OPCHAIN-01.jsonl';
export const SLOT_COUNT = BADGE_SYMBOLS.length;

/**
 * The developmental cap on chain length, per band (§4.3).
 *
 * Li et al. (2024) found 6-7-year-olds mostly best fit by a RANDOM-RESPONSE model on an
 * information-integration structure, so the young bands get unidimensional and low-depth composition
 * only. Chain length is exactly that dimensionality here. Carried over from the shipped generator
 * unchanged — it is a fact about children, and nothing about serve-time materialisation touches it.
 */
export const BAND_MAX_CHAIN = [
  { band: 'K-1', maxChain: 1 },
  { band: '2-3', maxChain: 2 },
  { band: '4-5', maxChain: 3 },
  { band: '6-8', maxChain: 4 },
];

/** Bands whose cap admits a chain this long. */
export function bandsForChainLength(chainLength) {
  return BAND_MAX_CHAIN.filter((entry) => entry.maxChain >= chainLength).map((entry) => entry.band);
}

/**
 * The narrowest band that admits this chain length — the one the template declares.
 *
 * Narrowest rather than all-that-admit, because `ageBands` is what the engine filters on and a
 * template tagged with all four bands would offer a depth-4 chain to a K-1 child the moment the
 * cap moved from a filter to a hint.
 */
export function bandForChainLength(chainLength) {
  return BAND_MAX_CHAIN.find((entry) => entry.maxChain >= chainLength)?.band ?? '6-8';
}

/**
 * Every distractor rationale this chain admits, in PRIORITY ORDER.
 *
 * TWO PROPERTIES OF THE ORDER ARE LOAD-BEARING.
 *
 * It is CLASS-INTERLEAVED, not class-grouped. The server takes the first four rationales that
 * materialise to distinct, reachable, non-key figures under the drawn mapping, so whatever comes
 * first is what the slate is usually made of. Grouped by class, a depth-4 chain's slate would be
 * three reorders and a drop, and §4.6's strategy trace would classify almost every wrong answer into
 * one bucket. Interleaved, the first four span four classes.
 *
 * It is FIXED IN THE FILE and does not depend on the mapping. That is what makes the selection
 * reproducible from the seed: the server walks this list in this order under every mapping, so
 * "which four options did trial 7 show" is a function of (template, mapping) with no hidden state.
 *
 * The list is long on purpose. Collisions are the normal case rather than the exception — five of the
 * six operators are involutions, so `repeat@0` and `drop@0` produce the SAME figure whenever slot 0
 * happens to mean one of those five, and two commuting attribute operators make `reorder@i` produce
 * the key itself. A short list would leave depth-1 and depth-2 templates unmaterialisable under most
 * mappings, which is the failure this whole path exists to remove.
 */
export function rationaleSlate(chain, slotCount = SLOT_COUNT) {
  const length = chain.length;
  const unused = [];
  for (let slot = 0; slot < slotCount; slot += 1) if (!chain.includes(slot)) unused.push(slot);

  /** One queue per lure class, so the interleave below spreads the slate across classes. */
  const queues = [];

  const reorder = [];
  for (let i = 0; i + 1 < length; i += 1) {
    reorder.push({
      rationaleId: `reorder@${i}`,
      lure: 'order_error',
      transform: { kind: 'reorder', at: i },
      note: `applied badge ${i + 1} and badge ${i + 2} in the wrong order`,
    });
  }
  queues.push(reorder);

  const drop = [];
  for (let i = 0; i < length; i += 1) {
    drop.push({
      rationaleId: `drop@${i}`,
      lure: 'omission',
      transform: { kind: 'drop', at: i },
      note: `skipped badge ${i + 1}`,
    });
  }
  queues.push(drop);

  // `substitute` is the deepest queue and the only one that is admissible at chain length 1, where the
  // reachable set is exactly the six single-operator outputs and every other transform lands outside
  // it. It gets its own queue per position so the interleave reaches a second position before a
  // second substitution at the first.
  const substitute = [];
  for (let i = 0; i < length; i += 1) {
    for (const withSlot of unused) {
      substitute.push({
        rationaleId: `sub@${i}<-s${withSlot}`,
        lure: 'wrong_operator',
        transform: { kind: 'substitute', at: i, withSlot },
        note: `read badge ${i + 1} as a different operator`,
      });
    }
  }
  queues.push(substitute);

  const repeat = [];
  for (let i = 0; i < length; i += 1) {
    repeat.push({
      rationaleId: `twice@${i}`,
      lure: 'over_application',
      transform: { kind: 'repeat', at: i },
      note: `applied badge ${i + 1} twice`,
    });
  }
  queues.push(repeat);

  const truncate = [];
  // At length 2, reversing IS reordering position 0, so it would be a duplicate id for the same
  // figure; it only says something new from length 3 up.
  if (length >= 3) {
    truncate.push({
      rationaleId: 'reverse',
      lure: 'order_error',
      transform: { kind: 'reverse' },
      note: 'applied the badges in the opposite order, last one first',
    });
  }
  if (length > 1) {
    truncate.push({
      rationaleId: 'firstOnly',
      lure: 'first_step_only',
      transform: { kind: 'prefix', length: 1 },
      note: 'applied only the first badge and stopped',
    });
  }
  truncate.push({
    rationaleId: 'identity',
    lure: 'identity_copy',
    transform: { kind: 'prefix', length: 0 },
    note: 'applied no operator at all',
  });
  queues.push(truncate);

  const out = [];
  for (let round = 0; out.length < queues.reduce((n, q) => n + q.length, 0); round += 1) {
    for (const queue of queues) if (queue[round] !== undefined) out.push(queue[round]);
  }
  return out;
}

/**
 * One template.
 *
 * Note what is NOT computed here: the key, the options, the difficulty, and the key's screen slot.
 * All four are session facts. What IS computed is the reachable-figure count for (chain length,
 * input), because that quantity depends only on those two — `relabelVotes` never sees the mapping —
 * so it is a genuine property of the template and it is what the exclusion rule in §4.1 is stated
 * over. Recording it lets the emitter refuse a template that could not fill five reachable options
 * under ANY mapping, rather than leaving the server to discover it per session.
 */
export function genTemplate({ chainLength, slots, glyphIndex, seed }) {
  const rng = makeRng(seed);
  const input = {
    glyph: GLYPHS[glyphIndex % GLYPHS.length],
    orient: { a: Math.floor(rng() * 4), b: Math.floor(rng() * 2) },
    shade: rng() < 0.5 ? 'solid' : 'hollow',
    border: rng() < 0.5 ? 1 : 0,
    pair: rng() < 0.5 ? 1 : 0,
  };
  const reachable = relabelVotes(chainLength, input);
  const band = bandForChainLength(chainLength);

  return {
    templateId: `flu-opchain-t-${seed}`,
    typeCode: 'FLU-OPCHAIN-01',
    domain: 'fluid_reasoning',
    ageBands: [band],
    /** The input state the machine starts from. */
    input,
    /** The chain, as references to symbol slots. No meaning is named. */
    chain: slots.slice(),
    /** How to construct each wrong option, in priority order. */
    rationales: rationaleSlate(slots, SLOT_COUNT),
    /**
     * The relabelling-invariant facts §3 prices difficulty on.
     *
     * `slots` is here as well as in `chain` because the block needs the SET to count vocabulary in
     * play and to decide which earlier trials constrain this one, and doing that off `chain` would
     * mean every reader re-deriving it.
     */
    structure: {
      slotCount: SLOT_COUNT,
      chainLength,
      slots: [...slots].sort((a, b) => a - b),
      glyphIndex: glyphIndex % GLYPHS.length,
      band,
      /**
       * How many distinct figures ANY reading of a chain this long can reach from this input.
       * Mapping-independent, so it bounds the option slate for every session at once: below five
       * there is no mapping under which this template can fill a five-option screen.
       */
      reachableFigures: reachable.size,
    },
    optionCount: 5,
    provenance: {
      generator: 'grammar-template',
      generatorRef: 'flu-opchain-01-template@1',
      seed,
    },
    syntheticOnly: true,
    validated: false,
  };
}

/**
 * What makes two templates the same question, for the purpose of refusing to ship both.
 *
 * `learning-block.ts` forbids re-serving an item because a repeat measures recall of that item rather
 * than the system, and two templates differing only in id are a repeat wearing a new label. The
 * fingerprint names the input figure and the SLOT chain — not the operator chain, which does not
 * exist yet, and not the options, which do not either.
 *
 * It is deliberately sensitive to which slots are used rather than only to how many. Two depth-2
 * templates over slots {0,1} and {2,3} are different questions to a child mid-block: one may involve
 * two symbols they have already seen resolved and the other two they have not, which is the
 * `evidence` lever in §3 and the whole reason the slot set is a structural fact.
 */
export function templateFingerprint(template) {
  return JSON.stringify([figureKey(template.input), template.chain]);
}

/**
 * The template bank.
 *
 * `perCell` templates for every (chain length, slot-set) cell, walking glyphs and inputs so the
 * stimulus space is spread rather than sampled from one corner. Every cell is reachable by
 * construction: the slot sets are enumerated from the vocabulary, not filtered.
 */
export function buildTemplateBank({ perCell = 6, seedPrefix = 'FLU-OPCHAIN-01|template|v1' } = {}) {
  const templates = [];
  const emitted = new Set();
  let glyphCursor = 0;

  for (const chainLength of [1, 2, 3, 4]) {
    // Slot SETS are enumerated exhaustively and their internal ORDER is drawn, so the bank covers
    // every combination of symbols a chain of this length can put in play while the order in which
    // they act stays varied. Order matters to the child (the operators do not commute) and not to the
    // structural levers, which is exactly why it is drawn rather than enumerated.
    const sets = combinations(SLOT_COUNT, chainLength);
    for (const set of sets) {
      for (let i = 0; i < perCell; i += 1) {
        const seed = `${seedPrefix}|L${chainLength}|S${set.join('.')}|i${i}`;
        const ordered = shuffle(set, makeRng(`order|${seed}`));
        const template = genTemplate({
          chainLength,
          slots: ordered,
          glyphIndex: glyphCursor++,
          seed,
        });
        // Five options need five distinct reachable figures. A template that cannot reach them under
        // any mapping is refused here rather than excluded from every session for ever.
        if (template.structure.reachableFigures < template.optionCount) continue;
        const fingerprint = templateFingerprint(template);
        if (emitted.has(fingerprint)) continue;
        emitted.add(fingerprint);
        templates.push(template);
      }
    }
  }
  return templates;
}

/** Every `k`-subset of `0..n-1`, in lexicographic order. */
export function combinations(n, k) {
  const out = [];
  const walk = (start, current) => {
    if (current.length === k) {
      out.push(current.slice());
      return;
    }
    for (let i = start; i < n; i += 1) {
      current.push(i);
      walk(i + 1, current);
      current.pop();
    }
  };
  walk(0, []);
  return out;
}

/* ------------------------------------------------------------------ *
 * CLI entrypoint
 * ------------------------------------------------------------------ */
function isMain() {
  return process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
}

if (isMain()) {
  const perCell = Number(process.env.PER_CELL || 6);
  const templates = buildTemplateBank({ perCell });

  const problems = [];
  for (const template of templates) {
    // The rule that keeps difficulty relabelling-invariant, enforced at build time on every record.
    assertNoMeaningNames(template, OPERATORS);
    for (const problem of templateProblems(template)) {
      problems.push(`${template.templateId}: ${problem}`);
    }
  }
  if (problems.length > 0) {
    console.error(`${problems.length} template problem(s):`);
    for (const problem of problems.slice(0, 20)) console.error(`  - ${problem}`);
    process.exit(1);
  }

  const outPath = resolve(__dirname, TEMPLATE_PATH);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, templates.map((t) => JSON.stringify(t)).join('\n') + '\n');
  console.log(`FLU-OPCHAIN-01 templates: ${templates.length} -> ${outPath}`);

  const byLength = new Map();
  const byBand = new Map();
  for (const template of templates) {
    const { chainLength, band } = template.structure;
    byLength.set(chainLength, (byLength.get(chainLength) ?? 0) + 1);
    byBand.set(band, (byBand.get(band) ?? 0) + 1);
  }
  console.log(
    'chain lengths: ' +
      [...byLength]
        .sort((a, b) => a[0] - b[0])
        .map(([length, n]) => `L${length}:${n}`)
        .join('  '),
  );
  console.log(
    'bands: ' +
      [...byBand]
        .sort()
        .map(([band, n]) => `${band}:${n}`)
        .join('  '),
  );
  console.log(
    `distinct slot sets covered: ${new Set(templates.map((t) => t.structure.slots.join('.'))).size}`,
  );
  console.log(
    `rationales per template: min ${Math.min(...templates.map((t) => t.rationales.length))}, ` +
      `max ${Math.max(...templates.map((t) => t.rationales.length))}`,
  );
  console.log(
    '\nNO KEY, NO DIFFICULTY, NO OPERATOR NAME is stored in any record above. All three are session\n' +
      'facts, materialised by stage2-serve-time-materialisation.mjs and recorded with the session (R7).',
  );
}
