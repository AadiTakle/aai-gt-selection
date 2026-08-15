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
 *   motif   5 names: bolt, petal, capsule, leaf, chevron
 *   count   1..3, as a cluster
 *   size    0..2, as a scale step — the only attribute with no shared-glyph equivalent at all
 *   color   5 names: coral, teal, gold, blue, violet
 *   rot     0 / 45 / 90 / 135 DEGREES
 *   fill    1 solid, 0 outline — which is `Glyph`'s `hollow`
 *
 * THE MOTIF NAME IS NOT TRANSLATED ON THE WAY IN. `capsule` and `petal` used to be aliased onto
 * `square` and `teardrop` because the shared vocabulary had no paths for them. It has both now, and
 * the alias was doing real damage in the meantime: it renamed the motif before `skin.draw` was asked,
 * so a world that draws a petal as a blossom petal was asked for a teardrop and drew the wrong thing
 * — with two names capable of colliding onto one picture, which is the one failure that makes a
 * shape rule unanswerable. The bank's name now goes to the skin exactly as written.
 *
 * FILL SURVIVES A SKIN THAT IGNORES IT. `hollow` reaches `Glyph`, which honours it in the geometric
 * fallback, but a world's `draw` returns finished artwork and `Glyph` does not pass the modifier on
 * (see the note at the foot of this file). So a hollow cell also carries `fc-glyph-hollow`, and the
 * stylesheet ghosts the fill and outlines the silhouette whatever the skin handed back. Only seven
 * cells in the shipped bank are hollow, but they are seven items that would otherwise be unanswerable.
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

/**
 * The fallback ink, and the only colour name written down in this file.
 *
 * Used for a cell that arrives without a `color`. Every cell that has one is woven in its own, via
 * `skin.color(cell.color)`, because colour is one of the six attributes a progression can run on.
 */
const FALLBACK_INK = 'teal';

/**
 * `size` is an index, not a measurement. Monotonic and far enough apart to read at a glance, but not
 * so small at the bottom that a size-plus-count cell (which the top of the difficulty range does
 * produce) becomes three specks.
 */
const SIZE_SCALE = [0.7, 0.85, 1];

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
  return {
    // The bank's own name, so the skin is asked about a capsule rather than about a square.
    motif: asString(raw.motif, 'circle'),
    count: Math.max(1, Math.min(6, Math.round(asNumber(raw.count, 1)))),
    size: Math.max(0, Math.min(SIZE_SCALE.length - 1, Math.round(asNumber(raw.size, 0)))),
    color: asString(raw.color, FALLBACK_INK),
    rot: asNumber(raw.rot, 0),
    hollow: asNumber(raw.fill, 1) === 0,
  };
}
function vars(v: Record<string, string | number>): CSSProperties {
  return v as CSSProperties;
}

function Woven({ cell, skin, width }: { cell: Cell; skin: Skin; width: string }) {
  return (
    <span
      className="fc-face"
      data-n={cell.count}
      style={vars({
        '--fc-scale': SIZE_SCALE[cell.size] ?? 1,
        '--fc-w': width,
        '--fc-ink-cell': skin.color(cell.color),
      })}
    >
      {Array.from({ length: cell.count }, (_, i) => (
        <Glyph
          key={i}
          className={`fc-glyph${cell.hollow ? ' fc-glyph-hollow' : ''}`}
          shape={cell.motif}
          color={cell.color}
          skin={skin}
          // Degrees. The bank weaves 0, 45, 90 and 135, so quarter turns cannot say it.
          rotDeg={cell.rot}
          hollow={cell.hollow}
        />
      ))}
    </span>
  );
}

/**
 * One drawn size for every copy in the weave, taken from the largest count anywhere in the item.
 *
 * Sized per cell instead, a cell of one draws its motif at full width beside a cell of three at 45%,
 * so the mark grows as the count falls. `count` is one of the six attributes a progression can run
 * on, and `size` is another one of them — letting count move the size as well would put two of the
 * item's own attributes on one visual channel and make the size progression unreadable.
 */
function faceWidth(maxCount: number): string {
  if (maxCount <= 1) return '100%';
  if (maxCount <= 4) return '45%';
  return '30%';
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
  const [chosen, setChosen] = useState<string | null>(null);
  const locked = useRef(false);

  const { rows, cols, cells, blank, options, isRow, width } = useMemo(() => {
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
    const counts = [
      ...grid.flatMap((row) => row.map((cell) => cell?.count ?? 1)),
      ...opts.map((o) => o.tile.count),
    ];
    return {
      rows: r,
      width: faceWidth(Math.max(1, ...counts)),
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
                {isBlank ? (
                  <span className="fc-hole" aria-hidden="true" />
                ) : (
                  <Woven cell={cell} skin={skin} width={width} />
                )}
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
              <Woven cell={option.tile} skin={skin} width={width} />
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

/* ===========================================================================
   WANTED FROM shared/, REPORTED RATHER THAN CHANGED

   `Glyph` accepts `hollow` and documents `Skin.draw` as receiving an `opts` argument carrying it,
   but the call is `skin.draw?.(shape, fill)` — `opts` is never passed. So `hollow` reaches the
   geometric fallback only, and the moment a world draws its own artwork the distinction is gone.
   `fill` is a real varying attribute of this type, so that silently costs the item its answer.

   Rotation is safe by accident: `Glyph` rotates the whole `<svg>` in CSS, so it lands on whatever the
   skin returned. `hollow` has no such backstop, which is why this file carries `fc-glyph-hollow` and
   FluOpChain carries `foc-fig-hollow` — two copies of the same workaround, in two files, for one
   missing argument. Passing `{ hollow, rotDeg }` through would delete both.
   =========================================================================== */
