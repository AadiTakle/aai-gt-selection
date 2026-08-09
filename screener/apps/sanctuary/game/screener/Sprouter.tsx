import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';

import { handedFor } from './address';
import { Cluster, INK, clusterLayout, fitCluster, type ClusterFit } from './marks';
import { HUE, MAT, breath, shade, useReducedMotion, useSlab } from './theme';

/**
 * `QUANT-FUNC-01` as a thing in the hollow: the sprouter, a hollow stump with seeds going in one side
 * and shoots coming out the other, and every run it has already done still sitting in it.
 *
 * WHAT WAS WRONG BEFORE THIS FILE. Numbered buttons, drawing none of the item's content — the same
 * defect the owner caught on the tide-line, still true of this type. `TideLine.tsx` is the model.
 *
 * WHAT THE ITEM ACTUALLY IS. `pairs` are two or three worked examples, each `[in, out]`. `input` is the
 * new amount going in. `options` are four `{key, value}`, one of which is the amount that comes out.
 * `attributes` is `["count"]` on all 120 items: the rule is arithmetic on HOW MANY and nothing else.
 *
 * ONE MACHINE, EVERY RUN SHOWN AT ONCE. The examples are not a table beside the apparatus, they are
 * channels through the same stump, stacked, all pointing the same way, with the new run as the bottom
 * channel and its far end empty. That is what makes it answerable without a word of instruction: a child
 * sees three runs of one machine and one unfinished run, and the question asks itself. A table of pairs
 * would be a worksheet with a log drawn behind it.
 *
 * NO NUMERALS, EVER — and this bank makes that a live decision rather than a stylistic one. It carries a
 * `display` field that says `"numeral"` on 84 of its 120 items, and this file ignores it. Drawing "26"
 * would make a five-year-old's ability to read two digits the thing being measured. Every amount here is
 * a counted cluster laid out in fives, at ONE mark size chosen from the largest count anywhere in the
 * item, so no amount can win by being bigger. `marks.tsx` holds that reasoning and `fitCluster` enforces
 * it in a single call.
 *
 * SEEDS AND SHOOTS ARE DRAWN IN THE SAME UNIT BOX. Going in they are berries, coming out they are green
 * shoots, because that is what tells a child which side is which without arrows alone. Both are drawn to
 * the same shared radius, so changing role can never read as changing size — which matters, because the
 * child's whole job is comparing an in-amount to an out-amount.
 *
 * IT CANNOT KNOW THE ANSWER. `onPick` hands back the address from `address.ts` and nothing here compares
 * anything. The chosen bundle simply settles into the empty end of the new channel.
 */

/* ============================================================================
   layout
   ========================================================================== */

const DISH_W = 1.55;
const DISH_H = 1.05;
/** How far out the two ends of a channel sit from the stump's middle. */
const DISH_X = 2.55;
const ROW_PITCH = 1.25;
/** The new run, and where the examples stack up from. */
const NEW_Y = -1.15;
const FIRST_EXAMPLE_Y = 0.2;
/** Fixed offsets, lifted from `PodWall`/`TideLine`: a shelf derived from the apparatus's own geometry
 *  lands in the grass and half-buries the candidates. */
const SHELF = { y: -2.6, z: 2.3 } as const;
const OPT_PITCH = 2.2;

function numsOf(v: unknown): [number, number] | null {
  if (!Array.isArray(v) || v.length < 2) return null;
  const [a, b] = v;
  if (typeof a !== 'number' || typeof b !== 'number') return null;
  return [Math.max(0, Math.round(a)), Math.max(0, Math.round(b))];
}

/* ============================================================================
   the marks
   ========================================================================== */

/**
 * One shoot, inside the same unit box a berry occupies in `marks.tsx`.
 *
 * The box is the point. `MarkSolid` draws a berry as a unit sphere, so a shoot is built to the same
 * extent — a green spike about two units tall and one and a half wide, sitting on a seed case. If the
 * out-side marks were visibly larger than the in-side ones, an item whose rule is "one more than went
 * in" would read as "much more than went in", and the child would be comparing area instead of counting.
 */
