import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { handedFor } from './address';
import { inkOf } from './marks';
import { Motif } from './shapes';
import { HUE, MAT, breath, shade, useReducedMotion, useSlab } from './theme';

/**
 * `FLU-CARPET-01` as a thing in the hollow: the weave, a mat of woven pads with one pad still unmade.
 *
 * WHAT WAS WRONG BEFORE THIS FILE. Numbered buttons, drawing none of the item's content — the same defect
 * the owner caught on the tide-line. `PodWall.tsx` is the model, and this type is its harder cousin: the
 * matrix rules on three attributes, the carpet rules on six.
 *
 * WHAT THE ITEM ACTUALLY IS. `carpet` is `{rows, cols, cells}` with exactly one `null`, and `mode` says
 * whether that grid is a single row of four or a three-by-three. A cell is
 * `{motif, count, size, color, rot, fill}`. `options` are four or five `{key, tile}` of the same shape.
 * `activeAttrs` names which attributes progress, and over the 120 items that set includes `size` on 78 of
 * them and `fill` on 21.
 *
 * THE TWO ATTRIBUTES THAT GET DRAWN AWAY, and the only reason this file is longer than `PodWall`:
 *
 *   `fill` — the obvious way to draw a mark is a filled solid, and once everything is filled, the items
 *   whose rule is "solid, hollow, solid" have had that rule deleted and become coin tosses that still
 *   look correct in a screenshot. `shapes.tsx` gives every motif a real punched-out twin so a hollow mark
 *   shows the pale weave THROUGH it. That file holds the reasoning.
 *
 *   `size` — this one is subtler and it is the mistake `PodWall` makes and gets away with. A tile holding
 *   `count` marks normally shrinks them to fit, which is exactly what `PodWall`'s `TileMesh` does. Do that
 *   here and a size-2 mark at count 4 comes out smaller than a size-0 mark at count 1, so the `size` rule
 *   is not merely invisible, it is INVERTED — and 55 items in this bank have `count` and `size` both
 *   progressing at once, which is where it would do the damage. So the slots below are at a FIXED pitch,
 *   big enough for four of the largest marks, and a mark's scale is a function of `size` AND NOTHING ELSE.
 *
 * ONE TILE SIZE FOR THE WHOLE ITEM, mat and shelf alike, chosen from whichever of the two is tighter. Any
 * difference in tile scale between the mat and the candidates would be a difference in mark scale, which
 * is the `size` rule again, broken in a second way.
 *
 * IT CANNOT KNOW THE ANSWER. `onPick` hands back the address from `address.ts` and nothing here compares
 * anything. The chosen pad simply settles into the gap.
 */

/* ============================================================================
   layout
   ========================================================================== */

/**
 * A mark's scale as a fraction of the tile, per DISTINCT `size` value the item actually uses — and never a
 * function of `count`.
 *
 * TWO THINGS ARE GOING ON HERE and both were found by looking at shots.
 *
 * The steps are far apart, which is deliberate: at tile size a 1.2x step is a difference an adult can
 * measure and a child cannot see, and `size` progresses on 78 of the 120 items. The top step is capped by
 * the slot pitch below — four marks at 0.42 of a tile still leave daylight between them at a 0.43 pitch.
 *
 * And the ladder is chosen by HOW MANY sizes the item uses, not by the raw 0/1/2 value. 660 of the bank's
 * cells carry `size: 0`, and on the 42 items where nothing about size varies that means every mark in the
 * item was drawn at the smallest step for no reason at all — tiny marks, a sparse tile, and a harder read
 * of the `motif` and `fill` rules that item is actually built on. The mapping is monotone and is computed
 * once over every tile on screen, cells and candidates alike, so it cannot make one option stand out.
 */
const LADDER: Record<number, readonly number[]> = {
  1: [0.38],
  2: [0.26, 0.42],
  3: [0.2, 0.3, 0.42],
};

/** Where up to four marks sit inside a tile, in tile units. Fixed, for the reason in the header. */
const SLOT = 0.215;

/**
 * Fixed offsets, lifted from `PodWall`/`TideLine` — EXCEPT the depth, which those two put 2.3 in front of
 * the panel and which is wrong for this type specifically.
 *
 * The game's camera sits about 8 units back, so a shelf 2.3 units nearer renders about a third LARGER than
 * the mat behind it. On the matrix and the tide-line that costs nothing, because what a child compares
 * across the gap is a shape or a count and neither has a size. Here the comparison IS a size: a size-0
 * candidate at 2.3 out-measures a size-1 cell on the mat, which inverts the very rule this file spends its
 * length protecting. So the shelf sits close to the mat's own plane, and the drop in height is what
 * separates the two instead.
 */
