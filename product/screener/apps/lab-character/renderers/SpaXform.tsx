/**
 * SPA-XFORM-01 — the same machine as the op-chain, fed a pattern of blocks instead of a figure.
 *
 * `content` is `{grid:{rows,cols}, input:{blocks}, chain, badgeTray, options}`. A block list is a set
 * of occupied cells on a rows x cols lattice, each cell indexed `r*cols + c` (row-major, always 4x4
 * in the shipped bank, 2..7 blocks occupied). Options are `{key, blocks}` — the same lattice with a
 * different set occupied.
 *
 * As with the op-chain, the badges in `chain` are opaque LABELS: nothing in `content` says what any
 * of them does to a pattern, and the mapping is server-only so the vocabulary stays novel. This
 * renderer draws the lattice going in and the lattice of each option, and never applies, guesses at,
 * or hints at a transformation.
 *
 * THE LATTICE IS A GRID OF GLYPHS. There is no shared primitive for "a set of occupied cells", so the
 * lattice itself is laid out here — but each occupied cell is now a `Glyph`, so the block a world
 * stacks is that world's block: a plated tile in one, a slab of bark in another, a geometric square
 * where a world has nothing to say. Previously the whole lattice was one local SVG of `<rect>`s and no
 * world could reach it.
 *
 * THE EMPTY WELLS ARE NOT GLYPHS, and that is deliberate rather than unfinished. Every option differs
 * from every other ONLY in which cells are filled, so filled-versus-empty is the entire question. A
 * world's `draw` never sees `hollow` (see the foot of this file), so an empty cell drawn as a hollow
 * glyph would come back solid and the item would have five identical answers. The wells are therefore
 * plain CSS frames — thin, faint and unmistakably not a block — and the contrast survives any skin.
 *
 * The output window stays a question mark after answering, for the same reason as the op-chain: this
 * renderer does not know what came out and must not appear to.
 */
import { useMemo, useRef, useState, type CSSProperties } from 'react';

import { Glyph, NEUTRAL_SKIN } from '../shared/glyphs';
import type { Skin } from '../shared/glyphs';
import type { RendererProps } from '../shared/types';

import './SpaXform.css';

interface Option {
  key: string;
  blocks: number[];
}

/**
 * The one shape name and the one colour name in this file, both explicit FALLBACKS.
 *
 * Nothing in this payload carries either: an option is `{key, blocks}` and a block is an index into a
 * lattice, so there is no shape and no colour to read off the item. Naming them once here and sending
 * both through `Glyph`/`skin.color` is what hands the decision to the world — `square` is the request,
 * and whatever the world draws for a square is the answer. What was here before was
 * `skin.color('teal')` and a local `<rect>`, i.e. a fixed picture in a borrowed colour.
 */
const BLOCK_SHAPE = 'square';
const BLOCK_INK = 'ink';

function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
function asNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
function asString(v: unknown, fallback: string): string {
  return typeof v === 'string' && v ? v : fallback;
}
function readBlocks(v: unknown): number[] {
  return (Array.isArray(v) ? (v as unknown[]) : [])
    .map((cell) => asNumber(cell, -1))
    .filter((cell) => Number.isInteger(cell) && cell >= 0);
}
function vars(v: Record<string, string | number>): CSSProperties {
  return v as CSSProperties;
}

function Lattice({
  blocks,
  rows,
  cols,
  skin,
}: {
  blocks: number[];
  rows: number;
  cols: number;
  skin: Skin;
}) {
  const filled = new Set(blocks.filter((cell) => cell < rows * cols));

  return (
    <span
      className="sx-lattice"
      style={vars({ '--sx-rows': rows, '--sx-cols': cols, '--sx-block-ink': skin.color(BLOCK_INK) })}
      aria-hidden="true"
    >
      {Array.from({ length: rows * cols }, (_, index) =>
        filled.has(index) ? (
          <span key={index} className="sx-well sx-well-on">
            <Glyph className="sx-block" shape={BLOCK_SHAPE} color={BLOCK_INK} skin={skin} />
          </span>
        ) : (
          <span key={index} className="sx-well" />
        ),
      )}
    </span>
  );
}

function Badge({ symbol, hollow, skin }: { symbol: string; hollow: boolean; skin: Skin }) {
  return (
    <span className="sx-badge" style={vars({ '--sx-block-ink': skin.color(BLOCK_INK) })}>
      <Glyph
        className={`sx-badge-art${hollow ? ' sx-badge-hollow' : ''}`}
        shape={symbol}
        color={BLOCK_INK}
        skin={skin}
        hollow={hollow}
      />
    </span>
  );
}

