import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';

import { handedFor } from './address';
import { INK } from './marks';
import { HUE, MAT, breath, shade, useReducedMotion, useSlab } from './theme';

/**
 * `QUANT-BALANCE-01` as a thing in the hollow: the balance bough, a branch hung level from a limb with a
 * loaded pan on one side and an empty one on the other, and the swaps it goes by standing on the ledge
 * beneath it.
 *
 * WHAT WAS WRONG BEFORE THIS FILE. Numbered buttons, drawing none of the item's content — the same defect
 * the owner caught on the tide-line. `TideLine.tsx` and `PodWall.tsx` are the models.
 *
 * WHAT THE ITEM ACTUALLY IS. `shapes` is one to four shape names. `examples` are the exchange rates, each
 * `{left: [one shape], right: [two or three shapes]}` — every one of the 216 examples in the bank has
 * exactly one shape on the left. `target` is the load already in the left pan, two to six shapes.
 * `options` are four `{key, load}` of up to seven shapes. `attributes` is `["weight"]` on all 120 items.
 *
 * THE BEAM NEVER TILTS. This is the one hard rule in this file and it is a MEASUREMENT rule, not a
 * physical-plausibility one. A beam that dipped toward the heavier side would compute the comparison and
 * show it: hover an option, watch which way it goes, and the item is answered without a thought about
 * exchange rates. After a pick it would be worse — the beam would be marking the child's answer on screen,
 * which this client is not allowed to do and cannot do anyway, since correctness never reaches it. So
 * every beam here, big and small, is welded level in every state, before and after answering. Nothing in
 * this file computes a weight, and there is no code path that could.
 *
 * ALL SHAPES ARE DRAWN THE SAME SIZE. It is tempting to draw a heavy shape bigger; it would be a lie of a
 * particular kind. The exchange rates live in `examples`, so size would either contradict them or leak
 * them, and working out which shape is heavier in order to draw it bigger is precisely the reasoning the
 * item is asking the child for. Identity is carried by FORM and COLOUR — a cube, an orb, a cut diamond, a
 * triangle, each in a fixed colour that never changes between items — and by nothing else.
 *
 * ONE OBJECT SIZE FOR THE WHOLE ITEM, chosen from the tightest pan on screen, for the reason `marks.tsx`
 * gives: shapes that grew in a roomier pan would let a load win by looking bigger, and the child who
 * answered "that one is more" would be right about the picture and marked against the arithmetic.
 *
 * IT CANNOT KNOW THE ANSWER. `onPick` hands back the address from `address.ts` and nothing here compares
 * anything. The chosen load simply settles into the empty pan, which stays exactly level.
 */

/* ============================================================================
   layout
   ========================================================================== */

/** The big balance. `BEAM_Y` is where the beam is welded, and it never moves. */
const LIMB_Y = 2.95;
const BEAM_Y = 2.05;
const BEAM_HALF = 2.7;
const PAN_X = 2.25;
const PAN_Y = 0.85;
/** Wide enough for four weights across at a pitch a child can tell apart: the pan is what sets the ONE
 *  object size for the whole item, so a narrow pan makes every weight everywhere smaller. */
const PAN_W = 2.15;
/** Two rows deep with room to spare. A load of five needs a second row, and at a one-unit pan the row
 *  pitch — not the column pitch — became the binding constraint on the item's ONE object size, so every
 *  weight in every pan came out a quarter smaller than the pan's width would have allowed. */
const PAN_H = 1.24;
/** How far out a pan's two cords sit from its centre. Well inside the beam, deliberately: at half the pan's
 *  width they hung PAST the beam's ends and the pans read as tied to the sky. */
const CORD_X = 0.34;

/** The swaps, standing on a plank below. Laid out about their own centre so a swap is not lopsided. */
const EX_Y = -0.75;
const EX_PITCH = 3.0;
const MINI_L_X = -0.72;
const MINI_R_X = 0.82;
const MINI_L_W = 0.66;
const MINI_R_W = 1.45;
const MINI_PAN_H = 0.62;
const MINI_BEAM_HALF = 1.12;
const MINI_CORD_X = 0.16;

/** Fixed offsets, lifted from `PodWall`/`TideLine`, for the same reason those two give. */
const SHELF = { y: -2.5, z: 2.3 } as const;
const OPT_PITCH = 2.45;

/**
 * A shape's colour. Four names, four values, fixed for every item — so a cube is the same blue in the
 * swaps, in the target pan and on the shelf, and a child can follow one shape across all three without
 * being asked to remember anything.
 */
const SHAPE_HUE: Record<string, string> = {
  cube: INK.blue!,
  orb: INK.gold!,
  diamond: INK.violet!,
  triangle: INK.coral!,
};