function ShootSolid({ color }: { color: string }) {
  // Nearly matte, for the reason `shapes.tsx` gives about the carpet's marks: a strong clearcoat mirrors
  // the station's lamp and the mark nearest it renders white, which on a wall of green shoots would read
  // as a gap in the count.
  const mat = <meshPhysicalMaterial color={color} roughness={0.5} clearcoat={0.25} clearcoatRoughness={0.5} />;
  return (
    <group>
      <mesh position={[0, 0.34, 0]}>
        <coneGeometry args={[0.72, 1.5, 14]} />
        {mat}
      </mesh>
      <mesh position={[0, -0.6, 0]}>
        <sphereGeometry args={[0.44, 12, 9]} />
        {mat}
      </mesh>
    </group>
  );
}

/** `count` shoots, on the item's one shared layout and mark size — the same `fit` the berries use. */
function ShootCluster({ count, fit }: { count: number; fit: ClusterFit }) {
  const layout = useMemo(() => clusterLayout(count), [count]);
  return (
    <group>
      {layout.slots.map(([x, y], i) => (
        <group key={i} position={[x * fit.gap, y * fit.gap, 0]} scale={fit.radius}>
          <ShootSolid color={HUE.fern} />
        </group>
      ))}
    </group>
  );
}

/* ============================================================================
   the parts
   ========================================================================== */

/**
 * One end of a channel: a wide shallow dish, facing the child rather than facing up.
 *
 * WIDE AND FRONTAL for the reasons `TideLine` had to discover twice. The portions inside are laid out in
 * rows of five, and a five-wide row inscribed in a circle wastes most of the circle; and the game's
 * camera sits at about the apparatus's own height, so anything resting on a horizontal surface is a
 * smear. The rim is BEHIND and larger, the bed IN FRONT and smaller — the obvious way round hides the
 * bed completely, because a rounded slab is a solid, not a frame.
 *
 * `socket` is the hollow's one convention: the recessed place ringed in breathing honey light, the only
 * thing in the world that moves on its own. Under `prefers-reduced-motion` the breath resolves to its
 * MIDPOINT, so the rim still glows and the affordance survives.
 */
function Dish({
  at,
  socket = false,
  children,
}: {
  at: [number, number, number];
  socket?: boolean;
  children?: React.ReactNode;
}) {
  const rim = useSlab(DISH_W, DISH_H, 0.3, 0.13);
  const bed = useSlab(DISH_W - 0.2, DISH_H - 0.2, 0.24, 0.1);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const frame = useRef<THREE.Group>(null);
  const reduced = useReducedMotion();

  useFrame(({ clock }) => {
    if (!socket) return;
    const b = breath(clock.elapsedTime, 2.6, reduced);
    if (mat.current) mat.current.emissiveIntensity = 0.5 + b * 0.9;
    if (frame.current) {
      const s = 1 + b * 0.03;
      frame.current.scale.set(s, s, 1);
    }
  });

  return (
    <group position={at}>
      <mesh position={[0, -0.03, -0.36]}>
        <boxGeometry args={[DISH_W * 0.82, DISH_H * 0.78, 0.44]} />
        <meshStandardMaterial {...MAT.stoneDeep} />
      </mesh>
      {socket ? (
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
      ) : (
        <mesh geometry={rim} position={[0, 0, -0.12]}>
          <meshStandardMaterial {...MAT.stone} />
        </mesh>
      )}
      <mesh geometry={bed}>
        <meshStandardMaterial {...MAT.cut} />
      </mesh>
      {children}
    </group>
  );
}

/**
 * The way through the stump, and which way it runs. Two arrowheads, no words.
 *
 * IN FRONT OF THE STUMP'S FACE, not inside it. The first pass laid the groove at z = -0.16 and the
 * arrowheads at 0.06, both of which are BEHIND the front face of the body at 0.2 — so the channel was
 * geometrically inside solid wood and the only thing visible was a brown nub poking out either side. A
 * channel a child cannot see is a machine with no direction, and the whole read of "in this side, out that
 * side" rests on it.
 */
