import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';

import { handedFor } from './address';
import { Cluster, INK, fitCluster, type ClusterFit } from './marks';
import { HUE, MAT, breath, shade, useReducedMotion, useSlab } from './theme';

/**
 * `QUANT-SERIES-01` as a thing in the hollow: the tide-line, a row of feeding stones at the water's
 * edge, each holding one night's portion, with one stone still empty.
 *
 * WHAT WAS WRONG BEFORE THIS FILE. The type had no in-world presentation, so a beat fell back to a
 * row of numbered buttons — "1 2 3 4" — showing NONE of the item's content. From the child's side that
 * is indistinguishable from pressing random numbers, because that is exactly what it is. Everything
 * this file does is put the item's own content on screen; `PodWall.tsx` beside it does the same job
 * for `FLU-MATRIX-01` and is the model followed here down to the shelf offsets.
 *
 * WHAT THE ITEM ACTUALLY IS. `terms` is a list of `{value}` and optionally `{shape}`, `slotIndex` is
 * which position is blank (the whole bank puts it at the end, i.e. "what comes next", but the code
 * honours an interior one), and `options` are `{key, value}` with the same optional `shape`.
 * `attributes` names what varies — always `count`, sometimes `count` and `shape` — and BOTH have to be
 * drawn or the rule the child is meant to find is not on screen.
 *
 * THE ONE DECISION THAT MATTERS MORE THAN ANY OTHER: NO NUMERALS, EVER. The bank hands over a
 * `display` field that says `"numeral"` on 84 of its 120 items, and this file ignores it. Drawing "13"
 * would make a five-year-old's ability to read two digits the thing being measured. Every quantity
 * here is a counted cluster of berries, laid out in fives so it can actually be counted, at ONE mark
 * size chosen from the item's largest count so no cluster can win by being bigger. `marks.tsx` holds
 * that reasoning and enforces it in a single call.
 *
 * IT CANNOT KNOW THE ANSWER. `onPick` hands back the option's `key` and nothing here compares
 * anything. The chosen portion simply settles onto the empty stone.
 */

/** Everything on screen, in the local space the game positions. Roughly 8 wide, 6 tall, facing +Z. */
const SPAN_X = 8.7;
/** How far the shelf of candidates sits in front of and below the row. Lifted verbatim from
 *  `PodWall`, which had to discover that a shelf derived from the row's own geometry lands in the
 *  grass and half-buries the candidates. Fixed offsets, deliberately. */
const SHELF = { y: -2.35, z: 2.3 } as const;

interface Term {
  value: number;
  shape: string;
}

function asTerm(v: unknown): Term | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.value !== 'number') return null;
  return { value: o.value, shape: typeof o.shape === 'string' ? o.shape : 'dot' };
}

/* ============================================================================
   the parts
   ========================================================================== */

/**
 * A feeding stone: a wide, shallow, rounded trough cut into the ledge.
 *
 * WIDE RATHER THAN ROUND, and it is a legibility decision rather than a stylistic one. The portion in
 * it is laid out in ROWS OF FIVE (see `marks.tsx`), and a five-wide row inscribed in a circle wastes
 * most of the circle — the first version of this file used round pods and the berries came out a third
 * of the size they are now, which is the difference between countable and speckled.
 *
 * FACING THE CHILD, not facing up. The game's camera sits at roughly the row's own height, so a
 * portion resting on a horizontal surface is a smear. The trough is a recessed face turned to +Z: the
 * rim stands proud, the bed sits behind it, and the berries poke out past the rim the way real berries
 * in a real dish do.
 *
 * NOTHING PROTRUDES FORWARD OF THE BERRIES. Everything is layered strictly back from z=0.2, because the
 * first version's stone bodies were round cylinders whose front faces stood in front of the portions
 * and hid them completely — an item drawn perfectly and then covered up.
 */
function Trough({
  at,
  w,
  h,
  children,
}: {
  at: [number, number, number];
  w: number;
  h: number;
  children?: React.ReactNode;
}) {
  const rim = useSlab(w, h, 0.3, 0.13);
  const bed = useSlab(w - 0.22, h - 0.22, 0.24, 0.1);
  return (
    <group position={at}>
      {/* The block it is cut from, kept well behind. */}
      <mesh position={[0, -0.04, -0.4]}>
        <boxGeometry args={[w * 0.8, h * 0.78, 0.5]} />
        <meshStandardMaterial {...MAT.stoneDeep} />
      </mesh>
      {/* Rim BEHIND and larger, bed IN FRONT and smaller. The obvious way round — a full-size rim in
          front of a smaller bed — hides the bed completely, because a rounded slab is solid rather than
          a frame, and every trough then reads as a flat tile with berries stuck to it. */}
      <mesh geometry={rim} position={[0, 0, -0.12]}>
        <meshStandardMaterial {...MAT.stone} />
      </mesh>
      <mesh geometry={bed}>
        <meshStandardMaterial {...MAT.cut} />
      </mesh>
      {children}
    </group>
  );
}