const SHELF = { y: -2.2, z: 0.4 } as const;

interface Tile {
  motif: string;
  count: number;
  size: number;
  color: string;
  rot: number;
  fill: number;
}

function asTile(v: unknown): Tile | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  return {
    motif: typeof o.motif === 'string' ? o.motif : 'petal',
    count: typeof o.count === 'number' ? Math.max(1, Math.min(4, Math.round(o.count))) : 1,
    size: typeof o.size === 'number' ? Math.max(0, Math.min(2, Math.round(o.size))) : 0,
    color: typeof o.color === 'string' ? o.color : 'teal',
    rot: typeof o.rot === 'number' ? o.rot : 0,
    // Absent means solid. Present and zero means hollow, and that distinction is an active rule.
    fill: typeof o.fill === 'number' ? (o.fill === 0 ? 0 : 1) : 1,
  };
}

function slots(count: number): readonly (readonly [number, number])[] {
  switch (count) {
    case 1:
      return [[0, 0]];
    case 2:
      return [
        [-SLOT, 0],
        [SLOT, 0],
      ];
    case 3:
      return [
        [-SLOT, SLOT * 0.95],
        [SLOT, SLOT * 0.95],
        [0, -SLOT * 0.95],
      ];
    default:
      return [
        [-SLOT, SLOT],
        [SLOT, SLOT],
        [-SLOT, -SLOT],
        [SLOT, -SLOT],
      ];
  }
}

/* ============================================================================
   the pads
   ========================================================================== */

/**
 * The woven pad every tile is made of.
 *
 * PALE AND CROSS-WOVEN, and the weave is not decoration. It is what a hollow mark shows through: a hole
 * over a flat cream plate is a hole nobody notices, whereas a hole with two strands of vine crossing
 * behind it is unmistakably a hole. The `fill` rule is legible because of this mesh.
 */
