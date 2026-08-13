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
  /**
   * A cloud, and a GATHERING of dark ones.
   *
   * "Dark clouds gather." is the first event of the thunderstorm story and the fair-weather white puff was
   * not it — the sentence says two things, that there are several and that they are dark, and both are
   * drawable. Three overlapping bodies in the deep stone value, the front one lightest, so it reads as a
   * bank of cloud with depth rather than one grey smear.
   */
  cloud: ({ state }) =>
    state === 'big' ? (
      <group>
        <CloudBody y={0.24} c={C.taupe} />
        <CloudBody y={0.02} c={C.stoneDeep} />
        <CloudBody y={-0.18} c={C.taupe} />
      </group>
    ) : (
      <CloudBody c={C.white} />
    ),
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
  /**
   * Wind, and WIND THAT HAS STOPPED.
   *
   * "The wind stops." is the event a kite story turns on, and drawing it as wind blowing says the opposite
   * of the sentence. Stopped wind is drawn as the thing the wind was doing, at rest: the streaming curls
   * collapse to one slack, sagging line and a leaf sits on the ground under it. The shared `gone` treatment
   * in `EventGlyph` adds its three little puffs on top, which is the right gloss — something has just left.
   */
  wind: ({ state }) =>
    state === 'gone' ? (
      <group>
        <Arc at={[0, 0.06, 0]} r={0.34} t={0.05} c={C.stoneDeep} span={1.5} from={-2.4} />
        <Ball at={[0.2, -0.3, 0]} r={0.13} c={C.leaf} sy={0.5} />
        <Bar at={[0, -0.44, 0]} w={0.8} h={0.07} c={C.taupe} />
      </group>
    ) : (
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
  /**
   * A CANDLE AT THREE HEIGHTS, which is one whole item of the bank on its own.
   *
   * *The candle is lit → it burns down → we blow it out.* Before this, the three events were drawn as a
   * candle, a full CAMPFIRE and a bucket of water being emptied over one — three different objects, two of
   * them bigger than the thing the story is about, and the last one implying a fire brigade. They are now
   * the same candle: tall with a flame, short with a small flame and a pool of wax, and short with no flame
   * and a curl of smoke off the wick. A child can put those three in order without a single word.
   *
   * The stick SHRINKS FROM THE TOP, not the middle: its base stays on the same line in all three so the
   * eye has a fixed thing to measure the height against. That is the whole trick of an ordering picture.
   */
  candle: ({ state }) => {
    const spent = state === 'partial' || state === 'gone';
    const h = spent ? 0.24 : 0.5;
    // Base pinned at -0.45 whatever the height, so only the top moves.
    const midY = -0.45 + h / 2;
    return (
      <group>
        <Tube at={[0, midY, 0]} rt={0.13} rb={0.15} h={h} c={C.milk} />
        <Bar at={[0, midY + h / 2 + 0.05, 0]} w={0.03} h={0.1} c={C.ink} />
        {state === 'gone' ? (
          /* Blown out: no flame, and two little puffs off the wick. */
          <group>
            <Ball at={[0.03, midY + h / 2 + 0.2, 0]} r={0.08} c={C.stone} />
            <Ball at={[0.13, midY + h / 2 + 0.38, 0]} r={0.06} c={C.stone} />
          </group>
        ) : (
          <Wedge at={[0, midY + h / 2 + 0.19, 0]} r={spent ? 0.075 : 0.1} h={spent ? 0.19 : 0.26} c={C.gold} />
        )}
        {/* Wax that has run down and pooled, for the two spent states: the evidence that time has passed. */}
        {spent ? (
          <group>
            <Ball at={[-0.16, -0.44, 0]} r={0.12} c={C.milk} sy={0.42} />
            <Ball at={[0.16, -0.44, 0]} r={0.1} c={C.milk} sy={0.4} />
          </group>
        ) : null}
      </group>
    );
  },
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
  /**
   * A tree, and at `big` the TALL OAK that ends the acorn story.
   *
   * `big` widens the trunk and spreads the crown rather than just scaling the whole thing up, because the
   * job of this drawing is to be the last of three and to be unmistakably the biggest — and the shared
   * `big` scale in `EventGlyph` is only 1.12, which against a sapling is not a difference a child would
   * bet on. A thick trunk is the part that says "old".
   */
  tree: ({ state }) => {
    const big = state === 'big';
    return (
      <group>
        <Bar at={[0, -0.32, 0]} w={big ? 0.2 : 0.12} h={big ? 0.44 : 0.4} c={C.woodDeep} />
        <Ball at={[0, big ? 0.2 : 0.16, 0]} r={big ? 0.34 : 0.3} c={C.leafDeep} />
        <Ball at={[big ? -0.3 : -0.22, 0.04, 0]} r={big ? 0.23 : 0.19} c={C.leaf} />
        <Ball at={[big ? 0.3 : 0.22, 0.06, 0]} r={big ? 0.24 : 0.2} c={C.leaf} />
        {big ? <Ball at={[0, 0.44, 0]} r={0.2} c={C.leaf} /> : null}
      </group>
    );
  },
  /**
   * AN ACORN, planted. A nut with its cap, sitting in a scrape of soil.
   *
   * The middle of the three most-recognisable-objects-in-a-wood, and the reason it is not the generic
   * `seed`: a seed is a dark pip that could be any of forty things, and this story's first event names the
   * one nut every child can draw. The soil line under it is what makes it "plants an acorn" rather than
   * "here is an acorn" — and it is also what puts it in the same visual family as the sapling that follows.
   */
  acorn: () => (
    <group>
      <Bar at={[0, -0.34, 0]} w={0.7} h={0.13} c={C.soil} />
      <Ball at={[0, -0.1, 0]} r={0.24} c={C.wood} sy={1.14} />
      {/* The cap, ridged, sitting on top rather than round it: a cap that wraps reads as a mushroom. */}
      <Tube at={[0, 0.17, 0]} rt={0.24} rb={0.27} h={0.18} c={C.woodDeep} />
      <Bar at={[0, 0.32, 0]} w={0.05} h={0.14} c={C.woodDeep} />
    </group>
  ),
  /**
   * A SAPLING: the owner's own words for what the middle of the acorn story should be, instead of an
   * hourglass.
   *
   * Deliberately BETWEEN `sprout` and `tree` on every axis, because that is its whole function — it is only
   * ever seen in a row with one or both of them. Taller and woodier than the sprout's two seed leaves,
   * shorter and thinner than the oak, with a slim bare trunk, three small leaves and a tie-stake, which is
   * the detail that says "young tree somebody planted" rather than "small bush".
   */
  sapling: () => (
    <group>
      <Bar at={[0, -0.36, 0]} w={0.66} h={0.12} c={C.soil} />
      <Bar at={[0, -0.02, 0]} w={0.07} h={0.6} c={C.woodDeep} />
      <Bar at={[-0.16, 0.14, 0]} w={0.04} h={0.22} c={C.woodDeep} rot={0.6} />
      <Bar at={[0.16, 0.22, 0]} w={0.04} h={0.22} c={C.woodDeep} rot={-0.6} />
      <Ball at={[-0.24, 0.26, 0]} r={0.13} c={C.leaf} sx={1.1} sy={0.7} />
      <Ball at={[0.24, 0.34, 0]} r={0.13} c={C.leaf} sx={1.1} sy={0.7} />
      <Ball at={[0.02, 0.42, 0]} r={0.12} c={C.leafDeep} sx={1.1} sy={0.7} />
      {/* The stake, leaning against the trunk and tied to it. */}
      <Bar at={[0.16, -0.12, -0.06]} w={0.04} h={0.44} c={C.wood} rot={-0.12} />
    </group>
  ),
  /**
   * A BUNCH OF GRAPES. Was drawn as WHEAT, which is a different crop in a different colour on a different
   * plant, in a story whose other two events are a seed and a vine.
   */
  grape: () => (
    <group>
      <Bar at={[0, 0.42, 0]} w={0.05} h={0.16} c={C.woodDeep} />
      <Ball at={[-0.16, 0.34, 0]} r={0.13} c={C.leaf} sy={0.66} />
      {/* A triangle of berries: three, two, one. The taper is what makes it a bunch. */}
      {[
        [-0.22, 0.14],
        [0, 0.14],
        [0.22, 0.14],
        [-0.11, -0.08],
        [0.11, -0.08],
        [0, -0.3],
      ].map(([x, y], i) => (
        <Ball key={i} at={[x ?? 0, y ?? 0, 0]} r={0.13} c={i % 2 ? C.violet : '#8d5cc0'} />
      ))}
    </group>
  ),
  /**
   * A VINE CLIMBING. Two uprights and a stem winding up between them.
   *
   * `sprout` was standing in for this, and a sprout is a thing that has just come up out of soil — the
   * opposite end of the same story. The trellis is what carries the word "climbs": a plant on its own can
   * only be tall, whereas a plant on a frame is visibly going somewhere.
   */
  vine: () => (
    <group>
      <Bar at={[-0.3, -0.02, -0.06]} w={0.05} h={0.9} c={C.wood} />
      <Bar at={[0.3, -0.02, -0.06]} w={0.05} h={0.9} c={C.wood} />
      <Bar at={[0, 0.3, -0.06]} w={0.66} h={0.05} c={C.wood} />
      {[0, 1, 2].map((i) => (
        <Arc
          key={i}
          at={[0, -0.28 + i * 0.28, 0]}
          r={0.16}
          t={0.05}
          c={C.leafDeep}
          span={3.4}
          from={i % 2 ? 0.4 : 3.4}
        />
      ))}
      <Ball at={[0.2, 0.06, 0.06]} r={0.13} c={C.leaf} sy={0.72} />
      <Ball at={[-0.2, -0.2, 0.06]} r={0.12} c={C.leaf} sy={0.72} />
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
  /* -- the sorting robot's farmyard and field ------------------------------ */
  /**
   * A COW. Two short horns, a big pale muzzle, and dark patches on white.
   *
   * The patches are the read at a glance — nothing else in the set is piebald — and the muzzle is what tells
   * it from `horse`, whose head tapers. Both are drawn side-on with the head up, like `dog`, so the whole
   * farmyard shares one grammar and differs only where it should.
   */
  cow: () => (
    <group>
      <Limb at={[-0.06, -0.08, 0]} r={0.2} len={0.34} c={C.white} rot={Math.PI / 2} />
      <Lump at={[-0.16, 0.0, 0.16]} r={0.11} c={C.stoneDeep} />
      <Lump at={[0.08, -0.16, 0.16]} r={0.09} c={C.stoneDeep} />
      <Ball at={[0.32, 0.06, 0]} r={0.17} c={C.white} />
      <Ball at={[0.44, -0.04, 0.08]} r={0.11} c={C.pink} sy={0.8} />
      {/* Horns: short, out and up. */}
      <Wedge at={[0.24, 0.26, 0]} r={0.05} h={0.14} c={C.milk} rot={0.5} />
      <Wedge at={[0.4, 0.24, 0]} r={0.05} h={0.14} c={C.milk} rot={-0.4} />
      <Eye at={[0.36, 0.12, 0.14]} r={0.045} />
      {[-0.24, 0.06].map((x, i) => (
        <Bar key={i} at={[x, -0.36, 0]} w={0.08} h={0.2} c={C.white} />
      ))}
    </group>
  ),
  /** A PIG: a flat disc of a snout with two nostrils, small forward ears, and a curl of tail. */
  pig: () => (
    <group>
      <Limb at={[-0.04, -0.08, 0]} r={0.19} len={0.3} c={C.pink} rot={Math.PI / 2} />
      <Ball at={[0.28, 0.02, 0]} r={0.16} c={C.pink} />
      {/* The snout, dead-on even though the pig is side-on: it is the identification. */}
      <Disc at={[0.44, -0.04, 0.04]} r={0.1} c={C.coral} d={0.08} />
      <Ball at={[0.41, -0.04, 0.12]} r={0.022} c={C.ink} />
      <Ball at={[0.48, -0.04, 0.12]} r={0.022} c={C.ink} />
      <Wedge at={[0.22, 0.2, 0]} r={0.06} h={0.12} c={C.coral} rot={0.3} />
      <Eye at={[0.34, 0.08, 0.13]} r={0.04} />
      <Arc at={[-0.26, 0.04, 0]} r={0.08} t={0.032} c={C.coral} span={4.6} />
      {[-0.16, 0.06].map((x, i) => (
        <Bar key={i} at={[x, -0.32, 0]} w={0.07} h={0.16} c={C.pink} />
      ))}
    </group>
  ),
  /** A HEN: the red comb over a round body, and a fan of tail. Told from `chick` by the comb and the size. */
  hen: () => (
    <group>
      <Ball at={[-0.02, -0.08, 0]} r={0.26} c={C.milk} sx={1.15} />
      <Ball at={[0.22, 0.16, 0]} r={0.16} c={C.milk} />
      {/* The comb: three lobes along the top of the head. */}
      {[-0.06, 0.03, 0.12].map((dx, i) => (
        <Ball key={i} at={[0.2 + dx, 0.34 - Math.abs(dx) * 0.5, 0]} r={0.06} c={C.red} />
      ))}
      <Wedge at={[0.42, 0.14, 0]} r={0.06} h={0.13} c={C.gold} rot={-Math.PI / 2} />
      <Ball at={[0.24, 0.02, 0.1]} r={0.05} c={C.red} sy={1.3} />
      <Eye at={[0.28, 0.2, 0.13]} r={0.045} />
      {[0.3, 0.0, -0.3].map((a, i) => (
        <Wedge key={i} at={[-0.3 - i * 0.02, 0.06 + a * 0.3, 0]} r={0.07} h={0.26} c={C.stone} rot={1.9 + a} />
      ))}
      {[-0.1, 0.08].map((x, i) => (
        <Bar key={i} at={[x, -0.34, 0]} w={0.05} h={0.16} c={C.gold} />
      ))}
    </group>
  ),
  /** A HORSE: a long neck with a mane down it, and long legs. Height and neck are what separate it. */
  horse: () => (
    <group>
      <Limb at={[-0.1, -0.02, 0]} r={0.17} len={0.34} c={C.wood} rot={Math.PI / 2} />
      <Bar at={[0.22, 0.16, 0]} w={0.14} h={0.36} c={C.wood} rot={-0.3} />
      <Ball at={[0.36, 0.32, 0]} r={0.13} c={C.wood} sx={1.2} sy={0.8} />
      <Wedge at={[0.3, 0.44, 0]} r={0.05} h={0.12} c={C.woodDeep} />
      {/* The mane, a run of dark tufts down the back of the neck. */}
      {[0, 1, 2].map((i) => (
        <Ball key={i} at={[0.14 + i * 0.05, 0.16 + i * 0.11, -0.04]} r={0.07} c={C.woodDeep} />
      ))}
      <Eye at={[0.42, 0.34, 0.1]} r={0.04} />
      <Arc at={[-0.34, 0.02, 0]} r={0.13} t={0.05} c={C.woodDeep} span={2} from={1.6} />
      {[-0.24, -0.06, 0.06].map((x, i) => (
        <Bar key={i} at={[x, -0.34, 0]} w={0.06} h={0.34} c={C.wood} />
      ))}
    </group>
  ),
  /** A GOAT: horns curving BACK, and a beard. The beard is the one feature no other animal here has. */
  goat: () => (
    <group>
      <Limb at={[-0.06, -0.06, 0]} r={0.17} len={0.28} c={C.stone} rot={Math.PI / 2} />
      <Ball at={[0.28, 0.08, 0]} r={0.15} c={C.stone} />
      <Wedge at={[0.44, 0.02, 0]} r={0.07} h={0.14} c={C.milk} rot={-Math.PI / 2} />
      {/* Horns sweeping back over the neck. */}
      <Arc at={[0.2, 0.28, 0]} r={0.13} t={0.035} c={C.woodDeep} span={1.8} from={0.2} />
      <Arc at={[0.3, 0.3, -0.06]} r={0.11} t={0.032} c={C.woodDeep} span={1.8} from={0.2} />
      {/* The beard. */}
      <Ball at={[0.36, -0.1, 0.06]} r={0.07} c={C.milk} sy={1.5} />
      <Eye at={[0.34, 0.12, 0.12]} r={0.04} />
      <Bar at={[-0.28, 0.1, 0]} w={0.06} h={0.16} c={C.stone} rot={-0.4} />
      {[-0.16, 0.06].map((x, i) => (
        <Bar key={i} at={[x, -0.3, 0]} w={0.06} h={0.18} c={C.stone} />
      ))}
    </group>
  ),
  /** A BEAR: the biggest, roundest body in the set, small round ears, and NO tail. Bulk is the read. */
  bear: () => (
    <group>
      <Ball at={[-0.06, -0.1, 0]} r={0.3} c={C.woodDeep} sx={1.15} />
      <Ball at={[0.26, 0.14, 0]} r={0.19} c={C.woodDeep} />
      <Ball at={[0.16, 0.32, 0]} r={0.07} c={C.wood} />
      <Ball at={[0.36, 0.32, 0]} r={0.07} c={C.wood} />
      <Ball at={[0.42, 0.06, 0.08]} r={0.09} c={C.wood} sy={0.8} />
      <Ball at={[0.44, 0.1, 0.16]} r={0.035} c={C.ink} />
      <Eye at={[0.3, 0.18, 0.16]} r={0.04} />
      {[-0.2, 0.06].map((x, i) => (
        <Limb key={i} at={[x, -0.36, 0]} r={0.08} len={0.06} c={C.woodDeep} />
      ))}
    </group>
  ),
  /** A CAT: triangle ears and a long tail held UP. Both are what `dog`'s round ears and low tail are not. */
  cat: () => (
    <group>
      <Limb at={[-0.06, -0.12, 0]} r={0.16} len={0.28} c={C.gold} rot={Math.PI / 2} />
      <Ball at={[0.26, 0.08, 0]} r={0.16} c={C.gold} />
      <Wedge at={[0.16, 0.28, 0]} r={0.07} h={0.16} c={C.gold} rot={0.14} />
      <Wedge at={[0.36, 0.28, 0]} r={0.07} h={0.16} c={C.gold} rot={-0.14} />
      <Ball at={[0.4, 0.02, 0.08]} r={0.06} c={C.pink} sy={0.7} />
      <Eye at={[0.22, 0.1, 0.14]} r={0.045} />
      <Eye at={[0.34, 0.1, 0.14]} r={0.045} />
      {/* The tail: up and hooked over, which is a cat at rest and nothing else. */}
      <Bar at={[-0.34, 0.06, 0]} w={0.07} h={0.36} c={C.gold} rot={0.16} />
      <Arc at={[-0.28, 0.26, 0]} r={0.09} t={0.035} c={C.gold} span={2.4} from={0.6} />
      {[-0.18, 0.04].map((x, i) => (
        <Bar key={i} at={[x, -0.34, 0]} w={0.06} h={0.16} c={C.gold} />
      ))}
    </group>
  ),
  /** A FROG: eyes ON TOP of a squat green body, a wide mouth, and folded back legs. */
  frog: () => (
    <group>
      <Ball at={[0, -0.14, 0]} r={0.3} c={C.leaf} sx={1.2} sy={0.8} />
      <Bar at={[0, -0.16, 0.24]} w={0.4} h={0.05} c={C.leafDeep} />
      {/* Eyes on stalks over the crown: the frog signature. */}
      <Eye at={[-0.16, 0.14, 0.08]} r={0.1} />
      <Eye at={[0.16, 0.14, 0.08]} r={0.1} />
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <Arc at={[side * 0.3, -0.16, 0]} r={0.12} t={0.05} c={C.leafDeep} span={2} from={side > 0 ? -0.6 : 1.7} />
          <Ball at={[side * 0.4, -0.34, 0]} r={0.08} c={C.leafDeep} sy={0.6} />
        </group>
      ))}
    </group>
  ),
  /** A SNAKE: a coil, and the absence of legs. Nothing else in the set is a single continuous line. */
  snake: () => (
    <group>
      <Arc at={[0, -0.16, 0]} r={0.28} t={0.075} c={C.green} span={4.4} from={0.6} />
      <Arc at={[0.04, 0.2, 0]} r={0.17} t={0.07} c={C.green} span={3.4} from={3.6} />
      <Ball at={[0.28, 0.3, 0]} r={0.1} c={C.leafDeep} sx={1.2} sy={0.8} />
      <Eye at={[0.32, 0.34, 0.08]} r={0.035} />
      {/* The forked tongue. */}
      <Bar at={[0.44, 0.26, 0]} w={0.14} h={0.03} c={C.red} rot={-0.2} />
      <Bar at={[0.52, 0.29, 0]} w={0.07} h={0.025} c={C.red} rot={0.5} />
      <Bar at={[0.52, 0.22, 0]} w={0.07} h={0.025} c={C.red} rot={-0.5} />
    </group>
  ),
  /** A CRAB: two claws held up and a wide flat shell. Red, which no other sea animal here is. */
  crab: () => (
    <group>
      <Ball at={[0, -0.06, 0]} r={0.28} c={C.red} sx={1.25} sy={0.72} />
      <Eye at={[-0.1, 0.14, 0.12]} r={0.055} />
      <Eye at={[0.1, 0.14, 0.12]} r={0.055} />
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          {/* The claw: two pincers on an arm. */}
          <Bar at={[side * 0.34, 0.06, 0]} w={0.2} h={0.07} c={C.coral} rot={side * 0.6} />
          <Wedge at={[side * 0.46, 0.26, 0]} r={0.07} h={0.15} c={C.red} rot={side * 0.5} />
          <Wedge at={[side * 0.54, 0.18, 0]} r={0.06} h={0.13} c={C.coral} rot={side * 1.1} />
          {[0, 1].map((i) => (
            <Bar key={i} at={[side * (0.24 + i * 0.1), -0.24 - i * 0.05, 0]} w={0.16} h={0.05} c={C.coral} rot={side * -0.5} />
          ))}
        </group>
      ))}
    </group>
  ),
  /** A SEAL: a smooth tapering body up on its fore-flippers, whiskers, and a fluke. No legs, no fins. */
  seal: () => (
    <group>
      <Ball at={[-0.06, -0.14, 0]} r={0.26} c={C.stoneDeep} sx={1.3} sy={0.82} />
      <Bar at={[0.2, 0.1, 0]} w={0.16} h={0.3} c={C.stoneDeep} rot={-0.24} />
      <Ball at={[0.3, 0.28, 0]} r={0.14} c={C.stoneDeep} />
      <Ball at={[0.42, 0.22, 0.06]} r={0.07} c={C.ink} sy={0.7} />
      <Eye at={[0.3, 0.32, 0.12]} r={0.05} />
      {[0.02, -0.03].map((dy, i) => (
        <Bar key={i} at={[0.5, 0.2 + dy, 0.1]} w={0.14} h={0.02} c={C.pale} rot={dy * 4} />
      ))}
      <Wedge at={[-0.44, -0.12, 0]} r={0.1} h={0.22} c={C.taupe} rot={1.9} />
      <Wedge at={[-0.44, -0.3, 0]} r={0.09} h={0.2} c={C.taupe} rot={-2.2} />
      <Bar at={[0.1, -0.36, 0.08]} w={0.18} h={0.07} c={C.taupe} rot={-0.3} />
    </group>
  ),
  /** An OWL: two enormous FORWARD-facing eyes on a flat face. The only front-on bird in the set. */
  owl: () => (
    <group>
      <Ball at={[0, -0.06, 0]} r={0.3} c={C.wood} sy={1.1} />
      <Ball at={[0, 0.16, 0.14]} r={0.24} c={C.milk} sy={0.7} />
      <Eye at={[-0.12, 0.18, 0.24]} r={0.105} />
      <Eye at={[0.12, 0.18, 0.24]} r={0.105} />
      <Wedge at={[0, 0.02, 0.26]} r={0.05} h={0.12} c={C.gold} rot={Math.PI} />
      {/* Ear tufts. */}
      <Wedge at={[-0.18, 0.38, 0]} r={0.06} h={0.14} c={C.wood} rot={0.3} />
      <Wedge at={[0.18, 0.38, 0]} r={0.06} h={0.14} c={C.wood} rot={-0.3} />
      <Bar at={[0, -0.4, 0]} w={0.34} h={0.07} c={C.woodDeep} />
      {[-0.1, 0.1].map((x, i) => (
        <Bar key={i} at={[x, -0.34, 0.1]} w={0.06} h={0.12} c={C.gold} />
      ))}
    </group>
  ),
  /**
   * A LION: `cat`'s build with a MANE round the head, which is the one thing a child draws first.
   *
   * Deliberately the cat body rather than a new one — a lion IS a big cat and the family resemblance is
   * correct — with the whole identification carried by the ring of locks and the tufted tail. The same
   * argument the slime crests make: one silhouette feature, sized to survive being small.
   */
  lion: () => (
    <group>
      <Limb at={[-0.1, -0.14, 0]} r={0.16} len={0.26} c={C.gold} rot={Math.PI / 2} />
      {/* The mane: eight locks in a ring, drawn BEFORE the face so the face sits inside it. */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <Ball key={i} at={[0.24 + Math.cos(a) * 0.2, 0.12 + Math.sin(a) * 0.2, -0.04]} r={0.1} c={C.ember} />;
      })}
      <Ball at={[0.24, 0.12, 0.06]} r={0.15} c={C.sun} />
      <Ball at={[0.3, 0.06, 0.18]} r={0.055} c={C.wood} sy={0.7} />
      <Eye at={[0.18, 0.16, 0.18]} r={0.04} />
      <Eye at={[0.3, 0.16, 0.18]} r={0.04} />
      <Bar at={[-0.36, -0.06, 0]} w={0.06} h={0.26} c={C.gold} rot={0.5} />
      <Ball at={[-0.44, 0.1, 0]} r={0.08} c={C.ember} />
      {[-0.2, 0.02].map((x, i) => (
        <Bar key={i} at={[x, -0.34, 0]} w={0.07} h={0.16} c={C.gold} />
      ))}
    </group>
  ),
  /** A HAWK: wings SPREAD, and a hooked beak. Told from `owl` by being side-on and in flight. */
  hawk: () => (
    <group>
      <Ball at={[0, -0.04, 0]} r={0.16} c={C.woodDeep} sy={1.2} />
      <Ball at={[0.14, 0.18, 0]} r={0.11} c={C.wood} />
      {/* The hook: a beak that turns down at the tip. */}
      <Wedge at={[0.28, 0.18, 0]} r={0.05} h={0.11} c={C.gold} rot={-Math.PI / 2} />
      <Wedge at={[0.32, 0.12, 0]} r={0.035} h={0.08} c={C.gold} rot={Math.PI - 0.6} />
      <Eye at={[0.16, 0.22, 0.1]} r={0.04} />
      {/* Spread wings, each two bars with a stepped trailing edge. */}
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <Bar at={[side * 0.3, 0.1, 0]} w={0.4} h={0.11} c={C.woodDeep} rot={side * 0.24} />
          <Bar at={[side * 0.52, 0.16, 0]} w={0.22} h={0.08} c={C.wood} rot={side * 0.36} />
        </group>
      ))}
      <Wedge at={[-0.06, -0.3, 0]} r={0.1} h={0.2} c={C.wood} rot={Math.PI} />
    </group>
  ),
  /** An ANT: three segments and SIX legs. Told from `spider` by the segments and by the leg count. */
  ant: () => (
    <group>
      <Ball at={[-0.28, -0.04, 0]} r={0.17} c={C.woodDeep} />
      <Ball at={[-0.02, -0.02, 0]} r={0.12} c={C.ink} />
      <Ball at={[0.24, 0.02, 0]} r={0.14} c={C.woodDeep} />
      <Eye at={[0.3, 0.06, 0.12]} r={0.04} />
      <Bar at={[0.36, 0.22, 0]} w={0.04} h={0.16} c={C.ink} rot={-0.5} />
      <Bar at={[0.24, 0.24, 0]} w={0.04} h={0.16} c={C.ink} rot={0.3} />
      {[0, 1, 2].map((i) =>
        ([-1, 1] as const).map((side) => (
          <Bar
            key={`${i}${side}`}
            at={[-0.2 + i * 0.22, side * 0.16, 0]}
            w={0.04}
            h={0.2}
            c={C.ink}
            rot={side * (0.5 - i * 0.3)}
          />
        )),
      )}
    </group>
  ),

  /* -- the sorting robot's water and air ----------------------------------- */
  /** A plain fish, side on. Serves *fish*, *tuna* and *trout*: the generic member of its own category. */
  fish: () => (
    <group>
      <Ball at={[0, 0, 0]} r={0.28} c={C.water} sx={1.3} sy={0.86} />
      {/* Tail as two wedges off the back, so it is a fluke rather than a spike. */}
      <Wedge at={[-0.42, 0.08, 0]} r={0.12} h={0.24} c={C.waterDeep} rot={2.0} />
      <Wedge at={[-0.42, -0.08, 0]} r={0.12} h={0.24} c={C.waterDeep} rot={-2.0} />
      <Wedge at={[0.02, 0.28, 0]} r={0.1} h={0.2} c={C.waterDeep} />
      <Eye at={[0.24, 0.06, 0.16]} r={0.055} />
      <Arc at={[0.06, -0.04, 0.2]} r={0.1} t={0.028} c={C.waterDeep} span={2} from={1.4} />
    </group>
  ),
  /**
   * A WHALE, and the spout is the read: it is what keeps this off `fish` and off `shark`.
   *
   * Blunt and broad rather than tapered, because at this size a silhouette says "huge" through proportion
   * and nothing else. It is a `mammals` item's answer, so it has to be unmistakably not a fish.
   */
  whale: () => (
    <group>
      <Ball at={[-0.02, -0.08, 0]} r={0.3} c={C.waterDeep} sx={1.5} sy={0.92} />
      <Ball at={[0.1, -0.2, 0.16]} r={0.2} c={C.pale} sx={1.3} sy={0.5} />
      {/* The fluke, lifting at the back: a whale's tail is horizontal and rises. */}
      <Wedge at={[-0.5, 0.12, 0]} r={0.14} h={0.28} c={C.waterDeep} rot={0.9} />
      <Wedge at={[-0.52, -0.1, 0]} r={0.11} h={0.22} c={C.waterDeep} rot={-2.2} />
      <Limb at={[0.16, 0.32, 0]} r={0.05} len={0.16} c={C.water} />
      <Ball at={[0.1, 0.5, 0]} r={0.08} c={C.pale} />
      <Ball at={[0.28, 0.46, 0]} r={0.07} c={C.pale} />
      <Eye at={[0.3, -0.06, 0.14]} r={0.05} />
    </group>
  ),
  /** A SHARK: one tall dorsal fin and a toothed mouth. The fin is the whole identification. */
  shark: () => (
    <group>
      <Ball at={[0, -0.1, 0]} r={0.27} c={C.stoneDeep} sx={1.45} sy={0.78} />
      <Wedge at={[0.0, 0.26, 0]} r={0.16} h={0.38} c={C.stoneDeep} rot={0.24} />
      <Wedge at={[-0.46, 0.04, 0]} r={0.13} h={0.26} c={C.stoneDeep} rot={1.9} />
      <Wedge at={[-0.44, -0.2, 0]} r={0.1} h={0.2} c={C.stoneDeep} rot={-2.3} />
      <Bar at={[0.3, -0.2, 0.12]} w={0.26} h={0.07} c={C.pale} rot={-0.16} />
      {[0.22, 0.32, 0.4].map((x, i) => (
        <Wedge key={i} at={[x, -0.26, 0.16]} r={0.03} h={0.08} c={C.white} rot={Math.PI} />
      ))}
      <Eye at={[0.26, -0.02, 0.14]} r={0.045} />
    </group>
  ),
  /** A SQUID: a pointed hood and a fan of arms. Only the spider has more limbs than this. */
  squid: () => (
    <group>
      <Wedge at={[0, 0.24, 0]} r={0.22} h={0.44} c={C.pink} />
      <Ball at={[0, -0.02, 0]} r={0.21} c={C.pink} sy={0.86} />
      <Eye at={[-0.1, 0.0, 0.16]} r={0.055} />
      <Eye at={[0.1, 0.0, 0.16]} r={0.055} />
      {[-0.3, -0.12, 0.06, 0.24].map((x, i) => (
        <Arc key={i} at={[x + 0.03, -0.3, 0]} r={0.14} t={0.04} c={C.coral} span={2.2} from={i % 2 ? 3.6 : 4.4} />
      ))}
    </group>
  ),
  /** A DUCK: the flat orange bill is the read, and no other bird in the set has one. */
  duck: () => (
    <group>
      <Ball at={[-0.08, -0.12, 0]} r={0.26} c={C.milk} sx={1.25} />
      <Ball at={[0.2, 0.2, 0]} r={0.17} c={C.milk} />
      <Bar at={[0.44, 0.14, 0]} w={0.26} h={0.1} c={C.gold} />
      <Eye at={[0.24, 0.26, 0.14]} r={0.05} />
      <Ball at={[-0.16, -0.08, 0.14]} r={0.15} c={C.stone} sy={0.6} />
      {/* Water under it, because a duck sits ON something. */}
      <Bar at={[-0.02, -0.4, 0]} w={0.82} h={0.07} c={C.water} />
      <Arc at={[0.3, -0.4, 0]} r={0.09} t={0.03} c={C.water} span={Math.PI} />
    </group>
  ),
  /** A CROW: `bird`'s shape in the dark values, with a heavy straight beak and no pale belly. */
  crow: () => (
    <group>
      <Ball at={[-0.04, -0.04, 0]} r={0.24} c={C.ink} sx={1.2} />
      <Ball at={[0.2, 0.16, 0]} r={0.15} c={C.ink} />
      <Bar at={[0.42, 0.12, 0]} w={0.22} h={0.08} c={C.stoneDeep} rot={-0.1} />
      <Eye at={[0.22, 0.2, 0.12]} r={0.045} />
      <Bar at={[-0.32, -0.02, 0]} w={0.26} h={0.08} c={C.ink} rot={0.24} />
      <Bar at={[-0.32, -0.14, 0]} w={0.24} h={0.07} c={C.stoneDeep} rot={-0.1} />
      <Ball at={[-0.06, 0.06, 0.12]} r={0.15} c={C.stoneDeep} sy={0.5} />
    </group>
  ),
  /** A SPIDER: a body and EIGHT legs. The count is the identification, so eight is what is drawn. */
  spider: () => (
    <group>
      <Ball at={[0, -0.02, 0]} r={0.2} c={C.woodDeep} />
      <Ball at={[0, 0.2, 0]} r={0.12} c={C.ink} />
      <Eye at={[-0.05, 0.24, 0.1]} r={0.035} />
      <Eye at={[0.05, 0.24, 0.1]} r={0.035} />
      {[0, 1, 2, 3].map((i) =>
        ([-1, 1] as const).map((side) => (
          <Arc
            key={`${i}${side}`}
            at={[side * 0.2, 0.06 - i * 0.11, 0]}
            r={0.16}
            t={0.03}
            c={C.ink}
            span={1.5}
            from={side > 0 ? -0.4 - i * 0.2 : 2.1 + i * 0.2}
          />
        )),
      )}
    </group>
  ),
  /**
   * A MOTH, which is the harder half of the moth/butterfly pair.
   *
   * Three differences, all of them ones a child would name: the wings are SWEPT BACK into a triangle rather
   * than held up as four rounds, the body is fat and furry rather than a thin stalk, and the antennae are
   * FEATHERED. Drab taupe against the butterfly's violet does the rest.
   */
  moth: () => (
    <group>
      <Wedge at={[-0.24, 0.0, 0]} r={0.24} h={0.4} c={C.taupe} rot={2.1} />
      <Wedge at={[0.24, 0.0, 0]} r={0.24} h={0.4} c={C.taupe} rot={-2.1} />
      <Limb at={[0, 0.0, 0.1]} r={0.09} len={0.28} c={C.woodDeep} />
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <Bar at={[side * 0.1, 0.34, 0]} w={0.04} h={0.2} c={C.ink} rot={side * 0.4} />
          {[0, 1, 2].map((i) => (
            <Bar
              key={i}
              at={[side * (0.13 + i * 0.03), 0.28 + i * 0.07, 0.04]}
              w={0.08}
              h={0.025}
              c={C.ink}
              rot={side * 0.6}
            />
          ))}
        </group>
      ))}
      <Ball at={[0, -0.04, 0.16]} r={0.07} c={C.stone} />
    </group>
  ),
  /** A BAT: scalloped wings, two tall ears, not one feather anywhere. The silhouette is the whole read. */
  bat: () => (
    <group>
      <Ball at={[0, -0.04, 0]} r={0.17} c={C.ink} sy={1.1} />
      <Wedge at={[-0.08, 0.24, 0]} r={0.06} h={0.18} c={C.ink} rot={0.24} />
      <Wedge at={[0.08, 0.24, 0]} r={0.06} h={0.18} c={C.ink} rot={-0.24} />
      <Eye at={[-0.06, 0.02, 0.14]} r={0.04} />
      <Eye at={[0.06, 0.02, 0.14]} r={0.04} />
      {/* Each wing is a slab with two scallops taken out of its lower edge by body-coloured cones. */}
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <Bar at={[side * 0.34, 0.06, 0]} w={0.42} h={0.28} c={C.woodDeep} rot={side * 0.14} />
          <Wedge at={[side * 0.22, -0.14, 0.06]} r={0.09} h={0.16} c={C.ink} />
          <Wedge at={[side * 0.46, -0.12, 0.06]} r={0.09} h={0.16} c={C.ink} />
        </group>
      ))}
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
  /* -- kitchen things, tools, body parts ----------------------------------- */
  /** A FORK: four tines off a handle. The tine count is what tells it from `spoon` at any size. */
  fork: () => (
    <group>
      <Bar at={[0, -0.24, 0]} w={0.1} h={0.44} c={C.stone} />
      <Bar at={[0, 0.02, 0]} w={0.3} h={0.08} c={C.stone} />
      {[-0.12, -0.04, 0.04, 0.12].map((x, i) => (
        <Bar key={i} at={[x, 0.22, 0]} w={0.05} h={0.34} c={C.stone} />
      ))}
    </group>
  ),
  /** A SPOON: a bowl on a handle, and no tines. */
  spoon: () => (
    <group>
      <Bar at={[0, -0.24, 0]} w={0.1} h={0.44} c={C.stone} />
      <Ball at={[0, 0.16, 0]} r={0.22} c={C.stone} sx={0.78} sy={1.16} />
      <Ball at={[0, 0.16, 0.1]} r={0.15} c={C.pale} sx={0.78} sy={1.16} />
    </group>
  ),
  /** A PLATE: a wide shallow disc with a rim, seen from slightly above. Flat is the whole point. */
  plate: () => (
    <group>
      <mesh position={[0, -0.06, 0]} scale={[1, 0.34, 1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.16, 24]} />
        <meshStandardMaterial color={C.white} {...MAT} />
      </mesh>
      <mesh position={[0, -0.04, 0.1]} scale={[1, 0.34, 1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.16, 24]} />
        <meshStandardMaterial color={C.pale} {...MAT} />
      </mesh>
    </group>
  ),
  /** A TABLE: a wide flat top on four legs. Told from `chair` by having no back at all. */
  table: () => (
    <group>
      <Bar at={[0, 0.16, 0]} w={0.86} h={0.12} c={C.wood} />
      {[-0.34, -0.12, 0.12, 0.34].map((x, i) => (
        <Bar key={i} at={[x, -0.16, i % 2 ? -0.06 : 0.04]} w={0.07} h={0.52} c={C.woodDeep} />
      ))}
    </group>
  ),
  /** A HAMMER: a heavy head across the top of a handle. The T is the read. */
  hammer: () => (
    <group>
      <Bar at={[0, -0.16, 0]} w={0.1} h={0.6} c={C.wood} />
      <Bar at={[0.02, 0.24, 0]} w={0.44} h={0.18} c={C.stoneDeep} />
      {/* The claw, so it is a claw hammer and not a mallet. */}
      <Wedge at={[-0.22, 0.24, 0]} r={0.08} h={0.16} c={C.stoneDeep} rot={Math.PI / 2} />
      <Bar at={[0.24, 0.24, 0]} w={0.12} h={0.22} c={C.taupe} />
    </group>
  ),
  /** A NAIL: a flat head, a straight shank and a point. */
  nail: () => (
    <group>
      <Bar at={[0, 0.34, 0]} w={0.34} h={0.1} c={C.stone} />
      <Bar at={[0, 0.02, 0]} w={0.11} h={0.56} c={C.stoneDeep} />
      <Wedge at={[0, -0.36, 0]} r={0.055} h={0.18} c={C.stoneDeep} rot={Math.PI} />
    </group>
  ),
  /** A WRENCH: a shaft with an open C-jaw at one end. The gap in the jaw is the identification. */
  wrench: () => (
    <group>
      <Bar at={[-0.06, -0.16, 0]} w={0.12} h={0.5} c={C.taupe} rot={-0.16} />
      <Arc at={[0.1, 0.24, 0]} r={0.17} t={0.075} c={C.stoneDeep} span={4.6} from={-0.7} />
      <Arc at={[-0.16, -0.4, 0]} r={0.12} t={0.06} c={C.stoneDeep} span={4.4} from={2.4} />
    </group>
  ),
  /** A HAND: a palm and five fingers. Five is the read, so five is drawn. */
  hand: () => (
    <group>
      <Bar at={[0, -0.22, 0]} w={0.4} h={0.3} c={C.skin} />
      {[-0.15, -0.05, 0.05, 0.15].map((x, i) => (
        <Limb key={i} at={[x, 0.06 + (i === 1 || i === 2 ? 0.06 : 0), 0]} r={0.055} len={0.2} c={C.skin} />
      ))}
      {/* The thumb, out to the side and lower: what stops it reading as a rake. */}
      <Limb at={[-0.28, -0.14, 0]} r={0.06} len={0.16} c={C.skin} rot={0.9} />
      <Bar at={[0, -0.42, 0]} w={0.22} h={0.12} c={C.coral} />
    </group>
  ),
  /** A FOOT: an ankle, a sole and five small toes, seen side-on. */
  foot: () => (
    <group>
      <Bar at={[-0.12, 0.2, 0]} w={0.2} h={0.34} c={C.skin} />
      <Limb at={[0.02, -0.16, 0]} r={0.16} len={0.34} c={C.skin} rot={Math.PI / 2} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Ball key={i} at={[0.16 + i * 0.07, -0.06 - i * 0.02, 0.08]} r={0.05 - i * 0.004} c={C.skin} />
      ))}
      <Bar at={[0, -0.4, 0]} w={0.62} h={0.06} c={C.taupe} />
    </group>
  ),
  /** A NOSE: a nose and mouth in profile, because a nose alone is an unrecognisable lump. */
  nose: () => (
    <group>
      <Bar at={[-0.16, 0.0, -0.04]} w={0.3} h={0.86} c={C.skin} />
      <Wedge at={[0.1, 0.06, 0]} r={0.15} h={0.3} c={C.skin} rot={-Math.PI / 2} />
      <Ball at={[0.12, -0.06, 0.08]} r={0.045} c={C.wood} />
      <Bar at={[-0.04, -0.28, 0.06]} w={0.2} h={0.05} c={C.coral} />
      <Eye at={[-0.1, 0.3, 0.14]} r={0.06} />
    </group>
  ),

  /* -- the sorting robot's household and garden things --------------------- */
  /** A CHAIR, seen three-quarters: a seat, a tall back and two visible legs. */
  chair: () => (
    <group>
      <Bar at={[0, -0.06, 0]} w={0.5} h={0.11} c={C.wood} />
      <Bar at={[-0.2, 0.22, -0.04]} w={0.1} h={0.66} c={C.woodDeep} />
      {[0.3, 0.12].map((y, i) => (
        <Bar key={i} at={[0.04, y + 0.12, -0.04]} w={0.42} h={0.07} c={C.woodDeep} />
      ))}
      <Bar at={[-0.18, -0.32, 0]} w={0.08} h={0.42} c={C.wood} />
      <Bar at={[0.18, -0.32, 0]} w={0.08} h={0.42} c={C.wood} />
    </group>
  ),
  /** A SOFA: wide, low, two arms and two cushions. Told from `chair` by proportion, which is the honest cue. */
  sofa: () => (
    <group>
      <Bar at={[0, -0.16, 0]} w={0.86} h={0.22} c={C.coral} />
      <Bar at={[0, 0.1, -0.06]} w={0.7} h={0.34} c={C.red} />
      <Bar at={[-0.42, -0.02, 0]} w={0.14} h={0.4} c={C.red} />
      <Bar at={[0.42, -0.02, 0]} w={0.14} h={0.4} c={C.red} />
      {/* Two cushions, so it is unmistakably a seat for more than one. */}
      <Bar at={[-0.17, -0.04, 0.08]} w={0.28} h={0.16} c={C.pink} />
      <Bar at={[0.17, -0.04, 0.08]} w={0.28} h={0.16} c={C.pink} />
      <Bar at={[-0.3, -0.38, 0]} w={0.08} h={0.18} c={C.woodDeep} />
      <Bar at={[0.3, -0.38, 0]} w={0.08} h={0.18} c={C.woodDeep} />
    </group>
  ),
  /**
   * A DRINKING GLASS, which `cup` cannot be, because `cup` has a HANDLE.
   *
   * Straight-sided, tapering slightly IN toward the base, and half full of water with a highlight down one
   * side. A `things to drink` item can put *glass* and *milk* and *juice* in the same row, so the vessels
   * have to differ as objects and not only by what is in them.
   */
  glass: () => (
    <group>
      <Tube at={[0, -0.02, 0]} rt={0.25} rb={0.19} h={0.66} c={C.pale} open />
      <Ring at={[0, 0.31, 0]} r={0.25} t={0.03} c={C.white} />
      <Tube at={[0, -0.14, 0]} rt={0.22} rb={0.19} h={0.4} c={C.water} />
      {/* The highlight: what makes it read as glass rather than as a paper cup. */}
      <Bar at={[-0.12, 0.02, 0.2]} w={0.05} h={0.5} c={C.white} />
      <Ball at={[0, -0.36, 0]} r={0.2} c={C.stone} sy={0.2} />
    </group>
  ),
  /* -- fruit, vegetables, shapes and colours ------------------------------- */
  /** An APPLE: a round body with a dimple at the top, a stalk and one leaf. */
  apple: () => (
    <group>
      <Ball at={[0, -0.08, 0]} r={0.32} c={C.red} sy={0.96} />
      {/* The dimple: a slab-coloured notch is wrong here, so it is two lobes meeting instead. */}
      <Ball at={[-0.14, 0.16, 0]} r={0.14} c={C.red} />
      <Ball at={[0.14, 0.16, 0]} r={0.14} c={C.red} />
      <Bar at={[0, 0.32, 0]} w={0.05} h={0.18} c={C.woodDeep} rot={0.14} />
      <Ball at={[0.16, 0.36, 0]} r={0.11} c={C.leafDeep} sx={1.2} sy={0.5} />
      <Ball at={[-0.14, 0.0, 0.28]} r={0.06} c={C.coral} />
    </group>
  ),
  /** A PEAR: narrow at the shoulder and heavy at the base. The taper is the whole difference from an apple. */
  pear: () => (
    <group>
      <Ball at={[0, -0.16, 0]} r={0.28} c={C.leaf} sy={0.92} />
      <Ball at={[0, 0.12, 0]} r={0.19} c={C.leaf} sy={1.05} />
      <Bar at={[0.02, 0.34, 0]} w={0.05} h={0.18} c={C.woodDeep} rot={-0.16} />
      <Ball at={[-0.12, 0.06, 0.24]} r={0.05} c={C.green} />
    </group>
  ),
  /** A PLUM: a small deep-violet oval with the crease down it that every plum has. */
  plum: () => (
    <group>
      <Ball at={[0, -0.04, 0]} r={0.29} c={C.violet} sx={0.92} />
      <Bar at={[0, -0.04, 0.24]} w={0.045} h={0.5} c={'#7a4fae'} />
      <Bar at={[0.04, 0.3, 0]} w={0.04} h={0.14} c={C.leafDeep} rot={-0.2} />
      <Ball at={[-0.13, 0.08, 0.22]} r={0.05} c={C.pink} />
    </group>
  ),
  /** A LIME: a green citrus, cut, so the segments show. The wedges are what keep it off `apple` and `pear`. */
  lime: () => (
    <group>
      <Disc at={[0, -0.02, 0]} r={0.32} c={C.leafDeep} />
      <Disc at={[0, -0.02, 0.09]} r={0.26} c={C.green} />
      {Array.from({ length: 6 }, (_, i) => (
        <Bar
          key={i}
          at={[0, -0.02, 0.14]}
          w={0.44}
          h={0.035}
          c={C.pale}
          rot={(i / 6) * Math.PI}
        />
      ))}
      <Disc at={[0, -0.02, 0.16]} r={0.05} c={C.pale} />
    </group>
  ),
  /** A CARROT: an orange cone pointing DOWN with a feathery top. Nothing else in the set is a cone. */
  carrot: () => (
    <group>
      <Wedge at={[0, -0.1, 0]} r={0.19} h={0.62} c={C.ember} rot={Math.PI} />
      {/* Two ridges across it, which is what a carrot has and a traffic cone does not. */}
      {[-0.16, 0.04].map((y, i) => (
        <Bar key={i} at={[0, y, 0.12]} w={0.2 - i * 0.06} h={0.03} c={C.gold} />
      ))}
      {[-0.5, 0, 0.5].map((a, i) => (
        <Ball key={i} at={[Math.sin(a) * 0.16, 0.34 + Math.cos(a) * 0.06, 0]} r={0.11} c={C.leafDeep} sx={0.5} sy={1.2} />
      ))}
    </group>
  ),
  /** A PEA POD, opened, with three peas in a row. Round-in-a-line is the read; `bean` is closed and curved. */
  pea: () => (
    <group>
      <Arc at={[0, -0.06, 0]} r={0.34} t={0.075} c={C.leafDeep} span={3.0} from={3.3} />
      {[-0.2, 0, 0.2].map((x, i) => (
        <Ball key={i} at={[x, 0.0, 0.04]} r={0.13} c={C.green} />
      ))}
      <Bar at={[-0.34, 0.2, 0]} w={0.04} h={0.14} c={C.leafDeep} rot={0.5} />
    </group>
  ),
  /** A RING: a band with a gem on it. Told from `tire` by being thin, gold, and jewelled. */
  ring: () => (
    <group>
      <Ring at={[0, -0.1, 0]} r={0.27} t={0.05} c={C.gold} />
      <Wedge at={[0, 0.28, 0]} r={0.12} h={0.2} c={C.water} seg={6} />
      <Wedge at={[0, 0.4, 0]} r={0.12} h={0.14} c={C.pale} seg={6} rot={Math.PI} />
    </group>
  ),
  /** A TIRE: a fat dark torus with tread blocks round it and a pale hub. */
  tire: () => (
    <group>
      <Ring at={[0, 0, 0]} r={0.3} t={0.13} c={C.ink} />
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return <Bar key={i} at={[Math.cos(a) * 0.4, Math.sin(a) * 0.4, 0]} w={0.1} h={0.05} c={C.stoneDeep} rot={a} />;
      })}
      <Disc at={[0, 0, 0.06]} r={0.15} c={C.stone} />
    </group>
  ),
  /** A TRIANGLE. A shape word, so it is drawn as the shape and nothing else. */
  triangle: () => (
    <group>
      <Wedge at={[0, -0.06, 0]} r={0.42} h={0.66} c={C.violet} seg={3} ry={Math.PI / 2} />
      <Wedge at={[0, -0.04, 0.1]} r={0.3} h={0.48} c={C.pink} seg={3} ry={Math.PI / 2} />
    </group>
  ),
  /**
   * A CORNER: two walls meeting, with the right angle marked.
   *
   * The bank uses `corner` as a `global_mismatch` distractor — plainly not a member of whatever is being
   * sorted — so what it has to be is UNMISTAKABLY ITSELF and unlike everything around it. An L of two thick
   * bars with a small square in the crook is the way every drawing has ever said "right angle".
   */
  corner: () => (
    <group>
      <Bar at={[-0.02, -0.34, 0]} w={0.76} h={0.14} c={C.stoneDeep} />
      <Bar at={[-0.32, 0.04, 0]} w={0.14} h={0.62} c={C.stoneDeep} />
      <Bar at={[-0.16, -0.18, 0.1]} w={0.16} h={0.16} c={C.stone} />
    </group>
  ),
  /**
   * ROLLING: a ball part-way along its own track, with the arcs it left behind.
   *
   * A verb, used as an associate distractor for the round-things categories, and it must not be `ball` —
   * which is exactly what a naive mapping would have made it, in items where `ball` is another option. So
   * the drawing is the MOTION: the ground line, the trail, and a curved arrow round the ball itself.
   */
  roll: () => (
    <group>
      <Bar at={[0, -0.36, 0]} w={0.86} h={0.06} c={C.taupe} />
      <Ball at={[0.2, -0.14, 0]} r={0.2} c={C.coral} />
      <Arc at={[0.2, -0.14, 0.14]} r={0.13} t={0.035} c={C.pale} span={3.6} from={0.6} />
      <Wedge at={[0.34, -0.02, 0.14]} r={0.05} h={0.1} c={C.pale} rot={-1.2} />
      {[-0.34, -0.12].map((x, i) => (
        <Arc key={i} at={[x, -0.2, 0]} r={0.14 - i * 0.02} t={0.03} c={C.stone} span={1.6} from={0.4} />
      ))}
    </group>
  ),
  /**
   * THE THREE COLOUR WORDS, as tiles of that colour.
   *
   * A `colors` item asks which new word goes in the box with `red` and `pink`, so the option has to BE its
   * colour — there is nothing else about the word to draw. A rounded tile with a lighter inner face, so it
   * reads as a painted chip rather than as a flat rectangle of nothing.
   */
  swatchRed: () => (
    <group>
      <Bar at={[0, 0, 0]} w={0.68} h={0.6} c={C.red} d={0.2} />
      <Bar at={[0, 0.02, 0.11]} w={0.5} h={0.42} c={C.coral} d={0.06} />
    </group>
  ),
  swatchBlue: () => (
    <group>
      <Bar at={[0, 0, 0]} w={0.68} h={0.6} c={C.waterDeep} d={0.2} />
      <Bar at={[0, 0.02, 0.11]} w={0.5} h={0.42} c={C.blue} d={0.06} />
    </group>
  ),
  swatchGreen: () => (
    <group>
      <Bar at={[0, 0, 0]} w={0.68} h={0.6} c={C.leafDeep} d={0.2} />
      <Bar at={[0, 0.02, 0.11]} w={0.5} h={0.42} c={C.green} d={0.06} />
    </group>
  ),
  /** A BANANA: one curved yellow crescent with a dark tip. */
  banana: () => (
    <group>
      <Arc at={[0, 0.06, 0]} r={0.32} t={0.115} c={C.sun} span={2.1} from={3.6} />
      <Arc at={[0.02, 0.04, 0.06]} r={0.3} t={0.045} c={C.gold} span={1.9} from={3.7} />
      <Ball at={[-0.28, 0.2, 0]} r={0.06} c={C.leafDeep} />
      <Ball at={[0.3, -0.16, 0]} r={0.055} c={C.woodDeep} />
    </group>
  ),
  /** A TOMATO: round, red, with a green star of a calyx and one shine. */
  tomato: () => (
    <group>
      <Ball at={[0, -0.06, 0]} r={0.32} c={C.red} sy={0.9} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Ball
          key={i}
          at={[Math.cos((i / 5) * Math.PI * 2) * 0.14, 0.24 + Math.sin((i / 5) * Math.PI * 2) * 0.1, 0.08]}
          r={0.09}
          c={C.leafDeep}
          sy={0.5}
        />
      ))}
      <Bar at={[0, 0.34, 0]} w={0.05} h={0.12} c={C.leafDeep} />
      <Ball at={[-0.12, 0.02, 0.28]} r={0.07} c={C.coral} />
    </group>
  ),
  /** A BEAN POD: one curved green pod with three beans showing through it. */
  bean: () => (
    <group>
      <Ball at={[0, -0.02, 0]} r={0.34} c={C.leaf} sx={0.44} sy={1.1} />
      <Ball at={[0.02, 0.28, 0]} r={0.16} c={C.leafDeep} sx={0.4} sy={0.7} />
      <Bar at={[0.06, 0.44, 0]} w={0.04} h={0.14} c={C.leafDeep} rot={-0.3} />
      {[-0.16, 0.0, 0.16].map((y, i) => (
        <Ball key={i} at={[0, y - 0.04, 0.14]} r={0.08} c={C.green} />
      ))}
    </group>
  ),
  /**
   * A FROST STAR, and it exists so that *frost* and *winter* are not the same picture.
   *
   * Both were landing on `snow`, which draws snow FALLING out of a cloud — right for winter, and wrong for
   * frost, which is a pattern that forms ON something. Six spokes with barbs, laid on a pale ground.
   */
  iceCrystal: () => (
    <group>
      {[0, 1, 2].map((i) => (
        <Bar key={i} at={[0, 0, 0]} w={0.78} h={0.075} c={C.pale} rot={(i * Math.PI) / 3} />
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i * Math.PI) / 3;
        return (
          <group key={`b${i}`}>
            <Bar at={[Math.cos(a) * 0.26, Math.sin(a) * 0.26, 0.04]} w={0.2} h={0.055} c={C.white} rot={a + 0.7} />
            <Bar at={[Math.cos(a) * 0.26, Math.sin(a) * 0.26, 0.04]} w={0.2} h={0.055} c={C.white} rot={a - 0.7} />
          </group>
        );
      })}
      <Disc at={[0, 0, 0.06]} r={0.1} c={C.white} />
    </group>
  ),
  /**
   * A TOOTHBRUSH, for "He gets a brush." — which was drawing an artist's paintbrush, in a story whose next
   * event is brushing teeth.
   *
   * Told apart from `brush` by three things a child reads instantly: it is HORIZONTAL rather than held at
   * a painter's angle, its head is a flat block of bristles rather than a point, and there is a worm of
   * paste laid along it. The paste is what makes it unmistakable, and it is also what stops it reading as
   * a hairbrush.
   */
  toothbrush: () => (
    <group>
      <Limb at={[-0.06, -0.08, 0]} r={0.075} len={0.62} c={C.blue} rot={Math.PI / 2 + 0.16} />
      {/* The head: a wider block at one end, so the silhouette is a T rather than a stick. */}
      <Bar at={[0.34, 0.02, 0]} w={0.26} h={0.15} c={C.pale} rot={0.16} />
      {/* Bristles, three tufts standing up off the head. */}
      {[-0.08, 0.02, 0.12].map((dx, i) => (
        <Bar key={i} at={[0.28 + dx, 0.15, 0]} w={0.07} h={0.14} c={C.white} rot={0.16} />
      ))}
      {/* The paste, a fat pale-green worm along the bristles. */}
      <Limb at={[0.3, 0.26, 0.04]} r={0.055} len={0.22} c={C.green} rot={Math.PI / 2 + 0.16} />
    </group>
  ),
  /**
   * A TAP, running or shut, for the story that was being told with a LIGHT SWITCH.
   *
   * A switch is a convention: a child has to have been taught that a bar with a bump at one end means "on"
   * before the item can be answered at all, and half of them have not. A tap is an object — a spout over a
   * basin — and whether water is coming out of it is a fact about the picture rather than a code. So `start`
   * runs a stream into a filling basin and `empty` leaves the spout dry with the handle turned down.
   */
  tap: ({ state }) => {
    const running = state === 'start';
    return (
      <group>
        {/* The riser and the spout, an upside-down L with a rounded bend. */}
        <Bar at={[-0.28, 0.06, 0]} w={0.12} h={0.6} c={C.stoneDeep} />
        <Bar at={[-0.06, 0.3, 0]} w={0.5} h={0.11} c={C.stoneDeep} />
        <Bar at={[0.16, 0.19, 0]} w={0.12} h={0.16} c={C.stoneDeep} />
        {/* The handle: across the top when running, dropped when shut. */}
        <Bar at={[-0.28, 0.42, 0]} w={running ? 0.3 : 0.11} h={running ? 0.09 : 0.24} c={C.gold} />
        {running ? <Pour at={[0.16, -0.02, 0]} h={0.32} c={C.water} /> : null}
        {/* The basin. It holds water when the tap has been running. */}
        <Tube at={[0.12, -0.32, 0]} rt={0.34} rb={0.24} h={0.24} c={C.pale} open />
        <Ring at={[0.12, -0.2, 0]} r={0.34} t={0.035} c={C.stone} />
        {running ? <Tube at={[0.12, -0.3, 0]} rt={0.3} rb={0.25} h={0.16} c={C.water} /> : null}
      </group>
    );
  },
  /**
   * THE BATTER: a mixing bowl with a spoon standing in it and the mix swirled.
   *
   * "We mix the batter." was landing on `bowl` at `partial`, i.e. a HALF-EATEN DINNER — the wrong moment of
   * the wrong story, in an item whose other two events are a cake going into the oven and a cake being
   * eaten. A deep bowl, a pale mix filled nearly to the rim, a swirl drawn on its surface and a wooden
   * spoon leaning out of it. The spoon at an angle is the part that means "being mixed" rather than "sitting
   * there", which is the difference the sentence turns on.
   */
  batter: () => (
    <group>
      <Tube at={[0, -0.18, 0]} rt={0.42} rb={0.28} h={0.36} c={C.stone} open />
      <Ring at={[0, 0.0, 0]} r={0.42} t={0.045} c={C.stoneDeep} />
      {/* The mix, high in the bowl. */}
      <Tube at={[0, -0.08, 0]} rt={0.38} rb={0.32} h={0.18} c={C.milk} />
      {/* The swirl on top of it. */}
      <Arc at={[-0.04, 0.02, 0.14]} r={0.15} t={0.04} c={C.gold} span={4.2} />
      {/* The spoon, leaning out to the right. */}
      <Bar at={[0.34, 0.24, 0]} w={0.08} h={0.56} c={C.wood} rot={-0.42} />
      <Ball at={[0.14, -0.04, 0.06]} r={0.12} c={C.wood} sy={0.72} />
    </group>
  ),
  /**
   * A BABY'S BOTTLE, empty or full, for the two events that were an empty and a full dinner bowl.
   *
   * A bowl is what the rest of the bank eats out of, so the baby's story was borrowing the wrong container
   * and colliding with it across items. A bottle is unmistakably a baby's, it is unmistakably the thing the
   * dad in the third event is holding, and it has a fill level — so "the baby is hungry" and "the dad feeds
   * it" become one object at two levels, which is what makes them orderable.
   */
  bottle: ({ state }) => {
    const f = fillOf(state);
    return (
      <group>
        {/* Body, shoulder, neck, teat: four pieces, and the teat is the whole read. */}
        <Tube at={[0, -0.22, 0]} rt={0.24} rb={0.24} h={0.46} c={C.pale} open />
        <Tube at={[0, 0.06, 0]} rt={0.14} rb={0.24} h={0.14} c={C.pale} />
        <Tube at={[0, 0.19, 0]} rt={0.13} rb={0.13} h={0.14} c={C.stone} />
        <Wedge at={[0, 0.36, 0]} r={0.11} h={0.24} c={C.pink} />
        {f > 0 ? <Tube at={[0, -0.44 + (0.42 * f) / 2, 0]} rt={0.21} rb={0.21} h={0.42 * f} c={C.milk} /> : null}
        {/* Measure marks, so the level is readable as a level rather than as a two-tone bottle. */}
        {[-0.08, -0.22].map((y, i) => (
          <Bar key={i} at={[0.16, y, 0.16]} w={0.12} h={0.03} c={C.taupe} />
        ))}
      </group>
    );
  },
  /**
   * TIRED, for "She feels tired." — which was drawing a BED.
   *
   * A bed answers a different question. She has just run; she is not going to sleep, and the story's third
   * event is not bedtime. So: a figure sitting down, head dropped forward, with two beads of sweat and a
   * long breath out. Sitting is the part that does the work — every other figure in this file stands.
   */
  weary: () => (
    <group>
      {/* Head, dropped forward and to one side. */}
      <Ball at={[-0.06, 0.2, 0]} r={0.16} c={C.skin} />
      {/* Body, leaning. */}
      <Limb at={[0.02, -0.08, 0]} r={0.13} len={0.16} c={C.coral} rot={-0.24} />
      {/* Legs out in front, i.e. sitting on the ground. */}
      <Bar at={[0.24, -0.3, 0]} w={0.34} h={0.09} c={C.blue} rot={-0.12} />
      <Bar at={[0.2, -0.4, 0]} w={0.3} h={0.09} c={C.blue} rot={0.06} />
      <Bar at={[-0.1, -0.44, 0]} w={0.5} h={0.07} c={C.taupe} />
      {/* Two beads of sweat off the brow, and a long breath. */}
      <Limb at={[0.16, 0.34, 0.1]} r={0.04} len={0.06} c={C.water} />
      <Limb at={[0.3, 0.2, 0.1]} r={0.035} len={0.05} c={C.water} />
      <Arc at={[0.14, 0.06, 0.12]} r={0.1} t={0.03} c={C.taupe} span={2.2} from={-1} />
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
  /**
   * ONE PICTURE AT THREE STAGES: drawn, coloured, hung up.
   *
   * That is a whole item of the bank — *I draw a picture / I color it in / I hang it up* — and it was being
   * told with a BRUSH, a brush with a blob on it, and a frame. Two of the three events therefore showed the
   * TOOL rather than the work, which is the near-miss the owner is objecting to: the story is about the
   * picture, and the picture is the thing that changes.
   *
   * So `start` is a bare sheet with the subject sketched in outline — no frame, because it is not framed
   * yet; `full` is the same sheet with the same subject filled in with colour; `up` is the finished thing in
   * a frame on a nail with a hanging wire. The SUBJECT IS THE SAME SHAPES IN ALL THREE — a tree and a house
   * roof — which is what makes them read as three moments of one object rather than three pictures.
   */
  picture: ({ state }) => {
    const outline = state === 'start';
    const framed = state !== 'start' && state !== 'full';
    return (
      <group>
        <Bar at={[0, 0, -0.04]} w={0.7} h={0.58} c={C.milk} d={0.12} />
        {framed ? (
          <group>
            <Bar at={[0, 0.3, 0]} w={0.78} h={0.08} c={C.wood} />
            <Bar at={[0, -0.3, 0]} w={0.78} h={0.08} c={C.wood} />
            <Bar at={[-0.35, 0, 0]} w={0.08} h={0.68} c={C.wood} />
            <Bar at={[0.35, 0, 0]} w={0.08} h={0.68} c={C.wood} />
          </group>
        ) : null}
        {/* The subject. Outlined in pencil at `start`, the same two shapes filled at `full` and beyond. */}
        {outline ? (
          <group>
            <Ring at={[-0.14, -0.06, 0.06]} r={0.13} t={0.022} c={C.taupe} />
            <Bar at={[-0.14, -0.26, 0.06]} w={0.03} h={0.14} c={C.taupe} />
            <Bar at={[0.12, -0.12, 0.06]} w={0.26} h={0.03} c={C.taupe} />
            <Bar at={[0.0, 0.0, 0.06]} w={0.03} h={0.24} c={C.taupe} rot={-0.6} />
            <Bar at={[0.24, 0.0, 0.06]} w={0.03} h={0.24} c={C.taupe} rot={0.6} />
          </group>
        ) : (
          <group>
            <Ball at={[-0.14, -0.06, 0.06]} r={0.13} c={C.leaf} />
            <Bar at={[-0.14, -0.26, 0.06]} w={0.04} h={0.16} c={C.woodDeep} />
            <Wedge at={[0.12, 0.02, 0.06]} r={0.15} h={0.22} c={C.blue} />
            <Bar at={[0.12, -0.2, 0.06]} w={0.22} h={0.18} c={C.coral} />
          </group>
        )}
        {/* The pencil that is doing the outlining, at `start` only. */}
        {outline ? (
          <group>
            <Bar at={[0.32, -0.3, 0.12]} w={0.08} h={0.36} c={C.gold} rot={-0.5} />
            <Wedge at={[0.22, -0.44, 0.12]} r={0.05} h={0.12} c={C.wood} rot={Math.PI - 0.5} />
          </group>
        ) : null}
        {/* Hung: the wire and the nail above it. */}
        {state === 'up' ? (
          <group>
            <Arc at={[0, 0.36, 0]} r={0.16} t={0.028} c={C.taupe} span={Math.PI} />
            <Ball at={[0, 0.52, 0]} r={0.06} c={C.stoneDeep} />
          </group>
        ) : null}
      </group>
    );
  },
  /**
   * A TEST PAPER: a sheet with question lines and answer boxes, and a pencil across it.
   *
   * The item is *studies all week / takes the test / earns a good grade* and this middle event was drawing a
   * QUILL — a goose feather and an inkpot. The owner's note is exactly this one: "the test taking one
   * doesn't look like it". What a child has actually sat in front of is a sheet of paper with rows on it and
   * a pencil, so that is what this is. The empty answer boxes down the right are the part that says "test"
   * rather than "letter": a page you have to fill in.
   */
  testPaper: () => (
    <group>
      <Bar at={[0, 0.02, -0.02]} w={0.64} h={0.8} c={C.white} d={0.1} />
      {/* Question rows, shortening down the page, each with an empty box beside it. */}
      {[0.26, 0.06, -0.14, -0.34].map((y, i) => (
        <group key={i}>
          <Bar at={[-0.12, y, 0.05]} w={0.32 - i * 0.03} h={0.045} c={C.taupe} />
          <Ring at={[0.18, y, 0.05]} r={0.055} t={0.018} c={C.stoneDeep} />
        </group>
      ))}
      {/* A tick in the first box: the child has started. */}
      <Bar at={[0.17, -0.01, 0.09]} w={0.03} h={0.09} c={C.green} rot={0.6} />
      <Bar at={[0.2, 0.02, 0.09]} w={0.03} h={0.13} c={C.green} rot={-0.5} />
      {/* The pencil, lying across the corner. */}
      <Bar at={[0.26, -0.34, 0.12]} w={0.09} h={0.44} c={C.gold} rot={-0.7} />
      <Wedge at={[0.11, -0.45, 0.12]} r={0.055} h={0.12} c={C.wood} rot={Math.PI - 0.7} />
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
  /**
   * A JAR WITH MONEY IN IT, which the generic `jar` cannot be: its fill is drawn in WATER BLUE.
   *
   * The saving-up story ran coins → a jar of water → a bike, and the middle picture was quietly telling the
   * child about a completely different jar. Filled with coins on edge instead, plus one dropping in over the
   * mouth, which is what says "fills up" — a jar that already has coins in it is a static fact, whereas a
   * coin in mid-air is the event.
   */
  coinJar: () => (
    <group>
      <Tube at={[0, -0.1, 0]} rt={0.3} rb={0.3} h={0.56} c={C.pale} open />
      <Ring at={[0, 0.19, 0]} r={0.31} t={0.04} c={C.stone} />
      {/* Coins stacked and leaning, filling most of the jar. */}
      {[
        [-0.11, -0.3, 0],
        [0.12, -0.29, 0.2],
        [-0.02, -0.13, -0.15],
        [0.15, -0.08, 0.1],
        [-0.15, 0.02, 0.25],
        [0.04, 0.06, -0.2],
      ].map(([x, y, r], i) => (
        <mesh key={i} position={[x ?? 0, y ?? 0, 0]} rotation={[Math.PI / 2, 0, r ?? 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.05, 16]} />
          <meshStandardMaterial color={i % 2 ? C.gold : C.sun} {...MAT} />
        </mesh>
      ))}
      {/* One more going in. */}
      <Disc at={[0.02, 0.42, 0.06]} r={0.11} c={C.gold} d={0.05} />
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
