import type { RawBankItem } from '../bank-loader';
import { num, numArray, type Verdict, type Verifier } from './types';

/**
 * Per-type verifiers for the verbal domain, keyed by `typeCode`.
 *
 * Each entry grades a constructed response that no generic verifier can handle.
 * Re-derive the expected response from `item.content` plus `item.answer` where
 * possible, rather than trusting a stored key, and never show correctness to the
 * client beyond the boolean this returns.
 *
 * FILE OWNERSHIP NOTE: the five `WM-*` entries below are spatial/memory types by
 * domain, not verbal ones. They live here only so that four agents can write
 * verifiers in parallel without touching the same file. `index.ts` merges every
 * domain file into one `typeCode`-keyed record, so which file an entry sits in
 * has no effect on resolution — only the key does.
 */

/* ------------------------------------------------------------------ *
 * shared helpers
 * ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recordOf(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function arrayOf(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function strArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') return null;
    out.push(entry);
  }
  return out;
}

/** Scores are compared and reported at the 4dp the solver specs round to. */
function round4(value: number): number {
  return Math.round(value * 1e4) / 1e4;
}

/** Ordinary-least-squares slope of `ys` on `xs`; null when x has no spread. */
function olsSlope(xs: readonly number[], ys: readonly number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i]!;
    sy += ys[i]!;
  }
  const mx = sx / n;
  const my = sy / n;
  let cov = 0;
  let varx = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx;
    cov += dx * (ys[i]! - my);
    varx += dx * dx;
  }
  if (varx === 0) return null;
  return cov / varx;
}

/* ------------------------------------------------------------------ *
 * WM-corsi-01 — wm-span-serial-order@1
 * ------------------------------------------------------------------ */

/**
 * Replay the timed flash schedule the way the renderer plays it (sort by onset,
 * read off the cells), then apply the instruction: forward keeps the seen order,
 * backward reverses it. Falls back to the stored `expectedSequence` only when the
 * schedule is unreadable — the schedule is the primary source because it is what
 * the child actually saw.
 */
function corsiExpectedSequence(item: RawBankItem): number[] | null {
  const content = item.content as { presentation?: unknown; mode?: unknown };
  const presentation = recordOf(content.presentation);
  const schedule = presentation ? arrayOf(presentation.schedule) : null;
  if (schedule && schedule.length > 0) {
    const steps = schedule.filter(isRecord);
    if (steps.length === schedule.length) {
      const ordered = [...steps].sort((a, b) => (num(a.onsetMs) ?? 0) - (num(b.onsetMs) ?? 0));
      const cells = ordered.map((step) => num(step.cell));
      if (cells.every((cell): cell is number => cell !== null)) {
        const mode = str(content.mode) ?? str(item.answer.mode);
        return mode === 'backward' ? cells.reverse() : cells;
      }
    }
  }
  return numArray(item.answer.expectedSequence);
}

/**
 * Serial-order span recall. Credit is strictly positional: unit `i` counts only
 * when `tappedCells[i]` is the cell the target sequence holds at `i`. Full credit
 * additionally needs the response to be exactly as long as the sequence, so an
 * intrusion (a sixth tap on a five-cell trail) is not full credit even when the
 * first five are right.
 *
 * `M-POLY` is the polytomous score the solver spec defines. `M-PROG` carries
 * `longestCorrectPrefix` as a proportion — how far into the trail the child got
 * before the first break, which is the per-item span contribution and is lost if
 * only the dichotomous verdict is kept.
 */
function verifyCorsi(item: RawBankItem, response: Record<string, unknown>): Verdict {
  const expected = corsiExpectedSequence(item);
  const tapped = numArray(response.tappedCells);
  if (!expected || expected.length === 0 || !tapped) return { correct: false };

  let unitsCorrect = 0;
  for (let i = 0; i < expected.length; i++) if (tapped[i] === expected[i]) unitsCorrect++;
  let prefix = 0;
  while (prefix < expected.length && tapped[prefix] === expected[prefix]) prefix++;

  return {
    correct: tapped.length === expected.length && unitsCorrect === expected.length,
    metrics: {
      'M-POLY': round4(unitsCorrect / expected.length),
      'M-PROG': round4(prefix / expected.length),
    },
  };
}

