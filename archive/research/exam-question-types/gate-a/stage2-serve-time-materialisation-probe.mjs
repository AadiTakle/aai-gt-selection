// SERVE-TIME MATERIALISATION, MEASURED — the before/after for STAGE2_REDESIGN_SPEC.md §2.1 and §3.
//
// Six sections, each one a claim the redesign has to earn:
//
//   §1  ADMISSIBILITY. Is the correct answer on screen? Measured on the SHIPPED bank under re-keying,
//       which is the failure (13.8% at chain depth 4), and on the MATERIALISED path, which is the fix.
//   §2  THE DIFFICULTY-ORDINAL ATTACK (F7b). Recover the key's screen slot from the served difficulty
//       ordinal alone. Measured on the shipped bank, where it works, and on a materialised session,
//       where there is no bank-wide order to recover.
//   §3  RELABELLING INVARIANCE. Does difficulty move when only the mapping moves?
//   §4  R7 REPLAY. Does a session re-run from its seed reproduce every served item, option order and
//       difficulty exactly?
//   §5  WHAT THE NEW MODEL COSTS. Reachable difficulty, granularity, and the one confound §3 of the
//       spec does not mention.
//   §6  THE SERVED PAYLOAD. Does anything the browser receives carry key material?
//
// Deterministic from the constant in the header. Run:
//   node research/exam-question-types/gate-a/stage2-serve-time-materialisation-probe.mjs
//   node research/exam-question-types/gate-a/stage2-serve-time-materialisation-probe.mjs --json
//
// CLAIM BOUNDARY. Every bank and template here is born-synthetic (`syntheticOnly: true`,
// `validated: false`). "A client scores X" is a statement about a script, never about a child, and it
// does not belong in a responder model or a guessing floor. Nothing here is evidence that this type
// measures learning: that is Gate B, it needs roughly 128 real children, and it has not run.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BADGE_SYMBOLS,
  OPERATORS,
  applyChain,
  figureKey,
  makeRng,
  shuffle,
} from '../generators/FLU-OPCHAIN-01-algebra.mjs';
import { permutations } from '../stage2-learnability-core.mjs';
import {
  OPTION_KEYS,
  drawSessionSystem,
  materialiseTemplate,
  nearestCandidate,
  openSession,
  replaySession,
} from '../stage2-serve-time-materialisation.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
export const PROBE_SEED = 'STAGE2_SERVE_TIME_MATERIALISATION|v1';

const readJsonl = (file) =>
  readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));

const pct = (n, d) => (d === 0 ? 0 : (100 * n) / d);
const fmt = (x, places = 1) => x.toFixed(places);
const mean = (xs) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
const quantile = (xs, q) => {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};

/* ================================================================== *
 * §1 ADMISSIBILITY — is the answer on screen?
 * ================================================================== */

/**
 * Every badge->operator bijection. 720 of them, enumerated exactly rather than sampled: the whole
 * point of the measurement is the tail, and a sample of the tail is not the tail.
 */
const ALL_MAPPINGS = permutations(OPERATORS).map((assigned) =>
  Object.fromEntries(BADGE_SYMBOLS.map((badge, i) => [badge, assigned[i]])),
);

/**
 * THE SHIPPED BANK UNDER RE-KEYING — PR #51's Failure B, reproduced.
 *
 * The bank's options are baked against ONE build-time mapping. Re-key the session and the chain means
 * something else, so the figure the machine now produces may or may not be among the five already on
 * screen. This counts, per item and per chain depth, how many of the 720 mappings leave the answer
 * visible at all. Nothing reconciles the two, which is why the number is not 100%.
 */
