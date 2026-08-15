/**
 * QUANT-BALANCE-01 — make the two pans agree.
 *
 * WHAT THE ITEM SAYS. `target` is the load already sitting on the left pan. `examples` are the
 * exchange rates the child is given, each one `{left:[one shape], right:[two or three shapes]}`, i.e.
 * "one triangle weighs the same as three cubes". `shapes` lists the vocabulary in play — `cube`, `orb`,
 * `diamond`, `triangle` in this bank. Each option carries a `load` to put on the right pan. Nothing in
 * the item says which shape is heavier: that only comes from the examples, so all four shapes are drawn
 * the same size and are told apart by silhouette and ink.
 *
 * EVERY PIECE IS THE WORLD'S OWN. The weights go through `Glyph` with the skin threaded through, so what
 * sits on the pan is whatever that world weighs: an egg, a core stone, a plain geometric cube where a
 * world has nothing to say. `orb` is the one name that needs help getting there — see `SHAPE_ALIAS`.
 *
 * SIZE IS PINNED IN CSS, NOT BY COUNT. `--qb-piece` and its two siblings fix the drawn size of a piece
 * per context, so a load of two and a load of five are the same shapes at the same size in different
 * numbers. That is the same protection `cols` gives a `Cluster`, and it matters for the same reason: a
 * pan whose pieces grew as the load shrank would let a child weigh by size instead of by the rules.
 *
 * THE BEAM NEVER TILTS. A beam that dips towards the heavier side is a marking scheme drawn as
 * furniture: it would tell the child, before the server ever answers, whether the load they are
 * looking at is the one that balances. So the beam is level in every state, including after the child
 * has chosen, and the only thing that changes on answering is that the chosen load is shown resting on
 * the right pan.
 */
import { useId, useState, type CSSProperties } from 'react';

import { Glyph, NEUTRAL_SKIN, type Skin } from '../shared/glyphs';
import type { RendererProps } from '../shared/types';

import './QuantBalance.css';

interface Choice {
  key: string;
  load: string[];
}

interface Example {
  left: string[];
  right: string[];
}

/**
 * A stable ink per shape name, so a shape means the same thing in the rules, on the pan and in the
 * options.
 *
 * The names are the shared palette's own (`teal, ink, violet, blue, gold, coral`); anything else
 * resolves to teal, and two shape names sharing a fill is what makes a weight rule unreadable. This
 * bank uses four shapes at once (`cube`, `orb`, `diamond`, `triangle`), so four of the six are spoken
 * for and the rest are here for a bank that adds one.
 */
const FALLBACK_INK = 'teal';

/**
 * `orb` is not in the shared vocabulary, and that costs it the skin unless it is asked for by a name
 * that is.
 *
 * `Glyph` asks the skin about the RAW name first and only folds an unknown one down to a primitive
 * afterwards, so `orb` reached `skin.draw('orb')`, which no world dresses, and came back as a bare
 * geometric disc sitting among that world's own marks — on the same pan, in the same item. Asking for
 * `dot` instead gets the world's own small round thing, which is what an orb wants to be. Everything
 * else this bank weighs (`cube`, `diamond`, `triangle`) is in the vocabulary and goes through untouched.
 *
 * The ink stays keyed on the bank's own name, so an alias can never quietly merge two weights into one
 * colour.
 */
const SHAPE_ALIAS: Record<string, string> = { orb: 'dot' };

const SHAPE_INK: Record<string, string> = {
  cube: 'blue',
  orb: 'teal',
  diamond: 'violet',
  triangle: 'gold',
  square: 'coral',
  circle: 'teal',
  star: 'gold',
  pentagon: 'coral',
  hexagon: 'ink',
};