/* ------------------------------------------------------------------ *
 * WM-bind-01 — wm-binding-partial-credit@1
 * ------------------------------------------------------------------ */

/** Replay the encoding schedule into the creature -> house map it establishes. */
function bindExpectedBindings(item: RawBankItem): Record<string, number> | null {
  const content = item.content as { presentation?: unknown };
  const presentation = recordOf(content.presentation);
  const schedule = presentation ? arrayOf(presentation.schedule) : null;
  if (schedule && schedule.length > 0) {
    const steps = schedule.filter(isRecord);
    if (steps.length === schedule.length) {
      const ordered = [...steps].sort((a, b) => (num(a.onsetMs) ?? 0) - (num(b.onsetMs) ?? 0));
      const bindings: Record<string, number> = {};
      let readable = true;
      for (const step of ordered) {
        const creatureId = str(step.creatureId);
        const cell = num(step.cell);
        if (creatureId === null || cell === null) {
          readable = false;
          break;
        }
        // A later showing of the same creature legitimately overwrites.
        bindings[creatureId] = cell;
      }
      if (readable && Object.keys(bindings).length > 0) return bindings;
    }
  }
  const stored = recordOf(item.answer.bindings);
  if (!stored) return null;
  const bindings: Record<string, number> = {};
  for (const [creatureId, cell] of Object.entries(stored)) {
    const value = num(cell);
    if (value === null) return null;
    bindings[creatureId] = value;
  }
  return Object.keys(bindings).length > 0 ? bindings : null;
}

/**
 * Object-to-location binding recall. Credit is ORDER-FREE: a creature is credited
 * when it is back in the house it occupied during encoding, no matter when the
 * child put it there. That is what separates this type from WM-corsi-01 — the
 * construct is the identity-location association, not the sequence.
 *
 * Full credit needs every creature placed AND every placement right, so an
 * omission can never reach 1 even if the surviving placements are all correct.
 * `M-POLY` keeps the per-binding proportion, which is the whole point of the
 * type: a child who holds three of four bindings is not the same as one who
 * holds none.
 */
function verifyBind(item: RawBankItem, response: Record<string, unknown>): Verdict {
  const bindings = bindExpectedBindings(item);
  const placements = recordOf(response.placements);
  if (!bindings || !placements) return { correct: false };

  const creatures = Object.keys(bindings);
  let unitsCorrect = 0;
  let placed = 0;
  for (const creature of creatures) {
    const cell = num(placements[creature]);
    if (cell === null) continue;
    placed++;
    if (cell === bindings[creature]) unitsCorrect++;
  }

  return {
    correct: placed === creatures.length && unitsCorrect === creatures.length,
    metrics: { 'M-POLY': round4(unitsCorrect / creatures.length) },
  };
}

/* ------------------------------------------------------------------ *
 * WM-gridflash-01 — wm-change-detection-sdt@1 + wm-array-recognition-partial-credit@1
 * ------------------------------------------------------------------ */

/**
 * Two shells share one difficulty ladder, so one verifier grades both and
 * branches on the response's own `shell` tag (cross-checked against
 * `content.responsePhase.mode`).
 *
 * SDT CHANNELS. A hit and a correct rejection are not interchangeable evidence,
 * and the trial type lives in the item, not the response — so the two are emitted
 * on separate metric channels rather than as one accuracy number:
 *
 *   `M-DPRIME`     — hit-rate evidence. Only present on trials that can produce a
 *                    hit (a `change` probe, or the lit cells of a recognition
 *                    array).
 *   `M-FALSEALARM` — false-alarm-rate evidence. Only present on trials that can
 *                    produce a false alarm (a `same` probe, or the dark cells of
 *                    a recognition array).
 *
 * Averaging each channel over the items that carry it therefore yields the hit
 * rate and the false-alarm rate separately, which is what d-prime and Cowan's
 * K = setSize * (hitRate - falseAlarmRate) need. Collapsing them into one
 * accuracy figure would make a cautious child and a guesser look identical.
 */