export function shippedBankAdmissibility(bank) {
  const byDepth = new Map();
  for (const item of bank) {
    const input = item.content.input;
    const chain = item.content.chain;
    const depth = chain.length;
    const onScreen = new Set(item.content.options.map((o) => figureKey(o.figure)));

    let landed = 0;
    for (const mapping of ALL_MAPPINGS) {
      const produced = figureKey(applyChain(chain.map((badge) => mapping[badge]), input));
      if (onScreen.has(produced)) landed += 1;
    }
    const row = byDepth.get(depth) ?? { depth, items: 0, landed: 0, mappings: 0, difficulties: [] };
    row.items += 1;
    row.landed += landed;
    row.mappings += ALL_MAPPINGS.length;
    row.difficulties.push(item.difficulty);
    byDepth.set(depth, row);
  }
  return [...byDepth.values()]
    .sort((a, b) => a.depth - b.depth)
    .map((row) => ({
      depth: row.depth,
      items: row.items,
      admissibleShare: pct(row.landed, row.mappings),
      difficultySpan: [Math.min(...row.difficulties), Math.max(...row.difficulties)],
    }));
}

/**
 * THE MATERIALISED PATH — the same question, asked of the fix.
 *
 * For every template and a spread of drawn mappings: does the served item show the figure the chain
 * produces? It has to, because the option slate is BUILT from that figure and from transformations of
 * the chain that made it, rather than selected from a slate that predates the mapping. This measures
 * it anyway, because "by construction" is an argument and the table is evidence.
 *
 * `excluded` is reported alongside and is not a hidden denominator: a template excluded under a mapping
 * is not served under that mapping, so it cannot contribute an inadmissible item. The exclusion RATE
 * is the honest cost of the guarantee and it is printed with the reasons.
 */
export function materialisedAdmissibility(templates, sessionSeeds) {
  const byDepth = new Map();
  const exclusions = new Map();
  for (const sessionSeed of sessionSeeds) {
    const system = drawSessionSystem(sessionSeed);
    for (const template of templates) {
      const depth = template.chain.length;
      const row = byDepth.get(depth) ?? { depth, served: 0, keyOnScreen: 0, excluded: 0 };
      const result = materialiseTemplate(template, system, { sessionSeed });
      if (result.excluded !== undefined) {
        row.excluded += 1;
        exclusions.set(result.excluded, (exclusions.get(result.excluded) ?? 0) + 1);
        byDepth.set(depth, row);
        continue;
      }
      row.served += 1;
      const derived = figureKey(applyChain(result.item.answer.operatorChain, template.input));
      const keyed = result.item.content.options.find((o) => o.key === result.item.answer.correctKey);
      if (keyed !== undefined && figureKey(keyed.figure) === derived) row.keyOnScreen += 1;
      byDepth.set(depth, row);
    }
  }
  return {
    byDepth: [...byDepth.values()]
      .sort((a, b) => a.depth - b.depth)
      .map((row) => ({
        depth: row.depth,
        served: row.served,
        admissibleShare: pct(row.keyOnScreen, row.served),
        excludedShare: pct(row.excluded, row.served + row.excluded),
      })),
    exclusions: [...exclusions].sort((a, b) => b[1] - a[1]),
  };
}

/* ================================================================== *
 * §2 F7b — the difficulty-ordinal slot attack
 * ================================================================== */

/**
 * Name the key's screen slot from the item's rank in the served difficulty order, and nothing else.
 *
 * WHY THIS WORKS ON THE SHIPPED BANK. Its generator allocates the key's slot with a global round-robin
 * cursor — `keyPosition = n mod 5`, `n` the emission index — and emits rung by rung in increasing
 * difficulty. `difficulty` is served. So sorting a scraped bank by difficulty approximately recovers
 * `n`, and `n mod 5` is the answer. No brute force, no mapping enumeration, no understanding of the
 * item at all.
 *
 * Ties are broken on `itemId`, which is also served — never on position in the bank file, which a
 * client does not have.
 */