/**
 * The empty trough, ringed in breathing honey light.
 *
 * This is the hollow's one convention and the reason a child who cannot read a word of this finds the
 * question in under a second: the only thing in the world that moves on its own is the place where
 * something is missing. Under `prefers-reduced-motion` the breath resolves to its MIDPOINT rather than
 * to nothing, so the rim still glows and the affordance survives.
 */
function Socket({
  at,
  w,
  h,
  children,
}: {
  at: [number, number, number];
  w: number;
  h: number;
  children?: React.ReactNode;
}) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const frame = useRef<THREE.Group>(null);
  const reduced = useReducedMotion();
  const rim = useSlab(w, h, 0.34, 0.13);
  const bed = useSlab(w - 0.22, h - 0.22, 0.24, 0.1);

  useFrame(({ clock }) => {
    const b = breath(clock.elapsedTime, 2.6, reduced);
    if (mat.current) mat.current.emissiveIntensity = 0.5 + b * 0.9;
    if (frame.current) {
      const s = 1 + b * 0.03;
      frame.current.scale.set(s, s, 1);
    }
  });

  return (
    <group position={at}>
      <mesh position={[0, -0.04, -0.4]}>
        <boxGeometry args={[w * 0.8, h * 0.78, 0.5]} />
        <meshStandardMaterial {...MAT.stoneDeep} />
      </mesh>
      <group ref={frame}>
        <mesh geometry={rim} position={[0, 0, -0.14]}>
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
      {/* The bed of the empty one is the darkest thing on screen, so it reads as a hole even before
          the light on its rim is noticed. */}
      <mesh geometry={bed}>
        <meshStandardMaterial {...MAT.cut} />
      </mesh>
      {children}
    </group>
  );
}

/* ============================================================================
   the tide-line
   ========================================================================== */

