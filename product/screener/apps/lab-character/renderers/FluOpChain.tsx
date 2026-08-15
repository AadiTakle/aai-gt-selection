/**
 * FLU-OPCHAIN-01 — a machine with parts on it, and one figure going in.
 *
 * `content` is `{input, chain, badgeTray, options}`. The figure is `{glyph, orient:{a,b}, shade,
 * border, pair}` and the chain is a list of badge symbols drawn from `badgeTray`.
 *
 * THE BADGES ARE LABELS, NOT PICTURES. Nothing in `content` says what any badge does — the
 * badge-to-operator mapping is server-only by design, because the whole point of this type is that
 * the vocabulary is novel and has to be learned across trials. So this renderer draws the machine
 * exactly as stated and makes no attempt to depict, hint at, or apply an operation. It cannot
 * compute the output and must not appear to.
 *
 * Two consequences for the drawing:
 *
 *  1. Badges alternate solid and outline down the tray order. That is not styling. At badge size a
 *     filled circle and a filled hexagon are the same grey blob, and a child who cannot tell two
 *     badges apart is being measured on symbol decoding instead of rule learning.
 *  2. Every glyph here is chiral and has no rotational symmetry, so orientation stays visible.
 *     `orient.a` is quarter turns and `orient.b` is a mirror, i.e. the D4 element r^a m^b, which is
 *     why the mirror is applied FIRST and the rotation second.
 *
 * THE FIGURE IS NO LONGER DRAWN HERE. It used to be: this file kept a four-entry path table because
 * the shared `Glyph` had no mirror and no paths for `hook`, `boot` or `comma`. It has all four chiral
 * names as distinct handed paths now, plus `flip`, so the table is gone and every figure goes through
 * `Glyph` — which means a world finally gets asked what a `boot` looks like. It was the private table
 * that made this the worst offender in the lab: near-black world or warm one, every figure came out
 * as the same L in the same borrowed teal.
 *
 * WHAT `Glyph` CANNOT CARRY, and so is drawn around it rather than inside it:
 *
 *   pair    two copies side by side. Two `Glyph`s in a flex row, half size each.
 *   border  a frame around the figure that does NOT turn with it. A CSS border on the wrapper, which
 *           is also what keeps it square while the figure inside rotates.
 *   shade   solid or hollow. `hollow` is handed to `Glyph` for the fallback AND enforced in CSS,
 *           because `Glyph` does not pass the modifier to a world's `draw` — see the foot of this
 *           file. Options in this bank differ by `shade` alone, so it cannot be allowed to go missing.
 *
 * The output window stays a question mark after answering. The renderer does not know what the
 * machine made, and putting the child's own choice in the window would assert that it did.
 */
import { useMemo, useRef, useState, type CSSProperties } from 'react';

import { Glyph, NEUTRAL_SKIN } from '../shared/glyphs';
import type { Skin } from '../shared/glyphs';
import type { RendererProps } from '../shared/types';

import './FluOpChain.css';

/**
 * The two colour names in this file, and the only ones, because nothing in this item carries a colour.
 *
 * A figure is `{glyph, orient, shade, border, pair}` and a badge is a bare symbol name: there is no
 * `color` anywhere in the payload to read. So the ink is named once here as an explicit FALLBACK and
 * resolved through `skin.color`, which is what lets a world answer with its own value. What was here
 * before was `skin.color('teal')` — a literal, asked for on every item regardless of what the item
 * said, which is how a near-black world ended up with teal figures in it.
 *
 * Both are `ink`, one of the six names every world maps. The badges used to ask for `slate`, which is
 * not in the vocabulary at all: `paletteColor` hands back its teal for an unknown name, so under the
 * neutral skin the machine's labels came out the one colour that is supposed to mean something else.
 * The figure/label hierarchy is carried by size and by the chip behind each badge instead, which is
 * where it belongs — it is not a distinction the item rules on.
 */
const FIGURE_INK = 'ink';
const BADGE_INK = 'ink';

interface Figure {
  glyph: string;
  a: number;
  b: number;
  solid: boolean;
  border: boolean;
  pair: boolean;
}