function Pad({ tile }: { tile: number }) {
  const base = useSlab(tile, tile, 0.22, 0.16);
  /** Four strands each way rather than three fat ones: a finer mesh still shows through a punched mark and
   *  stops competing with the mark's own silhouette, which three heavy bars were doing. */
  const strands = 4;
  return (
    <group>
      <mesh geometry={base}>
        <meshStandardMaterial color={shade(HUE.paperDeep, 0.16)} roughness={0.95} metalness={0} />
      </mesh>
      {Array.from({ length: strands }, (_, i) => {
        const t = ((i + 1) / (strands + 1) - 0.5) * tile * 0.9;
        return (
          <group key={i}>
            <mesh position={[0, t, 0.1]}>
              <boxGeometry args={[tile * 0.9, tile * 0.042, 0.05]} />
              <meshStandardMaterial {...MAT.vine} />
            </mesh>
            <mesh position={[t, 0, 0.07]}>
              <boxGeometry args={[tile * 0.042, tile * 0.9, 0.05]} />
              <meshStandardMaterial {...MAT.vine} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/**
 * A tile: `count` marks of one `motif`, at `size`, in `color`, each turned by `rot`, solid or hollow by
 * `fill`. Every one of those six is drawn, because every one of them is a rule some item in this bank is
 * built on, and flattening any of them makes those items unanswerable.
 *
 * Each mark is turned about ITS OWN centre rather than the tile being turned as a whole. Turning the tile
 * would swing the slot arrangement too, so a 45-degree item would read as a tilted group rather than as
 * turned marks — and at counts of two and four, a swung pair and a turned pair look nothing alike.
 */
function TileFace({
  tile,
  size,
  stepOf,
}: {
  tile: Tile;
  size: number;
  stepOf: (sizeValue: number) => number;
}) {
  const color = inkOf(tile.color);
  const scale = size * stepOf(tile.size);
  return (
    <group position={[0, 0, 0.16]}>
      {slots(tile.count).map(([x, y], i) => (
        <group key={i} position={[x * size, y * size, 0]}>
          <group rotation={[0, 0, THREE.MathUtils.degToRad(tile.rot)]} scale={scale}>
            <Motif motif={tile.motif} color={color} fill={tile.fill} />
          </group>
        </group>
      ))}
    </group>
  );
}

/**
 * One place in the mat: a woven pad, or the gap where one is missing.
 *
 * The gap is the hollow's one convention — a recessed dark bed ringed in breathing honey light, the only
 * thing in the world that moves on its own, so a child who cannot read a word finds it in under a second.
 * Under `prefers-reduced-motion` the breath resolves to its MIDPOINT rather than to nothing, so the ring
 * still glows and the affordance survives.
 */
function Cell({
  tile,
  filled,
  size,
  stepOf,
  at,
}: {
  tile: Tile | null;
  filled: Tile | null;
  size: number;
  stepOf: (sizeValue: number) => number;
  at: [number, number, number];
}) {
  const shown = tile ?? filled;
  const ring = useSlab(size + 0.16, size + 0.16, 0.2, 0.17);
  const bed = useSlab(size - 0.06, size - 0.06, 0.2, 0.15);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const frame = useRef<THREE.Group>(null);
  const reduced = useReducedMotion();
  const empty = tile === null;

  useFrame(({ clock }) => {
    if (!empty) return;
    const b = breath(clock.elapsedTime, 2.6, reduced);
    if (mat.current) mat.current.emissiveIntensity = 0.45 + b * 0.95;
    if (frame.current) {
      const s = 1 + b * 0.025;
      frame.current.scale.set(s, s, 1);
    }
  });

  return (
    <group position={at}>
      {empty ? (
        <>
          <group ref={frame}>
            <mesh geometry={ring} position={[0, 0, -0.14]}>
              <meshStandardMaterial
                ref={mat}
                color={HUE.honey}
                emissive={HUE.honey}
                emissiveIntensity={0.8}
                roughness={0.45}
                metalness={0}
              />
            </mesh>
          </group>
          <mesh geometry={bed} position={[0, 0, -0.05]}>
            <meshStandardMaterial {...MAT.cut} />
          </mesh>
          {shown ? <TileFace tile={shown} size={size} stepOf={stepOf} /> : null}
        </>
      ) : (
        <>
          <Pad tile={size} />
          <TileFace tile={tile} size={size} stepOf={stepOf} />
        </>
      )}
    </group>
  );
}

/* ============================================================================
   the weave
   ========================================================================== */

export function Weave({
  content,
  onPick,
  disabled = false,
}: {
  content: Record<string, unknown>;
  onPick: (handed: string) => void;
  disabled?: boolean;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const { cells, rows, cols } = useMemo(() => {
    const c = (content.carpet ?? {}) as Record<string, unknown>;
    const raw = Array.isArray(c.cells) ? (c.cells as unknown[][]) : [];
    return {
      cells: raw.map((r) => (Array.isArray(r) ? r.map(asTile) : [])),
      rows: typeof c.rows === 'number' ? c.rows : raw.length || 1,
      cols: typeof c.cols === 'number' ? c.cols : (raw[0]?.length ?? 1),
    };
  }, [content]);

  /**
   * Candidates.
   *
   * The address comes from `handedFor` rather than from a local expression, because it is the one line in
   * this file that can be wrong without anything failing: these options are lettered, so it resolves to
   * the letter, and `prove-drawn-types.ts` drives that same function against the live API.
   */
  const options = useMemo(() => {
    const raw = Array.isArray(content.options) ? (content.options as Record<string, unknown>[]) : [];
    return raw.map((o, i) => ({ handed: handedFor(o, i), tile: asTile(o.tile) }));
  }, [content]);

  const pickedTile = options.find((o) => o.handed === picked)?.tile ?? null;

  /**
   * The size ladder, over every tile on screen at once — see `LADDER`.
   *
   * Cells AND candidates, deliberately: a ladder built from the mat alone would give a candidate whose size
   * the mat never shows nowhere to land, and one built per tile would be the `count`-scaling mistake again
   * in a new costume.
   */
  const stepOf = useMemo(() => {
    const used = new Set<number>();
    for (const row of cells) for (const c of row) if (c) used.add(c.size);
    for (const o of options) if (o.tile) used.add(o.tile.size);
    const sorted = [...used].sort((a, b) => a - b);
    const ladder = LADDER[Math.min(3, Math.max(1, sorted.length))] ?? LADDER[3]!;
    const map = new Map<number, number>();
    sorted.forEach((v, i) => map.set(v, ladder[Math.min(i, ladder.length - 1)] ?? 0.3));
    return (v: number) => map.get(v) ?? ladder[ladder.length - 1] ?? 0.3;
  }, [cells, options]);

  /* ONE tile size for the mat AND the shelf, from whichever is tighter — see the header. */
  const matPitch = Math.min(2.0, 7.8 / Math.max(1, cols), 4.35 / Math.max(1, rows));
  const optPitch = Math.min(2.25, 10.4 / Math.max(1, options.length));
  const tile = Math.min(matPitch * 0.9, optPitch - 0.34);

  /** A single row reads better sitting low, right above its shelf; a three-by-three needs the height. */
  const matY = rows > 1 ? 1.0 : 0.15;
  const originX = -((cols - 1) * matPitch) / 2;
  const originY = ((rows - 1) * matPitch) / 2;
  const matW = cols * matPitch + 0.5;
  const matH = rows * matPitch + 0.5;
  const fringe = Math.max(4, Math.round(matW * 1.5));

  return (
    <group>
      {/* The mat itself: a woven backing with a rope border and a fringe, hung where the child can see
          it. One made thing, not a grid of tiles floating in the air. */}
      <mesh position={[0, matY, -0.6]}>
        <boxGeometry args={[matW, matH, 0.34]} />
        <meshStandardMaterial color={shade(HUE.barkSoft, 0.22)} roughness={0.95} metalness={0} />
      </mesh>
      {[
        [0, matY + matH / 2, matW, 0.18],
        [0, matY - matH / 2, matW, 0.18],
        [-matW / 2, matY, 0.18, matH],
        [matW / 2, matY, 0.18, matH],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x ?? 0, y ?? 0, -0.4]}>
          <boxGeometry args={[w ?? 0.2, h ?? 0.2, 0.42]} />
          <meshStandardMaterial {...MAT.vine} />
        </mesh>
      ))}
      {/* Fringe along the bottom edge. Warm, and it tells you which way up the mat is. */}
      {Array.from({ length: fringe }, (_, i) => (
        <mesh
          key={i}
          position={[(i / Math.max(1, fringe - 1) - 0.5) * (matW - 0.3), matY - matH / 2 - 0.13, -0.5]}
        >
          <capsuleGeometry args={[0.03, 0.13, 3, 6]} />
          <meshStandardMaterial {...MAT.vine} />
        </mesh>
      ))}

      {cells.map((row, r) =>
        row.map((cell, c) => (
          <Cell
            key={`${r}-${c}`}
            tile={cell}
            filled={cell === null ? pickedTile : null}
            size={tile}
            stepOf={stepOf}
            at={[originX + c * matPitch, matY + originY - r * matPitch, 0]}
          />
        )),
      )}

      {/* The shelf of pads to choose from. */}
      <group position={[0, SHELF.y, SHELF.z]}>
        <mesh position={[0, -tile / 2 - 0.32, -0.62]}>
          <boxGeometry args={[options.length * optPitch + 0.8, 0.26, 1.2]} />
          <meshStandardMaterial {...MAT.bark} />
        </mesh>
        {options.map((o, i) => {
          const x = (i - (options.length - 1) / 2) * optPitch;
          const taken = picked === o.handed;
          const live = !disabled && !picked;
          const lit = hover === o.handed && live;
          return (
            <group key={o.handed} position={[x, lit ? 0.18 : 0, 0]}>
              {/* Invisible, oversized hit volume: over two units on a side, because a small child
                  aiming a crosshair in three dimensions is imprecise and a missed tap reads as a broken
                  game. */}
              <mesh
                visible={false}
                onPointerOver={() => setHover(o.handed)}
                onPointerOut={() => setHover((h) => (h === o.handed ? null : h))}
                onClick={(e) => {
                  e.stopPropagation();
                  if (disabled || picked) return;
                  setPicked(o.handed);
                  onPick(o.handed);
                }}
              >
                <boxGeometry args={[Math.max(2.05, tile + 0.4), Math.max(2.2, tile + 0.9), 1.8]} />
              </mesh>
              {!taken && o.tile ? (
                <group scale={lit ? 1.06 : 1}>
                  <Pad tile={tile} />
                  <TileFace tile={o.tile} size={tile} stepOf={stepOf} />
                </group>
              ) : null}
              {/* A plinth, so a taken slot still reads as a slot. It is also the hover tell. */}
              <mesh position={[0, -tile / 2 - 0.14, 0]}>
                <cylinderGeometry args={[0.38, 0.46, 0.14, 24]} />
                <meshStandardMaterial
                  color={lit ? HUE.honey : shade(HUE.stone, 0.06)}
                  emissive={lit ? HUE.honey : '#000000'}
                  emissiveIntensity={lit ? 0.6 : 0}
                  roughness={0.7}
                  metalness={0}
                />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}