function loadOf(v: unknown, field: string): string[] {
  if (!v || typeof v !== 'object') return [];
  const raw = (v as Record<string, unknown>)[field];
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is string => typeof s === 'string');
}

/* ============================================================================
   the shapes
   ========================================================================== */

/**
 * One weight, inside a unit box. Four distinct forms at ONE size, for the reason in the header.
 *
 * Facing the child: the triangle is a prism turned to +Z rather than a cone, because a cone seen from the
 * game's camera height is a circle with a bump and the `triangle` name then reads as `orb`.
 */
function WeightSolid({ shape }: { shape: string }) {
  const color = SHAPE_HUE[shape] ?? INK.teal!;
  // Nearly matte, for the reason `shapes.tsx` gives: a strong clearcoat mirrors the station's lamp, and a
  // weight rendered white is a weight whose SHAPE COLOUR — which is half of how it is identified — has
  // been erased by a highlight.
  const mat = (
    <meshPhysicalMaterial color={color} roughness={0.45} clearcoat={0.3} clearcoatRoughness={0.45} />
  );
  switch (shape) {
    case 'orb':
      return (
        <mesh>
          <sphereGeometry args={[0.5, 20, 15]} />
          {mat}
        </mesh>
      );
    case 'diamond':
      return (
        <mesh rotation={[0, Math.PI / 4, 0]}>
          <octahedronGeometry args={[0.58, 0]} />
          {mat}
        </mesh>
      );
    case 'triangle':
      return (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.58, 0.58, 0.42, 3]} />
          {mat}
        </mesh>
      );
    default:
      // `cube`, and the safe landing for a name the bank might grow: something is always drawn, so an
      // unknown weight is still a thing the child can count rather than a hole in the pan.
      return (
        <mesh rotation={[0, 0.3, 0]}>
          <boxGeometry args={[0.78, 0.78, 0.78]} />
          {mat}
        </mesh>
      );
  }
}

/** How many columns a load of `n` uses. Four across at most, so a pan stays shallow and frontal. */
function loadCols(n: number): number {
  return Math.max(1, Math.min(4, n));
}

/** Where each of `n` weights sits, in SLOT units, centred — partial rows centred so a pan looks packed. */
function loadSlots(n: number): readonly (readonly [number, number])[] {
  const cols = loadCols(n);
  const rows = Math.max(1, Math.ceil(n / cols));
  const out: [number, number][] = [];
  for (let i = 0; i < n; i += 1) {
    const r = Math.floor(i / cols);
    const inRow = Math.min(cols, n - r * cols);
    const c = i % cols;
    out.push([c - (inRow - 1) / 2, -(r - (rows - 1) / 2)]);
  }
  return out;
}

/** `load` drawn in a pan, at the item's one shared slot pitch. */
function Load({ load, pitch }: { load: readonly string[]; pitch: number }) {
  const slots = useMemo(() => loadSlots(load.length), [load.length]);
  return (
    <group>
      {load.map((shape, i) => {
        const s = slots[i] ?? ([0, 0] as const);
        return (
          <group key={i} position={[s[0] * pitch, s[1] * pitch, 0]} scale={pitch * 0.88}>
            <WeightSolid shape={shape} />
          </group>
        );
      })}
    </group>
  );
}

/* ============================================================================
   the pans
   ========================================================================== */

/**
 * A pan: a shallow woven basket on two cords, facing the child.
 *
 * `socket` is the hollow's one convention — the empty place ringed in breathing honey light, the only
 * thing in the world that moves on its own. Under `prefers-reduced-motion` the breath resolves to its
 * MIDPOINT, so the ring still glows and a child whose parent set that flag can still find the empty pan.
 */
