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
 * Shapes read better in different inks, so the alternation is visible rather than decorative.
 *
 * Names come from the shared palette (`teal, ink, violet, blue, gold, coral`). A name outside it
 * resolves to teal, which would make two shapes identical and the shape rule invisible.
 */
function inkFor(shape: string | undefined): string {
  if (!shape) return 'teal';
  if (shape === 'star') return 'gold';
  if (shape === 'dot' || shape === 'circle') return 'blue';
  return 'teal';
}

function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

function Quantity({
  value,
  shape,
  numeral,
  skin,
}: {
  value: number;
  shape: string | undefined;
  numeral: boolean;
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
  return <Cluster n={value} shape={shape ?? 'dot'} color={color} skin={skin} max={30} />;
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
                skin={skin}
              />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
