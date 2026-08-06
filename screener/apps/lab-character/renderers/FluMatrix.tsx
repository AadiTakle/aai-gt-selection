/**
 * FLU-MATRIX-01 — "which piece finishes the pattern"
 *
 * The payload is a rows x cols matrix of tiles with exactly one hole (`matrix.blank`, and the cell
 * itself is `null`), plus 4-6 option tiles. A tile is `{shape,color,count,rot}` and every rule the
 * generator switched on is expressed in those four attributes, so all four have to be VISIBLE or
 * the item stops being answerable:
 *
 *   shape     6 names, two of which (`kite`, `drop`) are not in the shared glyph vocabulary
 *   color     6 names, four of which (`ink`, `blue`, `gold`, `coral`) are not in the neutral palette
 *   count     1..3, drawn as a cluster and never as a numeral
 *   rot       0 / 120 / 240, in DEGREES (the shared Glyph counts quarter turns)
 *
 * The three mismatches above are handled here, deliberately locally, and reported upward rather
 * than patched into `shared/` — see the notes at each map.
 *
 * WHAT IS NOT DRAWN. `content.activeRules` and `content.ruleCount` name the rules in force
 * ("shape", "color", "count", "rotation"). They are generator metadata and drawing them would hand
 * the child the induction the item is measuring, so they are read and ignored on purpose.
 *
 * WHAT SETTLING DOES NOT DO. The chosen tile is NOT dropped into the hole. That would render the
 * completed pattern, and a broken-looking pattern is a verdict — the child would learn they were
 * wrong from a renderer that is not allowed to know. Settling lifts the chosen option and marks it
 * as chosen. Nothing more.
 */
import { useMemo, useRef, useState, type CSSProperties } from 'react';

import { Glyph, NEUTRAL_SKIN } from '../shared/glyphs';
import type { Skin } from '../shared/glyphs';
import type { RendererProps } from '../shared/types';

import './FluMatrix.css';

/**
 * Bank shape names with no path in `shared/glyphs`. `Glyph` silently falls back to a circle for an
 * unknown name, so `kite` and `drop` would BOTH draw as circles and every shape rule in the bank
 * would become invisible. Mapping them onto unused primitives keeps the six names six shapes, and
 * keeps them going through `Glyph` so a world's `skin.draw` still gets a say.
 */
const SHAPE_ALIAS: Record<string, string> = { kite: 'diamond', drop: 'teardrop' };

/**
 * Bank colour names the neutral palette does not know. `paletteColor` returns its teal for anything
 * unknown, which collapses `ink`/`blue`/`gold`/`coral` into one colour and makes the colour rule
 * unanswerable under `NEUTRAL_SKIN`. This fills the gaps ONLY where the active skin has no opinion
 * of its own, so a world that maps these names keeps its own art direction.
 */
const PALETTE_GAP: Record<string, string> = {
  ink: '#2b3440',
  blue: '#3f6fb0',
  gold: '#cf9a2b',
  coral: '#e0714f',
};

function useTintedSkin(skin: Skin): Skin {
  return useMemo(() => {
    const fallback = skin.color('teal');
    return {
      ...skin,
      color: (name: string) => {
        const own = skin.color(name);
        const gap = PALETTE_GAP[name];
        // A skin that does not know `name` hands back the same colour it hands back for everything.
        return gap && name !== 'teal' && own === fallback ? gap : own;
      },
    };
  }, [skin]);
}

interface Tile {
  shape: string;
  color: string;
  count: number;
  /** Degrees, as the bank states it. */
  rot: number;
}