export function ordinalSlotAttack(items) {
  const ranked = [...items].sort(
    (a, b) => a.difficulty - b.difficulty || (a.itemId < b.itemId ? -1 : 1),
  );
  let best = 0;
  // The attacker fits one integer: which offset of `rank mod 5` to play. Reporting the BEST offset is
  // the honest reading — an attacker tries all five and keeps the one that works.
  for (let offset = 0; offset < OPTION_KEYS.length; offset += 1) {
    let hits = 0;
    ranked.forEach((item, rank) => {
      if (OPTION_KEYS[(rank + offset) % OPTION_KEYS.length] === item.correctKey) hits += 1;
    });
    best = Math.max(best, pct(hits, ranked.length));
  }
  return best;
}

/** The marginal key-slot distribution, so a slot-frequency attack is scored next to the ordinal one. */
export function modalSlotAttack(items) {
  const counts = new Map();
  for (const item of items) counts.set(item.correctKey, (counts.get(item.correctKey) ?? 0) + 1);
  return pct(Math.max(...counts.values()), items.length);
}

/**
 * What {@link ordinalSlotAttack} scores when the association it exploits has been destroyed.
 *
 * THIS IS WHY THE RAW FIGURE CANNOT BE READ AGAINST THE 20% FLOOR. The attacker fits one integer — it
 * tries all five offsets of `rank mod 5` and keeps the best — so on a 30-trial session it scores well
 * above chance on data with no pattern in it at all, purely because the maximum of five noisy estimates
 * is above their mean. The bank's 468 items make that bias small; a session's 30 do not.
 *
 * So the null shuffles the key slots against the difficulty order, which preserves both the difficulty
 * ordinal and the marginal slot distribution and destroys only the association between them, and
 * reports what the same attacker scores. A served figure at its own null is a served figure with no
 * recoverable ordering, whatever the absolute number looks like.
 */
export function ordinalSlotAttackNull(items, seed, rounds = 200) {
  const rng = makeRng(`null|${seed}`);
  const scores = [];
  for (let round = 0; round < rounds; round += 1) {
    const slots = shuffle(items.map((item) => item.correctKey), rng);
    scores.push(ordinalSlotAttack(items.map((item, i) => ({ ...item, correctKey: slots[i] }))));
  }
  return mean(scores);
}

/* ================================================================== *
 * §3 RELABELLING INVARIANCE
 * ================================================================== */

/**
 * Does a free relabelling move the difficulty, holding the child's evidence fixed?
 *
 * PR #51's Failure A is that it does, by mean 0.83 and p95 2.94 on this type, because the shipped model
 * prices a count of one operator sub-class and class membership belongs to the operator. The model in
 * §3 prices four levers that name no meaning, so the STRUCTURAL levers must be bit-identical across
 * mappings and the total must move only through residual ambiguity — which §3 says should move with the
 * mapping rather than against it.
 *
 * Measured at trial 1 with no evidence, so the only thing varying is the draw. Templates excluded under
 * a mapping are skipped for that mapping and counted, because an unserved item has no difficulty to
 * drift.
 */
export function difficultyDriftAcrossMappings(templates, sessionSeeds) {
  const perTemplate = new Map();
  for (const sessionSeed of sessionSeeds) {
    const session = openSession({ sessionSeed, templates });
    for (const candidate of session.candidates()) {
      const id = candidate.entry.template.templateId;
      const row = perTemplate.get(id) ?? { structural: [], total: [], chainLengths: new Set() };
      row.structural.push(candidate.levers.structural);
      row.total.push(candidate.difficulty);
      row.chainLengths.add(candidate.levers.chainLength);
      perTemplate.set(id, row);
    }
  }

  const structuralDrifts = [];
  const totalDrifts = [];
  let structuralMoved = 0;
  let compared = 0;
  for (const row of perTemplate.values()) {
    if (row.total.length < 2) continue;
    compared += 1;
    const sSpread = Math.max(...row.structural) - Math.min(...row.structural);
    const tSpread = Math.max(...row.total) - Math.min(...row.total);
    structuralDrifts.push(sSpread);
    totalDrifts.push(tSpread);
    if (sSpread > 1e-9) structuralMoved += 1;
  }
  return {
    templatesCompared: compared,
    mappings: sessionSeeds.length,
    structuralMovedShare: pct(structuralMoved, compared),
    structuralMaxDrift: structuralDrifts.length === 0 ? 0 : Math.max(...structuralDrifts),
    totalMeanDrift: mean(totalDrifts),
    totalP95Drift: quantile(totalDrifts, 0.95),
    totalMaxDrift: totalDrifts.length === 0 ? 0 : Math.max(...totalDrifts),
  };
}