function verifyGridflash(item: RawBankItem, response: Record<string, unknown>): Verdict {
  const content = item.content as {
    presentation?: unknown;
    responsePhase?: unknown;
    grid?: unknown;
    setSize?: unknown;
  };
  const presentation = recordOf(content.presentation);
  const responsePhase = recordOf(content.responsePhase);
  const array = presentation ? arrayOf(presentation.array) : null;
  const mode = responsePhase ? str(responsePhase.mode) : null;
  const shell = str(response.shell) ?? mode;

  if (shell === 'two_choice') {
    const probe = responsePhase ? recordOf(responsePhase.probe) : null;
    const probeCell = probe ? num(probe.cell) : null;
    const probeHue = probe ? str(probe.hue) : null;

    // Re-derive SAME/CHANGED: the colour the probed cell carried in the flash vs
    // the colour the test shows. The stored key is only a fallback.
    let expectedKey: string | null = null;
    if (array && probeCell !== null && probeHue !== null) {
      const flashed = array.filter(isRecord).find((star) => num(star.cell) === probeCell);
      const originalHue = flashed ? str(flashed.hue) : null;
      if (originalHue !== null) expectedKey = originalHue === probeHue ? 'SAME' : 'CHANGED';
    }
    expectedKey ??= str(item.answer.correctKey);
    const selectedKey = str(response.selectedKey);
    if (expectedKey === null || selectedKey === null) return { correct: false };

    const correct = selectedKey === expectedKey;
    // The spec is explicit that a single two-choice probe is dichotomous: the
    // polytomous information for this type comes from the recognition shell and
    // from the set-size ladder, so no M-POLY is emitted here.
    return expectedKey === 'CHANGED'
      ? { correct, metrics: { 'M-DPRIME': correct ? 1 : 0 } }
      : { correct, metrics: { 'M-FALSEALARM': correct ? 0 : 1 } };
  }

  if (shell === 'select_set') {
    let expectedCells: number[] | null = null;
    if (array && array.length > 0) {
      const cells = array.filter(isRecord).map((star) => num(star.cell));
      if (cells.length === array.length && cells.every((cell): cell is number => cell !== null)) {
        expectedCells = cells;
      }
    }
    expectedCells ??= numArray(item.answer.expectedCells);
    const selectedRaw = numArray(response.selectedCells);
    if (!expectedCells || expectedCells.length === 0 || !selectedRaw) return { correct: false };

    const expectedSet = new Set(expectedCells);
    const selected = new Set(selectedRaw);
    let hits = 0;
    for (const cell of selected) if (expectedSet.has(cell)) hits++;
    const falseAlarms = selected.size - hits;

    const grid = recordOf(content.grid);
    const cellCount = grid ? num(grid.cellCount) : null;
    const darkCells = cellCount !== null ? cellCount - expectedSet.size : 0;

    const metrics: Record<string, number> = {
      'M-POLY': round4(hits / expectedSet.size),
      'M-DPRIME': round4(hits / expectedSet.size),
    };
    if (darkCells > 0) metrics['M-FALSEALARM'] = round4(falseAlarms / darkCells);

    return { correct: hits === expectedSet.size && falseAlarms === 0, metrics };
  }

  return { correct: false };
}

/* ------------------------------------------------------------------ *
 * WM-gate-01 — wm-running-memory-multiprobe@1
 * ------------------------------------------------------------------ */

interface GateProbe {
  probeIndex: number;
  k: number;
  expectedKeys: string[];
}

/**
 * Replay the parade event by event and answer every checkpoint from scratch, the
 * way a scorer holding only the display would:
 *
 *   creature_lastk  — the last k token keys, in order;
 *   keep_track      — the most recent token of each asked colour family (the
 *                     families are read off `content.responsePhase.probePlan`,
 *                     which is what the child was actually asked for);
 *   numeric_running — the running total after every update so far.
 *
 * Returns null when the stream is unreadable, so the caller can fall back to the
 * stored `answer.probes`.
 */
