/**
 * QUANT-FUNC-01 — the machine.
 *
 * WHAT THE ITEM SAYS. `pairs` is two or three worked examples as `[in, out]`, `input` is the new
 * amount going in, and the child picks what comes out. `display` is `dots` on the low rungs and
 * `numeral` higher up.
 *
 * WHY ONE RAIL. The examples and the question are the same machine used four times, so the machine is
 * drawn once — a single vertical rail every row passes through — rather than redrawn per row. Four
 * little machines would read as four different machines, which is a different (and harder) item than
 * the one the bank wrote.
 *
 * Quantities default to counted clusters: see `asNumeral`. Showing "17" to a five-year-old turns a
 * reasoning item into a reading item.
 */
import { useId, useState, type CSSProperties } from 'react';

import { Cluster, Glyph, NEUTRAL_SKIN, type Skin } from '../shared/glyphs';
import type { RendererProps } from '../shared/types';

import './QuantFunc.css';

interface Choice {
  key: string;
  value: number;
}

/** The largest count a child can take in as a cluster rather than read as a numeral. */
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

function readPairs(v: unknown): Array<{ in: number; out: number }> {
  return asList(v).map((raw) => {
    const p = asList(raw);
    return { in: asNumber(p[0]), out: asNumber(p[1]) };
  });
}

function readChoices(v: unknown): Choice[] {
  const out: Choice[] = [];
  for (const raw of asList(v)) {
    const o = asRecord(raw);
    const key = asText(o.key);
    if (!key) continue;
    out.push({ key, value: asNumber(o.value) });
  }
  return out;
}

function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

function Quantity({
  value,
  numeral,
  color,
  skin,
}: {
  value: number;
  numeral: boolean;
  color: string;
  skin: Skin;
}) {
  if (numeral) return <span className="qf-numeral">{value}</span>;
  return <Cluster n={value} color={color} skin={skin} max={30} />;
}

export default function QuantFunc({
  content,
  onAnswer,
  answered,
  band,
  skin = NEUTRAL_SKIN,
}: RendererProps & { skin?: Skin }) {
  const [picked, setPicked] = useState<string | null>(null);
  const promptId = useId();

  const pairs = readPairs(content.pairs);
  const choices = readChoices(content.options);
  const input = asNumber(content.input);
  const prompt = asText(content.prompt) ?? 'Choose the amount the machine makes for the new input.';
  const display = asText(content.display) ?? 'dots';

  const biggest = Math.max(0, input, ...pairs.flatMap((p) => [p.in, p.out]), ...choices.map((c) => c.value));
  const asNumeral = display === 'numeral' && (band === '6-8' || biggest > COUNTABLE);

  const settled = answered || picked !== null;
  const rows = pairs.length + 1;

  function choose(key: string) {
    if (settled) return;
    setPicked(key);
    onAnswer(key);
  }

  const workedLabel = pairs.length
    ? `The machine has done this before: ${pairs
        .map((p) => `${p.in} in, ${p.out} out`)
        .join('; ')}. Now ${input} goes in.`
    : `${input} goes in.`;

  return (
    <section className="qf" data-band={band} data-settled={settled ? 'true' : undefined}>
      <p className="qf-prompt" id={promptId}>
        {prompt}
      </p>

      <div
        className="qf-machine"
        style={{ '--rows': rows } as CSSProperties}
        role="img"
        aria-label={workedLabel}
      >
        {/* One machine, spanning every row, so all four passes are visibly the same machine. */}
        <div className="qf-rail" aria-hidden="true">
          <span className="qf-rail-seam" />
          <span className="qf-rail-seam" />
        </div>

        {pairs.map((pair, i) => (
          <div key={`p-${i}`} className="qf-row" style={{ '--i': i } as CSSProperties}>
            <div className="qf-slotcell">
              <Quantity value={pair.in} numeral={asNumeral} color="slate" skin={skin} />
            </div>
            <div className="qf-arrow" aria-hidden="true">
              <Glyph shape="chevron" color="slate" skin={skin} rot={3} />
            </div>
            <div className="qf-slotcell">
              <Quantity value={pair.out} numeral={asNumeral} color="teal" skin={skin} />
            </div>
          </div>
        ))}

        <div className="qf-row qf-row-live" style={{ '--i': pairs.length } as CSSProperties}>
          <div className="qf-slotcell">
            <Quantity value={input} numeral={asNumeral} color="indigo" skin={skin} />
          </div>
          <div className="qf-arrow" aria-hidden="true">
            <Glyph shape="chevron" color="indigo" skin={skin} rot={3} />
          </div>
          <div className="qf-slotcell qf-open" aria-hidden="true" />
        </div>
      </div>

      <div className="qf-choices" role="group" aria-labelledby={promptId}>
        {choices.map((choice, i) => (
          <button
            key={choice.key}
            type="button"
            className="qf-choice"
            style={{ '--i': i } as CSSProperties}
            onClick={() => choose(choice.key)}
            aria-disabled={settled || undefined}
            aria-pressed={picked === choice.key}
            data-chosen={picked ? String(picked === choice.key) : undefined}
            aria-label={asNumeral ? String(choice.value) : plural(choice.value, 'dot')}
          >
            <span className="qf-choice-art">
              <Quantity value={choice.value} numeral={asNumeral} color="teal" skin={skin} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
