/**
 * Facts about an item's RESPONSE FORMAT, read off the bank record rather than declared per type.
 *
 * Two callers need the same fact for unrelated reasons — burst policy asks whether an item is a
 * one-tap choice, and the Phase 2 learning-curve fit asks what a child who knows nothing scores on
 * it — and both answers turn on the response format. Keeping one reader means a bank whose format
 * changes moves both at once, which a per-type table of counts would not: the table would still
 * hold the old number and nothing would say so.
 *
 * The format is a discriminated union rather than a nullable count, because "offers no options" and
 * "takes a continuous placement" are different facts with different floors, and collapsing them is
 * how a slider ends up fitted at the five-option 0.2 (E-207).
 *
 * Pure: no I/O, no framework, no node-only APIs.
 */
import type { ItemContent } from './types';

/** The minimum an item must expose to be read here; both `BankItem` and `ServedItem` satisfy it. */
export interface FormattedItem {
  readonly content: ItemContent;
}

/**
 * How many options an item offers, or `null` when it declares no option list at all.
 *
 * Two spellings are accepted because the engine runs over two different views of the same bank. A
 * full bank item carries the option list itself. A selection index carries only `optionCount`: the
 * pool a browser selects over is fetched without stimulus content (megabytes of it), so the count
 * is sent instead, and burst policy has to decide before an item's content exists.
 *
 * A DECLARED count is returned as it stands, including a degenerate 0 or 1, rather than being
 * folded into `null`. "Declares no options" and "declares an option list that cannot be chosen
 * from" are different facts about a bank, and the two callers want different things done about
 * them — so the judgment belongs to each caller rather than being made here.
 */
export function itemOptionCount(item: FormattedItem): number | null {
  const content = item.content as { options?: unknown; optionCount?: unknown };
  if (Array.isArray(content.options)) return content.options.length;
  if (typeof content.optionCount === 'number' && Number.isFinite(content.optionCount)) {
    return content.optionCount;
  }
  return null;
}

/**
 * The response-format tag a bank sets when the child's answer is a POSITION rather than a choice.
 *
 * A format name and nothing else. It carries no tolerance, no target, no bound and no key material,
 * which is what lets it travel in `content` — and it has to travel in `content`, because the browser
 * decides the block's chance floor before any answer exists and the selection index it holds is
 * stripped of stimulus content entirely.
 */
export const CONTINUOUS_PLACEMENT = 'continuous_placement';

/**
 * The chance-success floor of a continuous placement response.
 *
 * WHY A CONSTANT AND NOT A COMPUTATION. The floor of a placement response is the accepting band's
 * share of wherever an unknowing client places — so it is a function of the grading tolerance and of
 * the stretch of the line targets are drawn from, and BOTH are answer-key material. `answer.tolerance`
 * is the width of the band the verifier grades against; publishing it to the browser would hand a
 * client the precision it needs and, item by item near the ends of the line, where the band is. So
 * the number is declared here, on the server-and-engine side of the firewall, rather than read off a
 * payload.
 *
 * WHERE IT COMES FROM. `QUANT-GLYPHNUM-01` grades on `|placedRatio - targetRatio| <= 0.025` and draws
 * every target from [0.20, 0.95], so a placement uniform on that support scores
 * `0.05 / 0.75 = 1/15`. Equivalently the slider is a fifteen-alternative response. The bank's
 * generator computes and prints both this figure and the 0.05 a placement uniform over the WHOLE line
 * would score, and asserts the support on every item; E-211 records the measurement.
 *
 * The LARGER of the two is the one carried here. A child cannot read the support off a single item,
 * but across thirty trials they can see that nothing ever lands in the left fifth of the line, and a
 * floor set below the truth is the direction that reads chance successes as ability — which is the
 * failure mode E-207 was raised to fix, in the direction that costs.
 *
 * CLAIM BOUNDARY. Identical in kind to D-200 part 1's reciprocal-of-the-option-count: a DESIGN
 * assumption, not a calibrated `c`. A real child does not place uniformly — centre bias raises the
 * effective floor for mid-line targets and lowers it at the edges — and a disengaged child sits below
 * it again. It is set positive rather than left at 0 because 0 is the one value known to be wrong:
 * `--guessing-probe` in `scripts/exam-learning-block-harness.ts` measures what a floor of 0 does to a
 * child who is not learning.
 *
 * A SECOND continuous type must not silently inherit this. The floor belongs to the format plus the
 * band, and a type with a different tolerance or a different support has a different floor — see
 * {@link itemResponseFormat}, whose `continuous` branch is where that split would go.
 */
export const CONTINUOUS_PLACEMENT_CHANCE_FLOOR = 1 / 15;

/**
 * How an item takes its answer, as a discriminated fact rather than as a number that might be null.
 *
 * `itemOptionCount` answers "how many options" and has to return `null` for a type that offers none —
 * which is indistinguishable from "the field was stripped on the way here". That ambiguity is exactly
 * what a caller must not resolve by falling back to a default: the reciprocal of a missing option
 * count is not the floor of a slider, and E-207 is the record of what one wrong floor costs an
 * activity. So a type whose response is continuous SAYS SO, and the two cases separate.
 */
export type ItemResponseFormat =
  /** A bounded choice among `optionCount` visible candidates. Floor `1 / optionCount`. */
  | { readonly kind: 'options'; readonly optionCount: number }
  /** A position on a bounded line, graded by a server-only tolerance. Floor {@link CONTINUOUS_PLACEMENT_CHANCE_FLOOR}. */
  | { readonly kind: 'continuous'; readonly chanceFloor: number }
  /** Neither declared. The caller decides what to do, and must not treat it as either of the above. */
  | { readonly kind: 'undeclared' };

/**
 * Read one item's response format off its own bank record.
 *
 * Both views of a bank are handled, for the reason {@link itemOptionCount} gives: a full item carries
 * its option list or its format tag in `content`, and the selection index the browser holds carries
 * `optionCount` or the same tag and nothing else.
 *
 * The format tag is checked FIRST. A continuous type has no option list, so the order only matters if
 * a bank ever declared both — and if one did, the explicit tag is the one its author wrote on purpose.
 */
export function itemResponseFormat(item: FormattedItem): ItemResponseFormat {
  const content = item.content as { responseFormat?: unknown };
  if (content.responseFormat === CONTINUOUS_PLACEMENT) {
    return { kind: 'continuous', chanceFloor: CONTINUOUS_PLACEMENT_CHANCE_FLOOR };
  }
  const count = itemOptionCount(item);
  return count === null ? { kind: 'undeclared' } : { kind: 'options', optionCount: count };
}