/* ================================================================== *
 * §4 R7 REPLAY, §5 COST, §6 THE PAYLOAD
 * ================================================================== */

/**
 * Run one 30-trial block, then re-run it from the seed and the recorded choices and compare.
 *
 * The comparison is over the WHOLE ledger, deep — trial order, template id, item id, key slot, the
 * rationale id in every option slot, the option figure keys, and the difficulty with its levers. A
 * comparison over item ids alone would pass while the options were reshuffled, and reproducing option
 * ORDER is half of what R7 needs here.
 *
 * The replay is handed the seed, the templates and the (templateId, chosenKey) pairs. It is NOT handed
 * the options, the keys or the difficulties: taking those as input would make the assertion circular.
 */
export function replayCheck(templates, sessionSeeds, { trials = 30, targetWalk } = {}) {
  const results = [];
  for (const sessionSeed of sessionSeeds) {
    const rng = makeRng(`responder|${sessionSeed}`);
    const session = openSession({ sessionSeed, templates });
    const choices = [];
    for (let trial = 0; trial < trials; trial += 1) {
      const candidates = session.candidates();
      if (candidates.length === 0) break;
      const picked = nearestCandidate(candidates, targetWalk(trial));
      const { item, row } = session.serve(picked.entry.template.templateId);
      // A responder that is right some of the time and wrong the rest, so the targeting walk and the
      // recorded choices both vary. Its accuracy is irrelevant; what matters is that the replay is
      // handed the same choices and has to reproduce the same screens.
      const chosenKey =
        rng() < 0.5
          ? row.correctKey
          : item.content.options[Math.floor(rng() * item.content.options.length)].key;
      session.commit({ chosenKey });
      choices.push({ templateId: row.templateId, chosenKey });
    }
    const replayed = replaySession({ sessionSeed, templates, choices });
    results.push({
      sessionSeed,
      trials: session.ledger.length,
      identical: JSON.stringify(replayed.ledger) === JSON.stringify(session.ledger),
      difficulties: session.ledger.map((row) => row.difficulty),
      ledger: session.ledger,
    });
  }
  return results;
}

/**
 * What the four-lever model can actually reach, per trial, and what that costs.
 *
 * The direct successor to PR #51's rung table. Under the shipped bank the question was "does every
 * 0.5-point rung hold the five items the bank guarantees", and re-keying broke it on 87.8% of rungs.
 * A template bank cannot answer that question at all, because an item has no difficulty until a
 * session prices it. The question that replaces it is per-trial and per-rung: **at this trial, is
 * there a candidate within the selection tolerance of this rung?**
 */