function Pan({
  w,
  h,
  socket = false,
  cords = 0,
  cordX = CORD_X,
  at,
  children,
}: {
  w: number;
  h: number;
  socket?: boolean;
  cords?: number;
  cordX?: number;
  at: [number, number, number];
  children?: React.ReactNode;
}) {
  const rim = useSlab(w, h, 0.28, 0.15);
  const bed = useSlab(w - 0.2, h - 0.2, 0.22, 0.12);
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
      {/* The cords, drawn PERFECTLY VERTICAL and at a fixed length. See the header: a cord that
          stretched or a pan that hung lower would be the tilt this file exists to refuse. */}
      {cords > 0
        ? [-cordX, cordX].map((x, i) => (
            <mesh key={i} position={[x, cords / 2 + h / 2, -0.18]}>
              <boxGeometry args={[0.05, cords, 0.05]} />
              <meshStandardMaterial {...MAT.vine} />
            </mesh>
          ))
        : null}
      <mesh position={[0, -0.03, -0.3]}>
        <boxGeometry args={[w * 0.84, h * 0.76, 0.36]} />
        <meshStandardMaterial {...MAT.stoneDeep} />
      </mesh>
      {socket ? (
        <group ref={frame}>
          <mesh geometry={rim} position={[0, 0, -0.13]}>
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
        <mesh geometry={rim} position={[0, 0, -0.11]}>
          <meshStandardMaterial color={shade(HUE.barkSoft, 0.16)} roughness={0.95} metalness={0} />
        </mesh>
      )}
      {/* The bed is lifted off the world's `cut` value: four saturated weights on near-black read as a
          hole with beads in it, and a pan is supposed to look like a basket. */}
      <mesh geometry={bed}>
        <meshStandardMaterial color={shade(HUE.stoneDeep, -0.2)} roughness={0.95} metalness={0} />
      </mesh>
      {children}
    </group>
  );
}