function gateReplay(item: RawBankItem): GateProbe[] | null {
  const content = item.content as {
    shell?: unknown;
    palette?: unknown;
    presentation?: unknown;
    responsePhase?: unknown;
  };
  const shell = str(content.shell);
  const presentation = recordOf(content.presentation);
  const events = presentation ? arrayOf(presentation.events) : null;
  const stops = presentation ? arrayOf(presentation.probes) : null;
  if (!shell || !events || !stops) return null;

  const responsePhase = recordOf(content.responsePhase);
  const plan = responsePhase ? arrayOf(responsePhase.probePlan) : null;
  const askedByProbe = new Map<number, string[]>();
  for (const entry of plan ?? []) {
    if (!isRecord(entry)) continue;
    const probeIndex = num(entry.probeIndex);
    const asked = strArray(entry.askedFamilies);
    if (probeIndex !== null && asked) askedByProbe.set(probeIndex, asked);
  }

  const familyOf = new Map<string, string>();
  for (const token of arrayOf(content.palette) ?? []) {
    if (!isRecord(token)) continue;
    const key = str(token.key);
    const family = str(token.family);
    if (key !== null && family !== null) familyOf.set(key, family);
  }

  const ordered = events.filter(isRecord).sort((a, b) => (num(a.index) ?? 0) - (num(b.index) ?? 0));
  if (ordered.length !== events.length) return null;

  const stopAt = new Map<number, Record<string, unknown>>();
  for (const stop of stops) {
    if (!isRecord(stop)) return null;
    const after = num(stop.afterEventIndex);
    if (after === null) return null;
    stopAt.set(after, stop);
  }

  const history: Record<string, unknown>[] = [];
  const derived: GateProbe[] = [];
  let total = 0;
  for (const event of ordered) {
    history.push(event);
    if (shell === 'numeric_running') {
      const value = num(event.value);
      if (value === null) return null;
      total = str(event.kind) === 'set' ? value : total + value;
    }
    const index = num(event.index);
    if (index === null) return null;
    const stop = stopAt.get(index);
    if (!stop) continue;

    const probeIndex = num(stop.probeIndex);
    const k = num(stop.k);
    if (probeIndex === null || k === null) return null;

    let expectedKeys: string[] | null = null;
    if (shell === 'creature_lastk') {
      const window = history.slice(-k).map((e) => str(e.tokenKey));
      if (window.every((key): key is string => key !== null)) expectedKeys = window;
    } else if (shell === 'keep_track') {
      const asked = askedByProbe.get(probeIndex);
      if (asked) {
        const keys: string[] = [];
        for (const family of asked) {
          let found: string | null = null;
          for (let i = history.length - 1; i >= 0; i--) {
            const tokenKey = str(history[i]!.tokenKey);
            if (tokenKey !== null && familyOf.get(tokenKey) === family) {
              found = tokenKey;
              break;
            }
          }
          if (found === null) {
            expectedKeys = null;
            break;
          }
          keys.push(found);
        }
        if (keys.length === asked.length) expectedKeys = keys;
      }
    } else if (shell === 'numeric_running') {
      expectedKeys = [`v${total}`];
    }

    if (!expectedKeys) return null;
    derived.push({ probeIndex, k, expectedKeys });
  }

  return derived.length > 0 ? derived : null;
}

/** The stored checkpoint answers, used only when the stream cannot be replayed. */
function gateStoredProbes(item: RawBankItem): GateProbe[] | null {
  const stored = arrayOf(item.answer.probes);
  if (!stored) return null;
  const probes: GateProbe[] = [];
  for (const entry of stored) {
    if (!isRecord(entry)) return null;
    const probeIndex = num(entry.probeIndex);
    const k = num(entry.k);
    const expectedKeys = strArray(entry.expectedKeys);
    if (probeIndex === null || k === null || !expectedKeys) return null;
    probes.push({ probeIndex, k, expectedKeys });
  }
  return probes.length > 0 ? probes : null;
}