export function reachabilityByTrial(templates, sessionSeeds, { trials = 30, targetWalk, tolerance = 0.25 }) {
  const rungs = [];
  for (let d = 1; d <= 20 + 1e-9; d += 0.5) rungs.push(Math.round(d * 100) / 100);

  const rungCovered = new Map(rungs.map((rung) => [rung, 0]));
  let rungChecks = 0;
  const targetErrors = [];
  const spans = [];
  const distinctCounts = [];
  const windowTops = [];
  /**
   * The mean price of the WHOLE unserved pool at each trial, which is how the §3 confound has to be
   * measured. Correlating the SERVED difficulty with trial index measures the targeting rule, not the
   * model: the target climbs, so the served difficulty climbs with it whatever the model does. The pool
   * mean has no selection in it, so its slope is the model's own drift and nothing else.
   */
  const poolTrialIndex = [];
  const poolMeanDifficulty = [];

  for (const sessionSeed of sessionSeeds) {
    const rng = makeRng(`responder|${sessionSeed}`);
    const session = openSession({ sessionSeed, templates });
    for (let trial = 0; trial < trials; trial += 1) {
      const candidates = session.candidates();
      if (candidates.length === 0) break;
      const values = candidates.map((c) => c.difficulty);
      spans.push([Math.min(...values), Math.max(...values)]);
      distinctCounts.push(new Set(values).size);
      windowTops.push(Math.max(...values));
      poolTrialIndex.push(trial);
      poolMeanDifficulty.push(mean(values));
      for (const rung of rungs) {
        rungChecks += 1;
        if (values.some((v) => Math.abs(v - rung) <= tolerance)) {
          rungCovered.set(rung, rungCovered.get(rung) + 1);
        }
      }
      const target = targetWalk(trial);
      const picked = nearestCandidate(candidates, target);
      targetErrors.push(Math.abs(picked.difficulty - target));
      const { item, row } = session.serve(picked.entry.template.templateId);
      session.commit({
        chosenKey:
          rng() < 0.5
            ? row.correctKey
            : item.content.options[Math.floor(rng() * item.content.options.length)].key,
      });
    }
  }

  const perRung = rungs.map((rung) => ({
    rung,
    coveredShare: pct(rungCovered.get(rung), rungChecks / rungs.length),
  }));
  return {
    perRung,
    rungsNeverCovered: perRung.filter((r) => r.coveredShare === 0).map((r) => r.rung),
    poolDriftCorrelation: correlation(poolTrialIndex, poolMeanDifficulty),
    poolMeanFirstTrial: poolMeanDifficulty[0],
    poolMeanLastTrial: poolMeanDifficulty[poolMeanDifficulty.length - 1],
    meanTargetError: mean(targetErrors),
    p95TargetError: quantile(targetErrors, 0.95),
    maxTargetError: Math.max(...targetErrors),
    withinToleranceShare: pct(targetErrors.filter((e) => e <= 0.25).length, targetErrors.length),
    meanDistinctDifficulties: mean(distinctCounts),
    firstTrialWindow: spans[0],
    windowTopFirst: windowTops[0],
    windowTopLast: windowTops[windowTops.length - 1],
  };
}

/** Pearson correlation, for the one confound §3 of the spec does not mention. */
function correlation(xs, ys) {
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < xs.length; i += 1) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return dx === 0 || dy === 0 ? 0 : num / Math.sqrt(dx * dy);
}

/**
 * The served projection, and what it must not contain.
 *
 * Built by NAMING the seven fields a `ServedItem` has rather than by deleting the server-only ones, so
 * a field added to the materialised item later is absent from this by default instead of present by
 * oversight. Same shape as `toServedItem` in `apps/web/src/lib/exam/bank-loader.ts`.
 */
export function servedProjection(item) {
  return {
    itemId: item.itemId,
    typeCode: item.typeCode,
    domain: item.domain,
    difficulty: item.difficulty,
    ageBands: item.ageBands,
    content: item.content,
    syntheticOnly: true,
    validated: false,
  };
}

/**
 * Every string a served payload is forbidden to contain, and why each one is on the list.
 *
 * The six OPERATOR NAMES are the decisive entries: with the mapping absent but the vocabulary present,
 * a client that also knows the algebra could solve the item, so the payload must not name the
 * vocabulary at all. The rest are the field names that would carry the mapping, the key or the slot
 * allocation.
 */
export const FORBIDDEN_IN_PAYLOAD = [
  ...OPERATORS,
  'correctKey',
  'operatorChain',
  'slotToOperator',
  'slotToBadge',
  'badgeToOperator',
  'strategyTrace',
  'distractorRationales',
  'templateId',
  'rationaleId',
  'keySlot',
  'sessionSeed',
  'systemId',
];

export function payloadLeaks(payload) {
  const serialised = JSON.stringify(payload);
  return FORBIDDEN_IN_PAYLOAD.filter((token) => serialised.includes(token));
}

/* ================================================================== *
 * REPORT
 * ================================================================== */