interface Option {
  key: string;
  figure: Figure;
}

function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
function asNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
function asString(v: unknown, fallback: string): string {
  return typeof v === 'string' && v ? v : fallback;
}
function readFigure(v: unknown): Figure {
  const raw = asObject(v);
  const orient = asObject(raw.orient);
  return {
    glyph: asString(raw.glyph, 'flag'),
    a: Math.round(asNumber(orient.a, 0)),
    b: asNumber(orient.b, 0) ? 1 : 0,
    solid: asString(raw.shade, 'solid') === 'solid',
    border: asNumber(raw.border, 0) === 1,
    pair: asNumber(raw.pair, 0) === 1,
  };
}
function vars(v: Record<string, string | number>): CSSProperties {
  return v as CSSProperties;
}

/**
 * One figure, as the item states it: a chiral glyph, mirrored then turned, solid or hollow, framed or
 * not, alone or paired.
 *
 * MIRROR BEFORE ROTATE. `orient` is the D4 element r^a m^b and the two do not commute, so the order
 * is part of what the item says. `Glyph` composes `rotate(...) scaleX(-1)` as a CSS transform list,
 * which is applied right to left — the mirror lands first, which is the order wanted here.
 *
 * The wrapper carries the frame and the resolved ink; the ink goes down as a custom property because
 * the frame and the hollow outline are drawn in CSS and both have to match the figure's own colour.
 */
function FigureArt({ fig, skin }: { fig: Figure; skin: Skin }) {
  const className = [
    'foc-fig',
    fig.pair ? 'foc-fig-pair' : '',
    fig.border ? 'foc-fig-framed' : '',
    fig.solid ? '' : 'foc-fig-hollow',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={className} style={vars({ '--foc-fig-ink': skin.color(FIGURE_INK) })}>
      {Array.from({ length: fig.pair ? 2 : 1 }, (_, i) => (
        <Glyph
          key={i}
          className="foc-fig-art"
          shape={fig.glyph}
          color={FIGURE_INK}
          skin={skin}
          rotDeg={(((fig.a % 4) + 4) % 4) * 90}
          flip={fig.b === 1}
          hollow={!fig.solid}
        />
      ))}
    </span>
  );
}

function Badge({ symbol, hollow, skin }: { symbol: string; hollow: boolean; skin: Skin }) {
  return (
    <span className="foc-badge" style={vars({ '--foc-fig-ink': skin.color(BADGE_INK) })}>
      <Glyph
        className={`foc-badge-art${hollow ? ' foc-fig-hollow' : ''}`}
        shape={symbol}
        color={BADGE_INK}
        skin={skin}
        hollow={hollow}
      />
    </span>
  );
}