/** A beam. Always horizontal, in every state, for the reason at the top of this file. */
function Beam({ half, at }: { half: number; at: [number, number, number] }) {
  return (
    <group position={at}>
      <mesh>
        <boxGeometry args={[half * 2, 0.2, 0.28]} />
        <meshStandardMaterial {...MAT.bark} />
      </mesh>
      {[-half, half].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <sphereGeometry args={[0.13, 12, 9]} />
          <meshStandardMaterial {...MAT.barkDeep} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * One swap, as a small balance of exactly the same silhouette as the big one.
 *
 * Drawn as a balance rather than as an equals sign on purpose: a child who has not met "=" reads a level
 * beam immediately, and it teaches the big apparatus above it at the same time.
 */
function Swap({
  left,
  right,
  pitch,
  at,
}: {
  left: readonly string[];
  right: readonly string[];
  pitch: number;
  at: [number, number, number];
}) {
  return (
    <group position={at}>
      {/* Post and foot: these stand on the plank rather than hang, so they cannot be mistaken for the
          question. The post is at the swap's own centre and the beam reaches past both pans' cords. */}
      <mesh position={[0, -0.62, -0.3]}>
        <boxGeometry args={[0.16, 1.5, 0.16]} />
        <meshStandardMaterial {...MAT.barkDeep} />
      </mesh>
      <Beam half={MINI_BEAM_HALF} at={[0, 0.16, -0.1]} />
      <Pan w={MINI_L_W} h={MINI_PAN_H} cords={0.35} cordX={MINI_CORD_X} at={[MINI_L_X, -0.42, 0]}>
        <group position={[0, 0, 0.14]}>
          <Load load={left} pitch={pitch} />
        </group>
      </Pan>
      <Pan w={MINI_R_W} h={MINI_PAN_H} cords={0.35} cordX={MINI_CORD_X} at={[MINI_R_X, -0.42, 0]}>
        <group position={[0, 0, 0.14]}>
          <Load load={right} pitch={pitch} />
        </group>
      </Pan>
    </group>
  );
}

/* ============================================================================
   the balance bough
   ========================================================================== */

export function BalanceBough({
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

  const target = useMemo(() => {
    const raw = content.target;
    return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string') : [];
  }, [content]);

  const examples = useMemo(() => {
    const raw = Array.isArray(content.examples) ? (content.examples as unknown[]) : [];
    return raw
      .map((e) => ({ left: loadOf(e, 'left'), right: loadOf(e, 'right') }))
      .filter((e) => e.left.length > 0 || e.right.length > 0);
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
    return raw.map((o, i) => ({
      handed: handedFor(o, i),
      load: loadOf(o, 'load'),
    }));
  }, [content]);

  /**
   * ONE slot pitch — and therefore one object size — for every pan in the item, from the TIGHTEST pan.
   *
   * The tightest is whichever of these needs most room: a big pan holding the longest load (up to seven,
   * four across), or a swap's right-hand pan holding up to three in a single row. Sizing each pan to its
   * own contents would make a five-cube load's cubes smaller than a two-cube load's, so the child could
   * read "more" as "bigger", which is the confound `marks.tsx` was written to stop.
   */
  const pitch = useMemo(() => {
    const maxBig = Math.max(1, target.length, ...options.map((o) => o.load.length));
    const bigCols = loadCols(maxBig);
    const bigRows = Math.max(1, Math.ceil(maxBig / bigCols));
    const maxRight = Math.max(1, ...examples.map((e) => e.right.length));
    const maxLeft = Math.max(1, ...examples.map((e) => e.left.length));
    const candidates = [
      (PAN_W - 0.24) / bigCols,
      (PAN_H - 0.24) / bigRows,
      (MINI_R_W - 0.2) / loadCols(maxRight),
      MINI_PAN_H - 0.2,
      (MINI_L_W - 0.2) / loadCols(maxLeft),
    ];
    return Math.min(0.55, ...candidates);
  }, [target, options, examples]);

  const pickedLoad = options.find((o) => o.handed === picked)?.load ?? null;
  const exSpan = Math.max(1, examples.length) * EX_PITCH;

  return (
    <group>
      {/* The bough hangs lower when there are no swaps beneath it to hold the bottom of the picture — 18
          of the bank's items have none, all of them K-1, and at the shared height those read as a small
          balance stranded above a wide empty gap. */}
      <group position={[0, examples.length ? 0 : -0.95, 0]}>
        {/* The limb the bough hangs from, and the trunk it comes off. */}
        <mesh position={[0, LIMB_Y, -0.7]}>
          <boxGeometry args={[BEAM_HALF * 2 + 1.6, 0.34, 0.5]} />
          <meshStandardMaterial {...MAT.barkDeep} />
        </mesh>
        <mesh position={[0, LIMB_Y + 0.26, -0.7]}>
          <boxGeometry args={[BEAM_HALF * 2 + 1.6, 0.2, 0.62]} />
          <meshStandardMaterial {...MAT.moss} />
        </mesh>
        {/* One cord, dead centre, dead vertical. */}
        <mesh position={[0, (LIMB_Y + BEAM_Y) / 2, -0.4]}>
          <boxGeometry args={[0.07, LIMB_Y - BEAM_Y, 0.07]} />
          <meshStandardMaterial {...MAT.vine} />
        </mesh>

        {/* THE BEAM. Level, always. */}
        <Beam half={BEAM_HALF} at={[0, BEAM_Y, -0.2]} />

        {/* What is already in the pan. */}
        <Pan w={PAN_W} h={PAN_H} cords={BEAM_Y - PAN_Y - PAN_H / 2} at={[-PAN_X, PAN_Y, 0]}>
          <group position={[0, 0, 0.14]}>
            <Load load={target} pitch={pitch} />
          </group>
        </Pan>

        {/* And the pan that is still empty. */}
        <Pan w={PAN_W} h={PAN_H} socket cords={BEAM_Y - PAN_Y - PAN_H / 2} at={[PAN_X, PAN_Y, 0]}>
          {pickedLoad ? (
            <group position={[0, 0, 0.14]}>
              <Load load={pickedLoad} pitch={pitch} />
            </group>
          ) : null}
        </Pan>
      </group>

      {/* The swaps this hollow goes by, on a plank underneath. */}
      {examples.length ? (
        <mesh position={[0, EX_Y - 1.22, -0.42]}>
          <boxGeometry args={[exSpan + 0.6, 0.24, 1.0]} />
          <meshStandardMaterial {...MAT.bark} />
        </mesh>
      ) : null}
      {examples.map((e, i) => (
        <Swap
          key={i}
          left={e.left}
          right={e.right}
          pitch={pitch}
          at={[(i - (examples.length - 1) / 2) * EX_PITCH, EX_Y, 0]}
        />
      ))}

      {/* The shelf of loads to choose from. */}
      <group position={[0, SHELF.y, SHELF.z]}>
        <mesh position={[0, -PAN_H / 2 - 0.36, -0.62]}>
          <boxGeometry args={[options.length * OPT_PITCH + 0.8, 0.3, 1.2]} />
          <meshStandardMaterial {...MAT.bark} />
        </mesh>
        {options.map((o, i) => {
          const x = (i - (options.length - 1) / 2) * OPT_PITCH;
          const taken = picked === o.handed;
          const live = !disabled && !picked;
          const lit = hover === o.handed && live;
          return (
            <group key={o.handed} position={[x, lit ? 0.18 : 0, 0]}>
              {/* Invisible, oversized hit volume: over two units on a side, because a small child aiming
                  a crosshair in three dimensions is imprecise and a missed tap reads as a broken game. */}
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
                <boxGeometry args={[2.2, 2.1, 1.8]} />
              </mesh>
              {!taken ? (
                <group scale={lit ? 1.06 : 1}>
                  <Pan w={PAN_W} h={PAN_H} at={[0, 0, 0]}>
                    <group position={[0, 0, 0.14]}>
                      <Load load={o.load} pitch={pitch} />
                    </group>
                  </Pan>
                </group>
              ) : null}
              {/* A plinth, so a taken slot still reads as a slot. It is also the hover tell. */}
              <mesh position={[0, -PAN_H / 2 - 0.2, 0]}>
                <cylinderGeometry args={[0.44, 0.52, 0.14, 24]} />
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
