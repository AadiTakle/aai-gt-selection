/**
 * FLU-MATRIX-01 — "which piece finishes the pattern"
 *
 * The payload is a rows x cols matrix of tiles with exactly one hole (`matrix.blank`, and the cell
 * itself is `null`), plus 4-6 option tiles. A tile is `{shape,color,count,rot}` and every rule the
 * generator switched on is expressed in those four attributes, so all four have to be VISIBLE or
 * the item stops being answerable:
 *
 *   shape     6 names: star, pentagon, kite, drop, hexagon, triangle
 *   color     6 names: teal, ink, violet, blue, gold, coral
 *   count     1..3, drawn as a cluster and never as a numeral
 *   rot       0 / 120 / 240, in DEGREES
 *
 * ALL SIX SHAPES AND ALL SIX COLOURS NOW GO STRAIGHT THROUGH. This file used to carry two local
 * tables: `kite`/`drop` were aliased onto `diamond`/`teardrop` because the shared vocabulary had no
 * path for them, and four colours were patched from a local hex table because the neutral palette
 * was missing them. Both holes are closed in `shared/glyphs`, and both tables were actively harmful
 * once they were not needed: aliasing renamed the shape BEFORE `skin.draw` saw it, so a world that
 * draws a kite as a kite got asked for a diamond instead and the item was depicted in someone
 * else's vocabulary. The bank's own name is now handed to the skin unchanged.
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
 * The fallback ink, and the only colour name written down in this file.
 *
 * It is used for a tile that arrives with no `color` at all. Every tile that HAS one is drawn in its
 * own — `skin.color(tile.color)` — because the colour is one of the four attributes the item may be
 * ruling on, and a literal colour name here would overwrite the rule with a house style.
 */
const FALLBACK_INK = 'teal';

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
  return {
    // The bank's own name, unaliased, so `skin.draw` is asked about a kite rather than a diamond.
    shape: asString(raw.shape, 'circle'),
    color: asString(raw.color, FALLBACK_INK),
    count: Math.max(1, Math.min(6, Math.round(asNumber(raw.count, 1)))),
    rot: asNumber(raw.rot, 0),
  };
}
function vars(v: Record<string, string | number>): CSSProperties {
  return v as CSSProperties;
}

/**
 * A tile's face: `count` copies of one glyph, all carrying the tile's rotation.
 *
 * `width` is the drawn size of one copy and is pinned PER ITEM rather than per tile — see `faceWidth`.
 */
function TileFace({ tile, skin, width }: { tile: Tile; skin: Skin; width: string }) {
  return (
    <span className="fm-face" data-n={tile.count} style={vars({ '--fm-w': width })}>
      {Array.from({ length: tile.count }, (_, i) => (
        <Glyph
          key={i}
          className="fm-glyph"
          shape={tile.shape}
          color={tile.color}
          skin={skin}
          // Degrees, which is what the bank carries: 0, 120 and 240 are not quarter turns.
          rotDeg={tile.rot}
        />
      ))}
    </span>
  );
}

/**
 * One drawn size for every copy in the item, chosen from the LARGEST count anywhere in it.
 *
 * Sizing each face by its own count is the trap: a tile of one would be drawn at full width next to
 * a tile of three at 45%, so "one big shape" and "three small shapes" differ in mark size as well as
 * in number. Count is one of the rules these items run on, and a child reading size for number is
 * answering a different question than the one that was served. Pinning the width across the whole
 * item — pattern and options alike — leaves number as the only thing that changes.
 */
function faceWidth(maxCount: number): string {
  if (maxCount <= 1) return '100%';
  if (maxCount <= 4) return '45%';
  return '30%';
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
  const [chosen, setChosen] = useState<string | null>(null);
  const locked = useRef(false);

  const { rows, cols, cells, blank, options, width } = useMemo(() => {
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
    const counts = [
      ...grid.flatMap((row) => row.map((cell) => cell?.count ?? 1)),
      ...opts.map((o) => o.tile.count),
    ];
    return {
      rows: Math.max(1, Math.round(asNumber(matrix.rows, grid.length || 1))),
      cols: Math.max(1, Math.round(asNumber(matrix.cols, grid[0]?.length ?? 1))),
      cells: grid,
      blank: { row: Math.round(asNumber(hole.row, -1)), col: Math.round(asNumber(hole.col, -1)) },
      options: opts,
      width: faceWidth(Math.max(1, ...counts)),
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
                  <TileFace tile={tile} skin={skin} width={width} />
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
              <TileFace tile={option.tile} skin={skin} width={width} />
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
