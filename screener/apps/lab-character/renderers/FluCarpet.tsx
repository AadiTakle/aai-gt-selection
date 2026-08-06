/**
 * FLU-CARPET-01 — a woven strip or a woven square with one cell left unwoven.
 *
 * Two shapes of the same item, both in the bank: `mode:'row'` is 1x4 and reads left to right, and
 * `mode:'grid'` is 3x3 and reads both ways. The blank is the last cell either way, and is `null` in
 * `carpet.cells` as well as named in `carpet.blank`.
 *
 * A cell is `{motif,count,size,color,rot,fill}` and the generator can put a progression on any of
 * the six at once (`activeAttrs` runs up to five deep at the top of the difficulty range), so all
 * six attributes are drawn:
 *
 *   motif   5 names; `capsule` and `petal` have no path in the shared vocabulary
 *   count   1..3, as a cluster
 *   size    0..2, as a scale step — the only attribute with no shared-glyph equivalent at all
 *   color   5 names; `coral`, `blue`, `gold` are not in the neutral palette
 *   rot     0 / 45 / 90 / 135 DEGREES (the shared Glyph counts quarter turns)
 *   fill    1 solid, 0 outline — which is `Glyph`'s `hollow`
 *
 * `activeAttrs` and `progressionCount` are read and never drawn. Naming the attributes that vary is
 * the answer to the question the item is asking.
 *
 * Settling lifts the chosen option. The blank stays blank: weaving the child's own choice into the
 * carpet would show them a pattern that either continues or visibly breaks, and that is a verdict
 * this renderer is not allowed to deliver.
 */
import { useMemo, useRef, useState, type CSSProperties } from 'react';

import { Glyph, NEUTRAL_SKIN } from '../shared/glyphs';
import type { Skin } from '../shared/glyphs';
import type { RendererProps } from '../shared/types';

import './FluCarpet.css';

/** `capsule` and `petal` fall back to a circle in `shared/glyphs`, which would merge two motifs. */
const MOTIF_ALIAS: Record<string, string> = { capsule: 'square', petal: 'teardrop' };

/** Bank colours the neutral palette has no entry for; without these three the colour progression
    collapses into one teal and the item cannot be answered. */
const PALETTE_GAP: Record<string, string> = {
  coral: '#e0714f',
  blue: '#3f6fb0',
  gold: '#cf9a2b',
  ink: '#2b3440',
};

/**
 * `size` is an index, not a measurement. Monotonic and far enough apart to read at a glance, but not
 * so small at the bottom that a size-plus-count cell (which the top of the difficulty range does
 * produce) becomes three specks.
 */
const SIZE_SCALE = [0.7, 0.85, 1];

function useTintedSkin(skin: Skin): Skin {
  return useMemo(() => {
    const fallback = skin.color('teal');
    return {
      ...skin,
      color: (name: string) => {
        const own = skin.color(name);
        const gap = PALETTE_GAP[name];
        return gap && name !== 'teal' && own === fallback ? gap : own;
      },
    };
  }, [skin]);
}

interface Cell {
  motif: string;
  count: number;
  size: number;
  color: string;
  /** Degrees, as the bank states it. */
  rot: number;
  hollow: boolean;
}

