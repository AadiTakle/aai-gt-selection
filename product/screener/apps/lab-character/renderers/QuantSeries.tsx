/**
 * QUANT-SERIES-01 — a run of quantities with the next step missing.
 *
 * WHAT THE ITEM ACTUALLY SAYS. `terms` is a list of `{value, shape?}`, `slotIndex` is the position
 * that is blank (in this bank it is always one past the last term, i.e. "what comes next", but an
 * interior blank is handled too), and `display` is `dots` on the low rungs and `numeral` higher up.
 * `attributes` may include `shape`, in which case the run alternates a shape as well as a count and
 * the options differ by shape — so the shape has to be drawn on the options or the item is unanswerable.
 *
 * WHY A CLUSTER AND NOT A NUMERAL. A numeral is a reading task before it is a reasoning task, so the
 * cluster is the default. The numeral is opt-in and only when the item asks for it and the quantity
 * has left counting range (or the child is in the oldest band) — see `asNumeral` below.
 *
 * WHAT THE MARKS ARE. Every cluster is drawn with the skin threaded through, so the run is counted in
 * whatever the world counts in: eggs, pips, pebbles. `shape` is the item's own when it carries one and
 * the vocabulary's `dot` when it does not, so a world always has something to answer.
 *
 * ONE MARK SIZE FOR THE WHOLE RUN. `cols` is pinned from the largest quantity in the item and passed to
 * every cluster in it — see `columnsFor`. Left to itself `Cluster` picks its columns from its own count,
 * which draws four marks larger than five: a run whose marks grow as the count falls is a run a child
 * can answer on size, and size is not what this item is asking about.
 *
 * WHAT IT CANNOT DO. It cannot mark. `onAnswer` sends the chosen option's own `key` and the server
 * keeps the answer, so there is nothing here to leak, dim, tick or cross.
 */
import { useId, useState, type CSSProperties } from 'react';

import { Cluster, Glyph, NEUTRAL_SKIN, type Skin } from '../shared/glyphs';
import type { RendererProps } from '../shared/types';

import './QuantSeries.css';

interface Term {
  value: number;
  shape?: string;
}

interface Choice {
  key: string;
  value: number;
  shape?: string;
}

/** The largest count a child can be asked to take in as a cluster rather than read as a numeral. */
const COUNTABLE = 12;

/**
 * What a quantity is counted in when the item names no shape, which is 96 of the 120 items here.
 *
 * It is a request rather than a picture: `dot` is in the shared vocabulary, so a world answers it with
 * whatever it counts in and only falls through to a geometric disc if it has nothing to say.
 */
