import { fbm } from './noise';
import {
  arcLengths,
  chainSegment,
  roundedRectOutline,
  sampleClosed,
  toWorld,
  type P2,
  type Placed,
  type Solid,
} from './plan';

/**
 * ALL THE RANCH'S FENCING, AS A PLAN. No three.js and no React — just where every post stands and what
 * stops a child at it.
 *
 * WHY THIS FILE EXISTS. The pens' fence solver used to live inline in `Buildings.tsx`, which was fine
 * while the only fencing on the ranch was three pens. It is not any more: the owner asked for a boundary
 * — "a fence around the entire ranch that goes beyond the trees but is obviously sectioning off the area
 * so the child can't explore beyond the ranch" — and a boundary is a two-hundred-metre run of the same
 * carpentry plus a promise that it HOLDS. A promise like that has to be provable, and a test cannot
 * import a `.tsx` that drags a renderer into node, so the arithmetic moved here where `boundary.test.ts`
 * can call it. `Buildings.tsx` draws these numbers; this file decides them.
 *
 * ONE VOCABULARY, TWO JOBS. The pens and the boundary are the same fence: the same post section, the same
 * spacing, the same rail stock, the same paint. That is deliberate rather than lazy — a second fence
 * language on one farm reads as two farms. What separates them is stated instead:
 *
 *   A PEN has two rails and its gate STANDS OPEN, because a pen is somewhere a child is invited into and
 *   an open gate is the invitation.
 *
 *   THE BOUNDARY has three rails, corner posts a head taller than the line posts, and its gates are SHUT
 *   AND BARRED. Three rails at closer centres is what a stock-proof field fence looks like from ten
 *   metres; the taller corner posts are what punctuate a long run so it reads as built rather than
 *   extruded; and the shut gate is the whole answer to the owner's ask. A gate left open in the boundary
 *   would be a hole in it, and a five-year-old will find a hole in a fence faster than they will find the
 *   barn.
 *
 * IT IS THE SAME HEIGHT AS A PEN FENCE — 1.42m against a 1.5m eye — and that is a decision, not an
 * oversight. A boundary tall enough to hide the wood behind it is a wall, and a wall around a child's
 * ranch is a pen with the child in it. At 1.42m a five-year-old walking up to it sees the trees carry on
 * over the top rail: the world does not stop, their part of it does.
 *
 * NOTHING HERE IS DRAWN AS A MESH. Every post, cap, rail and gate bar below is emitted as a placement for
 * one of `Buildings.tsx`'s existing `InstancedMesh` sets — the same five geometries the pens already use.
 * A hundred and thirty separate post meshes around a ranch would be the single most expensive object in
 * the scene; folded into the sets that already exist, the entire boundary costs ZERO additional draw
 * calls. See the note over `BOUNDARY` for the sums.
 */

/* ------------------------------------------------------------------ *\
   Stock: the dimensions every fence on the ranch is built from
\* ------------------------------------------------------------------ */

export const POST_SPACING = 1.62;
export const POST_H = 1.42;
export const POST_W = 0.17;
export const GATE_POST_EXTRA = 0.42;
/** Half the gap left for a pen's gate, measured along the fence line. */
export const GATE_HALF = 1.55;

/** Rail centres on a pen. Two, because a pen is a low enclosure you look over into. */
export const PEN_RAIL_HEIGHTS: readonly number[] = [0.52, 1.02];
/**
 * And on the boundary. Three, at closer centres, which is the cheapest possible way of saying "this one
 * is meant to hold something in" without making the fence any taller than a pen's.
 */
export const BOUNDARY_RAIL_HEIGHTS: readonly number[] = [0.38, 0.79, 1.2];

/* ------------------------------------------------------------------ *\
   The pens
\* ------------------------------------------------------------------ */

export interface PenSpec extends Placed {
  halfW: number;
  halfD: number;
  cornerR: number;
  /** A point in the world the gate should open toward. Puts the gate on the path side, always. */
  gateAim: readonly [number, number];
}

