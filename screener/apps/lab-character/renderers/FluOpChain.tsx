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
 *     why the transform mirrors FIRST and rotates second.
 *
 * The shared `Glyph` cannot draw the figure: it has no mirror, and `hook`/`boot`/`comma` have no
 * path in it (its own `flag` is a different picture). The figure is therefore local SVG, tinted
 * through `skin.color` so a world still owns the palette; the badges DO go through `Glyph`, so a
 * world can restyle the machine's labels.
 *
 * The output window stays a question mark after answering. The renderer does not know what the
 * machine made, and putting the child's own choice in the window would assert that it did.
 */
import { useMemo, useRef, useState, type CSSProperties } from 'react';

import { Glyph, NEUTRAL_SKIN } from '../shared/glyphs';
import type { Skin } from '../shared/glyphs';
import type { RendererProps } from '../shared/types';

import './FluOpChain.css';

/** The four chiral figures the bank uses. Deliberately the same outlines the type was piloted with. */
const GLYPH_PATH: Record<string, string> = {
  flag: 'M30,14 L30,86 L42,86 L42,56 L80,40 L42,24 Z',
  boot: 'M30,14 L50,14 L50,64 L82,64 L82,86 L30,86 Z',
  hook: 'M22,14 L82,14 L82,34 L58,86 L36,86 L58,34 L22,34 Z',
  comma: 'M26,14 L74,14 L50,48 L70,48 L30,88 L42,56 L22,56 Z',
};

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

function FigureArt({ fig, ink }: { fig: Figure; ink: string }) {
  const path = GLYPH_PATH[fig.glyph] ?? GLYPH_PATH.flag!;
  const spin = `rotate(${(((fig.a % 4) + 4) % 4) * 90} 50 50)${fig.b ? ' translate(100,0) scale(-1,1)' : ''}`;
  const body = (
    <g transform={spin}>
      <path
        d={path}
        fill={fig.solid ? ink : 'none'}
        stroke={ink}
        strokeWidth={fig.solid ? 3 : 7}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </g>
  );

  return (
    <svg className="foc-fig" viewBox="0 0 100 100" role="presentation" aria-hidden="true">
      {fig.border ? (
        <rect x="4" y="4" width="92" height="92" rx="14" fill="none" stroke={ink} strokeWidth="4" />
      ) : null}
      {fig.pair ? (
        <>
          <g transform="translate(6,25) scale(0.44)">{body}</g>
          <g transform="translate(50,25) scale(0.44)">{body}</g>
        </>
      ) : (
        body
      )}
    </svg>
  );
}

function Badge({ symbol, hollow, skin }: { symbol: string; hollow: boolean; skin: Skin }) {
  return (
    <span className="foc-badge">
      <Glyph className="foc-badge-art" shape={symbol} color="slate" skin={skin} hollow={hollow} />
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
  const ink = skin.color('teal');

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
          <FigureArt fig={input} ink={ink} />
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
              <FigureArt fig={option.figure} ink={ink} />
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