interface Option {
  key: string;
  tile: Cell;
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
function readCell(v: unknown): Cell {
  const raw = asObject(v);
  const name = asString(raw.motif, 'circle');
  return {
    motif: MOTIF_ALIAS[name] ?? name,
    count: Math.max(1, Math.min(6, Math.round(asNumber(raw.count, 1)))),
    size: Math.max(0, Math.min(SIZE_SCALE.length - 1, Math.round(asNumber(raw.size, 0)))),
    color: asString(raw.color, 'teal'),
    rot: asNumber(raw.rot, 0),
    hollow: asNumber(raw.fill, 1) === 0,
  };
}
function vars(v: Record<string, string | number>): CSSProperties {
  return v as CSSProperties;
}

function Woven({ cell, skin }: { cell: Cell; skin: Skin }) {
  return (
    <span
      className="fc-face"
      data-n={cell.count}
      style={vars({ '--fc-scale': SIZE_SCALE[cell.size] ?? 1 })}
    >
      {Array.from({ length: cell.count }, (_, i) => (
        <Glyph
          key={i}
          className="fc-glyph"
          shape={cell.motif}
          color={cell.color}
          skin={skin}
          rot={cell.rot / 90}
          hollow={cell.hollow}
        />
      ))}
    </span>
  );
}

function ChosenMark() {
  return (
    <svg className="fc-mark" viewBox="0 0 24 24" aria-hidden="true">
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

export default function FluCarpet({
  content,
  onAnswer,
  answered,
  band,
  skin = NEUTRAL_SKIN,
}: RendererProps & { skin?: Skin }) {
  const tinted = useTintedSkin(skin);
  const [chosen, setChosen] = useState<string | null>(null);
  const locked = useRef(false);

  const { rows, cols, cells, blank, options, isRow } = useMemo(() => {
    const carpet = asObject(content.carpet);
    const rawRows = Array.isArray(carpet.cells) ? (carpet.cells as unknown[]) : [];
    const grid: (Cell | null)[][] = rawRows.map((row) =>
      (Array.isArray(row) ? (row as unknown[]) : []).map((cell) => (cell == null ? null : readCell(cell))),
    );
    const hole = asObject(carpet.blank);
    const opts: Option[] = (Array.isArray(content.options) ? (content.options as unknown[]) : []).map(
      (raw, i) => {
        const o = asObject(raw);
        return { key: asString(o.key, String.fromCharCode(65 + i)), tile: readCell(o.tile) };
      },
    );
    const r = Math.max(1, Math.round(asNumber(carpet.rows, grid.length || 1)));
    return {
      rows: r,
      cols: Math.max(1, Math.round(asNumber(carpet.cols, grid[0]?.length ?? 1))),
      cells: grid,
      blank: { row: Math.round(asNumber(hole.row, -1)), col: Math.round(asNumber(hole.col, -1)) },
      options: opts,
      isRow: asString(content.mode, r === 1 ? 'row' : 'grid') === 'row',
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
    <div className={`fc-root${answered ? ' fc-settled' : ''}`} data-band={band}>
      <p className="fc-ask">{isRow ? 'Which one comes next?' : 'Which piece finishes the weave?'}</p>

      <div
        className="fc-carpet"
        style={vars({ '--fc-cols': cols })}
        role="img"
        aria-label={
          isRow
            ? `A strip of ${cols} woven pieces with the last one missing.`
            : `A ${rows} by ${cols} weave with one piece missing.`
        }
      >
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => {
            const cell = cells[r]?.[c] ?? null;
            const isBlank = cell === null || (r === blank.row && c === blank.col);
            return (
              <span
                key={`${r}-${c}`}
                className={`fc-cell${isBlank ? ' fc-cell-blank' : ''}`}
                style={vars({ '--i': r * cols + c })}
              >
                {isBlank ? <span className="fc-hole" aria-hidden="true" /> : <Woven cell={cell} skin={tinted} />}
              </span>
            );
          }),
        )}
      </div>

      <div className="fc-options" role="group" aria-label="Answer choices">
        {options.map((option, i) => (
          <button
            key={option.key}
            type="button"
            className={`fc-opt${chosen === option.key ? ' fc-opt-chosen' : ''}`}
            style={vars({ '--i': i })}
            aria-label={`Option ${option.key}`}
            aria-disabled={!live}
            onClick={() => pick(option.key)}
          >
            <span className="fc-opt-face">
              <Woven cell={option.tile} skin={tinted} />
            </span>
            <span className="fc-opt-key" aria-hidden="true">
              {option.key}
            </span>
            {chosen === option.key ? <ChosenMark /> : null}
          </button>
        ))}
      </div>

      <p className="fc-sr" role="status">
        {chosen ? `Option ${chosen} chosen.` : ''}
      </p>
    </div>
  );
}