/**
 * MOVED HERE FROM `Buildings.tsx` UNCHANGED, and the move is what lets `paths.ts` exist.
 *
 * A worn spur has to END at a pen's gate, and the gate is not a typed coordinate — it is solved from the
 * pen's own outline. So the module that lays out the tracks needs the pens, and the module that draws
 * them needs both. Leaving the pens inside the renderer would have meant either a cycle or a second,
 * hand-copied set of pen positions, which is the failure mode every comment in this directory is about.
 */
export const PENS: readonly PenSpec[] = [
  { x: -6.0, z: 15.5, rot: 0.14, halfW: 4.75, halfD: 3.5, cornerR: 1.6, gateAim: [0, 8] },
  { x: 11.4, z: 4.2, rot: -0.2, halfW: 4.75, halfD: 3.5, cornerR: 1.6, gateAim: [3, 2] },
  /**
   * PEN 2'S GATE WAS RE-AIMED FROM (-7, -9) TO THE NORTH OF THE PEN, and it is the one layout change this
   * job made to something nobody had complained about. It was forced by geometry rather than chosen.
   *
   * Aimed east-north-east, the gate sat at (-10.89, -14.05) and the only approach to it was a corridor
   * between the shop stall's milk churn at (-6.0, -11.2) and the felled-log station's cradle post at
   * (-7.7, -11.0). Those two are 1.71m apart, which is 1.01m of clear ground — and a keeper is 0.90m
   * across. A child could squeeze through with five centimetres either side, which fails this codebase's
   * own standard for an opening: the barn's doorway is deliberately four times a keeper's width "so a
   * child never has to aim". Both props live in `stations/` and `economy/` and cannot be moved.
   *
   * So the gate goes where a track can actually reach it. Every aim north of the pen resolves to the same
   * outline point — the north-west corner at (-17.54, -11.94) — whose approach at (-18.61, -9.57) has
   * 4.77m of clearance all round, reached by a track running west along the ranch's southern edge, south
   * of the barn and north of the log station. That route also passes the log station's standing spot, so
   * the far pen and the station now share an approach instead of neither having one.
   */
  { x: -15.5, z: -16.5, rot: 0.3, halfW: 5.0, halfD: 3.75, cornerR: 1.7, gateAim: [-16.5, -8.5] },
];

export interface Post {
  x: number;
  z: number;
  /** Fence direction at this post, as a world `rotation.y`. Orients the cap board. */
  angle: number;
  gatePost: boolean;
}
export interface Rail {
  x: number;
  z: number;
  angle: number;
  length: number;
}
export interface Gate {
  /** Hinge post, in world. */
  x: number;
  z: number;
  /** World `rotation.y` that points local +X from the hinge post toward the latch post. */
  angle: number;
  span: number;
  /** How far the gate stands open. Always open: an open gate is an invitation to walk in. */
  swing: number;
}

/**
 * Where a pen's gate opening is, in world.
 *
 * Split out of the fence solver because `paths.ts` needs the answer and nothing else about the fence: a
 * spur that stops short of the gate is exactly the defect the owner reported, and the only way a spur can
 * be guaranteed to reach a gate is for both to be reading the same number.
 */
export function penGate(pen: PenSpec): {
  mid: P2;
  /** Unit vector pointing out of the pen through the gate. */
  normal: P2;
  clear: number;
} {
  const outline = roundedRectOutline(pen.halfW, pen.halfD, pen.cornerR, 7);
  const { at, total } = arcLengths(outline);
  let sGate = 0;
  let best = Infinity;
  for (let i = 0; i < outline.length; i += 1) {
    const local = outline[i] ?? [0, 0];
    const w = toWorld(pen, local[0], local[1]);
    const d = Math.hypot(w[0] - pen.gateAim[0], w[1] - pen.gateAim[1]);
    if (d < best) {
      best = d;
      sGate = at[i] ?? 0;
    }
  }
  const mid = sampleClosed(outline, at, total, sGate);
  const a = sampleClosed(outline, at, total, sGate - GATE_HALF);
  const b = sampleClosed(outline, at, total, sGate + GATE_HALF);
  const wm = toWorld(pen, mid.p[0], mid.p[1]);
  const wa = toWorld(pen, a.p[0], a.p[1]);
  const wb = toWorld(pen, b.p[0], b.p[1]);
  const nx = wm[0] - pen.x;
  const nz = wm[1] - pen.z;
  const nl = Math.hypot(nx, nz) || 1;
  return {
    mid: [wm[0], wm[1]],
    normal: [nx / nl, nz / nl],
    clear: Math.hypot(wb[0] - wa[0], wb[1] - wa[1]),
  };
}

