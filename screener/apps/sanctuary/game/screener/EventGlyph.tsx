import type { JSX } from 'react';

import type { GlyphName, GlyphState } from './eventMeaning';

/**
 * THE PICTURES. One drawing per name in `eventMeaning.ts`, built from spheres, boxes, cones and rings.
 *
 * WHY PRIMITIVES AND NOT ART. Eighty-five pictures is more than anybody is going to model by hand
 * before this game ships, and a missing picture is worse than a rough one: it silently turns an event
 * into a blank slab and makes the item unanswerable. Primitives mean all eighty-five exist, all
 * eighty-five light and cast shadow like everything else in the hollow, and none of them can fail to
 * load. They are drawn in the local XY plane facing +Z, inside roughly a one-unit box centred on the
 * origin, so a caller can scale one to any slab.
 *
 * THE STATE AXIS IS NOT DECORATION. `eventMeaning.ts` explains at length why a cup must be able to be
 * empty, full and half-drunk: these stories are one object passing through moments, so the state IS
 * the item's content. Everything below that takes a `state` implements it as a REAL difference in the
 * drawing — a fill level, a slice removed, mud on a dog — rather than as a badge a child would have
 * to be taught to read. Glyphs that ignore a state fall back to their plain self, which is safe
 * because `DayLog` also colours each event's slab by its position, so two events can never become
 * literally indistinguishable even when their pictures agree.
 *
 * BG IS PASSED IN FOR SUBTRACTION. A crescent moon is a disc with a bite taken out of it, and the
 * bite has to be painted in whatever the slab behind it is. Hence `bg`.
 */

/* ============================================================================
   the small palette everything is drawn from
   ========================================================================== */

/**
 * Warm all the way through. Nothing here is grey and nothing here is near-black: the darkest value is a
 * bark brown, which is the hollow's own rule about shadows applied to line work.
 *
 * THE THREE STONE VALUES ARE SPREAD ON PURPOSE, and it is a legibility fix rather than taste. These
 * pictures are drawn against `DayLog`'s slab face, which is the hollow's mid stone. The first version's
 * `stone` and `taupe` sat within a few percent of that face, so a gear, a cloud and a rock came out
 * near-invisible — technically drawn, practically absent. `stone` is now clearly LIGHTER than the face
 * and `stoneDeep` and `taupe` clearly DARKER, so each of them has somewhere it can be seen.
 */
const C = {
  ink: '#6b5340',
  pale: '#fdf6e8',
  white: '#fffaf0',
  stone: '#e0d4bd',
  stoneDeep: '#8b7960',
  wood: '#a9784f',
  woodDeep: '#8a5a3b',
  soil: '#9a7350',
  leaf: '#6faa54',
  leafDeep: '#4e8a44',
  water: '#5aa7c4',
  waterDeep: '#3d7f9c',
  sun: '#f2c14e',
  gold: '#efb445',
  ember: '#ef7a4f',
  red: '#e05a4c',
  coral: '#f0796a',
  pink: '#f3a7ae',
  violet: '#a074d6',
  blue: '#4f8ee0',
  green: '#67b061',
  skin: '#e8b98f',
  taupe: '#9e8b76',
  milk: '#fbf3e2',
} as const;

type V3 = [number, number, number];

/* ============================================================================
   primitives, named short because they appear several hundred times below
   ========================================================================== */

const MAT = { roughness: 0.62, metalness: 0 };

/** A ball. */
function Ball({ at, r, c, sy = 1, sx = 1 }: { at: V3; r: number; c: string; sy?: number; sx?: number }) {
  return (
    <mesh position={at} scale={[sx, sy, 1]}>
      <sphereGeometry args={[r, 16, 12]} />
      <meshStandardMaterial color={c} {...MAT} />
    </mesh>
  );
}

/** A bar: the workhorse. Thin in z, rotated about z, so it draws strokes and slabs alike. */
function Bar({
  at,
  w,
  h,
  c,
  rot = 0,
  d = 0.15,
}: {
  at: V3;
  w: number;
  h: number;
  c: string;
  rot?: number;
  d?: number;
}) {
  return (
    <mesh position={at} rotation={[0, 0, rot]}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={c} {...MAT} />
    </mesh>
  );
}

/** A disc facing the child. */
function Disc({ at, r, c, d = 0.14, seg = 20 }: { at: V3; r: number; c: string; d?: number; seg?: number }) {
  return (
    <mesh position={at} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[r, r, d, seg]} />
      <meshStandardMaterial color={c} {...MAT} />
    </mesh>
  );
}

/** A ring facing the child. */
function Ring({ at, r, t, c }: { at: V3; r: number; t: number; c: string }) {
  return (
    <mesh position={at}>
      <torusGeometry args={[r, t, 8, 24]} />
      <meshStandardMaterial color={c} {...MAT} />
    </mesh>
  );
}

/** A part-ring: arcs, waves, handles, sound. `span` in radians, `from` where it starts. */
function Arc({
  at,
  r,
  t,
  c,
  span = Math.PI,
  from = 0,
}: {
  at: V3;
  r: number;
  t: number;
  c: string;
  span?: number;
  from?: number;
}) {
  return (
    <mesh position={at} rotation={[0, 0, from]}>
      <torusGeometry args={[r, t, 8, 20, span]} />
      <meshStandardMaterial color={c} {...MAT} />
    </mesh>
  );
}

/**
 * A cone, point up unless rotated.
 *
 * `ry` spins it about the vertical, which only matters for the low-segment ones: a four-sided pyramid
 * has to be turned an eighth so a FLAT face points at the child. Rolling it about z instead — which is
 * what the first version did — tips the whole roof over and a house reads as a red flag.
 */
function Wedge({
  at,
  r,
  h,
  c,
  rot = 0,
  ry = 0,
  seg = 16,
}: {
  at: V3;
  r: number;
  h: number;
  c: string;
  rot?: number;
  ry?: number;
  seg?: number;
}) {
  return (
    <mesh position={at} rotation={[0, ry, rot]}>
      <coneGeometry args={[r, h, seg]} />
      <meshStandardMaterial color={c} {...MAT} />
    </mesh>
  );
}

/** A tapered tube: cups, pots, trunks, plumes. */
function Tube({
  at,
  rt,
  rb,
  h,
  c,
  rot = 0,
  open = false,
}: {
  at: V3;
  rt: number;
  rb: number;
  h: number;
  c: string;
  rot?: number;
  open?: boolean;
}) {
  return (
    <mesh position={at} rotation={[0, 0, rot]}>
      <cylinderGeometry args={[rt, rb, h, 18, 1, open]} />
      <meshStandardMaterial color={c} {...MAT} side={open ? 2 : 0} />
    </mesh>
  );
}

/** A rounded limb. */
function Limb({ at, r, len, c, rot = 0 }: { at: V3; r: number; len: number; c: string; rot?: number }) {
  return (
    <mesh position={at} rotation={[0, 0, rot]}>
      <capsuleGeometry args={[r, len, 6, 12]} />
      <meshStandardMaterial color={c} {...MAT} />
    </mesh>
  );
}

/** A lump of something: rock, mud, ash. Faceted so it does not read as a berry. */
function Lump({ at, r, c }: { at: V3; r: number; c: string }) {
  return (
    <mesh position={at} rotation={[0.4, 0.7, 0.2]}>
      <dodecahedronGeometry args={[r, 0]} />
      <meshStandardMaterial color={c} roughness={0.85} metalness={0} />
    </mesh>
  );
}

/** A little four-point sparkle, for clean things and for sparks. */
function Twinkle({ at, r, c }: { at: V3; r: number; c: string }) {
  return (
    <group position={at}>
      <Bar at={[0, 0, 0]} w={r * 2} h={r * 0.42} c={c} d={0.1} />
      <Bar at={[0, 0, 0]} w={r * 0.42} h={r * 2} c={c} d={0.1} />
    </group>
  );
}

/** A simple person: head, body, two legs. Used for every crowd in the bank. */
function Figure({ at, s = 1, c = C.violet, skin = C.skin }: { at: V3; s?: number; c?: string; skin?: string }) {
  return (
    <group position={at} scale={s}>
      <Ball at={[0, 0.26, 0]} r={0.12} c={skin} />
      <Limb at={[0, -0.02, 0]} r={0.1} len={0.16} c={c} />
      <Bar at={[-0.06, -0.26, 0]} w={0.06} h={0.18} c={c} d={0.12} />
      <Bar at={[0.06, -0.26, 0]} w={0.06} h={0.18} c={c} d={0.12} />
    </group>
  );
}