interface Option {
  key: string;
  tile: Tile;
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
function readTile(v: unknown): Tile {
  const raw = asObject(v);
  const name = asString(raw.shape, 'circle');
  return {
    shape: SHAPE_ALIAS[name] ?? name,
    color: asString(raw.color, 'teal'),
    count: Math.max(1, Math.min(6, Math.round(asNumber(raw.count, 1)))),
    rot: asNumber(raw.rot, 0),
  };
}
function vars(v: Record<string, string | number>): CSSProperties {
  return v as CSSProperties;
}

/** A tile's face: `count` copies of one glyph, all carrying the tile's rotation. */
function TileFace({ tile, skin }: { tile: Tile; skin: Skin }) {
  return (
    <span className="fm-face" data-n={tile.count}>
      {Array.from({ length: tile.count }, (_, i) => (
        <Glyph
          key={i}
          className="fm-glyph"
          shape={tile.shape}
          color={tile.color}
          skin={skin}
          // The bank speaks degrees; Glyph counts quarter turns.
          rot={tile.rot / 90}
        />
      ))}
    </span>
  );
}

function ChosenMark() {
  return (
    <svg className="fm-mark" viewBox="0 0 24 24" aria-hidden="true">
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

export default function FluMatrix({
  content,
  onAnswer,
  answered,
  band,
  skin = NEUTRAL_SKIN,
}: RendererProps & { skin?: Skin }) {
  const tinted = useTintedSkin(skin);
  const [chosen, setChosen] = useState<string | null>(null);
  const locked = useRef(false);

  const { rows, cols, cells, blank, options } = useMemo(() => {
    const matrix = asObject(content.matrix);
    const rawRows = Array.isArray(matrix.cells) ? (matrix.cells as unknown[]) : [];
    const grid: (Tile | null)[][] = rawRows.map((row) =>
      (Array.isArray(row) ? (row as unknown[]) : []).map((cell) => (cell == null ? null : readTile(cell))),
    );
    const hole = asObject(matrix.blank);
    const opts: Option[] = (Array.isArray(content.options) ? (content.options as unknown[]) : []).map(
      (raw, i) => {
        const o = asObject(raw);
        return { key: asString(o.key, String.fromCharCode(65 + i)), tile: readTile(o.tile) };
      },
    );
    return {
      rows: Math.max(1, Math.round(asNumber(matrix.rows, grid.length || 1))),
      cols: Math.max(1, Math.round(asNumber(matrix.cols, grid[0]?.length ?? 1))),
      cells: grid,
      blank: { row: Math.round(asNumber(hole.row, -1)), col: Math.round(asNumber(hole.col, -1)) },
      options: opts,
    };
  }, [content]);

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
    <div className={`fm-root${answered ? ' fm-settled' : ''}`} data-band={band}>
      <p className="fm-ask">Which piece finishes the pattern?</p>

      <div
        className="fm-grid"
        style={vars({ '--fm-cols': cols })}
        role="img"
        aria-label={`A ${rows} by ${cols} pattern with one piece missing.`}
      >
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => {
            const tile = cells[r]?.[c] ?? null;
            const isBlank = tile === null || (r === blank.row && c === blank.col);
            return (
              <span
                key={`${r}-${c}`}
                className={`fm-cell${isBlank ? ' fm-cell-blank' : ''}`}
                style={vars({ '--i': r * cols + c })}
              >
                {isBlank ? (
                  <svg className="fm-hole" viewBox="0 0 100 100" aria-hidden="true">
                    <path
                      d="M36 38a14 14 0 1 1 20 13v9"
                      fill="none"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                    <circle cx="56" cy="72" r="5" />
                  </svg>
                ) : (
                  <TileFace tile={tile} skin={tinted} />
                )}
              </span>
            );
          }),
        )}
      </div>

      <div className="fm-options" role="group" aria-label="Answer choices">
        {options.map((option, i) => (
          <button
            key={option.key}
            type="button"
            className={`fm-opt${chosen === option.key ? ' fm-opt-chosen' : ''}`}
            style={vars({ '--i': i })}
            aria-label={`Option ${option.key}`}
            aria-disabled={!live}
            onClick={() => pick(option.key)}
          >
            <span className="fm-opt-face">
              <TileFace tile={option.tile} skin={tinted} />
            </span>
            <span className="fm-opt-key" aria-hidden="true">
              {option.key}
            </span>
            {chosen === option.key ? <ChosenMark /> : null}
          </button>
        ))}
      </div>

      <p className="fm-sr" role="status">
        {chosen ? `Option ${chosen} chosen.` : ''}
      </p>
    </div>
  );
}
