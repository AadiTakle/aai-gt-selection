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
 * FILE OWNERSHIP NOTE: the three `WM-*` entries below are spatial/memory types by
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
 * WM-bubble-01 — n-back, computed_solver
 * ------------------------------------------------------------------ */

/**
 * N-back over one or two printed channels. The target steps are re-derived from
 * the stream itself — step `i` is a target iff `stream[i] === stream[i - n]` —
 * rather than read off `answer.correctKey`.
 *
 * The renderer asks a two-alternative question of every decidable bubble — "seen
 * it" (this stimulus repeats the one n back) or "new" — and posts the answers as
 * `response.judgements`, one per lane per step, in presentation order. Grading the
 * answers rather than a stream of taps is what makes a miss distinguishable from
 * a non-response: under a go/no-go POP control the absence of a tap meant either.
 *
 * The first n steps are the lead-in: no n-back item exists yet, so no answer
 * there is defensible and the renderer does not collect one. Judgements outside
 * the decidable range are therefore ignored rather than counted, matching what
 * the renderer can emit. A later judgement for the same lane and step supersedes
 * an earlier one, so a child who changes their mind is graded on the answer they
 * left standing.
 *
 * Only steps the child actually answered are scored (`response.stepsShown`), but
 * full credit still requires the whole stream to have been presented — a block
 * cut short was not administered, so it cannot be a full-credit block.
 *
 * Hits and false alarms go on separate SDT channels, because they are not
 * interchangeable evidence: `M-DPRIME` carries the hit rate over target steps,
 * `M-FALSEALARM` the false-alarm rate over non-target decidable steps. Collapsing
 * them into one accuracy figure would make a cautious child and a guesser look
 * identical. `M-POLY` is the proportion of decidable steps answered correctly; a
 * step left unanswered is not correct, and is not a false alarm either.
 */