/** An eye, for things that are watched or awake. */
function Eye({ at, r = 0.1 }: { at: V3; r?: number }) {
  return (
    <group position={at}>
      <Ball at={[0, 0, 0]} r={r} c={C.white} sy={0.68} />
      <Ball at={[0, 0, r * 0.6]} r={r * 0.44} c={C.ink} />
    </group>
  );
}

/** A downward-tapering stream of liquid, for pouring and for taps. */
function Pour({ at, h, c = C.milk }: { at: V3; h: number; c?: string }) {
  return (
    <group position={at}>
      <Bar at={[0, 0, 0]} w={0.07} h={h} c={c} d={0.1} />
      <Ball at={[0, -h / 2 - 0.03, 0]} r={0.05} c={c} />
    </group>
  );
}

/** Three ticks trailing behind a thing that has just started to move. */
function Motion({ at, c = C.taupe }: { at: V3; c?: string }) {
  return (
    <group position={at}>
      <Bar at={[0, 0.1, 0]} w={0.2} h={0.05} c={c} d={0.08} />
      <Bar at={[-0.05, 0, 0]} w={0.26} h={0.05} c={c} d={0.08} />
      <Bar at={[0, -0.1, 0]} w={0.2} h={0.05} c={c} d={0.08} />
    </group>
  );
}

/* ============================================================================
   the eighty-five pictures
   ========================================================================== */

interface GlyphProps {
  state: GlyphState;
  /** What is behind the glyph, for the few shapes made by taking a bite out of another. */
  bg: string;
}

type Glyph = (p: GlyphProps) => JSX.Element;

/** A cloud, reused by half the weather. */
function CloudBody({ y = 0.12, c = C.white }: { y?: number; c?: string }) {
  return (
    <group>
      <Ball at={[-0.2, y, 0]} r={0.19} c={c} />
      <Ball at={[0.04, y + 0.07, 0]} r={0.24} c={c} />
      <Ball at={[0.26, y, 0]} r={0.17} c={c} />
      <Bar at={[0.02, y - 0.12, 0]} w={0.6} h={0.16} c={c} d={0.28} />
    </group>
  );
}

/** How much liquid sits in a container, by state. Returns a 0..1 fill. */
function fillOf(state: GlyphState): number {
  switch (state) {
    case 'empty':
      return 0;
    case 'partial':
      return 0.38;
    case 'full':
    case 'big':
      return 0.9;
    case 'start':
      return 0.5;
    default:
      return 0.62;
  }
}

