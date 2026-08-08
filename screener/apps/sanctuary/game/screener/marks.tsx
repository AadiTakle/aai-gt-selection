import { useMemo } from 'react';

/**
 * HOW MANY, DRAWN AS THINGS YOU CAN COUNT. Shared by every quantitative dressing in this directory.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE, and it is a measurement rule rather than a taste one:
 *
 *   1. A QUANTITY IS NEVER A NUMERAL. `QUANT-SERIES-01` carries a `display` field that says `"dots"`
 *      on its easy items and `"numeral"` on its hard ones, and this file ignores it completely and
 *      always draws objects. A numeral turns a reasoning item into a reading item, and this game is
 *      aimed at K-2. A child who cannot yet read "13" can absolutely see that a heap is two rows of
 *      five and three more.
 *
 *   2. THE INDIVIDUAL OBJECT IS THE SAME SIZE IN EVERY CLUSTER OF ONE ITEM. This is the whole reason
 *      `fitCluster` takes the item's LARGEST count rather than each cluster's own. Size one heap to
 *      its own space and four big berries out-mass five small ones, at which point the item measures
 *      area and the child who answers "more" is right and marked wrong. One size, chosen once, from
 *      the biggest number on show, used by every term and every candidate.
 *
 *   3. FIVES, SO IT IS COUNTABLE. A blob of eleven is not countable by anybody. Rows of five with a
 *      visible break, stacked into blocks of twenty, is how counting actually happens: five, ten,
 *      one more. The bank reaches 84 on its hardest items, so the layout has to survive that too,
 *      which it does by tiling blocks of twenty into a near-square rather than one enormous column.
 *
 * `theme.ts` in this directory already reasoned its way to fives and is quoted by that decision; this
 * file is the frontal version of it, because everything in these dressings faces the child rather
 * than lying on a floor, and a heap laid out in depth reads as a smear from the game's camera.
 */

/**
 * The colour table, lifted from `game/screener/PodWall.tsx`.
 *
 * Copied rather than imported because `PodWall` keeps it private and that file belongs to someone
 * else. The values matter and are not arbitrary: they are the bank's six colour names LIGHTENED for a
 * world lit by one soft lamp, and the darkest of them is a slate rather than a near-black, because
 * pale marks on pale stone stop being countable the moment a shadow lands on them.
 */
export const INK: Record<string, string> = {
  teal: '#37b3aa',
  ink: '#5d7183',
  violet: '#a074d6',
  blue: '#4f8ee0',
  gold: '#efb445',
  coral: '#f0796a',
};

export function inkOf(name: string): string {
  return INK[name] ?? INK.teal!;
}

/* ============================================================================
   layout
   ========================================================================== */

const COLS = 5;
const ROWS_PER_BLOCK = 4;
const PER_BLOCK = COLS * ROWS_PER_BLOCK;
/** Vertical pitch inside a block, in gap units. Slightly over 1 so rows do not touch. */
const ROW_PITCH = 1.16;
/** Where a block starts relative to the previous one. The gutter is what makes a block a block. */
const BLOCK_PITCH_X = COLS + 0.9;
const BLOCK_PITCH_Y = ROWS_PER_BLOCK * ROW_PITCH + 0.8;

export interface ClusterLayout {
  /** Centred offsets in GAP UNITS. Multiply by the gap to get local space. */
  slots: readonly (readonly [number, number])[];
  /** Extent in gap units, for fitting. Never zero, so a single mark still gets breathing room. */
  w: number;
  h: number;
}

/**
 * Where each of `n` marks sits, in gap units, centred on the origin.
 *
 * Partial rows are LEFT-ALIGNED rather than centred, on purpose: eleven has to read as five, five and
 * one, and centring the last row throws away the alignment that makes that visible.
 */