/**
 * Running memory with several checkpoints inside one administration, and — in
 * most items — a different k at different checkpoints.
 *
 * Every checkpoint is scored on its own, position by position, and the units are
 * summed across checkpoints; full credit needs every checkpoint answered in full
 * and every position right. `M-POLY` is that summed proportion.
 *
 * `M-UPDATECOST` is the OLS slope of per-checkpoint score on that checkpoint's k.
 * Because k varies WITHIN the item, the slope is estimable from a single
 * administration — a negative slope means accuracy falls as the window widens.
 * It is omitted (not zeroed) when every checkpoint used the same k, since a slope
 * with no x-spread is undefined rather than flat.
 */
function verifyGate(item: RawBankItem, response: Record<string, unknown>): Verdict {
  const expected = gateReplay(item) ?? gateStoredProbes(item);
  const submitted = arrayOf(response.probes);
  if (!expected || !submitted) return { correct: false };

  const byIndex = new Map<number, string[]>();
  for (const entry of submitted) {
    if (!isRecord(entry)) continue;
    const probeIndex = num(entry.probeIndex);
    const keys = strArray(entry.keys);
    if (probeIndex !== null && keys) byIndex.set(probeIndex, keys);
  }

  let unitsTotal = 0;
  let unitsCorrect = 0;
  let allProbesComplete = true;
  const ks: number[] = [];
  const probeScores: number[] = [];

  for (const probe of expected) {
    const keys = byIndex.get(probe.probeIndex) ?? [];
    let credited = 0;
    for (let i = 0; i < probe.expectedKeys.length; i++) {
      if (keys[i] === probe.expectedKeys[i]) credited++;
    }
    unitsTotal += probe.expectedKeys.length;
    unitsCorrect += credited;
    if (keys.length !== probe.expectedKeys.length) allProbesComplete = false;
    ks.push(probe.k);
    probeScores.push(credited / probe.expectedKeys.length);
  }
  if (unitsTotal === 0) return { correct: false };

  const metrics: Record<string, number> = { 'M-POLY': round4(unitsCorrect / unitsTotal) };
  const slope = olsSlope(ks, probeScores);
  if (slope !== null) metrics['M-UPDATECOST'] = round4(slope);

  return { correct: allProbesComplete && unitsCorrect === unitsTotal, metrics };
}

/* ------------------------------------------------------------------ *
 * WM-bubble-01 — n-back, computed_solver
 * ------------------------------------------------------------------ */

/**
 * N-back over one or two printed channels. The target steps are re-derived from
 * the stream itself — step `i` is a target iff `stream[i] === stream[i - n]` —
 * rather than read off `answer.correctKey`.
 *
 * The first n steps are the lead-in: no n-back item exists yet, so no pop there
 * is defensible and the renderer blocks it. Pops outside the decidable range are
 * therefore ignored rather than counted, matching what the renderer can emit.
 *
 * Only steps the child actually saw are scored (`response.stepsShown`), but full
 * credit still requires the whole stream to have been presented — a block cut
 * short was not administered, so it cannot be a full-credit block.
 *
 * Hits and false alarms go on the same two SDT channels as WM-gridflash-01:
 * `M-DPRIME` carries the hit rate over target steps, `M-FALSEALARM` the
 * false-alarm rate over non-target decidable steps. `M-POLY` is the proportion of
 * decidable steps decided correctly (a pop on a target, no pop on a non-target).
 */