const GLYPHS: Record<GlyphName, Glyph> = {
  /* -- sky and weather ----------------------------------------------------- */
  sun: () => (
    <group>
      <Disc at={[0, 0, 0]} r={0.28} c={C.sun} />
      {Array.from({ length: 8 }, (_, i) => (
        <Bar key={i} at={[Math.cos((i / 8) * Math.PI * 2) * 0.42, Math.sin((i / 8) * Math.PI * 2) * 0.42, 0]} w={0.18} h={0.07} c={C.gold} rot={(i / 8) * Math.PI * 2} />
      ))}
    </group>
  ),
  moon: ({ bg }) => (
    <group>
      <Disc at={[0, 0, 0]} r={0.34} c={C.pale} />
      {/* The bite that makes it a crescent, painted in the slab's own colour. */}
      <Disc at={[0.2, 0.06, 0.03]} r={0.29} c={bg} />
      <Twinkle at={[-0.36, 0.3, 0]} r={0.09} c={C.pale} />
    </group>
  ),
  cloud: () => <CloudBody c={C.white} />,
  rain: () => (
    <group>
      <CloudBody y={0.22} />
      {[-0.18, 0.02, 0.22].map((x, i) => (
        <Limb key={i} at={[x, -0.22 - (i % 2) * 0.08, 0]} r={0.045} len={0.14} c={C.water} />
      ))}
    </group>
  ),
  lightning: () => (
    <group>
      <CloudBody y={0.26} c={C.stoneDeep} />
      <Bar at={[0.02, -0.05, 0.06]} w={0.1} h={0.26} c={C.gold} rot={0.42} />
      <Bar at={[-0.06, -0.28, 0.06]} w={0.1} h={0.24} c={C.gold} rot={-0.42} />
    </group>
  ),
  snow: () => (
    <group>
      <CloudBody y={0.24} />
      {[-0.2, 0.04, 0.24].map((x, i) => (
        <Twinkle key={i} at={[x, -0.22 - (i % 2) * 0.1, 0]} r={0.1} c={C.pale} />
      ))}
    </group>
  ),
  umbrella: () => (
    <group>
      <Tube at={[0, 0.12, 0]} rt={0.02} rb={0.44} h={0.34} c={C.red} open />
      <Bar at={[0, -0.2, 0]} w={0.06} h={0.42} c={C.wood} />
      <Arc at={[-0.1, -0.4, 0]} r={0.1} t={0.035} c={C.wood} span={Math.PI} from={Math.PI} />
    </group>
  ),
  wind: () => (
    <group>
      {[0.18, -0.02, -0.22].map((y, i) => (
        <Arc key={i} at={[i * 0.06 - 0.06, y, 0]} r={0.22 - i * 0.03} t={0.05} c={C.stoneDeep} span={2.2} from={-1.1} />
      ))}
    </group>
  ),

  /* -- water --------------------------------------------------------------- */
  puddle: () => (
    <group>
      <mesh position={[0, -0.14, 0]} scale={[1.5, 0.42, 1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 0.12, 22]} />
        <meshStandardMaterial color={C.water} roughness={0.3} metalness={0} />
      </mesh>
      <Limb at={[-0.1, 0.26, 0]} r={0.05} len={0.12} c={C.waterDeep} />
      <Limb at={[0.16, 0.36, 0]} r={0.04} len={0.08} c={C.waterDeep} />
    </group>
  ),
  cup: ({ state }) => {
    const f = fillOf(state);
    const tilt = state === 'partial' ? 0.5 : 0;
    return (
      <group rotation={[0, 0, tilt]}>
        <Tube at={[0, -0.04, 0]} rt={0.28} rb={0.2} h={0.46} c={C.pale} open />
        <Ring at={[0, 0.19, 0]} r={0.28} t={0.035} c={C.stone} />
        {f > 0 ? <Tube at={[0, -0.24 + (0.42 * f) / 2, 0]} rt={0.2 + 0.08 * f} rb={0.2} h={0.42 * f} c={C.milk} /> : null}
        <Arc at={[0.36, -0.04, 0]} r={0.11} t={0.035} c={C.stone} span={Math.PI} from={-Math.PI / 2} />
        {state === 'start' ? <Pour at={[0, 0.46, 0]} h={0.3} /> : null}
      </group>
    );
  },
  jar: ({ state }) => {
    const f = fillOf(state);
    return (
      <group>
        <Tube at={[0, -0.04, 0]} rt={0.26} rb={0.26} h={0.5} c={C.pale} open />
        <Ring at={[0, 0.21, 0]} r={0.27} t={0.04} c={C.stone} />
        {f > 0 ? <Tube at={[0, -0.27 + (0.46 * f) / 2, 0]} rt={0.24} rb={0.24} h={0.46 * f} c={C.water} /> : null}
      </group>
    );
  },
  tub: ({ state }) => {
    const f = fillOf(state);
    return (
      <group>
        <Tube at={[0, -0.1, 0]} rt={0.44} rb={0.34} h={0.36} c={C.white} open />
        <Ring at={[0, 0.07, 0]} r={0.44} t={0.04} c={C.stone} />
        {f > 0 ? <Tube at={[0, -0.26 + (0.3 * f) / 2, 0]} rt={0.36 + 0.07 * f} rb={0.34} h={0.3 * f} c={C.water} /> : null}
        {[-0.28, -0.06, 0.2].map((x, i) => (
          <Bar key={i} at={[x, -0.4, 0]} w={0.07} h={0.12} c={C.stone} />
        ))}
        {state === 'start' ? <Pour at={[0.1, 0.34, 0]} h={0.28} c={C.water} /> : null}
        {state === 'full' ? <Ball at={[0.02, 0.16, 0.16]} r={0.12} c={C.gold} /> : null}
        {state === 'empty' ? <Arc at={[0, -0.24, 0.1]} r={0.12} t={0.035} c={C.water} span={4.4} /> : null}
      </group>
    );
  },
  steam: ({ state }) => (
    <group>
      <Tube at={[0, -0.28, 0]} rt={0.3} rb={0.24} h={0.24} c={C.stoneDeep} />
      <Ring at={[0, -0.15, 0]} r={0.3} t={0.035} c={C.stone} />
      {state === 'start' ? <Wedge at={[0, -0.48, 0]} r={0.14} h={0.18} c={C.ember} rot={Math.PI} /> : null}
      {[0, 1, 2].map((i) => (
        <Arc key={i} at={[(i - 1) * 0.16, 0.02 + i * 0.12, 0]} r={0.11} t={0.04} c={C.pale} span={3.4} from={i} />
      ))}
    </group>
  ),
  wave: () => (
    <group>
      <Arc at={[-0.2, 0.02, 0]} r={0.22} t={0.06} c={C.water} span={2.6} from={0.3} />
      <Arc at={[0.24, -0.02, 0]} r={0.2} t={0.06} c={C.waterDeep} span={2.6} from={0.3} />
      <Bar at={[0, -0.3, 0]} w={0.86} h={0.08} c={C.water} />
    </group>
  ),
  river: ({ state }) => (
    <group>
      <Arc at={[-0.18, 0.2, 0]} r={0.24} t={state === 'big' ? 0.09 : 0.06} c={C.water} span={2.4} from={-1.2} />
      <Arc at={[0.16, -0.16, 0]} r={0.24} t={state === 'big' ? 0.11 : 0.07} c={C.water} span={2.4} from={1.9} />
      <Ball at={[-0.34, 0.42, 0]} r={0.07} c={C.waterDeep} />
    </group>
  ),

  /* -- fire ---------------------------------------------------------------- */
  spark: () => (
    <group>
      <Twinkle at={[0, 0.04, 0]} r={0.3} c={C.gold} />
      <Ball at={[0, 0.04, 0.08]} r={0.09} c={C.sun} />
      <Ball at={[-0.3, -0.24, 0]} r={0.05} c={C.ember} />
      <Ball at={[0.28, -0.3, 0]} r={0.04} c={C.ember} />
    </group>
  ),
  fire: ({ state }) => {
    const s = state === 'big' ? 1.12 : 1;
    return (
      <group scale={s}>
        <Wedge at={[0, -0.02, 0]} r={0.3} h={0.66} c={C.ember} />
        <Wedge at={[0, -0.1, 0.12]} r={0.17} h={0.4} c={C.sun} />
        <Bar at={[0, -0.4, 0]} w={0.6} h={0.1} c={C.woodDeep} rot={0.14} />
      </group>
    );
  },
  candle: () => (
    <group>
      <Tube at={[0, -0.2, 0]} rt={0.13} rb={0.15} h={0.5} c={C.milk} />
      <Bar at={[0, 0.09, 0]} w={0.03} h={0.1} c={C.ink} />
      <Wedge at={[0, 0.26, 0]} r={0.1} h={0.26} c={C.gold} />
    </group>
  ),
  smoke: () => (
    <group>
      <Ball at={[-0.12, -0.28, 0]} r={0.13} c={C.taupe} />
      <Ball at={[0.04, -0.04, 0]} r={0.17} c={C.taupe} />
      <Ball at={[-0.06, 0.24, 0]} r={0.21} c={C.stone} />
      <Ball at={[0.18, 0.44, 0]} r={0.14} c={C.stone} />
    </group>
  ),
  douse: () => (
    <group>
      <Wedge at={[0, -0.2, 0]} r={0.22} h={0.4} c={C.taupe} />
      <Arc at={[0, 0.1, 0.06]} r={0.3} t={0.055} c={C.water} span={Math.PI} />
      {[-0.2, 0, 0.2].map((x, i) => (
        <Limb key={i} at={[x, 0.02 - (i % 2) * 0.08, 0.1]} r={0.045} len={0.1} c={C.water} />
      ))}
    </group>
  ),
  volcano: ({ state }) => (
    <group>
      <Tube at={[0, -0.24, 0]} rt={0.2} rb={0.5} h={0.44} c={C.stoneDeep} />
      {state === 'big' ? (
        <group>
          <Wedge at={[0, 0.16, 0]} r={0.2} h={0.3} c={C.ember} />
          <Ball at={[-0.24, 0.4, 0]} r={0.11} c={C.taupe} />
          <Ball at={[0.06, 0.5, 0]} r={0.15} c={C.taupe} />
          <Ball at={[0.28, 0.36, 0]} r={0.1} c={C.ember} />
        </group>
      ) : (
        <group>
          <Arc at={[-0.1, 0.16, 0]} r={0.09} t={0.035} c={C.taupe} span={3} />
          <Arc at={[0.12, 0.26, 0]} r={0.08} t={0.032} c={C.taupe} span={3} from={1} />
        </group>
      )}
    </group>
  ),

  /* -- growing things ------------------------------------------------------ */
  seed: () => (
    <group>
      <Ball at={[0, -0.02, 0]} r={0.22} c={C.woodDeep} sy={1.34} sx={0.86} />
      <Bar at={[0.02, 0.28, 0]} w={0.05} h={0.14} c={C.leafDeep} rot={0.3} />
    </group>
  ),
  sprout: ({ state }) => (
    <group scale={state === 'small' ? 0.8 : 1}>
      <Bar at={[0, -0.28, 0]} w={0.6} h={0.12} c={C.soil} />
      <Bar at={[0, 0.02, 0]} w={0.06} h={0.42} c={C.leafDeep} />
      <Ball at={[-0.19, 0.14, 0]} r={0.15} c={C.leaf} sy={0.6} />
      <Ball at={[0.19, 0.24, 0]} r={0.14} c={C.leaf} sy={0.6} />
    </group>
  ),
  flower: () => (
    <group>
      {Array.from({ length: 5 }, (_, i) => (
        <Ball key={i} at={[Math.cos((i / 5) * Math.PI * 2) * 0.2, 0.18 + Math.sin((i / 5) * Math.PI * 2) * 0.2, 0]} r={0.13} c={C.pink} />
      ))}
      <Ball at={[0, 0.18, 0.1]} r={0.1} c={C.gold} />
      <Bar at={[0, -0.24, 0]} w={0.06} h={0.44} c={C.leafDeep} />
      <Ball at={[0.16, -0.24, 0]} r={0.11} c={C.leaf} sy={0.5} />
    </group>
  ),
  tree: () => (
    <group>
      <Bar at={[0, -0.3, 0]} w={0.12} h={0.4} c={C.woodDeep} />
      <Ball at={[0, 0.16, 0]} r={0.3} c={C.leafDeep} />
      <Ball at={[-0.22, 0.02, 0]} r={0.19} c={C.leaf} />
      <Ball at={[0.22, 0.04, 0]} r={0.2} c={C.leaf} />
    </group>
  ),
  grain: ({ state }) => (
    <group>
      {[-0.22, 0, 0.22].map((x, i) => (
        <group key={i}>
          <Bar at={[x, -0.22, 0]} w={0.05} h={0.44} c={C.leafDeep} rot={x * 0.2} />
          {state === 'partial' ? null : (
            <group>
              <Ball at={[x - 0.06, 0.14 + i * 0.02, 0]} r={0.07} c={C.gold} />
              <Ball at={[x + 0.06, 0.22 + i * 0.02, 0]} r={0.07} c={C.gold} />
              <Ball at={[x, 0.32 + i * 0.02, 0]} r={0.07} c={C.gold} />
            </group>
          )}
        </group>
      ))}
      {state === 'partial' ? <Disc at={[0, 0.22, 0]} r={0.26} c={C.milk} /> : null}
      {state === 'full' ? <Bar at={[0, -0.44, 0]} w={0.7} h={0.1} c={C.wood} /> : null}
    </group>
  ),
  wither: () => (
    <group>
      <Bar at={[0, -0.28, 0]} w={0.6} h={0.12} c={C.soil} />
      <Arc at={[0, 0.04, 0]} r={0.24} t={0.05} c={C.stoneDeep} span={1.8} from={0.6} />
      <Ball at={[0.24, -0.16, 0]} r={0.12} c={C.wood} sy={0.5} />
      <Ball at={[-0.24, -0.14, 0]} r={0.1} c={C.wood} sy={0.5} />
    </group>
  ),
  field: ({ state }) => (
    <group>
      {[-0.22, 0, 0.22].map((y, i) => (
        <Bar key={i} at={[0, y - 0.16, 0]} w={0.78} h={0.1} c={i % 2 ? C.soil : C.woodDeep} />
      ))}
      {state === 'start' ? <Ball at={[0, 0.3, 0]} r={0.11} c={C.woodDeep} sy={1.3} /> : null}
      {state === 'partial'
        ? [-0.22, 0.02, 0.24].map((x, i) => <Limb key={i} at={[x, 0.3 - (i % 2) * 0.08, 0]} r={0.045} len={0.1} c={C.water} />)
        : null}
      {state === 'plain' ? <Ball at={[0, 0.34, 0]} r={0.16} c={C.leaf} sy={0.7} /> : null}
    </group>
  ),

  /* -- creatures ----------------------------------------------------------- */
  egg: () => <Ball at={[0, 0, 0]} r={0.3} c={C.milk} sy={1.3} sx={0.94} />,
  eggCrack: () => (
    <group>
      <Ball at={[0, 0, 0]} r={0.3} c={C.milk} sy={1.3} sx={0.94} />
      <Bar at={[-0.1, 0.06, 0.24]} w={0.16} h={0.05} c={C.stoneDeep} rot={0.6} />
      <Bar at={[0.02, -0.02, 0.24]} w={0.16} h={0.05} c={C.stoneDeep} rot={-0.6} />
      <Bar at={[0.14, 0.06, 0.24]} w={0.16} h={0.05} c={C.stoneDeep} rot={0.6} />
    </group>
  ),
  chick: ({ state }) => (
    <group scale={state === 'big' ? 1.16 : state === 'small' ? 0.76 : 1}>
      <Ball at={[0, -0.12, 0]} r={0.26} c={C.gold} />
      <Ball at={[0.02, 0.2, 0]} r={0.18} c={C.sun} />
      <Wedge at={[0.22, 0.18, 0]} r={0.07} h={0.14} c={C.ember} rot={-Math.PI / 2} />
      <Eye at={[0.08, 0.26, 0.16]} r={0.055} />
      <Bar at={[-0.06, -0.4, 0]} w={0.05} h={0.12} c={C.ember} />
      <Bar at={[0.08, -0.4, 0]} w={0.05} h={0.12} c={C.ember} />
    </group>
  ),
  bird: () => (
    <group>
      <Ball at={[-0.04, -0.04, 0]} r={0.24} c={C.blue} sx={1.2} />
      <Ball at={[0.2, 0.14, 0]} r={0.15} c={C.blue} />
      <Wedge at={[0.38, 0.12, 0]} r={0.06} h={0.14} c={C.gold} rot={-Math.PI / 2} />
      <Ball at={[-0.1, 0.02, 0.14]} r={0.14} c={C.pale} sy={0.6} />
      <Eye at={[0.25, 0.18, 0.12]} r={0.05} />
      <Arc at={[-0.3, -0.1, 0]} r={0.14} t={0.045} c={C.waterDeep} span={2} from={2} />
    </group>
  ),
  caterpillar: () => (
    <group>
      {[-0.3, -0.1, 0.1, 0.3].map((x, i) => (
        <Ball key={i} at={[x, -0.04 + (i % 2) * 0.06, 0]} r={0.15} c={i % 2 ? C.leaf : C.leafDeep} />
      ))}
      <Eye at={[0.36, 0.06, 0.12]} r={0.05} />
      <Bar at={[0.3, 0.2, 0]} w={0.04} h={0.12} c={C.leafDeep} rot={0.3} />
    </group>
  ),
  cocoon: () => (
    <group>
      <Ball at={[0, -0.06, 0]} r={0.28} c={C.taupe} sy={1.4} sx={0.8} />
      {[-0.2, 0, 0.2].map((y, i) => (
        <Bar key={i} at={[0, y - 0.06, 0.18]} w={0.4} h={0.05} c={C.stone} />
      ))}
      <Bar at={[0, 0.34, 0]} w={0.05} h={0.16} c={C.woodDeep} />
    </group>
  ),
  butterfly: () => (
    <group>
      <Ball at={[-0.22, 0.14, 0]} r={0.19} c={C.violet} sx={1.1} />
      <Ball at={[0.22, 0.14, 0]} r={0.19} c={C.violet} sx={1.1} />
      <Ball at={[-0.18, -0.16, 0]} r={0.14} c={C.pink} />
      <Ball at={[0.18, -0.16, 0]} r={0.14} c={C.pink} />
      <Limb at={[0, 0, 0.1]} r={0.05} len={0.34} c={C.ink} />
      <Bar at={[-0.08, 0.36, 0]} w={0.04} h={0.14} c={C.ink} rot={0.4} />
      <Bar at={[0.08, 0.36, 0]} w={0.04} h={0.14} c={C.ink} rot={-0.4} />
    </group>
  ),
  dog: ({ state }) => (
    <group>
      <Limb at={[-0.08, -0.1, 0]} r={0.18} len={0.3} c={C.wood} rot={Math.PI / 2} />
      <Ball at={[0.26, 0.1, 0]} r={0.19} c={C.wood} />
      <Wedge at={[0.2, 0.3, 0]} r={0.08} h={0.16} c={C.woodDeep} rot={0.3} />
      <Ball at={[0.42, 0.02, 0]} r={0.09} c={C.woodDeep} />
      <Eye at={[0.32, 0.14, 0.14]} r={0.05} />
      <Arc at={[-0.34, 0.06, 0]} r={0.12} t={0.05} c={C.wood} span={2.2} from={0.4} />
      {[-0.22, 0.04].map((x, i) => (
        <Bar key={i} at={[x, -0.36, 0]} w={0.07} h={0.18} c={C.wood} />
      ))}
      {state === 'dirty' ? (
        <group>
          <Lump at={[-0.1, 0.06, 0.16]} r={0.07} c={C.soil} />
          <Lump at={[0.12, -0.14, 0.16]} r={0.06} c={C.soil} />
          <Lump at={[-0.26, -0.16, 0.16]} r={0.05} c={C.soil} />
        </group>
      ) : null}
      {state === 'clean' ? (
        <group>
          <Twinkle at={[-0.34, 0.34, 0.1]} r={0.11} c={C.pale} />
          <Twinkle at={[0.34, 0.36, 0.1]} r={0.09} c={C.pale} />
        </group>
      ) : null}
      {state === 'partial' ? (
        <group>
          <Ball at={[-0.16, 0.24, 0.14]} r={0.12} c={C.white} />
          <Ball at={[0.06, 0.32, 0.14]} r={0.1} c={C.white} />
          <Ball at={[0.24, 0.4, 0.14]} r={0.08} c={C.white} />
        </group>
      ) : null}
      {state === 'start' ? (
        <group>
          <Arc at={[0.52, 0.12, 0]} r={0.1} t={0.035} c={C.gold} span={2} from={-1} />
          <Arc at={[0.56, 0.12, 0]} r={0.18} t={0.035} c={C.gold} span={2} from={-1} />
        </group>
      ) : null}
    </group>
  ),
  hive: () => (
    <group>
      {[0.22, 0.02, -0.2].map((y, i) => (
        <Disc key={i} at={[0, y, 0]} r={0.2 + i * 0.08} c={i % 2 ? C.gold : C.sun} d={0.18} />
      ))}
      <Disc at={[0, -0.2, 0.12]} r={0.07} c={C.woodDeep} d={0.08} />
      <Ball at={[0.34, 0.34, 0]} r={0.06} c={C.ink} />
    </group>
  ),
  dragon: () => (
    <group>
      <Limb at={[-0.1, -0.06, 0]} r={0.17} len={0.3} c={C.leafDeep} rot={Math.PI / 2} />
      <Ball at={[0.26, 0.1, 0]} r={0.17} c={C.leafDeep} />
      <Wedge at={[0.16, 0.3, 0]} r={0.07} h={0.16} c={C.leaf} />
      <Eye at={[0.32, 0.14, 0.13]} r={0.045} />
      <Wedge at={[0.5, 0.04, 0]} r={0.1} h={0.22} c={C.ember} rot={-Math.PI / 2} />
      <Ball at={[-0.12, 0.24, 0]} r={0.18} c={C.leaf} sy={0.6} />
      <Arc at={[-0.4, 0.04, 0]} r={0.14} t={0.05} c={C.leafDeep} span={2.4} from={0.6} />
    </group>
  ),

  /* -- a person's day ------------------------------------------------------ */
  wake: () => (
    <group>
      <Disc at={[0, -0.02, 0]} r={0.27} c={C.sun} />
      {/* The sun comes up BEHIND a wooden sill rather than behind a patch of slab-coloured paint. Two
          earlier versions painted the lower half out in the slab's own colour, and both times the patch
          read as a raised block, because a lit box in front of a lit slab picks up its own shading no
          matter how well the colour is matched. A real object in front of it has nothing to hide. */}
      <Bar at={[0, -0.3, 0.06]} w={0.86} h={0.3} c={C.wood} />
      <Bar at={[0, -0.13, 0.1]} w={0.92} h={0.08} c={C.woodDeep} />
      {[0.42, 0.85, Math.PI / 2, 2.29, 2.72].map((a, i) => (
        <Bar
          key={i}
          at={[Math.cos(a) * 0.42, -0.02 + Math.sin(a) * 0.42, 0]}
          w={0.16}
          h={0.065}
          c={C.gold}
          rot={a}
        />
      ))}
    </group>
  ),
  bed: () => (
    <group>
      <Bar at={[0, -0.12, 0]} w={0.8} h={0.16} c={C.pale} />
      <Bar at={[0, -0.3, 0]} w={0.72} h={0.12} c={C.wood} />
      <Ball at={[-0.24, 0.04, 0]} r={0.15} c={C.white} sy={0.7} />
      <Bar at={[-0.42, -0.06, 0]} w={0.08} h={0.32} c={C.woodDeep} />
      <Arc at={[0.16, 0.06, 0]} r={0.12} t={0.04} c={C.taupe} span={3} from={0.4} />
      <Arc at={[0.34, 0.24, 0]} r={0.09} t={0.035} c={C.taupe} span={3} from={0.4} />
    </group>
  ),
  shirt: () => (
    <group>
      <Bar at={[0, -0.02, 0]} w={0.44} h={0.5} c={C.blue} />
      <Bar at={[-0.34, 0.14, 0]} w={0.28} h={0.16} c={C.blue} rot={-0.3} />
      <Bar at={[0.34, 0.14, 0]} w={0.28} h={0.16} c={C.blue} rot={0.3} />
      <Bar at={[0, 0.26, 0.1]} w={0.16} h={0.1} c={C.pale} />
    </group>
  ),
  shoe: () => (
    <group>
      <Limb at={[0.04, -0.18, 0]} r={0.14} len={0.34} c={C.woodDeep} rot={Math.PI / 2} />
      <Bar at={[-0.16, 0.02, 0]} w={0.24} h={0.28} c={C.wood} />
      <Bar at={[-0.16, 0.14, 0.12]} w={0.28} h={0.06} c={C.pale} rot={0.4} />
      <Bar at={[-0.16, 0.14, 0.12]} w={0.28} h={0.06} c={C.pale} rot={-0.4} />
    </group>
  ),
  tooth: () => (
    <group>
      <Ball at={[-0.14, 0.06, 0]} r={0.2} c={C.white} sx={1.05} />
      <Bar at={[-0.24, -0.18, 0]} w={0.1} h={0.18} c={C.white} rot={0.14} />
      <Bar at={[-0.04, -0.18, 0]} w={0.1} h={0.18} c={C.white} rot={-0.14} />
      <Bar at={[0.28, -0.06, 0]} w={0.1} h={0.5} c={C.blue} rot={-0.3} />
      <Bar at={[0.38, 0.22, 0]} w={0.18} h={0.12} c={C.pale} rot={-0.3} />
    </group>
  ),
  bowl: ({ state }) => {
    const f = fillOf(state);
    return (
      <group>
        <Tube at={[0, -0.16, 0]} rt={0.42} rb={0.26} h={0.3} c={C.pale} open />
        <Ring at={[0, 0.0, 0]} r={0.42} t={0.04} c={C.stone} />
        {f > 0.5 ? (
          <group>
            <Ball at={[-0.14, 0.02, 0]} r={0.13} c={C.ember} />
            <Ball at={[0.12, 0.04, 0]} r={0.12} c={C.leaf} />
            <Ball at={[0, 0.14, 0]} r={0.1} c={C.gold} />
          </group>
        ) : f > 0 ? (
          <Ball at={[-0.06, -0.02, 0]} r={0.11} c={C.ember} />
        ) : null}
        {state === 'partial' ? <Bar at={[0.34, 0.18, 0]} w={0.07} h={0.4} c={C.wood} rot={-0.34} /> : null}
      </group>
    );
  },
  bread: ({ state }) => (
    <group scale={state === 'big' ? 1.14 : 1}>
      <Limb at={[state === 'partial' ? -0.08 : 0, -0.04, 0]} r={0.22} len={0.36} c={C.wood} rot={Math.PI / 2} />
      {[-0.12, 0.04, 0.2].map((x, i) => (
        <Bar key={i} at={[x, 0.12, 0.16]} w={0.06} h={0.16} c={C.woodDeep} rot={0.5} />
      ))}
      {state === 'partial' ? <Bar at={[0.42, -0.04, 0]} w={0.1} h={0.4} c={C.milk} /> : null}
      {state === 'start' ? (
        <group>
          <Bar at={[0, 0.42, -0.1]} w={0.9} h={0.08} c={C.stoneDeep} />
          <Bar at={[-0.46, 0.02, -0.1]} w={0.08} h={0.72} c={C.stoneDeep} />
          <Bar at={[0.46, 0.02, -0.1]} w={0.08} h={0.72} c={C.stoneDeep} />
          <Wedge at={[-0.3, 0.3, 0]} r={0.07} h={0.14} c={C.ember} />
          <Wedge at={[0.3, 0.3, 0]} r={0.07} h={0.14} c={C.ember} />
        </group>
      ) : null}
    </group>
  ),
  cake: ({ state }) => (
    <group>
      <Tube at={[0, -0.2, 0]} rt={0.36} rb={0.34} h={0.24} c={C.wood} />
      <Disc at={[0, -0.04, 0]} r={0.36} c={C.pink} d={0.2} />
      {state === 'partial' ? (
        <Wedge at={[0.3, -0.12, 0.16]} r={0.13} h={0.24} c={C.milk} rot={Math.PI} />
      ) : (
        <group>
          <Bar at={[0, 0.16, 0]} w={0.05} h={0.2} c={C.pale} />
          <Wedge at={[0, 0.34, 0]} r={0.07} h={0.16} c={C.gold} />
        </group>
      )}
      {state === 'start' ? (
        <group>
          <Bar at={[0, 0.46, -0.1]} w={0.94} h={0.08} c={C.stoneDeep} />
          <Bar at={[-0.48, 0.06, -0.1]} w={0.08} h={0.72} c={C.stoneDeep} />
          <Bar at={[0.48, 0.06, -0.1]} w={0.08} h={0.72} c={C.stoneDeep} />
        </group>
      ) : null}
    </group>
  ),
  scrape: () => (
    <group>
      <Ball at={[0, 0.04, 0]} r={0.3} c={C.skin} />
      {[-0.1, 0.04, 0.18].map((x, i) => (
        <Bar key={i} at={[x, 0.0 - (i % 2) * 0.08, 0.24]} w={0.05} h={0.2} c={C.red} rot={0.4} />
      ))}
      <Bar at={[0, -0.36, 0]} w={0.3} h={0.12} c={C.skin} />
    </group>
  ),
  bandage: () => (
    <group>
      <Ball at={[0, 0.04, 0]} r={0.3} c={C.skin} />
      <Bar at={[0, 0.02, 0.24]} w={0.56} h={0.18} c={C.pale} rot={-0.5} />
      <Bar at={[0, 0.02, 0.3]} w={0.16} h={0.16} c={C.milk} rot={-0.5} />
      <Bar at={[0, -0.36, 0]} w={0.3} h={0.12} c={C.skin} />
    </group>
  ),

  /* -- making and knowing -------------------------------------------------- */
  book: ({ state }) => {
    if (state === 'closed') {
      return (
        <group>
          <Bar at={[0, 0, 0]} w={0.56} h={0.7} c={C.red} d={0.2} />
          <Bar at={[0.24, 0, 0.02]} w={0.08} h={0.66} c={C.milk} d={0.22} />
          <Bar at={[-0.16, 0, 0.11]} w={0.16} h={0.5} c={C.gold} d={0.04} />
        </group>
      );
    }
    return (
      <group>
        <Bar at={[-0.24, -0.02, 0]} w={0.44} h={0.56} c={C.milk} rot={0.16} />
        <Bar at={[0.24, -0.02, 0]} w={0.44} h={0.56} c={C.milk} rot={-0.16} />
        <Bar at={[0, -0.06, 0.06]} w={0.08} h={0.6} c={C.red} />
        {[0.08, -0.04, -0.16].map((y, i) => (
          <Bar key={i} at={[-0.24, y, 0.1]} w={0.28} h={0.04} c={C.taupe} rot={0.16} />
        ))}
        {state === 'plain' ? <Eye at={[0.02, 0.42, 0]} r={0.11} /> : null}
      </group>
    );
  },
  quill: () => (
    <group>
      <Bar at={[0.06, 0.06, 0]} w={0.07} h={0.68} c={C.milk} rot={-0.34} />
      <Ball at={[0.16, 0.2, 0]} r={0.19} c={C.pale} sx={0.6} sy={1.3} />
      <Wedge at={[-0.14, -0.28, 0]} r={0.06} h={0.14} c={C.ink} rot={Math.PI + 0.34} />
      <Ball at={[-0.3, -0.42, 0]} r={0.07} c={C.violet} />
    </group>
  ),
  brush: ({ state }) => (
    <group>
      <Bar at={[0.18, 0.14, 0]} w={0.09} h={0.5} c={C.wood} rot={-0.4} />
      <Wedge at={[0.02, -0.16, 0]} r={0.09} h={0.2} c={C.ink} rot={Math.PI + 0.4} />
      {state === 'full' ? (
        <Disc at={[-0.24, -0.16, 0]} r={0.22} c={C.violet} />
      ) : (
        <Ring at={[-0.24, -0.16, 0]} r={0.2} t={0.035} c={C.taupe} />
      )}
    </group>
  ),
  picture: ({ state }) => (
    <group>
      <Bar at={[0, 0, -0.04]} w={0.7} h={0.58} c={C.milk} d={0.12} />
      <Bar at={[0, 0.3, 0]} w={0.78} h={0.08} c={C.wood} />
      <Bar at={[0, -0.3, 0]} w={0.78} h={0.08} c={C.wood} />
      <Bar at={[-0.35, 0, 0]} w={0.08} h={0.68} c={C.wood} />
      <Bar at={[0.35, 0, 0]} w={0.08} h={0.68} c={C.wood} />
      <Ball at={[-0.14, -0.08, 0.06]} r={0.12} c={C.leaf} />
      <Wedge at={[0.12, 0.0, 0.06]} r={0.13} h={0.22} c={C.blue} />
      {state === 'up' ? <Arc at={[0, 0.44, 0]} r={0.1} t={0.03} c={C.taupe} span={Math.PI} /> : null}
    </group>
  ),
  idea: () => (
    <group>
      <Ball at={[0, 0.06, 0]} r={0.22} c={C.sun} />
      <Bar at={[0, -0.22, 0]} w={0.16} h={0.14} c={C.stone} />
      {[0.4, 1.2, Math.PI / 2, 1.94, 2.74].map((a, i) => (
        <Bar key={i} at={[Math.cos(a) * 0.42, 0.06 + Math.sin(a) * 0.42, 0]} w={0.16} h={0.06} c={C.gold} rot={a} />
      ))}
    </group>
  ),
  flask: () => (
    <group>
      <Wedge at={[0, -0.14, 0]} r={0.32} h={0.46} c={C.pale} rot={Math.PI} />
      <Bar at={[0, 0.22, 0]} w={0.14} h={0.3} c={C.pale} />
      <Ring at={[0, 0.36, 0]} r={0.1} t={0.03} c={C.stone} />
      <Wedge at={[0, -0.2, 0.04]} r={0.24} h={0.28} c={C.leaf} rot={Math.PI} />
      <Ball at={[-0.06, 0.06, 0.1]} r={0.05} c={C.pale} />
      <Ball at={[0.07, 0.18, 0.1]} r={0.04} c={C.pale} />
    </group>
  ),
  gear: () => (
    <group>
      <Disc at={[0, 0, 0]} r={0.3} c={C.stoneDeep} />
      {Array.from({ length: 6 }, (_, i) => (
        <Bar
          key={i}
          at={[Math.cos((i / 6) * Math.PI * 2) * 0.36, Math.sin((i / 6) * Math.PI * 2) * 0.36, 0]}
          w={0.16}
          h={0.16}
          c={C.woodDeep}
          rot={(i / 6) * Math.PI * 2}
        />
      ))}
      <Disc at={[0, 0, 0.1]} r={0.1} c={C.pale} />
    </group>
  ),
  lens: () => (
    <group>
      <Disc at={[0.06, 0.12, -0.04]} r={0.24} c={C.water} d={0.1} />
      <Ring at={[0.06, 0.12, 0]} r={0.26} t={0.05} c={C.stoneDeep} />
      <Bar at={[-0.22, -0.24, 0]} w={0.1} h={0.34} c={C.wood} rot={0.72} />
    </group>
  ),
  note: () => (
    <group>
      <Ball at={[-0.1, -0.2, 0]} r={0.17} c={C.violet} sx={1.2} sy={0.9} />
      <Bar at={[0.08, 0.06, 0]} w={0.07} h={0.62} c={C.violet} />
      <Bar at={[0.24, 0.32, 0]} w={0.3} h={0.1} c={C.violet} rot={-0.3} />
    </group>
  ),
  star: () => (
    <group>
      <Twinkle at={[0, 0, 0]} r={0.42} c={C.gold} />
      <Disc at={[0, 0, 0.04]} r={0.15} c={C.sun} />
      {Array.from({ length: 4 }, (_, i) => (
        <Bar key={i} at={[0, 0, 0]} w={0.5} h={0.1} c={C.gold} rot={Math.PI / 4 + (i * Math.PI) / 2} />
      ))}
    </group>
  ),

  /* -- going places, and things that happen -------------------------------- */
  kite: ({ state }) => {
    const y = state === 'down' ? -0.22 : 0.16;
    return (
      <group>
        <Bar at={[0, y, 0]} w={0.34} h={0.34} c={C.coral} rot={Math.PI / 4} />
        <Bar at={[0, y, 0.1]} w={0.44} h={0.04} c={C.pale} rot={Math.PI / 4} />
        <Bar at={[0, y, 0.1]} w={0.04} h={0.44} c={C.pale} rot={Math.PI / 4} />
        {state === 'down' ? (
          <Arc at={[0.1, -0.42, 0]} r={0.16} t={0.025} c={C.taupe} span={2.6} from={0.4} />
        ) : (
          <Bar at={[0.02, -0.24, 0]} w={0.04} h={0.5} c={C.taupe} rot={0.1} />
        )}
        {[0, 1, 2].map((i) => (
          <Ball key={i} at={[0.14 + i * 0.06, y - 0.3 - i * 0.12, 0]} r={0.05} c={C.gold} />
        ))}
      </group>
    );
  },
  bike: () => (
    <group>
      <Ring at={[-0.26, -0.14, 0]} r={0.2} t={0.04} c={C.ink} />
      <Ring at={[0.26, -0.14, 0]} r={0.2} t={0.04} c={C.ink} />
      <Bar at={[0, -0.1, 0]} w={0.5} h={0.06} c={C.red} rot={0.1} />
      <Bar at={[-0.1, 0.06, 0]} w={0.06} h={0.34} c={C.red} rot={0.34} />
      <Bar at={[0.22, 0.14, 0]} w={0.24} h={0.06} c={C.ink} />
    </group>
  ),
  car: () => (
    <group>
      <Bar at={[0, -0.06, 0]} w={0.74} h={0.24} c={C.blue} />
      <Bar at={[0.02, 0.16, 0]} w={0.44} h={0.22} c={C.blue} />
      <Bar at={[0.02, 0.16, 0.1]} w={0.34} h={0.14} c={C.pale} />
      <Ring at={[-0.24, -0.24, 0]} r={0.12} t={0.05} c={C.ink} />
      <Ring at={[0.24, -0.24, 0]} r={0.12} t={0.05} c={C.ink} />
    </group>
  ),
  runner: () => (
    <group>
      <Ball at={[0.08, 0.34, 0]} r={0.13} c={C.skin} />
      <Limb at={[-0.02, 0.06, 0]} r={0.11} len={0.2} c={C.coral} rot={0.34} />
      <Bar at={[0.22, 0.14, 0]} w={0.26} h={0.07} c={C.skin} rot={0.5} />
      <Bar at={[-0.24, 0.06, 0]} w={0.24} h={0.07} c={C.skin} rot={-0.4} />
      <Bar at={[0.14, -0.24, 0]} w={0.08} h={0.3} c={C.blue} rot={-0.5} />
      <Bar at={[-0.16, -0.24, 0]} w={0.08} h={0.3} c={C.blue} rot={0.4} />
    </group>
  ),
  footprints: () => (
    <group>
      {[0, 1, 2, 3].map((i) => (
        <Ball
          key={i}
          at={[-0.3 + i * 0.2, -0.24 + (i % 2) * 0.2 + i * 0.06, 0]}
          r={0.1}
          c={C.woodDeep}
          sy={1.4}
          sx={0.8}
        />
      ))}
    </group>
  ),
  peak: () => (
    <group>
      <Wedge at={[0, -0.16, 0]} r={0.42} h={0.62} c={C.stoneDeep} seg={4} ry={Math.PI / 4} />
      <Wedge at={[0, 0.06, 0.1]} r={0.16} h={0.24} c={C.pale} seg={4} ry={Math.PI / 4} />
      <Bar at={[0.1, 0.34, 0]} w={0.04} h={0.24} c={C.wood} />
      <Bar at={[0.2, 0.4, 0]} w={0.18} h={0.12} c={C.coral} />
    </group>
  ),
  map: () => (
    <group>
      <Bar at={[0, 0, 0]} w={0.76} h={0.56} c={C.milk} d={0.1} />
      <Bar at={[-0.12, 0, 0.06]} w={0.03} h={0.56} c={C.taupe} />
      <Bar at={[0.18, 0, 0.06]} w={0.03} h={0.56} c={C.taupe} />
      {[0, 1, 2, 3].map((i) => (
        <Ball key={i} at={[-0.26 + i * 0.18, -0.16 + (i % 2) * 0.18, 0.08]} r={0.045} c={C.red} />
      ))}
      <Twinkle at={[0.26, 0.18, 0.08]} r={0.09} c={C.red} />
    </group>
  ),
  bag: () => (
    <group>
      <Bar at={[0, -0.1, 0]} w={0.56} h={0.5} c={C.wood} />
      <Bar at={[0, 0.1, 0.1]} w={0.56} h={0.12} c={C.woodDeep} />
      <Arc at={[0, 0.18, 0]} r={0.18} t={0.045} c={C.woodDeep} span={Math.PI} />
    </group>
  ),
  school: () => (
    <group>
      <Bar at={[0, -0.12, 0]} w={0.68} h={0.44} c={C.milk} />
      <Wedge at={[0, 0.22, 0]} r={0.46} h={0.28} c={C.red} seg={4} ry={Math.PI / 4} />
      <Bar at={[0, -0.2, 0.1]} w={0.16} h={0.28} c={C.woodDeep} />
      <Bar at={[-0.2, -0.02, 0.1]} w={0.12} h={0.12} c={C.water} />
      <Bar at={[0.2, -0.02, 0.1]} w={0.12} h={0.12} c={C.water} />
    </group>
  ),
  castle: () => (
    <group>
      <Bar at={[0, -0.14, 0]} w={0.7} h={0.4} c={C.stone} />
      {[-0.3, 0.3].map((x, i) => (
        <group key={i}>
          <Bar at={[x, 0.06, 0]} w={0.2} h={0.5} c={C.stoneDeep} />
          <Bar at={[x - 0.06, 0.34, 0]} w={0.07} h={0.12} c={C.stoneDeep} />
          <Bar at={[x + 0.06, 0.34, 0]} w={0.07} h={0.12} c={C.stoneDeep} />
        </group>
      ))}
      <Arc at={[0, -0.2, 0.1]} r={0.13} t={0.06} c={C.woodDeep} span={Math.PI} />
      <Bar at={[0, -0.3, 0.1]} w={0.26} h={0.16} c={C.woodDeep} />
    </group>
  ),
  ball: () => (
    <group>
      <Ball at={[0, 0, 0]} r={0.32} c={C.coral} />
      <Arc at={[0, 0, 0.26]} r={0.22} t={0.04} c={C.pale} span={Math.PI} from={-Math.PI / 2} />
      <Arc at={[0, 0, 0.26]} r={0.22} t={0.04} c={C.pale} span={Math.PI} from={Math.PI / 2} />
    </group>
  ),
  trophy: () => (
    <group>
      <Tube at={[0, 0.12, 0]} rt={0.28} rb={0.16} h={0.34} c={C.gold} />
      <Arc at={[-0.3, 0.16, 0]} r={0.1} t={0.035} c={C.gold} span={Math.PI} from={Math.PI / 2} />
      <Arc at={[0.3, 0.16, 0]} r={0.1} t={0.035} c={C.gold} span={Math.PI} from={-Math.PI / 2} />
      <Bar at={[0, -0.14, 0]} w={0.1} h={0.2} c={C.gold} />
      <Bar at={[0, -0.28, 0]} w={0.4} h={0.12} c={C.woodDeep} />
    </group>
  ),
  coin: () => (
    <group>
      <Disc at={[0, 0, 0]} r={0.3} c={C.gold} d={0.16} />
      <Ring at={[0, 0, 0.09]} r={0.19} t={0.035} c={C.sun} />
      <Disc at={[0.22, -0.2, -0.06]} r={0.22} c={C.sun} d={0.14} />
    </group>
  ),
  bell: () => (
    <group>
      <Tube at={[0, 0.02, 0]} rt={0.1} rb={0.32} h={0.44} c={C.gold} />
      <Bar at={[0, -0.24, 0]} w={0.4} h={0.08} c={C.sun} />
      <Ball at={[0, -0.34, 0]} r={0.08} c={C.woodDeep} />
      <Arc at={[-0.42, 0.06, 0]} r={0.12} t={0.035} c={C.taupe} span={2} from={2.1} />
      <Arc at={[0.42, 0.06, 0]} r={0.12} t={0.035} c={C.taupe} span={2} from={-1.1} />
    </group>
  ),
  lightRed: () => (
    <group>
      <Bar at={[0, 0, -0.04]} w={0.36} h={0.8} c={C.stoneDeep} />
      <Disc at={[0, 0.24, 0.08]} r={0.12} c={C.red} />
      <Disc at={[0, 0, 0.08]} r={0.12} c={C.taupe} />
      <Disc at={[0, -0.24, 0.08]} r={0.12} c={C.taupe} />
    </group>
  ),
  lightGreen: () => (
    <group>
      <Bar at={[0, 0, -0.04]} w={0.36} h={0.8} c={C.stoneDeep} />
      <Disc at={[0, 0.24, 0.08]} r={0.12} c={C.taupe} />
      <Disc at={[0, 0, 0.08]} r={0.12} c={C.taupe} />
      <Disc at={[0, -0.24, 0.08]} r={0.12} c={C.green} />
    </group>
  ),
  crack: () => (
    <group>
      <Bar at={[0, 0, 0]} w={0.72} h={0.56} c={C.stone} d={0.2} />
      <Bar at={[-0.1, 0.16, 0.13]} w={0.06} h={0.24} c={C.woodDeep} rot={0.5} />
      <Bar at={[0.02, -0.04, 0.13]} w={0.06} h={0.24} c={C.woodDeep} rot={-0.5} />
      <Bar at={[0.14, -0.22, 0.13]} w={0.06} h={0.2} c={C.woodDeep} rot={0.5} />
    </group>
  ),
  rock: ({ state }) => (
    <group>
      <Lump at={[-0.02, -0.06, 0]} r={0.3} c={C.stoneDeep} />
      <Lump at={[0.28, -0.22, 0]} r={0.16} c={C.stone} />
      {state === 'start' ? <Motion at={[-0.42, 0.24, 0]} /> : null}
    </group>
  ),
  melt: () => (
    <group>
      <Wedge at={[0, -0.24, 0]} r={0.18} h={0.42} c={C.wood} rot={Math.PI} />
      <Ball at={[-0.04, 0.1, 0]} r={0.22} c={C.pink} />
      <Ball at={[0.16, 0.2, 0]} r={0.16} c={C.milk} />
      <Limb at={[0.28, -0.06, 0]} r={0.05} len={0.14} c={C.pink} />
      <Ball at={[0.34, -0.32, 0]} r={0.07} c={C.pink} sy={0.6} />
    </group>
  ),
  cloth: () => (
    <group>
      <Bar at={[0, -0.04, 0]} w={0.6} h={0.5} c={C.water} rot={0.12} />
      <Arc at={[-0.1, 0.02, 0.12]} r={0.13} t={0.035} c={C.pale} span={3} />
      <Ball at={[0.26, 0.32, 0]} r={0.1} c={C.white} />
      <Ball at={[-0.3, 0.34, 0]} r={0.07} c={C.white} />
    </group>
  ),
  switchOff: () => (
    <group>
      <Limb at={[0, 0, 0]} r={0.19} len={0.36} c={C.taupe} rot={Math.PI / 2} />
      <Ball at={[-0.18, 0, 0.12]} r={0.15} c={C.pale} />
    </group>
  ),
  switchOn: () => (
    <group>
      <Limb at={[0, 0, 0]} r={0.19} len={0.36} c={C.gold} rot={Math.PI / 2} />
      <Ball at={[0.18, 0, 0.12]} r={0.15} c={C.milk} />
      <Twinkle at={[0.4, 0.3, 0]} r={0.1} c={C.sun} />
    </group>
  ),
  hourglass: () => (
    <group>
      <Wedge at={[0, 0.16, 0]} r={0.26} h={0.34} c={C.pale} rot={Math.PI} />
      <Wedge at={[0, -0.18, 0]} r={0.26} h={0.34} c={C.pale} />
      <Wedge at={[0, -0.22, 0.06]} r={0.2} h={0.22} c={C.gold} />
      <Bar at={[0, 0.36, 0]} w={0.6} h={0.09} c={C.wood} />
      <Bar at={[0, -0.38, 0]} w={0.6} h={0.09} c={C.wood} />
    </group>
  ),
  folk: () => (
    <group>
      <Figure at={[-0.3, 0, 0]} s={0.9} c={C.coral} />
      <Figure at={[0, 0.04, -0.1]} s={1} c={C.blue} />
      <Figure at={[0.3, 0, 0]} s={0.9} c={C.leafDeep} />
    </group>
  ),
  twoFolk: () => (
    <group>
      <Figure at={[-0.22, 0, 0]} s={1} c={C.coral} />
      <Figure at={[0.22, 0, 0]} s={1} c={C.blue} />
      <Arc at={[0, 0.3, 0]} r={0.14} t={0.03} c={C.taupe} span={Math.PI} />
    </group>
  ),
  worry: () => (
    <group>
      <Figure at={[0, -0.14, 0]} s={1.05} c={C.violet} />
      <CloudBody y={0.4} c={C.taupe} />
      <Bar at={[0.02, 0.4, 0.16]} w={0.06} h={0.16} c={C.stoneDeep} rot={0.5} />
      <Bar at={[0.1, 0.28, 0.16]} w={0.06} h={0.14} c={C.stoneDeep} rot={-0.5} />
    </group>
  ),
  crown: () => (
    <group>
      <Bar at={[0, -0.14, 0]} w={0.62} h={0.18} c={C.gold} />
      {[-0.22, 0, 0.22].map((x, i) => (
        <Wedge key={i} at={[x, 0.1, 0]} r={0.11} h={0.3} c={C.gold} />
      ))}
      <Ball at={[0, 0.3, 0]} r={0.07} c={C.coral} />
    </group>
  ),
  scroll: () => (
    <group>
      <Bar at={[0, 0, 0]} w={0.6} h={0.5} c={C.milk} />
      <Tube at={[0, 0.28, 0]} rt={0.08} rb={0.08} h={0.66} c={C.wood} rot={Math.PI / 2} />
      <Tube at={[0, -0.28, 0]} rt={0.08} rb={0.08} h={0.66} c={C.wood} rot={Math.PI / 2} />
      {[0.1, 0, -0.1].map((y, i) => (
        <Bar key={i} at={[0, y, 0.08]} w={0.36 - i * 0.06} h={0.035} c={C.taupe} />
      ))}
    </group>
  ),
  baby: ({ state }) => (
    <group>
      <Ball at={[0, 0.16, 0]} r={0.26} c={C.skin} />
      <Limb at={[0, -0.2, 0]} r={0.14} len={0.14} c={C.pink} />
      <Eye at={[-0.1, 0.2, 0.2]} r={0.06} />
      <Eye at={[0.1, 0.2, 0.2]} r={0.06} />
      <Arc at={[0, 0.36, 0.2]} r={0.07} t={0.025} c={C.woodDeep} span={2.4} from={0.4} />
      {state === 'start' || state === 'plain' ? (
        <group>
          <Limb at={[-0.16, 0.02, 0.2]} r={0.04} len={0.08} c={C.water} />
          <Limb at={[0.16, 0.02, 0.2]} r={0.04} len={0.08} c={C.water} />
        </group>
      ) : null}
    </group>
  ),

  /* -- the neutral tokens: no claim about meaning, just a stable identity --- */
  tokenLeaf: () => (
    <group>
      <Ball at={[0, 0.04, 0]} r={0.3} c={C.leaf} sx={0.66} sy={1.15} />
      <Bar at={[0, -0.28, 0]} w={0.05} h={0.24} c={C.leafDeep} />
      <Bar at={[0, 0.06, 0.16]} w={0.04} h={0.4} c={C.leafDeep} />
    </group>
  ),
  tokenShell: () => (
    <group>
      <Wedge at={[0, -0.04, 0]} r={0.36} h={0.44} c={C.pink} seg={14} />
      {[-0.5, 0, 0.5].map((a, i) => (
        <Bar key={i} at={[Math.sin(a) * 0.14, -0.1, 0.16]} w={0.04} h={0.36} c={C.milk} rot={a} />
      ))}
    </group>
  ),
  tokenFeather: () => (
    <group>
      <Bar at={[0, 0, 0]} w={0.05} h={0.7} c={C.wood} rot={-0.18} />
      <Ball at={[-0.12, 0.12, 0]} r={0.24} c={C.pale} sx={0.5} sy={1} />
      <Ball at={[0.1, 0.06, 0]} r={0.22} c={C.taupe} sx={0.5} sy={1} />
    </group>
  ),
  tokenAcorn: () => (
    <group>
      <Ball at={[0, -0.1, 0]} r={0.26} c={C.wood} sy={1.1} />
      <Tube at={[0, 0.14, 0]} rt={0.28} rb={0.24} h={0.2} c={C.woodDeep} />
      <Bar at={[0, 0.3, 0]} w={0.05} h={0.14} c={C.woodDeep} />
    </group>
  ),
  tokenMushroom: () => (
    <group>
      <Bar at={[0, -0.22, 0]} w={0.16} h={0.34} c={C.milk} />
      <Tube at={[0, 0.06, 0]} rt={0.04} rb={0.38} h={0.32} c={C.coral} open />
      <Ball at={[-0.12, 0.08, 0.14]} r={0.05} c={C.milk} />
      <Ball at={[0.12, 0.02, 0.14]} r={0.045} c={C.milk} />
    </group>
  ),
  tokenPebbles: () => (
    <group>
      <Lump at={[-0.18, -0.12, 0]} r={0.19} c={C.stone} />
      <Lump at={[0.16, -0.16, 0]} r={0.15} c={C.stoneDeep} />
      <Lump at={[0.02, 0.16, 0]} r={0.17} c={C.taupe} />
    </group>
  ),
};

/**
 * One event's picture, ready to drop on a slab.
 *
 * `big`, `small` and `gone` are handled here rather than in each drawing because they mean the same
 * thing for every one of them: more of it, less of it, and no longer there. The rest of the states are
 * the drawing's own business, since "empty" means something different to a cup than to a field.
 */
export function EventGlyph({
  glyph,
  state,
  bg,
}: {
  glyph: GlyphName;
  state: GlyphState;
  bg: string;
}) {
  const Draw = GLYPHS[glyph];
  const scale = state === 'big' ? 1.12 : state === 'small' ? 0.82 : state === 'gone' ? 0.74 : 1;
  return (
    <group scale={scale}>
      <Draw state={state} bg={bg} />
      {state === 'gone' ? (
        <group>
          <Ball at={[0.36, 0.3, 0]} r={0.08} c={C.pale} />
          <Ball at={[0.5, 0.42, 0]} r={0.06} c={C.pale} />
          <Ball at={[-0.4, 0.36, 0]} r={0.07} c={C.pale} />
        </group>
      ) : null}
    </group>
  );
}