export function clusterLayout(n: number): ClusterLayout {
  const count = Math.max(0, Math.min(400, Math.round(n)));
  const blocks = Math.max(1, Math.ceil(count / PER_BLOCK));
  const metaCols = Math.max(1, Math.ceil(Math.sqrt(blocks)));

  const raw: [number, number][] = [];
  for (let i = 0; i < count; i += 1) {
    const b = Math.floor(i / PER_BLOCK);
    const k = i % PER_BLOCK;
    const bx = b % metaCols;
    const by = Math.floor(b / metaCols);
    raw.push([bx * BLOCK_PITCH_X + (k % COLS), -(by * BLOCK_PITCH_Y + Math.floor(k / COLS) * ROW_PITCH)]);
  }

  if (raw.length === 0) return { slots: [], w: 1, h: 1 };

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of raw) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  return {
    slots: raw.map(([x, y]) => [x - cx, y - cy] as const),
    // Plus one so the marks themselves have room: slots are centres, not edges.
    w: maxX - minX + 1,
    h: maxY - minY + 1,
  };
}

export interface ClusterFit {
  gap: number;
  radius: number;
}

/**
 * One gap and one mark radius for the WHOLE item, derived from its largest count.
 *
 * Called once per item with the biggest number that will appear anywhere on screen, and the result
 * handed to every cluster. That is rule 2 at the top of this file, expressed as a single call site
 * that is hard to get wrong.
 */
export function fitCluster(maxCount: number, fitW: number, fitH: number, baseGap = 0.3): ClusterFit {
  const l = clusterLayout(Math.max(1, maxCount));
  const gap = Math.min(baseGap, fitW / l.w, fitH / l.h);
  return { gap, radius: gap * 0.4 };
}

/* ============================================================================
   the marks themselves
   ========================================================================== */

/**
 * One countable object, at unit radius, drawn to be counted rather than admired.
 *
 * `shape` is an ACTIVE ATTRIBUTE of the series bank — its hardest items list `["count","shape"]` and
 * alternate dot with star from term to term — so flattening it to one solid would delete the rule the
 * child is meant to find. Two shapes only, and they are chosen to be unmistakable in silhouette at
 * three millimetres on a school laptop.
 */
export function MarkSolid({ shape, color }: { shape: string; color: string }) {
  const mat = (
    <meshPhysicalMaterial
      color={color}
      roughness={0.26}
      clearcoat={1}
      clearcoatRoughness={0.2}
      sheen={0.5}
      sheenColor="#ffffff"
    />
  );
  if (shape === 'star') {
    // Two crossed octahedra: spiky from every angle, which a flat star is not.
    //
    // THE RADIUS MATTERS. It is deliberately no larger than the dot's, because on the items where
    // `shape` alternates term by term the two solids sit side by side in the same series — and a star
    // that is fifteen percent bigger than a berry (which is what this was) quietly reintroduces the
    // size confound this whole file exists to prevent, in the one place it does the most damage.
    return (
      <group>
        <mesh>
          <octahedronGeometry args={[1.0, 0]} />
          {mat}
        </mesh>
        <mesh rotation={[0, Math.PI / 4, Math.PI / 4]}>
          <octahedronGeometry args={[0.82, 0]} />
          {mat}
        </mesh>
      </group>
    );
  }
  return (
    <mesh>
      <sphereGeometry args={[1, 18, 14]} />
      {mat}
    </mesh>
  );
}

/**
 * `count` marks, laid out in fives, at the item's one shared mark size.
 *
 * Drawn in the local XY plane facing +Z because everything in these dressings faces the child.
 */
export function Cluster({
  count,
  shape = 'dot',
  color = INK.coral!,
  fit,
}: {
  count: number;
  shape?: string;
  color?: string;
  fit: ClusterFit;
}) {
  const layout = useMemo(() => clusterLayout(count), [count]);
  return (
    <group>
      {layout.slots.map(([x, y], i) => (
        <group key={i} position={[x * fit.gap, y * fit.gap, 0]} scale={fit.radius}>
          <MarkSolid shape={shape} color={color} />
        </group>
      ))}
    </group>
  );
}