function Feed() {
  return (
    <svg className="sx-feed" viewBox="0 0 24 12" aria-hidden="true">
      <path d="M1 6h18M15 2l5 4-5 4" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChosenMark() {
  return (
    <svg className="sx-mark" viewBox="0 0 24 24" aria-hidden="true">
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

export default function SpaXform({
  content,
  onAnswer,
  answered,
  band,
  skin = NEUTRAL_SKIN,
}: RendererProps & { skin?: Skin }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const locked = useRef(false);

  const { rows, cols, input, chain, tray, options } = useMemo(() => {
    const grid = asObject(content.grid);
    const list = Array.isArray(content.badgeTray) ? (content.badgeTray as unknown[]) : [];
    return {
      rows: Math.max(1, Math.round(asNumber(grid.rows, 4))),
      cols: Math.max(1, Math.round(asNumber(grid.cols, 4))),
      input: readBlocks(asObject(content.input).blocks),
      chain: (Array.isArray(content.chain) ? (content.chain as unknown[]) : []).map((s) =>
        asString(s, 'circle'),
      ),
      tray: list.map((s) => asString(s, 'circle')),
      options: (Array.isArray(content.options) ? (content.options as unknown[]) : []).map((raw, i) => {
        const o = asObject(raw);
        const option: Option = {
          key: asString(o.key, String.fromCharCode(65 + i)),
          blocks: readBlocks(o.blocks),
        };
        return option;
      }),
    };
  }, [content]);

  /** Solid/outline alternates down the tray so no two badges are told apart by silhouette alone. */
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
    <div className={`sx-root${answered ? ' sx-settled' : ''}`} data-band={band}>
      <p className="sx-ask">Which pattern comes out?</p>

      <div className="sx-machine">
        <span
          className="sx-slot"
          role="img"
          aria-label={`The pattern going in: ${input.length} blocks on a ${rows} by ${cols} grid`}
        >
          <Lattice blocks={input} rows={rows} cols={cols} skin={skin} />
        </span>

        <Feed />

        <span className="sx-chain" role="img" aria-label={`Machine parts in use: ${chain.join(', ')}`}>
          {chain.map((symbol, i) => (
            <span key={`${symbol}-${i}`} className="sx-step" style={vars({ '--i': i })}>
              {i > 0 ? <span className="sx-tick" aria-hidden="true" /> : null}
              <Badge symbol={symbol} hollow={hollowFor(symbol)} skin={skin} />
            </span>
          ))}
        </span>

        <Feed />

        <span className="sx-slot sx-slot-out" role="img" aria-label="What comes out is unknown">
          <svg className="sx-unknown" viewBox="0 0 100 100" aria-hidden="true">
            <path d="M36 38a14 14 0 1 1 20 13v9" fill="none" strokeWidth="8" strokeLinecap="round" />
            <circle cx="56" cy="72" r="5" />
          </svg>
        </span>
      </div>

      <div className="sx-tray" aria-hidden="true">
        {tray.map((symbol) => (
          <span key={symbol} className={`sx-tray-item${inUse.has(symbol) ? ' sx-tray-on' : ''}`}>
            <Badge symbol={symbol} hollow={hollowFor(symbol)} skin={skin} />
          </span>
        ))}
      </div>

      <div className="sx-options" role="group" aria-label="Answer choices">
        {options.map((option, i) => (
          <button
            key={option.key}
            type="button"
            className={`sx-opt${chosen === option.key ? ' sx-opt-chosen' : ''}`}
            style={vars({ '--i': i })}
            aria-label={`Option ${option.key}`}
            aria-disabled={!live}
            onClick={() => pick(option.key)}
          >
            <span className="sx-opt-face">
              <Lattice blocks={option.blocks} rows={rows} cols={cols} skin={skin} />
            </span>
            <span className="sx-opt-key" aria-hidden="true">
              {option.key}
            </span>
            {chosen === option.key ? <ChosenMark /> : null}
          </button>
        ))}
      </div>

      <p className="sx-sr" role="status">
        {chosen ? `Option ${chosen} chosen.` : ''}
      </p>
    </div>
  );
}

/* ===========================================================================
   WANTED FROM shared/, REPORTED RATHER THAN CHANGED

   1. `Glyph` never passes its third argument to `skin.draw` — the call is `skin.draw?.(shape, fill)`
      even though `Skin.draw` is typed as taking `{ hollow, rotDeg }`. `hollow` therefore only reaches
      the geometric fallback. That is why the empty wells of this lattice are CSS frames rather than
      hollow glyphs: filled-versus-empty is the whole of this item, and a hollow glyph that came back
      solid would leave five identical options.

   2. There is no shared primitive for a set of occupied cells on a lattice, which two types would use
      (this one and anything else block-shaped). A `Lattice` beside `Cluster` in `shared/glyphs`, taking
      `{blocks, rows, cols, shape, skin}`, would put the filled/empty contrast in one place instead of
      leaving each renderer to invent it.
   =========================================================================== */