export function runProbe() {
  const bank = readJsonl(join(ROOT, 'banks', 'FLU-OPCHAIN-01.jsonl'));
  const templates = readJsonl(join(ROOT, 'templates', 'FLU-OPCHAIN-01.jsonl'));

  const sessionSeeds = [];
  const seedRng = makeRng(`${PROBE_SEED}|sessions`);
  for (let i = 0; i < 8; i += 1) sessionSeeds.push(`session|${Math.floor(seedRng() * 1e9)}`);

  // A climbing target, the shape the block's own targeting rule produces: start above the standing and
  // walk up. Chosen here rather than imported so the probe needs no workspace build.
  const targetWalk = (trial) => 9 + trial * 0.12;

  const shipped = shippedBankAdmissibility(bank);
  const materialised = materialisedAdmissibility(templates, sessionSeeds.slice(0, 4));
  const drift = difficultyDriftAcrossMappings(templates, sessionSeeds);

  const bankRows = bank.map((item) => ({
    itemId: item.itemId,
    difficulty: item.difficulty,
    correctKey: item.answer.correctKey,
  }));
  const shippedOrdinal = ordinalSlotAttack(bankRows);
  const shippedOrdinalNull = ordinalSlotAttackNull(bankRows, `${PROBE_SEED}|bank`, 40);
  const shippedModal = modalSlotAttack(bank.map((item) => ({ correctKey: item.answer.correctKey })));

  const replays = replayCheck(templates, sessionSeeds, { targetWalk });
  const ledgerRows = (replay) =>
    replay.ledger.map((row) => ({
      itemId: row.itemId,
      difficulty: row.difficulty,
      correctKey: row.correctKey,
    }));
  const servedOrdinals = replays.map((replay) => ordinalSlotAttack(ledgerRows(replay)));
  const servedOrdinalNulls = replays.map((replay) =>
    ordinalSlotAttackNull(ledgerRows(replay), replay.sessionSeed),
  );
  const servedModals = replays.map((replay) =>
    modalSlotAttack(replay.ledger.map((row) => ({ correctKey: row.correctKey }))),
  );

  const reach = reachabilityByTrial(templates, sessionSeeds, { targetWalk });

  // The whole materialised pool's key slots, so the marginal is measured over more than 30 draws.
  const slotCounts = new Map(OPTION_KEYS.map((key) => [key, 0]));
  for (const sessionSeed of sessionSeeds) {
    const session = openSession({ sessionSeed, templates });
    for (const entry of session.materialised) {
      slotCounts.set(entry.item.answer.correctKey, slotCounts.get(entry.item.answer.correctKey) + 1);
    }
  }
  const slotTotal = [...slotCounts.values()].reduce((a, b) => a + b, 0);

  const sample = openSession({ sessionSeed: sessionSeeds[0], templates });
  const sampleServed = sample.serve(sample.candidates()[0].entry.template.templateId);
  const leaks = payloadLeaks(servedProjection(sampleServed.item));

  return {
    probeSeed: PROBE_SEED,
    bankItems: bank.length,
    templates: templates.length,
    sessionSeeds,
    shipped,
    materialised,
    drift,
    attack: {
      shippedOrdinal,
      shippedOrdinalNull,
      shippedModal,
      servedOrdinalMean: mean(servedOrdinals),
      servedOrdinalMax: Math.max(...servedOrdinals),
      servedOrdinalNullMean: mean(servedOrdinalNulls),
      servedModalMean: mean(servedModals),
      floor: 100 / OPTION_KEYS.length,
      slotMarginal: OPTION_KEYS.map((key) => ({ key, share: pct(slotCounts.get(key), slotTotal) })),
    },
    replays: replays.map((r) => ({ sessionSeed: r.sessionSeed, trials: r.trials, identical: r.identical })),
    reach,
    payload: { leaks, checked: FORBIDDEN_IN_PAYLOAD.length },
  };
}