export function TideLine({
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

  const terms = useMemo(() => {
    const raw = Array.isArray(content.terms) ? (content.terms as unknown[]) : [];
    return raw.map(asTerm).filter((t): t is Term => t !== null);
  }, [content]);

  /**
   * Candidates.
   *
   * The address comes from `handedFor` rather than from a local expression, because it is the one line
   * in this file that can be wrong without anything failing. `QUANT-*` options are lettered so it
   * resolves to the letter; `prove-drawn-types.ts` in this directory drives that same function against
   * the live API and is the standing check that it still does.
   */
  const options = useMemo(() => {
    const raw = Array.isArray(content.options) ? (content.options as Record<string, unknown>[]) : [];
    return raw.map((o, i) => ({
      handed: handedFor(o, i),
      term: asTerm(o) ?? { value: 0, shape: 'dot' },
    }));
  }, [content]);

  const slotIndex = useMemo(() => {
    const s = content.slotIndex;
    return typeof s === 'number' ? Math.max(0, Math.min(terms.length, Math.round(s))) : terms.length;
  }, [content, terms.length]);

  /** The row, with the empty stone spliced in at the item's own slot. */
  const row = useMemo(() => {
    const cells: (Term | null)[] = terms.slice();
    cells.splice(slotIndex, 0, null);
    return cells;
  }, [terms, slotIndex]);

  /* Layout. Everything is layered strictly back from the berries at z≈0.2, so nothing can hide the
     one thing the item is made of. */
  const pitch = Math.min(1.7, SPAN_X / Math.max(1, row.length));
  const troughW = pitch * 0.88;
  const troughH = troughW * 0.66;
  const originX = -((row.length - 1) * pitch) / 2;

  /**
   * ONE mark size for the whole item, taken from the biggest number anywhere on screen.
   *
   * Sized from the ROW's trough, which is the smaller of the two, so the candidates on the shelf get a
   * roomier bed rather than bigger berries. Marks that changed size between the row and the shelf would
   * turn "which of these is the same amount" into a comparison of areas.
   */
  const fit: ClusterFit = useMemo(() => {
    const maxCount = Math.max(1, ...terms.map((t) => t.value), ...options.map((o) => o.term.value));
    return fitCluster(maxCount, (troughW - 0.18) * 0.92, (troughH - 0.18) * 0.88, 0.28);
  }, [terms, options, troughW, troughH]);

  const pickedTerm = options.find((o) => o.handed === picked)?.term ?? null;

  return (
    <group>
      {/* The bank the line is cut into: one carved panel, so this reads as a made thing at the water's
          edge rather than as a rectangle of blue floating in the air. */}
      <mesh position={[0, 0.62, -1.5]}>
        <boxGeometry args={[SPAN_X + 1.0, 4.3, 0.5]} />
        <meshStandardMaterial {...MAT.stone} />
      </mesh>
      <mesh position={[0, 1.5, -1.18]}>
        <boxGeometry args={[SPAN_X + 0.3, 2.1, 0.22]} />
        {/* Lightened off the palette's river: the raw value is a deep slate blue and at this size it
            reads as a hole rather than as water, which is a gloomy backdrop for a five-year-old. */}
        <meshStandardMaterial color={shade(HUE.river, 0.3)} roughness={0.32} metalness={0} />
      </mesh>
      {/* The tide, caught mid-retreat. Quiet: the water is scenery, the portions are the item. */}
      {[
        [-2.7, 1.1, 0],
        [0.4, 1.9, 1],
        [2.9, 1.3, 2],
      ].map(([x, y, i]) => (
        <mesh key={i} position={[x ?? 0, y ?? 0, -1.04]}>
          <torusGeometry args={[0.4 + (i ?? 0) * 0.14, 0.035, 6, 22, 2.2]} />
          <meshStandardMaterial color={HUE.mist} roughness={0.5} metalness={0} transparent opacity={0.5} />
        </mesh>
      ))}
      {/* Moss along the top of the bank. */}
      <mesh position={[0, 2.66, -1.4]}>
        <boxGeometry args={[SPAN_X + 1.0, 0.36, 0.66]} />
        <meshStandardMaterial {...MAT.moss} />
      </mesh>

      {/* The ledge the troughs are set into, behind them so it cannot cover a portion. */}
      <mesh position={[0, -0.74, -0.1]}>
        <boxGeometry args={[SPAN_X + 1.0, 0.62, 0.8]} />
        <meshStandardMaterial {...MAT.stone} />
      </mesh>
      <mesh position={[0, -0.44, 0.28]}>
        <boxGeometry args={[SPAN_X + 1.0, 0.14, 0.14]} />
        <meshStandardMaterial {...MAT.mossDeep} />
      </mesh>

      {/* The line itself: one trough per night, plus the empty one. */}
      {row.map((term, i) => {
        const at: [number, number, number] = [originX + i * pitch, 0.2, 0.3];
        const marks = (
          <group position={[0, 0, 0.14]}>
            <Cluster
              count={(term ?? pickedTerm)?.value ?? 0}
              shape={(term ?? pickedTerm)?.shape ?? 'dot'}
              color={INK.coral!}
              fit={fit}
            />
          </group>
        );
        return term === null ? (
          <Socket key={`slot-${i}`} at={at} w={troughW} h={troughH}>
            {pickedTerm ? marks : null}
          </Socket>
        ) : (
          <Trough key={`stone-${i}`} at={at} w={troughW} h={troughH}>
            {marks}
          </Trough>
        );
      })}

      {/* The shelf of portions to choose from. */}
      <group position={[0, SHELF.y, SHELF.z]}>
        <mesh position={[0, -0.62, -0.24]}>
          <boxGeometry args={[options.length * 1.95 + 0.8, 0.3, 1.4]} />
          <meshStandardMaterial {...MAT.bark} />
        </mesh>
        {options.map((o, i) => {
          const x = (i - (options.length - 1) / 2) * 1.95;
          const taken = picked === o.handed;
          const live = !disabled && !picked;
          const lit = hover === o.handed && live;
          return (
            <group key={o.handed} position={[x, lit ? 0.18 : 0, 0]}>
              {/* Invisible, oversized hit volume: over two units on a side, because a small child
                  aiming a mouse in three dimensions is imprecise and a missed tap reads as a broken
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
                <boxGeometry args={[2.0, 2.1, 1.8]} />
              </mesh>

              {!taken ? (
                <group scale={lit ? 1.07 : 1}>
                  <Trough at={[0, 0, 0]} w={troughW * 1.06} h={troughH * 1.06}>
                    <group position={[0, 0, 0.14]}>
                      <Cluster count={o.term.value} shape={o.term.shape} color={INK.coral!} fit={fit} />
                    </group>
                  </Trough>
                </group>
              ) : null}

              {/* A plinth, so a taken slot still reads as a slot. It is also the hover tell. */}
              <mesh position={[0, -0.5, 0]}>
                <cylinderGeometry args={[0.42, 0.5, 0.14, 24]} />
                <meshStandardMaterial
                  color={lit ? HUE.honey : HUE.stone}
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