/**
 * The pens' posts, rails and gates. Solved once at module scope so the renderer and `SOLIDS` read the
 * same posts: generated inside a component, the collider would be a second, hand-maintained opinion about
 * where the fence is, and two opinions drift apart the moment anything moves.
 *
 * Unchanged from the version that lived in `Buildings.tsx`, down to the arc-length gate search.
 */
export const FENCE: { posts: Post[]; rails: Rail[]; gates: Gate[] } = (() => {
  const posts: Post[] = [];
  const rails: Rail[] = [];
  const gates: Gate[] = [];

  for (const pen of PENS) {
    const outline = roundedRectOutline(pen.halfW, pen.halfD, pen.cornerR, 7);
    const { at, total } = arcLengths(outline);

    // The gate goes wherever the fence passes closest to the point it should open toward, so it always
    // lands on the path side without anybody typing a gate position.
    let sGate = 0;
    let best = Infinity;
    for (let i = 0; i < outline.length; i += 1) {
      const local = outline[i] ?? [0, 0];
      const w = toWorld(pen, local[0], local[1]);
      const d = Math.hypot(w[0] - pen.gateAim[0], w[1] - pen.gateAim[1]);
      if (d < best) {
        best = d;
        sGate = at[i] ?? 0;
      }
    }

    // Posts march from one side of the gate opening all the way round to the other. The spacing is
    // solved to fit the run rather than fixed, so the last bay is never a stub.
    const run = total - 2 * GATE_HALF;
    const bays = Math.max(2, Math.round(run / POST_SPACING));
    const step = run / bays;
    const made: { x: number; z: number }[] = [];
    for (let i = 0; i <= bays; i += 1) {
      const sample = sampleClosed(outline, at, total, sGate + GATE_HALF + i * step);
      const w = toWorld(pen, sample.p[0], sample.p[1]);
      posts.push({
        x: w[0],
        z: w[1],
        // The local tangent angle `a` maps to a world direction of `a - rot`, and three's rotation.y is
        // the negative of an atan2(dz, dx) heading. Hence `rot - a`.
        angle: pen.rot - sample.angle,
        gatePost: i === 0 || i === bays,
      });
      made.push({ x: w[0], z: w[1] });
    }

    for (let i = 0; i < made.length - 1; i += 1) {
      const a = made[i];
      const b = made[i + 1];
      if (!a || !b) continue;
      const length = Math.hypot(b.x - a.x, b.z - a.z) - POST_W;
      if (length <= 0.05) continue;
      rails.push({
        x: (a.x + b.x) / 2,
        z: (a.z + b.z) / 2,
        angle: -Math.atan2(b.z - a.z, b.x - a.x),
        length,
      });
    }

    const hinge = made[made.length - 1];
    const latch = made[0];
    if (hinge && latch) {
      gates.push({
        x: hinge.x,
        z: hinge.z,
        angle: -Math.atan2(latch.z - hinge.z, latch.x - hinge.x),
        span: Math.hypot(latch.x - hinge.x, latch.z - hinge.z),
        swing: 0.62,
      });
    }
  }

  return { posts, rails, gates };
})();

/* ------------------------------------------------------------------ *\
   The boundary
\* ------------------------------------------------------------------ */