function verifyBubble(item: RawBankItem, response: Record<string, unknown>): Verdict {
  const content = item.content as { n?: unknown; channels?: unknown; streamLength?: unknown };
  const n = num(content.n);
  const channels = arrayOf(content.channels);
  const pops = arrayOf(response.pops);
  if (n === null || n < 1 || !channels || channels.length === 0 || !pops) {
    return { correct: false };
  }

  const popped = new Set<string>();
  for (const pop of pops) {
    if (!isRecord(pop)) continue;
    const channel = str(pop.channel);
    const stepIndex = num(pop.stepIndex);
    if (channel !== null && stepIndex !== null) popped.add(`${channel}:${stepIndex}`);
  }

  const declaredLength = num(content.streamLength);
  const stepsShown = num(response.stepsShown);
  let fullStreamShown = true;

  let targets = 0;
  let hits = 0;
  let nonTargets = 0;
  let falseAlarms = 0;

  for (const channel of channels) {
    if (!isRecord(channel)) return { correct: false };
    const id = str(channel.id);
    const stream = strArray(channel.stream);
    if (id === null || !stream) return { correct: false };

    const streamLength = declaredLength ?? stream.length;
    if (stream.length < streamLength) return { correct: false };
    const shown = stepsShown !== null ? Math.min(stepsShown, streamLength) : streamLength;
    if (shown < streamLength) fullStreamShown = false;

    for (let i = n; i < shown; i++) {
      const isTarget = stream[i] === stream[i - n];
      const didPop = popped.has(`${id}:${i}`);
      if (isTarget) {
        targets++;
        if (didPop) hits++;
      } else {
        nonTargets++;
        if (didPop) falseAlarms++;
      }
    }
  }

  const decidable = targets + nonTargets;
  if (decidable === 0) return { correct: false };

  const correctDecisions = hits + (nonTargets - falseAlarms);
  const metrics: Record<string, number> = { 'M-POLY': round4(correctDecisions / decidable) };
  if (targets > 0) metrics['M-DPRIME'] = round4(hits / targets);
  if (nonTargets > 0) metrics['M-FALSEALARM'] = round4(falseAlarms / nonTargets);

  return {
    correct: fullStreamShown && targets > 0 && hits === targets && falseAlarms === 0,
    metrics,
  };
}

/* ------------------------------------------------------------------ *
 * VER-EVIDENCE-01 — two-part key, scoring.creditWeights
 * ------------------------------------------------------------------ */

/**
 * Re-derive the answer option and the evidence sentence independently of the
 * stored composite key, from the item's own inference derivation:
 *
 *   - the evidence sentence is the ONE sentence whose facts assert the premise;
 *   - the answer option is the ONE option whose claim is the conclusion.
 *
 * Both must be unique for the item to be gradeable this way; when they are not
 * (or the derivation is absent) the stored `"<option>+<sentence>"` key is used.
 */
function evidenceExpectedKeys(item: RawBankItem): { answer: string; evidence: string } | null {
  const provenance = recordOf(item.provenance);
  const derivation = provenance ? recordOf(provenance.derivation) : null;
  if (derivation) {
    const premise = str(derivation.premise);
    const conclusion = str(derivation.conclusion);
    const sentenceFacts = recordOf(derivation.sentenceFacts);
    const optionClaims = recordOf(derivation.optionClaims);
    if (premise !== null && conclusion !== null && sentenceFacts && optionClaims) {
      const bearing = Object.entries(sentenceFacts)
        .filter(([, facts]) => (strArray(facts) ?? []).includes(premise))
        .map(([key]) => key);
      const claiming = Object.entries(optionClaims)
        .filter(([, claim]) => claim === conclusion)
        .map(([key]) => key);
      if (bearing.length === 1 && claiming.length === 1) {
        return { answer: claiming[0]!, evidence: bearing[0]! };
      }
    }
  }
  const [answerKey, evidenceKey] = String(item.answer.correctKey).split('+');
  if (!answerKey || !evidenceKey) return null;
  return { answer: answerKey, evidence: evidenceKey };
}

/**
 * Comprehension with a mandatory evidence citation: the child picks an answer
 * option AND taps the sentence that proves it. Both parts are scored, weighted by
 * the item's own `scoring.creditWeights` (0.5 / 0.5 in this bank), and full credit
 * requires both.
 *
 * `M-POLY` is the weighted partial credit — the whole reason the type asks for
 * two keys. A child who reaches the right conclusion from the wrong sentence has
 * not proved the inference, but is not the same as one who got neither.
 *
 * `M-INFDEPTH` records the inference depth actually PROVED, so it is emitted only
 * when both parts are right.
 */