function Channel({ y, halfW }: { y: number; halfW: number }) {
  return (
    <group position={[0, y, 0]}>
      {/* Inside the stump's own width, and darker than its wood: a groove that overhangs the sides reads as
          a plank nailed across the front, which is the opposite of a way through. */}
      <mesh position={[0, 0, 0.22]}>
        <boxGeometry args={[halfW * 2 - 0.14, 0.46, 0.12]} />
        <meshStandardMaterial color={shade(HUE.bark, -0.18)} roughness={1} metalness={0} />
      </mesh>
      {[-halfW * 0.42, halfW * 0.42].map((x, i) => (
        <mesh key={i} position={[x, 0, 0.36]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.15, 0.3, 14]} />
          <meshStandardMaterial color={HUE.honey} roughness={0.6} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}

/* ============================================================================
   the sprouter
   ========================================================================== */

export function Sprouter({
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

  const pairs = useMemo(() => {
    const raw = Array.isArray(content.pairs) ? (content.pairs as unknown[]) : [];
    return raw.map(numsOf).filter((p): p is [number, number] => p !== null);
  }, [content]);

  const input = useMemo(() => {
    const v = content.input;
    return typeof v === 'number' ? Math.max(0, Math.round(v)) : 0;
  }, [content]);

  /**
   * Candidates.
   *
   * The address comes from `handedFor` rather than from a local expression, because it is the one line
   * in this file that can be wrong without anything failing: these options are lettered, so it resolves
   * to the letter, and `prove-drawn-types.ts` drives that same function against the live API.
   */
  const options = useMemo(() => {
    const raw = Array.isArray(content.options) ? (content.options as Record<string, unknown>[]) : [];
    return raw.map((o, i) => ({
      handed: handedFor(o, i),
      value: typeof o.value === 'number' ? Math.max(0, Math.round(o.value)) : 0,
    }));
  }, [content]);

  /**
   * ONE mark size for the whole item, taken from the biggest amount anywhere on screen.
   *
   * Every dish in this apparatus is the same size, so there is only one box to fit into and the largest
   * count decides the mark for all of them — the examples, the new seeds and every candidate. Marks that
   * changed size between the channels and the shelf would turn "which of these is the amount" into a
   * comparison of areas, and the bank runs to 77 on its hardest items, which is exactly where that would
   * bite hardest.
   */
  const fit: ClusterFit = useMemo(() => {
    const maxCount = Math.max(
      1,
      input,
      ...pairs.flat(),
      ...options.map((o) => o.value),
    );
    return fitCluster(maxCount, (DISH_W - 0.2) * 0.92, (DISH_H - 0.2) * 0.9, 0.3);
  }, [pairs, input, options]);

  const pickedValue = options.find((o) => o.handed === picked)?.value ?? null;

  /** Example rows stack UPWARD from just above the new run, so the new run is always in the same place. */
  const rowY = (i: number) => FIRST_EXAMPLE_Y + (pairs.length - 1 - i) * ROW_PITCH;
  const topY = pairs.length ? rowY(0) : NEW_Y;
  const bodyHalfW = 1.15;
  const bodyTop = topY + 0.66;
  const bodyBottom = NEW_Y - 0.66;
  const bodyH = bodyTop - bodyBottom;
  const bodyMid = (bodyTop + bodyBottom) / 2;

  return (
    <group>
      {/* The stump. One standing thing, mossy on top, rooted at the foot, cut through by one channel per
          run. Warm bark rather than the world's darkest value: the first pass used `barkDeep` for the face
          and the apparatus read as a black slab with trays stuck to it. */}
      <mesh position={[0, bodyMid, -0.5]}>
        <boxGeometry args={[bodyHalfW * 2, bodyH, 0.8]} />
        <meshStandardMaterial {...MAT.barkDeep} />
      </mesh>
      <mesh position={[0, bodyMid, -0.05]}>
        <boxGeometry args={[bodyHalfW * 2 - 0.18, bodyH - 0.14, 0.5]} />
        <meshStandardMaterial {...MAT.bark} />
      </mesh>
      {/* Growth rings down the face, so it is wood rather than a plank. */}
      {[-0.62, 0, 0.62].map((x, i) => (
        <mesh key={i} position={[x, bodyMid, 0.19]}>
          <boxGeometry args={[0.06, bodyH - 0.3, 0.04]} />
          <meshStandardMaterial color={shade(HUE.barkSoft, -0.12)} roughness={1} metalness={0} />
        </mesh>
      ))}
      <mesh position={[0, bodyTop + 0.14, -0.4]}>
        <boxGeometry args={[bodyHalfW * 2 + 0.34, 0.3, 1.0]} />
        <meshStandardMaterial {...MAT.moss} />
      </mesh>
      {/* A low mossy root mound, so the stump stands in the hollow rather than hangs in it. Flat and wide:
          the first pass was a deep sphere and it read as a hole in the ground under the machine. */}
      <mesh position={[0, bodyBottom - 0.04, -0.3]} scale={[1.5, 0.2, 0.5]}>
        <sphereGeometry args={[bodyHalfW + 0.3, 16, 12]} />
        <meshStandardMaterial {...MAT.mossDeep} />
      </mesh>
      <mesh position={[0, bodyBottom - 0.12, -0.5]}>
        <boxGeometry args={[bodyHalfW * 2 + 0.5, 0.2, 0.7]} />
        <meshStandardMaterial {...MAT.barkDeep} />
      </mesh>

      {/* Every run the sprouter has already done: seeds in one end, shoots out the other. */}
      {pairs.map(([inCount, outCount], i) => (
        <group key={`run-${i}`}>
          <Channel y={rowY(i)} halfW={bodyHalfW} />
          <Dish at={[-DISH_X, rowY(i), 0.3]}>
            <group position={[0, 0, 0.14]}>
              <Cluster count={inCount} shape="dot" color={INK.coral!} fit={fit} />
            </group>
          </Dish>
          <Dish at={[DISH_X, rowY(i), 0.3]}>
            <group position={[0, 0, 0.14]}>
              <ShootCluster count={outCount} fit={fit} />
            </group>
          </Dish>
        </group>
      ))}

      {/* A mossy sill between what it has done and what it is doing. Kept to the stump's own width, so it
          reads as a band around the wood rather than as a green bar laid across the dishes. */}
      {pairs.length ? (
        <mesh position={[0, (FIRST_EXAMPLE_Y + NEW_Y) / 2, 0.2]}>
          <boxGeometry args={[bodyHalfW * 2 - 0.14, 0.13, 0.1]} />
          <meshStandardMaterial {...MAT.mossDeep} />
        </mesh>
      ) : null}

      {/* And the run that is happening now. */}
      <Channel y={NEW_Y} halfW={bodyHalfW} />
      <Dish at={[-DISH_X, NEW_Y, 0.3]}>
        <group position={[0, 0, 0.14]}>
          <Cluster count={input} shape="dot" color={INK.coral!} fit={fit} />
        </group>
      </Dish>
      <Dish at={[DISH_X, NEW_Y, 0.3]} socket>
        {pickedValue !== null ? (
          <group position={[0, 0, 0.14]}>
            <ShootCluster count={pickedValue} fit={fit} />
          </group>
        ) : null}
      </Dish>

      {/* The shelf of bundles to choose from. */}
      <group position={[0, SHELF.y, SHELF.z]}>
        <mesh position={[0, -DISH_H / 2 - 0.34, -0.62]}>
          <boxGeometry args={[options.length * OPT_PITCH + 0.8, 0.28, 1.2]} />
          <meshStandardMaterial {...MAT.bark} />
        </mesh>
        {options.map((o, i) => {
          const x = (i - (options.length - 1) / 2) * OPT_PITCH;
          const taken = picked === o.handed;
          const live = !disabled && !picked;
          const lit = hover === o.handed && live;
          return (
            <group key={o.handed} position={[x, lit ? 0.18 : 0, 0]}>
              {/* Invisible, oversized hit volume: over two units on a side, because a small child
                  aiming a crosshair in three dimensions is imprecise and a missed tap reads as a
                  broken game. */}
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
                <boxGeometry args={[2.1, 2.1, 1.8]} />
              </mesh>
              {!taken ? (
                <group scale={lit ? 1.06 : 1}>
                  <Dish at={[0, 0, 0]}>
                    <group position={[0, 0, 0.14]}>
                      <ShootCluster count={o.value} fit={fit} />
                    </group>
                  </Dish>
                </group>
              ) : null}
              {/* A plinth, so a taken slot still reads as a slot. It is also the hover tell. */}
              <mesh position={[0, -DISH_H / 2 - 0.12, 0]}>
                <cylinderGeometry args={[0.36, 0.44, 0.14, 24]} />
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