/**
 * WHERE THE BOUNDARY SITS, AND WHY IT IS THIS RADIUS AND NOT A LARGER ONE.
 *
 * `Game.tsx` clamps the keeper to `BOUND = 34` metres and this file may not change that. So a fence
 * further out than 34m is a fence a child can never touch, and the thing that actually stops them stays
 * the invisible clamp — which is precisely the failure this job exists to fix. A boundary the child is
 * held two metres short of by nothing at all is worse than no boundary, because it teaches them the
 * fence is a picture.
 *
 * So the run is laid at a mean 32.3m with a metre of wander, giving a worst-case vertex at about 33.1m.
 * A keeper of radius 0.45 stopped by a 0.42 collider comes to rest at 32.2m — INSIDE 34, everywhere,
 * with room to spare. The fence is therefore the only thing a child ever meets at the edge of the world,
 * and `boundary.test.ts` sweeps the whole perimeter to prove the clamp never gets a turn.
 *
 * IT IS PAST THE TREE LINE. The scatter in `Buildings.tsx` starts its belt at 23.5m and thickens outward
 * to 48m, so the run at 32.3m has eight metres of open woodland inside it and the thickest part of the
 * wood standing outside. Walking out from the yard a child crosses meadow, then trees, then meets the
 * fence with more trees beyond it — woodland and then a boundary, which is a farm edge. A fence drawn
 * INSIDE the belt would have been a wall in a field with a wood behind it, and the ranch would have felt
 * like a paddock rather than a place.
 */
const BOUNDARY_R = 32.3;
/** How far each corner wanders off the mean radius. Keeps the run off a compass-drawn circle. */
const BOUNDARY_WOBBLE = 0.82;
/**
 * Sides in the loop. Fourteen puts a corner post every ~14.4m, which is about nine bays — long enough to
 * read as a straight run of fencing and short enough that the loop never reads as a circle. A circular
 * boundary is an arena; a polygon is a field.
 */
const BOUNDARY_SIDES = 14;
/** Half the clear opening of a boundary gate. 3.1m clear, so the 2.7m road fits through it. */
const BOUNDARY_GATE_HALF = 1.55;
/** How far a scattered tree or bush has to stand off the line, so nothing grows through the rails. */
export const BOUNDARY_CLEAR = 1.35;

/** The closed outline, as world (x, z). Hard corners: a field fence has corner posts, not fillets. */
export const BOUNDARY_OUTLINE: readonly P2[] = (() => {
  const out: P2[] = [];
  for (let i = 0; i < BOUNDARY_SIDES; i += 1) {
    const a = (i / BOUNDARY_SIDES) * Math.PI * 2;
    const cx = Math.cos(a);
    const cz = Math.sin(a);
    // Sampled ON a circle in the noise domain, so the wander closes seamlessly at i = 0 instead of
    // stepping — which is what a per-index random would do, and it shows as one wrong corner.
    const r = BOUNDARY_R + fbm(cx * 1.15 + 3.7, cz * 1.15 - 2.1, 2) * BOUNDARY_WOBBLE;
    out.push([cx * r, cz * r]);
  }
  return out;
})();

/** Shortest distance from a point to the boundary line. Used to keep the scatter off it. */
export function distanceToBoundary(x: number, z: number): number {
  let best = Infinity;
  for (let i = 0; i < BOUNDARY_OUTLINE.length; i += 1) {
    const a = BOUNDARY_OUTLINE[i] ?? [0, 0];
    const b = BOUNDARY_OUTLINE[(i + 1) % BOUNDARY_OUTLINE.length] ?? [0, 0];
    const vx = b[0] - a[0];
    const vz = b[1] - a[1];
    const len2 = vx * vx + vz * vz;
    const t = len2 > 1e-9 ? Math.min(1, Math.max(0, ((x - a[0]) * vx + (z - a[1]) * vz) / len2)) : 0;
    best = Math.min(best, Math.hypot(x - (a[0] + vx * t), z - (a[1] + vz * t)));
  }
  return best;
}

/** True where nothing may grow, because it would grow through the fence. */
export function onBoundary(x: number, z: number, pad = 0): boolean {
  return distanceToBoundary(x, z) < BOUNDARY_CLEAR + pad;
}

/**
 * Where a ray from `origin` along `dir` leaves the ranch, as an arc length around the outline.
 *
 * This is how a gate gets put on the road rather than beside it. The alternative — typing an angle and
 * checking the screenshot — is how you end up with a gate two metres to the left of the track, which
 * reads as a farmer who cannot aim.
 */