function verifyEvidence(item: RawBankItem, response: Record<string, unknown>): Verdict {
  const expected = evidenceExpectedKeys(item);
  const answerKey = str(response.answerKey);
  const evidenceKey = str(response.evidenceKey);
  if (!expected || answerKey === null || evidenceKey === null) return { correct: false };

  const weights = recordOf(item.scoring?.creditWeights);
  const answerWeight = (weights ? num(weights.answer) : null) ?? 0.5;
  const evidenceWeight = (weights ? num(weights.evidence) : null) ?? 0.5;
  const totalWeight = answerWeight + evidenceWeight;
  if (totalWeight <= 0) return { correct: false };

  const answerOk = answerKey === expected.answer;
  const evidenceOk = evidenceKey === expected.evidence;
  const credit = ((answerOk ? answerWeight : 0) + (evidenceOk ? evidenceWeight : 0)) / totalWeight;

  const correct = answerOk && evidenceOk;
  const metrics: Record<string, number> = { 'M-POLY': round4(credit) };
  if (correct) {
    const levers = recordOf(recordOf(item.provenance)?.levers);
    const depthRank = levers ? num(levers.depthRank) : null;
    if (depthRank !== null) metrics['M-INFDEPTH'] = depthRank;
  }
  return { correct, metrics };
}

/* ------------------------------------------------------------------ *
 * VER-SENSE-01 — word-card ordering
 * ------------------------------------------------------------------ */

/**
 * Re-derive the target permutation from the derivation's true word order by
 * mapping each word back to its card index. The generator's checker proves by
 * brute force over all permutations that exactly one ordering is both
 * grammatical and plausible, and guarantees the cards are pairwise distinct, so
 * this mapping is unambiguous. Falls back to the stored `"2,0,1"` key.
 */
function senseExpectedOrder(item: RawBankItem): number[] | null {
  const content = item.content as { cards?: unknown };
  const cards = arrayOf(content.cards);
  const texts = cards ? cards.map((card) => (isRecord(card) ? str(card.text) : null)) : null;

  if (texts && texts.every((text): text is string => text !== null)) {
    const provenance = recordOf(item.provenance);
    const derivation = provenance ? recordOf(provenance.derivation) : null;
    const trueOrder = derivation ? strArray(derivation.trueOrder) : null;
    if (trueOrder && trueOrder.length === texts.length && new Set(texts).size === texts.length) {
      const indices = trueOrder.map((word) => texts.indexOf(word));
      if (indices.every((index) => index >= 0)) return indices;
    }
  }

  const key = String(item.answer.correctKey).split(',');
  const indices = key.map((part) => Number(part));
  return indices.every((index) => Number.isInteger(index) && index >= 0) ? indices : null;
}

/**
 * The child drags word cards into a track. Exactly one ordering is both
 * grammatical and plausible, so correctness is a strict permutation match against
 * that ordering.
 *
 * `M-POLY` is the adjacent-pair credit the type declares: the proportion of the
 * target's adjacent word pairs that the child reproduced consecutively and in the
 * right direction. It is the right partial signal for an ordering task — a child
 * who builds the whole sentence but hangs one card in the wrong place keeps most
 * of the local structure, whereas positional overlap would score that near zero.
 */
function verifySense(item: RawBankItem, response: Record<string, unknown>): Verdict {
  const expected = senseExpectedOrder(item);
  const order = numArray(response.order);
  if (!expected || expected.length === 0 || !order) return { correct: false };

  let matched = 0;
  for (let i = 0; i < expected.length; i++) if (order[i] === expected[i]) matched++;
  const correct = order.length === expected.length && matched === expected.length;

  const pairsTotal = expected.length - 1;
  let pairsKept = 0;
  for (let i = 0; i < pairsTotal; i++) {
    const at = order.indexOf(expected[i]!);
    if (at !== -1 && order[at + 1] === expected[i + 1]) pairsKept++;
  }

  return {
    correct,
    metrics: { 'M-POLY': round4(pairsTotal > 0 ? pairsKept / pairsTotal : correct ? 1 : 0) },
  };
}

export const verbalVerifiers: Record<string, Verifier> = {
  'WM-corsi-01': verifyCorsi,
  'WM-bind-01': verifyBind,
  'WM-gridflash-01': verifyGridflash,
  'WM-gate-01': verifyGate,
  'WM-bubble-01': verifyBubble,
  'VER-EVIDENCE-01': verifyEvidence,
  'VER-SENSE-01': verifySense,
};
