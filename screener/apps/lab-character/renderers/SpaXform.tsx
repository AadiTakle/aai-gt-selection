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
 * The lattice is local SVG because there is no shared primitive for a set of occupied cells — every
 * option differs from every other ONLY in which cells are filled, so the empty cells have to stay
 * visible as a frame of reference or the options become five unrelated blobs. It is tinted through
 * `skin.color` so a world still owns the palette; the badges go through `Glyph`, so a world can
 * restyle the machine's labels.
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
  ink,
}: {
  blocks: number[];
  rows: number;
  cols: number;
  ink: string;
}) {
  const pad = 4;
  const span = 100 - 2 * pad;
  const stepX = span / cols;
  const stepY = span / rows;
  const gap = Math.min(stepX, stepY) * 0.08;
  const radius = Math.min(stepX, stepY) * 0.18;
  const filled = new Set(blocks.filter((cell) => cell < rows * cols));

  const wells = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const index = r * cols + c;
      wells.push(
        <rect
          key={index}
          x={pad + c * stepX + gap}
          y={pad + r * stepY + gap}
          width={stepX - 2 * gap}
          height={stepY - 2 * gap}
          rx={radius}
          fill={filled.has(index) ? ink : 'none'}
          stroke={filled.has(index) ? 'none' : ink}
          strokeWidth={filled.has(index) ? 0 : 0.9}
          opacity={filled.has(index) ? 1 : 0.22}
        />,
      );
    }
  }

  return (
    <svg className="sx-lattice" viewBox="0 0 100 100" role="presentation" aria-hidden="true">
      {wells}
    </svg>
  );
}

function Badge({ symbol, hollow, skin }: { symbol: string; hollow: boolean; skin: Skin }) {
  return (
    <span className="sx-badge">
      <Glyph className="sx-badge-art" shape={symbol} color="slate" skin={skin} hollow={hollow} />
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
  const ink = skin.color('teal');

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
          <Lattice blocks={input} rows={rows} cols={cols} ink={ink} />
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
              <Lattice blocks={option.blocks} rows={rows} cols={cols} ink={ink} />
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