function rayExit(outline: readonly P2[], origin: P2, dir: P2): number | null {
  const { at } = arcLengths(outline);
  let bestT = Infinity;
  let bestS: number | null = null;
  for (let i = 0; i < outline.length; i += 1) {
    const a = outline[i] ?? [0, 0];
    const b = outline[(i + 1) % outline.length] ?? [0, 0];
    const ex = b[0] - a[0];
    const ez = b[1] - a[1];
    // origin + t*dir = a + u*e, solved by cross products. `den` is zero when the ray is parallel.
    const den = dir[0] * ez - dir[1] * ex;
    if (Math.abs(den) < 1e-9) continue;
    const ox = a[0] - origin[0];
    const oz = a[1] - origin[1];
    const t = (ox * ez - oz * ex) / den;
    const u = (ox * dir[1] - oz * dir[0]) / den;
    if (t <= 0 || u < 0 || u > 1) continue;
    if (t < bestT) {
      bestT = t;
      bestS = (at[i] ?? 0) + u * Math.hypot(ex, ez);
    }
  }
  return bestS;
}

export interface BoundaryPost {
  x: number;
  z: number;
  /** World `rotation.y` along the run, for the cap board. */
  angle: number;
  /** Corner and jamb posts get the heavier, taller stock; line posts get the pen's. */
  heavy: boolean;
  /** 0..1 weathering, so two hundred metres of identical timber does not read as extrusion. */
  tint: number;
}

export interface BoundaryRail {
  x: number;
  y: number;
  z: number;
  angle: number;
  length: number;
  tint: number;
}

/** A gate bar, already resolved to a world placement: `Buildings.tsx` only has to hand it to `Instanced`. */
export interface Bar {
  position: readonly [number, number, number];
  /** ZYX Euler, as `instanced.tsx` composes them. */
  rot: readonly [number, number, number];
  scale: readonly [number, number, number];
}

/**
 * A unit bar along local +X, laid between two world points.
 *
 * SOLVED RATHER THAN EYEBALLED, because `instanced.tsx` composes its Euler in ZYX — about X, then Y, then
 * Z — and that is NOT the order `<group rotation={[0, yaw, 0]}><mesh rotation={[0, 0, tilt]}/></group>`
 * gives you, which is how the pens' gates are built. Under ZYX a bar's local +X lands at
 * `(cosY cosZ, cosY sinZ, -sinY)`, so aligning it with a direction `u` is two inverse trig calls and no
 * guesswork:
 *
 *   Y = asin(-u.z)          (cos Y is then non-negative, and a bar is the same bar end-for-end)
 *   Z = atan2(u.y, u.x)
 *
 * Getting this wrong does not throw. It puts a five-bar gate on its side, which is the kind of thing that
 * survives to a screenshot.
 */
export function barBetween(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  thickness = 1,
): Bar {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz) || 1e-6;
  const uz = Math.min(1, Math.max(-1, dz / len));
  const y = Math.asin(-uz);
  const cosY = Math.sqrt(Math.max(0, 1 - uz * uz));
  const z = cosY < 1e-6 ? 0 : Math.atan2(dy / len, dx / len);
  return {
    position: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
    rot: [0, y, z],
    scale: [len, thickness, thickness],
  };
}

export interface BoundaryGate {
  /** Centre of the opening, in world. */
  mid: P2;
  /** Unit vector along the opening, from one jamb to the other. */
  along: P2;
  /** Clear width between the jambs. */
  span: number;
}

interface Node {
  s: number;
  p: P2;
  kind: 'corner' | 'jamb';
}

/**
 * The boundary, solved.
 *
 * WHAT IT COSTS. Every part below is a placement in one of the five instanced sets `Pens()` already
 * builds — post, heavy post, cap, rail, gate bar. So the whole two-hundred-metre run adds no draw calls
 * at all: about 130 line posts and 12 corners join the pens' 60-odd posts in the same two meshes, ~400
 * rails join the pens' 120 in a third, and the two gates' bars join the pen gates in a fourth. The one
 * thing it does add is instance colour on the post and rail sets, which turns on `USE_INSTANCING_COLOR`
 * for those two programs and buys the weathering that stops a long run reading as a fence extruded by a
 * computer.
 *
 * WHY THE GATES ARE SHUT. See the file header. The collider goes across the closed leaf, so the thing
 * that stops a child is the thing they can see.
 */