const SPARE_INKS = ['teal', 'blue', 'violet', 'gold', 'coral', 'ink'];

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function asList(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asText(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function readShapes(v: unknown): string[] {
  const out: string[] = [];
  for (const raw of asList(v)) {
    const s = asText(raw);
    if (s) out.push(s);
  }
  return out;
}

function readExamples(v: unknown): Example[] {
  return asList(v).map((raw) => {
    const e = asRecord(raw);
    return { left: readShapes(e.left), right: readShapes(e.right) };
  });
}

function readChoices(v: unknown): Choice[] {
  const out: Choice[] = [];
  for (const raw of asList(v)) {
    const o = asRecord(raw);
    const key = asText(o.key);
    if (!key) continue;
    out.push({ key, load: readShapes(o.load) });
  }
  return out;
}

function inkFor(shape: string, vocabulary: string[]): string {
  const named = SHAPE_INK[shape];
  if (named) return named;
  const i = vocabulary.indexOf(shape);
  return SPARE_INKS[(i < 0 ? 0 : i) % SPARE_INKS.length] ?? FALLBACK_INK;
}

/** "two triangles and one cube", for the option's aria-label. */
function describe(load: string[]): string {
  const counts = new Map<string, number>();
  for (const s of load) counts.set(s, (counts.get(s) ?? 0) + 1);
  const parts = [...counts].map(([shape, n]) => `${n} ${shape}${n === 1 ? '' : 's'}`);
  if (parts.length === 0) return 'nothing';
  if (parts.length === 1) return parts[0] ?? 'nothing';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function Load({
  load,
  vocabulary,
  skin,
  className,
}: {
  load: string[];
  vocabulary: string[];
  skin: Skin;
  className: string;
}) {
  return (
    <span className={className} aria-hidden="true">
      {load.map((shape, i) => (
        <span className="qb-piece" key={`${shape}-${i}`} style={{ '--i': i } as CSSProperties}>
          <Glyph
            shape={SHAPE_ALIAS[shape] ?? shape}
            color={inkFor(shape, vocabulary)}
            skin={skin}
          />
        </span>
      ))}
    </span>
  );
}

export default function QuantBalance({
  content,
  onAnswer,
  answered,
  band,
  skin = NEUTRAL_SKIN,
}: RendererProps & { skin?: Skin }) {
  const [picked, setPicked] = useState<string | null>(null);
  const promptId = useId();

  const vocabulary = readShapes(content.shapes);
  const target = readShapes(content.target);
  const examples = readExamples(content.examples);
  const choices = readChoices(content.options);
  const prompt = asText(content.prompt) ?? 'Choose the group of shapes that balances the left pan.';

  const settled = answered || picked !== null;
  const chosen = picked ? choices.find((c) => c.key === picked) : undefined;

  function choose(key: string) {
    if (settled) return;
    setPicked(key);
    onAnswer(key);
  }

  return (
    <section className="qb" data-band={band} data-settled={settled ? 'true' : undefined}>
      <p className="qb-prompt" id={promptId}>
        {prompt}
      </p>

      {examples.length > 0 ? (
        <ul
          className="qb-rules"
          aria-label={`What you already know: ${examples
            .map((e) => `${describe(e.left)} weighs the same as ${describe(e.right)}`)
            .join('; ')}.`}
        >
          {examples.map((example, i) => (
            <li className="qb-rule" key={`rule-${i}`} style={{ '--i': i } as CSSProperties}>
              <Load load={example.left} vocabulary={vocabulary} skin={skin} className="qb-rule-side" />
              <span className="qb-eq" aria-hidden="true">
                <span />
                <span />
              </span>
              <Load load={example.right} vocabulary={vocabulary} skin={skin} className="qb-rule-side" />
            </li>
          ))}
        </ul>
      ) : null}

      <div
        className="qb-scale"
        role="img"
        aria-label={`The left pan holds ${describe(target)}. The right pan is ${
          chosen ? `holding ${describe(chosen.load)}` : 'empty'
        }.`}
      >
        <div className="qb-beam" aria-hidden="true" />
        <div className="qb-post" aria-hidden="true" />

        <div className="qb-hang">
          <span className="qb-cord" aria-hidden="true" />
          <div className="qb-tray">
            <Load load={target} vocabulary={vocabulary} skin={skin} className="qb-tray-load" />
          </div>
        </div>

        <div className="qb-hang">
          <span className="qb-cord" aria-hidden="true" />
          <div className="qb-tray qb-tray-open" data-filled={chosen ? 'true' : undefined}>
            {chosen ? (
              <Load load={chosen.load} vocabulary={vocabulary} skin={skin} className="qb-tray-load" />
            ) : null}
          </div>
        </div>
      </div>

      <div className="qb-choices" role="group" aria-labelledby={promptId}>
        {choices.map((choice, i) => (
          <button
            key={choice.key}
            type="button"
            className="qb-choice"
            style={{ '--i': i } as CSSProperties}
            onClick={() => choose(choice.key)}
            aria-disabled={settled || undefined}
            aria-pressed={picked === choice.key}
            data-chosen={picked ? String(picked === choice.key) : undefined}
            aria-label={describe(choice.load)}
          >
            <Load load={choice.load} vocabulary={vocabulary} skin={skin} className="qb-choice-load" />
          </button>
        ))}
      </div>
    </section>
  );
}