function report(out) {
  console.log(`# Stage 2 serve-time materialisation — FLU-OPCHAIN-01\n`);
  console.log(`seed: ${out.probeSeed}`);
  console.log(
    `shipped bank: ${out.bankItems} items   templates: ${out.templates}   sessions drawn: ${out.sessionSeeds.length}`,
  );
  console.log(
    '\nEverything below is born-synthetic and ungated. No figure here is evidence about a child.\n',
  );

  console.log('## §1 Admissibility — is the answer on screen?\n');
  console.log('### The shipped bank, re-keyed (PR #51 Failure B)\n');
  console.log('| chain depth | items | difficulty span | mappings landing the key on screen |');
  console.log('| --- | --- | --- | --- |');
  for (const row of out.shipped) {
    console.log(
      `| ${row.depth} | ${row.items} | ${fmt(row.difficultySpan[0], 2)} – ${fmt(row.difficultySpan[1], 2)} | **${fmt(row.admissibleShare)}%** |`,
    );
  }
  console.log(
    '\nDefinition, because it is not interchangeable with the recorded figure. A mapping "lands the key on\n' +
      'screen" when the figure the badge chain produces under it is shown by SOME option of the baked\n' +
      'slate — not necessarily the option the bank records as the key. Measured over all 720 bijections\n' +
      'exactly, not sampled. This is an independent implementation and it does not reproduce D-206/E-205\u2019s\n' +
      '78.2% / 13.8% to the decimal: it reads about 5 points higher at both ends on the same bank, whose\n' +
      'difficulty spans do match cell for cell. The direction and the magnitude are the same finding —\n' +
      'admissibility collapses with depth to under a fifth of mappings — but the two numbers are not\n' +
      'interchangeable and the recorded pair is the one on the register.\n',
  );
  console.log('### The materialised path\n');
  console.log('| chain depth | items served | key on screen | templates excluded |');
  console.log('| --- | --- | --- | --- |');
  for (const row of out.materialised.byDepth) {
    console.log(
      `| ${row.depth} | ${row.served} | **${fmt(row.admissibleShare)}%** | ${fmt(row.excludedShare)}% |`,
    );
  }
  console.log('\nExclusions, by reason:');
  for (const [reason, n] of out.materialised.exclusions) console.log(`  ${reason}: ${n}`);

  console.log('\n## §2 The difficulty-ordinal slot attack (F7b)\n');
  console.log('| target | slot from the difficulty ordinal | its permutation null | lift over the null | modal slot |');
  console.log('| --- | --- | --- | --- | --- |');
  console.log(
    `| shipped bank (${out.bankItems} items) | **${fmt(out.attack.shippedOrdinal)}%** | ${fmt(out.attack.shippedOrdinalNull)}% | ` +
      `**+${fmt(out.attack.shippedOrdinal - out.attack.shippedOrdinalNull)}** | ${fmt(out.attack.shippedModal)}% |`,
  );
  console.log(
    `| materialised session (30 trials) | ${fmt(out.attack.servedOrdinalMean)}% mean, ${fmt(out.attack.servedOrdinalMax)}% worst | ` +
      `${fmt(out.attack.servedOrdinalNullMean)}% | **${fmt(out.attack.servedOrdinalMean - out.attack.servedOrdinalNullMean, 2)}** | ${fmt(out.attack.servedModalMean)}% |`,
  );
  console.log(
    `\nFloor for a five-option item: ${fmt(out.attack.floor)}%. The NULL is the column to read against, ` +
      'not the floor: the attacker fits one integer (which offset of `rank mod 5` to play) and keeps the\n' +
      'best of five, which on 30 trials scores well above chance on data with no pattern in it. The null\n' +
      'shuffles the slots against the difficulty order, preserving both marginals and destroying only\n' +
      'their association, so a served figure AT its null has no recoverable ordering left in it.',
  );
  console.log(
    '\nKey-slot marginal over every materialised item of every drawn session: ' +
      out.attack.slotMarginal.map((s) => `${s.key} ${fmt(s.share)}%`).join('  '),
  );

  console.log('\n## §3 Relabelling invariance of difficulty\n');
  console.log(
    `templates compared across ${out.drift.mappings} drawn mappings: ${out.drift.templatesCompared}`,
  );
  console.log(
    `structural levers (chain length + vocabulary): moved on **${fmt(out.drift.structuralMovedShare)}%** ` +
      `of templates, max drift ${fmt(out.drift.structuralMaxDrift, 3)}`,
  );
  console.log(
    `total difficulty, which §3 says SHOULD move with the mapping through residual ambiguity: ` +
      `mean ${fmt(out.drift.totalMeanDrift, 2)}, p95 ${fmt(out.drift.totalP95Drift, 2)}, max ${fmt(out.drift.totalMaxDrift, 2)}`,
  );

  console.log('\n## §4 R7 replay from the session seed\n');
  console.log('| session seed | trials | ledger reproduced exactly |');
  console.log('| --- | --- | --- |');
  for (const replay of out.replays) {
    console.log(`| ${replay.sessionSeed} | ${replay.trials} | ${replay.identical ? '**yes**' : 'NO'} |`);
  }

  console.log('\n## §5 What the new model reaches, and what it costs\n');
  console.log(
    `reachable difficulty at trial 1: ${fmt(out.reach.firstTrialWindow[0], 2)} – ${fmt(out.reach.firstTrialWindow[1], 2)}`,
  );
  console.log(
    `top of the reachable window: ${fmt(out.reach.windowTopFirst, 2)} at trial 1, ` +
      `${fmt(out.reach.windowTopLast, 2)} at the last trial`,
  );
  console.log(`mean distinct difficulties offered per trial: ${fmt(out.reach.meanDistinctDifficulties)}`);
  console.log(
    `|difficulty - target|: mean ${fmt(out.reach.meanTargetError, 2)}, p95 ${fmt(out.reach.p95TargetError, 2)}, ` +
      `max ${fmt(out.reach.maxTargetError, 2)}; within the 0.25 selection tolerance on ` +
      `**${fmt(out.reach.withinToleranceShare)}%** of trials`,
  );
  console.log(
    `0.5-point rungs never reachable at any trial of any session: ` +
      (out.reach.rungsNeverCovered.length === 0
        ? 'none'
        : `${out.reach.rungsNeverCovered.length} (${out.reach.rungsNeverCovered.join(', ')})`),
  );
  console.log(
    `\nTHE CONFOUND §3 OF THE SPEC DOES NOT MENTION. Two of the four levers move monotonically with\n` +
      'trial index by construction — evidence only accumulates and residual ambiguity only shrinks — so\n' +
      'the price of an unchanged item FALLS as the block runs. Measured on the whole unserved pool, which\n' +
      'has no selection in it, the mean price goes from ' +
      `${fmt(out.reach.poolMeanFirstTrial, 2)} at trial 1 to ${fmt(out.reach.poolMeanLastTrial, 2)} at the last, ` +
      `r = ${fmt(out.reach.poolDriftCorrelation, 3)} against trial index.\n` +
      'That collides with how the climb is fitted: `estimateLearningCurve` takes difficulty as the item\n' +
      'covariate, and a covariate that declines with trial index by construction absorbs part of the very\n' +
      'climb it conditions on. `levers.structural` is recorded for that reason and is the covariate a fit\n' +
      'should use. Naming the threshold at which this stops being acceptable is not this branch\u2019s call.',
  );

  console.log('\n## §6 The served payload\n');
  console.log(
    out.payload.leaks.length === 0
      ? `no key material: ${out.payload.checked} forbidden tokens checked, 0 present`
      : `LEAKS: ${out.payload.leaks.join(', ')}`,
  );
}

if (process.argv[1] && process.argv[1].endsWith('stage2-serve-time-materialisation-probe.mjs')) {
  const out = runProbe();
  if (process.argv.includes('--json')) console.log(JSON.stringify(out, null, 2));
  else report(out);
}