export const BOUNDARY: {
  posts: BoundaryPost[];
  rails: BoundaryRail[];
  gates: BoundaryGate[];
  bars: Bar[];
  solids: Solid[];
} = (() => {
  const outline = BOUNDARY_OUTLINE;
  const { at, total } = arcLengths(outline);

  /**
   * The two gates, both on the ranch's own axis.
   *
   * The road gate is where the spine leaves the ranch to the north — aimed down the track's own last
   * heading, so it is on the road rather than near it — and the field gate is where the same axis leaves
   * to the south, which is the direction a child is facing the instant they arrive. Two gates on the
   * sightline, so the first and last thing the boundary says is "a farm", not "a fence".
   *
   * Typed as rays rather than as angles because `rayExit` then puts them exactly on the perimeter
   * whatever the wander does to it. The origins and headings are the spine's own end segments; see
   * `SPINE` in `paths.ts`, which extends the track out to meet the road gate.
   */
  const aims: readonly { origin: P2; dir: P2 }[] = [
    { origin: [1.4, 22], dir: [0.17888, 0.98387] },
    { origin: [0.2, -3], dir: [-0.03571, -0.99936] },
  ];

  const nodes: Node[] = [];
  const gateSpans: { from: number; to: number }[] = [];
  const gates: BoundaryGate[] = [];

  for (const aim of aims) {
    const s = rayExit(outline, aim.origin, aim.dir);
    if (s == null) continue;
    const from = s - BOUNDARY_GATE_HALF;
    const to = s + BOUNDARY_GATE_HALF;
    gateSpans.push({ from, to });
    const a = sampleClosed(outline, at, total, from);
    const b = sampleClosed(outline, at, total, to);
    const dx = b.p[0] - a.p[0];
    const dz = b.p[1] - a.p[1];
    const span = Math.hypot(dx, dz) || 1;
    nodes.push({ s: ((from % total) + total) % total, p: [a.p[0], a.p[1]], kind: 'jamb' });
    nodes.push({ s: ((to % total) + total) % total, p: [b.p[0], b.p[1]], kind: 'jamb' });
    gates.push({
      mid: [(a.p[0] + b.p[0]) / 2, (a.p[1] + b.p[1]) / 2],
      along: [dx / span, dz / span],
      span,
    });
  }

  /** True if this arc length falls inside a gate opening. Wrapped, so a gate may straddle s = 0. */
  const inGate = (s: number): boolean => {
    const q = ((s % total) + total) % total;
    for (const g of gateSpans) {
      const from = ((g.from % total) + total) % total;
      const to = ((g.to % total) + total) % total;
      if (from <= to ? q > from + 1e-6 && q < to - 1e-6 : q > from + 1e-6 || q < to - 1e-6) return true;
    }
    return false;
  };

  // Corners, except any the gate happens to swallow — a jamb standing 20cm from a corner post is a
  // stub bay, and a rail 20cm long looks like a mistake rather than like carpentry.
  for (let i = 0; i < outline.length; i += 1) {
    const s = at[i] ?? 0;
    if (inGate(s)) continue;
    nodes.push({ s, p: outline[i] ?? [0, 0], kind: 'corner' });
  }
  nodes.sort((a, b) => a.s - b.s);

  const posts: BoundaryPost[] = [];
  const rails: BoundaryRail[] = [];
  /** Weathering, sampled in world space so neighbouring posts drift together rather than dither. */
  const tintAt = (x: number, z: number): number =>
    Math.min(1, Math.max(0, fbm(x * 0.21 + 5.3, z * 0.21 - 8.1, 2) * 0.5 + 0.5));

  const put = (p: P2, angle: number, heavy: boolean): void => {
    posts.push({ x: p[0], z: p[1], angle, heavy, tint: tintAt(p[0], p[1]) });
  };

  for (let i = 0; i < nodes.length; i += 1) {
    const a = nodes[i];
    const b = nodes[(i + 1) % nodes.length];
    if (!a || !b) continue;
    const mid = a.s + (((b.s - a.s + total) % total) || total) / 2;
    const angle = -Math.atan2(b.p[1] - a.p[1], b.p[0] - a.p[0]);

    // Every node carries a post, and every node is heavy: they are the corners and the gate jambs.
    put(a.p, angle, true);
    if (inGate(mid)) continue;

    const runLen = Math.hypot(b.p[0] - a.p[0], b.p[1] - a.p[1]);
    const bays = Math.max(1, Math.round(runLen / POST_SPACING));
    const step = runLen / bays;
    const ux = (b.p[0] - a.p[0]) / (runLen || 1);
    const uz = (b.p[1] - a.p[1]) / (runLen || 1);
    for (let k = 1; k < bays; k += 1) {
      put([a.p[0] + ux * step * k, a.p[1] + uz * step * k], angle, false);
    }
    const railLen = step - POST_W;
    if (railLen > 0.05) {
      for (let k = 0; k < bays; k += 1) {
        const cx = a.p[0] + ux * step * (k + 0.5);
        const cz = a.p[1] + uz * step * (k + 0.5);
        const tint = tintAt(cx, cz);
        for (const h of BOUNDARY_RAIL_HEIGHTS) {
          rails.push({ x: cx, y: h, z: cz, angle, length: railLen, tint });
        }
      }
    }
  }

  /**
   * The gate leaves. Five bars, two stiles and a brace, in the cream the pens' gates are painted, hung
   * as ONE leaf across the whole opening rather than as a swinging pair — a shut gate has no hinge side
   * a child can read from ten metres, and a single wide leaf is four fewer parts.
   *
   * The brace runs heel-low to head-high, which is the way a real gate is braced: the diagonal has to
   * work in compression from the hanging stile down, or the gate drops on its latch within a season.
   * Nobody will notice it is right. Somebody would notice it upside down.
   */
  const bars: Bar[] = [];
  const solids: Solid[] = [];
  const origin: Placed = { x: 0, z: 0, rot: 0 };
  const GATE_H = POST_H + GATE_POST_EXTRA - 0.16;
  for (const gate of gates) {
    const [ux, uz] = gate.along;
    const inset = 0.14;
    const half = gate.span / 2 - inset;
    const ax = gate.mid[0] - ux * half;
    const az = gate.mid[1] - uz * half;
    const bx = gate.mid[0] + ux * half;
    const bz = gate.mid[1] + uz * half;
    for (let k = 0; k < 5; k += 1) {
      const h = 0.26 + (k / 4) * (GATE_H - 0.42);
      bars.push(barBetween([ax, h, az], [bx, h, bz]));
    }
    for (const [sx, sz] of [
      [ax, az],
      [bx, bz],
    ] as const) {
      bars.push(barBetween([sx, 0.24, sz], [sx, GATE_H - 0.14, sz]));
    }
    bars.push(barBetween([ax, 0.26, az], [bx, GATE_H - 0.16, bz]));

    // And what actually stops the child. Along the shut leaf, at the same 0.81m centres the run uses.
    solids.push(...chainSegment(origin, [ax, az], [bx, bz], 0.36, 0.7));
  }

  /**
   * THE COLLIDER, AND WHY IT IS TWICE AS DENSE AS THE POSTS.
   *
   * A circle on each post at 1.62m centres very nearly works: 0.42 plus the keeper's 0.45 is 0.87, and
   * two of those overlap by 12cm at that spacing. Twelve centimetres is not a margin, it is a rounding
   * error — walk at a post gap diagonally and the push-out has to resolve two circles at once from
   * inside their thinnest overlap, which is how a keeper squirts through a fence. Putting a circle at
   * every mid-bay as well halves the spacing to 0.81m and takes the overlap to 93cm, which is more than
   * a keeper is wide, so there is no approach angle that finds a hole. `boundary.test.ts` walks the
   * whole perimeter at 25cm and proves it.
   */
  for (let i = 0; i < posts.length; i += 1) {
    const p = posts[i];
    if (!p) continue;
    solids.push({ position: [p.x, p.z], radius: p.heavy ? 0.44 : 0.42 });
  }
  for (const rail of rails) {
    if (rail.y !== BOUNDARY_RAIL_HEIGHTS[0]) continue;
    solids.push({ position: [rail.x, rail.z], radius: 0.42 });
  }

  return { posts, rails, gates, bars, solids };
})();