function verifyBubble(item: RawBankItem, response: Record<string, unknown>): Verdict {
  const content = item.content as { n?: unknown; channels?: unknown; streamLength?: unknown };
  const n = num(content.n);
  const channels = arrayOf(content.channels);
  const judgements = arrayOf(response.judgements);
  if (n === null || n < 1 || !channels || channels.length === 0 || !judgements) {
    return { correct: false };
  }

  const answered = new Map<string, 'seen' | 'new'>();
  for (const judgement of judgements) {
    if (!isRecord(judgement)) continue;
    const channel = str(judgement.channel);
    const stepIndex = num(judgement.stepIndex);
    const choice = str(judgement.choice);
    if (channel === null || stepIndex === null) continue;
    if (choice !== 'seen' && choice !== 'new') continue;
    answered.set(`${channel}:${stepIndex}`, choice);
  }

  const declaredLength = num(content.streamLength);
  const stepsShown = num(response.stepsShown);
  let fullStreamShown = true;

  let targets = 0;
  let hits = 0;
  let nonTargets = 0;
  let falseAlarms = 0;
  let correctDecisions = 0;

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
      const expected = stream[i] === stream[i - n] ? 'seen' : 'new';
      const choice = answered.get(`${id}:${i}`) ?? null;
      if (expected === 'seen') {
        targets++;
        if (choice === 'seen') hits++;
      } else {
        nonTargets++;
        if (choice === 'seen') falseAlarms++;
      }
      if (choice === expected) correctDecisions++;
    }
  }

  const decidable = targets + nonTargets;
  if (decidable === 0) return { correct: false };

  const metrics: Record<string, number> = { 'M-POLY': round4(correctDecisions / decidable) };
  if (targets > 0) metrics['M-DPRIME'] = round4(hits / targets);
  if (nonTargets > 0) metrics['M-FALSEALARM'] = round4(falseAlarms / nonTargets);

  return {
    correct: fullStreamShown && targets > 0 && correctDecisions === decidable,
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

/** Fallback article vocabulary for a bank row written before `content.articles`. */
const SENSE_ARTICLES = ['a', 'an', 'the'];

/** The closed set of article tokens this item's sidebar may contribute. */
function senseArticleSet(item: RawBankItem): Set<string> {
  const declared = strArray((item.content as { articles?: unknown }).articles);
  const list = declared && declared.length > 0 ? declared : SENSE_ARTICLES;
  return new Set(list.map((word) => word.toLowerCase()));
}

/**
 * Project the line the child built onto the card-index ordering that is graded.
 *
 * The child inserts word cards and, from the sidebar, as many articles as they
 * like, so `response.sequence` is the full ordered line. Articles are SURFACE:
 * they are checked against the item's own closed article vocabulary and then
 * dropped, which is what makes every grammatical realisation of the reference
 * ordering accepted — "the dog ate a bone", "a dog ate the bone" and the bare
 * "dog ate bone" all project to the same card order. Nothing in the item fixes
 * the definiteness choice, so scoring it would mark a correct child wrong.
 *
 * A token that is neither a card in range nor a declared article makes the
 * response malformed rather than partially credited: otherwise a client could
 * smuggle a card past the projection by mislabelling it.
 *
 * `response.order` is still read (and is what the plpgsql port grades), so when
 * both fields arrive they must agree — a line and a card order that disagree
 * cannot both be what the child built.
 */
function senseCardOrder(item: RawBankItem, response: Record<string, unknown>): number[] | null {
  const cards = arrayOf((item.content as { cards?: unknown }).cards);
  const cardCount = cards ? cards.length : 0;
  const order = numArray(response.order);
  const sequence = arrayOf(response.sequence);
  if (!sequence) return order;

  const articles = senseArticleSet(item);
  const projected: number[] = [];
  for (const token of sequence) {
    if (!isRecord(token)) return null;
    const kind = str(token.kind);
    if (kind === 'card') {
      const index = num(token.index);
      if (index === null || !Number.isInteger(index) || index < 0 || index >= cardCount)
        return null;
      projected.push(index);
    } else if (kind === 'article') {
      const text = str(token.text);
      if (text === null || !articles.has(text.toLowerCase())) return null;
    } else {
      return null;
    }
  }
  if (order && (order.length !== projected.length || order.some((v, i) => v !== projected[i]))) {
    return null;
  }
  return projected;
}

/**
 * The child inserts word cards, in order, into a growing sentence line. Exactly
 * one ordering of the cards is both grammatical and plausible — the generator
 * proves it by brute force over every permutation and refuses to write an item
 * where two survive — so correctness is a strict permutation match against that
 * ordering, article placement aside (see {@link senseCardOrder}).
 *
 * `M-POLY` is the adjacent-pair credit the type declares: the proportion of the
 * target's adjacent word pairs that the child reproduced consecutively and in the
 * right direction. It is the right partial signal for an ordering task — a child
 * who builds the whole sentence but hangs one card in the wrong place keeps most
 * of the local structure, whereas positional overlap would score that near zero.
 */
function verifySense(item: RawBankItem, response: Record<string, unknown>): Verdict {
  const expected = senseExpectedOrder(item);
  const order = senseCardOrder(item, response);
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

/* ------------------------------------------------------------------ *
 * VER-SEQUENCE-01 — constructed event ordering
 * ------------------------------------------------------------------ */

/**
 * The reference ordering, re-derived from the item's own candidate set: the
 * option `answer.correctKey` names, validated to be a permutation of the events.
 *
 * The candidate orderings stay in `content` (they are what the bank was built
 * with) but the renderer no longer shows them — the child now reorders the event
 * cards directly, so the option set neither leaks the answer nor bounds the
 * response. Reading the reference through the key keeps one source of truth for
 * "what order does this story happen in".
 */
function sequenceReferenceOrder(item: RawBankItem): number[] | null {
  const content = item.content as { options?: unknown; events?: unknown };
  const options = arrayOf(content.options);
  const events = arrayOf(content.events);
  const key = num(item.answer.correctKey);
  if (!options || !events || key === null || !Number.isInteger(key)) return null;
  if (key < 0 || key >= options.length) return null;
  const option = recordOf(options[key]);
  const order = option ? numArray(option.order) : null;
  return isEventPermutation(order, events.length) ? order : null;
}

/** An ordering is gradeable only when it places every event exactly once. */
function isEventPermutation(order: number[] | null, eventCount: number): order is number[] {
  if (!order || eventCount === 0 || order.length !== eventCount) return false;
  if (new Set(order).size !== order.length) return false;
  return order.every((index) => Number.isInteger(index) && index >= 0 && index < eventCount);
}

/**
 * Story ordering, produced rather than recognised: the child drags the event
 * cards into the order the story happens and the response carries that ordering.
 * Correctness is exact agreement with the reference order.
 *
 * `M-POLY` is the pair concordance (Kendall-tau) the type declares: the share of
 * event PAIRS the child left in the right relative order. Adjacent-pair credit
 * would be the wrong partial signal here — a child who has the whole causal chain
 * but slots one late event too early keeps almost every ordering relation, which
 * is the thing the construct is about, and only a global measure sees it.
 */
function verifySequence(item: RawBankItem, response: Record<string, unknown>): Verdict {
  const expected = sequenceReferenceOrder(item);
  const built = numArray(response.finalOrder);
  if (!expected || !isEventPermutation(built, expected.length)) return { correct: false };

  const rank = new Map(expected.map((event, index) => [event, index]));
  let pairs = 0;
  let concordant = 0;
  for (let i = 0; i < built.length; i++) {
    for (let j = i + 1; j < built.length; j++) {
      pairs++;
      if (rank.get(built[i]!)! < rank.get(built[j]!)!) concordant++;
    }
  }
  const correct = built.every((event, index) => event === expected[index]);

  return {
    correct,
    metrics: { 'M-POLY': round4(pairs > 0 ? concordant / pairs : correct ? 1 : 0) },
  };
}

/* ================================================================== *
 * VER-MORPHO-01 — a tiny invented morphology; tap what the word means
 *
 * The child sees one labelled reference picture ("this is a KIB") and then either a derived word
 * and four candidate pictures, or a target picture and four candidate words. What each three-letter
 * morpheme MEANS is the hidden system: a form->meaning bijection under `answer.system.affixMap`,
 * which `servedItemSchema` omits, so nothing the browser holds identifies the key.
 *
 * The key is re-derived here rather than read. Resolve the word's morphemes through the mapping,
 * apply them to `content.stemPicture` left to right — the morpheme nearest the stem acts first —
 * and take the option that lands on the result. In the picture->word direction the same walk runs
 * once per option and the target is `content.targetPicture`. The stored `correctKey` is consulted
 * only when the derivation is not uniquely determined: a cross-check, not the source of truth.
 *
 * ONE VERIFIER SERVES BOTH ARMS. `consistent` and `perTrial` differ only in whether the mapping is
 * re-drawn per item, and the mapping is read per item either way, so this code has no arm branch —
 * which is what §4.1.1 requires of the control condition. Only the consistent arm is ever served
 * (`bank-loader.ts`), but the differential exercises both banks.
 *
 * Metrics:
 *   - `M-ERRTYPE` 0..1, higher is better. §4.6 makes the strategy trace a build requirement, and
 *     this type's four classes are ordered by how much of the system the error still holds. Wrong
 *     answers are capped below 1 so a correct answer is always strictly best.
 *   - `M-RULEID` composition depth, on a correct answer only. The registry defines it as the
 *     relational-complexity bound — how many co-acting rules the child binds at once, 1..4 — and
 *     the number of morphemes in the word is exactly that here.
 * ================================================================== */

interface MorphoPicture {
  kind: string;
  count: number;
  size: string;
  mark: string;
  role: string;
}

/**
 * The two counts each number morpheme swaps: the three transpositions of S₃ on one/two/many.
 *
 * They do not commute, which is the entire reason "the morphemes compose in the order written" is
 * a real thing for a child to induce rather than a convention. Getting this table or the walk
 * order wrong is the single most likely way a verifier for this type could be wrong about its own
 * answer, so it is stated once here and re-derived independently by
 * `research/exam-question-types/generators/check-VER-MORPHO-01.mjs`.
 */
const MORPHO_NUMBER_SWAP: Record<string, [number, number]> = {
  plural: [1, 3],
  dual: [1, 2],
  paucal: [2, 3],
};

/** Apply one meaning. Every morpheme is an involution, so a doubled one undoes itself. */
function applyMorphoMeaning(meaning: string, picture: MorphoPicture): MorphoPicture | null {
  const swap = MORPHO_NUMBER_SWAP[meaning];
  if (swap) {
    const [lo, hi] = swap;
    if (picture.count === lo) return { ...picture, count: hi };
    if (picture.count === hi) return { ...picture, count: lo };
    return { ...picture };
  }
  if (meaning === 'negate') {
    return { ...picture, mark: picture.mark === 'none' ? 'cross' : 'none' };
  }
  if (meaning === 'resize') {
    return { ...picture, size: picture.size === 'small' ? 'big' : 'small' };
  }
  if (meaning === 'swapRole') {
    return { ...picture, role: picture.role === 'doer' ? 'target' : 'doer' };
  }
  return null;
}

function readMorphoPicture(value: unknown): MorphoPicture | null {
  const record = recordOf(value);
  const kind = str(record?.kind);
  const count = num(record?.count);
  const size = str(record?.size);
  const mark = str(record?.mark);
  const role = str(record?.role);
  if (kind === null || count === null || size === null || mark === null || role === null) {
    return null;
  }
  return { kind, count, size, mark, role };
}

const morphoPictureKey = (p: MorphoPicture): string =>
  `${p.kind}|${String(p.count)}|${p.size}|${p.mark}|${p.role}`;

/** A word is `stem-affix-affix`; position 0 is the stem and never carries a meaning. */
function morphoAffixes(word: string): string[] {
  return word.split('-').slice(1);
}

/** What a written word denotes: its morphemes applied to the reference picture, in order. */
function morphoDenotation(
  word: string,
  affixMap: Record<string, unknown>,
  base: MorphoPicture,
): MorphoPicture | null {
  let state = base;
  for (const form of morphoAffixes(word)) {
    const meaning = str(affixMap[form]);
    if (meaning === null) return null;
    const next = applyMorphoMeaning(meaning, state);
    if (next === null) return null;
    state = next;
  }
  return state;
}

/** The option the hidden system actually picks out, or null when it cannot be derived. */
function deriveMorphoKey(item: RawBankItem): string | null {
  const content = item.content;
  const base = readMorphoPicture(content.stemPicture);
  const options = arrayOf(content.options);
  const affixMap = recordOf(recordOf(item.answer.system)?.affixMap);
  if (!base || !options || options.length === 0 || !affixMap) return null;
  const toWord = str(content.direction) === 'pictureToWord';

  const target = toWord
    ? readMorphoPicture(content.targetPicture)
    : (() => {
        const word = str(content.word);
        return word === null ? null : morphoDenotation(word, affixMap, base);
      })();
  if (!target) return null;
  const wanted = morphoPictureKey(target);

  const hits: string[] = [];
  for (const raw of options) {
    const option = recordOf(raw);
    const key = str(option?.key);
    if (key === null) return null;
    let shown: MorphoPicture | null;
    if (toWord) {
      const word = str(option?.word);
      shown = word === null ? null : morphoDenotation(word, affixMap, base);
    } else {
      shown = readMorphoPicture(option?.picture);
    }
    // An unreadable option aborts the whole derivation: the key is "the option that uniquely
    // matches", and that claim cannot be made over a slate one of whose members is unknown.
    if (!shown) return null;
    if (morphoPictureKey(shown) === wanted) hits.push(key);
  }
  return hits.length === 1 ? hits[0]! : null;
}

/** Morphemes in the word the key names — the same count in either direction. */
function morphoDepth(item: RawBankItem, expected: string): number {
  const content = item.content;
  if (str(content.direction) === 'pictureToWord') {
    for (const raw of arrayOf(content.options) ?? []) {
      const option = recordOf(raw);
      if (str(option?.key) !== expected) continue;
      const word = str(option?.word);
      return word === null ? 0 : morphoAffixes(word).length;
    }
    return 0;
  }
  const word = str(content.word);
  return word === null ? 0 : morphoAffixes(word).length;
}

/**
 * Error quality by named partial rule, from "almost had it" to "did not engage".
 *
 * The ladder is this type's own four relabelling-closed distractor classes, ordered by how much of
 * the system the error still holds: `order_error` has every morpheme meaning right and only the
 * composition order wrong; `near_miss` reads one morpheme as the other member of ITS OWN family,
 * so the family structure survives; `wrong_operator` reads one as a morpheme from the other family,
 * so it does not; `wrong_family` gets two morphemes wrong at once.
 *
 * The two classes this type shares with `FLU-OPCHAIN-01` keep that type's values (`order_error`
 * 1.0, `wrong_operator` 0.55) and the other two take free slots on the same ladder, so the metric
 * means the same thing when a child's two Stage 2 blocks are read side by side. Scaled by 0.9 so
 * that no wrong answer can tie a correct one at 1 — the route's convention is that higher is
 * better with 1 reserved for correct.
 */
const MORPHO_NEARNESS: Record<string, number> = {
  order_error: 1.0,
  near_miss: 0.7,
  wrong_operator: 0.55,
  wrong_family: 0.25,
};
const MORPHO_WRONG_CAP = 0.9;

function verifyMorpho(item: RawBankItem, response: Record<string, unknown>): Verdict {
  const expected = deriveMorphoKey(item) ?? str(item.answer.correctKey);
  if (expected === null) return { correct: false };

  const chosen = str(response.selectedKey);
  if (chosen === null) return { correct: false };

  if (chosen === expected) {
    const depth = morphoDepth(item, expected);
    const metrics: Record<string, number> = { 'M-ERRTYPE': 1 };
    if (depth > 0) metrics['M-RULEID'] = depth;
    return { correct: true, metrics };
  }

  const traced = recordOf(recordOf(item.answer.strategyTrace)?.[chosen]);
  const kind = str(traced?.kind);
  const nearness = kind === null ? undefined : MORPHO_NEARNESS[kind];
  // An unrecognised or absent trace means the response named no option this bank knows about, so
  // there is no partial rule to credit; report the floor rather than guessing a middle value.
  return {
    correct: false,
    metrics: { 'M-ERRTYPE': nearness === undefined ? 0 : MORPHO_WRONG_CAP * nearness },
  };
}

export const verbalVerifiers: Record<string, Verifier> = {
  'WM-corsi-01': verifyCorsi,
  'WM-bind-01': verifyBind,
  'WM-bubble-01': verifyBubble,
  'VER-EVIDENCE-01': verifyEvidence,
  'VER-SENSE-01': verifySense,
  'VER-SEQUENCE-01': verifySequence,
  'VER-MORPHO-01': verifyMorpho,
};