function Feed() {
  return (
    <svg className="foc-feed" viewBox="0 0 24 12" aria-hidden="true">
      <path d="M1 6h18M15 2l5 4-5 4" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChosenMark() {
  return (
    <svg className="foc-mark" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" />
      <path
        d="M7 12.4 10.6 16 17 9.2"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FluOpChain({
  content,
  onAnswer,
  answered,
  band,
  skin = NEUTRAL_SKIN,
}: RendererProps & { skin?: Skin }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const locked = useRef(false);

  const { input, chain, tray, options } = useMemo(() => {
    const list = Array.isArray(content.badgeTray) ? (content.badgeTray as unknown[]) : [];
    return {
      input: readFigure(content.input),
      chain: (Array.isArray(content.chain) ? (content.chain as unknown[]) : []).map((s) =>
        asString(s, 'circle'),
      ),
      tray: list.map((s) => asString(s, 'circle')),
      options: (Array.isArray(content.options) ? (content.options as unknown[]) : []).map((raw, i) => {
        const o = asObject(raw);
        const option: Option = {
          key: asString(o.key, String.fromCharCode(65 + i)),
          figure: readFigure(o.figure),
        };
        return option;
      }),
    };
  }, [content]);

  /** Solid/outline alternates down the tray, so no two badges are told apart by silhouette alone. */
  const hollowFor = (symbol: string) => {
    const at = tray.indexOf(symbol);
    return at < 0 ? false : at % 2 === 1;
  };
  const inUse = new Set(chain);

  const live = !answered && chosen === null;
  /**
   * The latch is a ref rather than the `chosen` state on purpose. Two options tapped in the same tick
   * — two fingers, or a fast double tap — both see the pre-update state, so a state-only guard lets
   * the second tap move the mark to an option that was never sent. The stage ignores the second
   * `onAnswer`, so this is a display bug rather than a scoring one, and a display that disagrees with
   * what was scored is the worst kind.
   */
  function pick(key: string) {
    if (answered || locked.current) return;
    locked.current = true;
    setChosen(key);
    onAnswer(key);
  }

  return (
    <div className={`foc-root${answered ? ' foc-settled' : ''}`} data-band={band}>
      <p className="foc-ask">What does the machine make?</p>

      <div className="foc-machine">
        <span className="foc-slot" role="img" aria-label="The figure going in">
          <FigureArt fig={input} skin={skin} />
        </span>

        <Feed />

        <span className="foc-chain" role="img" aria-label={`Machine parts in use: ${chain.join(', ')}`}>
          {chain.map((symbol, i) => (
            <span key={`${symbol}-${i}`} className="foc-step" style={vars({ '--i': i })}>
              {i > 0 ? <span className="foc-tick" aria-hidden="true" /> : null}
              <Badge symbol={symbol} hollow={hollowFor(symbol)} skin={skin} />
            </span>
          ))}
        </span>

        <Feed />

        {/* Stays a question mark for good. This renderer cannot know the machine's output. */}
        <span className="foc-slot foc-slot-out" role="img" aria-label="What comes out is unknown">
          <svg className="foc-unknown" viewBox="0 0 100 100" aria-hidden="true">
            <path d="M36 38a14 14 0 1 1 20 13v9" fill="none" strokeWidth="8" strokeLinecap="round" />
            <circle cx="56" cy="72" r="5" />
          </svg>
        </span>
      </div>

      <div className="foc-tray" aria-hidden="true">
        {tray.map((symbol) => (
          <span key={symbol} className={`foc-tray-item${inUse.has(symbol) ? ' foc-tray-on' : ''}`}>
            <Badge symbol={symbol} hollow={hollowFor(symbol)} skin={skin} />
          </span>
        ))}
      </div>

      <div className="foc-options" role="group" aria-label="Answer choices">
        {options.map((option, i) => (
          <button
            key={option.key}
            type="button"
            className={`foc-opt${chosen === option.key ? ' foc-opt-chosen' : ''}`}
            style={vars({ '--i': i })}
            aria-label={`Option ${option.key}`}
            aria-disabled={!live}
            onClick={() => pick(option.key)}
          >
            <span className="foc-opt-face">
              <FigureArt fig={option.figure} skin={skin} />
            </span>
            <span className="foc-opt-key" aria-hidden="true">
              {option.key}
            </span>
            {chosen === option.key ? <ChosenMark /> : null}
          </button>
        ))}
      </div>

      <p className="foc-sr" role="status">
        {chosen ? `Option ${chosen} chosen.` : ''}
      </p>
    </div>
  );
}

/* ===========================================================================
   WANTED FROM shared/, REPORTED RATHER THAN CHANGED

   `Glyph` calls `skin.draw?.(shape, fill)` and never passes the third argument, although `Skin.draw`
   is typed and documented as receiving `{ hollow, rotDeg }`. Rotation survives anyway because `Glyph`
   turns the whole `<svg>` in CSS, but `hollow` only reaches the geometric fallback, so a world that
   draws its own figures gets solid ones whatever the item said.

   `shade` is a varying attribute of this type — 248 of the 468 items in the shipped bank are hollow,
   and options inside one item differ by shade alone — so the modifier is the difference between an
   answerable item and a coin flip. It is enforced from `FluOpChain.css` here and from `FluCarpet.css`
   there, in duplicate, for want of one argument being forwarded.
   =========================================================================== */