const MARK_SHAPE = 'dot';

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function asList(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function asText(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function readTerms(v: unknown): Term[] {
  return asList(v).map((raw) => {
    const t = asRecord(raw);
    return { value: asNumber(t.value), shape: asText(t.shape) };
  });
}

function readChoices(v: unknown): Choice[] {
  const out: Choice[] = [];
  for (const raw of asList(v)) {
    const o = asRecord(raw);
    const key = asText(o.key);
    if (!key) continue;
    out.push({ key, value: asNumber(o.value), shape: asText(o.shape) });
  }
  return out;
}

/**
 * The ink, taken from the item's own `shape` where it has one.
 *
 * `attributes` can include `shape`, and when it does the run alternates two shapes and the options
 * differ by which one they draw. Giving each shape its own ink puts that alternation on a second
 * channel, so it survives a world whose two marks are closer in silhouette than the geometric
 * primitives are. The mapping is keyed on the item's value rather than on position, so the same shape
 * is the same colour in the run and in the options.
 *
 * Every name below is one of the vocabulary's six, because a name from outside it resolves to one
 * default and two shapes sharing an ink is the failure this mapping exists to avoid. `FALLBACK_INK` is
 * the single ink for the 96 items in 4 that carry no shape at all.
 */
const FALLBACK_INK = 'teal';

const SHAPE_INK: Record<string, string> = {
  star: 'gold',
  dot: 'blue',
  circle: 'blue',
};

function inkFor(shape: string | undefined): string {
  if (!shape) return FALLBACK_INK;
  return SHAPE_INK[shape] ?? FALLBACK_INK;
}

/**
 * The pinned column count for every cluster in one item, from the largest quantity in it.
 *
 * This is `Cluster`'s own ladder, applied ONCE for the whole item instead of per cluster. Its default
 * is fine for a single cluster shown alone and wrong for a row of them: 4 marks would be packed into 2
 * columns and drawn large while 5 went into 3 columns and drew small, so the run would read as
 * decreasing while the numbers increased.
 */
function columnsFor(largest: number): number {
  if (largest <= 1) return 1;
  if (largest <= 4) return 2;
  if (largest <= 9) return 3;
  if (largest <= 16) return 4;
  return 5;
}

function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

function Quantity({
  value,
  shape,
  numeral,
  cols,
  skin,
}: {
  value: number;
  shape: string | undefined;
  numeral: boolean;
  cols: number;
  skin: Skin;
}) {
  const color = inkFor(shape);
  if (numeral) {
    return (
      <span className="qs-figure">
        <span className="qs-numeral">{value}</span>
        {shape ? (
          <span className="qs-mark">
            <Glyph shape={shape} color={color} skin={skin} />
          </span>
        ) : null}
      </span>
    );
  }
  // `max` is generous rather than 12 so a large count is drawn honestly instead of quietly clipped.
  // `cols` is the item's, not this cluster's: see `columnsFor`.
  return (
    <Cluster
      n={value}
      shape={shape ?? MARK_SHAPE}
      color={color}
      skin={skin}
      cols={cols}
      max={30}
    />
  );
}

export default function QuantSeries({
  content,
  onAnswer,
  answered,
  band,
  skin = NEUTRAL_SKIN,
}: RendererProps & { skin?: Skin }) {
  const [picked, setPicked] = useState<string | null>(null);
  const promptId = useId();

  const terms = readTerms(content.terms);
  const choices = readChoices(content.options);
  const prompt = asText(content.prompt) ?? 'Choose the step that comes next.';
  const slotIndex = asNumber(content.slotIndex, terms.length);
  const display = asText(content.display) ?? 'dots';
  const shapeMatters = asList(content.attributes).includes('shape');

  const biggest = Math.max(0, ...terms.map((t) => t.value), ...choices.map((c) => c.value));
  const asNumeral = display === 'numeral' && (band === '6-8' || biggest > COUNTABLE);
  // One column count for the run and the options together, so a mark is the same size everywhere in
  // the item and number is the only thing that changes between two of them.
  const cols = columnsFor(Math.min(biggest, 30));

  // The blank sits at `slotIndex`. Past the end of the run it is appended ("what comes next");
  // inside the run the term there is masked, so a mid-sequence blank never shows its own value.
  const cells: Array<{ kind: 'term'; term: Term } | { kind: 'slot' }> = [];
  terms.forEach((term, i) => {
    cells.push(i === slotIndex ? { kind: 'slot' } : { kind: 'term', term });
  });
  if (slotIndex >= terms.length) cells.push({ kind: 'slot' });

  const settled = answered || picked !== null;

  function choose(key: string) {
    if (settled) return;
    setPicked(key);
    onAnswer(key);
  }

  const trackLabel = `The run so far: ${cells
    .map((c) => (c.kind === 'slot' ? 'the missing step' : String(c.term.value)))
    .join(', ')}.`;

  return (
    <section className="qs" data-band={band} data-settled={settled ? 'true' : undefined}>
      <p className="qs-prompt" id={promptId}>
        {prompt}
      </p>

      <div className="qs-track" role="img" aria-label={trackLabel}>
        {cells.map((cell, i) =>
          cell.kind === 'slot' ? (
            <div
              key={`slot-${i}`}
              className="qs-cell qs-slot"
              style={{ '--i': i } as CSSProperties}
              aria-hidden="true"
            />
          ) : (
            <div
              key={`term-${i}`}
              className="qs-cell"
              style={{ '--i': i } as CSSProperties}
              aria-hidden="true"
            >
              <Quantity
                value={cell.term.value}
                shape={shapeMatters ? cell.term.shape : undefined}
                numeral={asNumeral}
                cols={cols}
                skin={skin}
              />
            </div>
          ),
        )}
      </div>

      <div className="qs-choices" role="group" aria-labelledby={promptId}>
        {choices.map((choice, i) => (
          <button
            key={choice.key}
            type="button"
            className="qs-choice"
            style={{ '--i': i } as CSSProperties}
            onClick={() => choose(choice.key)}
            aria-disabled={settled || undefined}
            aria-pressed={picked === choice.key}
            data-chosen={picked ? String(picked === choice.key) : undefined}
            aria-label={
              shapeMatters && choice.shape
                ? plural(choice.value, choice.shape)
                : plural(choice.value, 'dot')
            }
          >
            <span className="qs-choice-art">
              <Quantity
                value={choice.value}
                shape={shapeMatters ? choice.shape : undefined}
                numeral={asNumeral}
                cols={cols}
                skin={skin}
              />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
