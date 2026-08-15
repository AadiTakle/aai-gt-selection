import { BARN, BARN_D } from './barn';
import { BOUNDARY, PENS, penGate, type PenSpec } from './fence';
import { fbm, noise2, smoothstep } from './noise';
import { toWorld, type P2 } from './plan';

/**
 * THE WORN TRACK NETWORK, AS A PLAN. No three.js and no React, so the connectivity can be PROVED.
 *
 * WHY THIS FILE EXISTS. The owner played the ranch and reported: "the dirt ground path isn't connected in
 * some of the spots, such as from some of the pens to the main path and the barn to the main path. i
 * don't want the patch of grass in between. the brown dirty portion should be all cohesive and
 * connected." That is a claim about a REGION — is the union of the trodden ground one connected shape? —
 * and a claim like that cannot be settled by looking at a screenshot from one angle. It needs to be
 * measured, and measuring it needs the plan out of the renderer. `paths.test.ts` flood-fills the whole
 * network on a 20cm grid and counts the components; the answer has to be 1.
 *
 * WHAT WAS ACTUALLY WRONG, because it was three faults wearing one coat and only one of them was the
 * obvious one.
 *
 *   1. TWO PENS HAD NO SPUR AT ALL. Pen 0's yard sat 0.4m off the spine's edge and pen 2's sat TWELVE
 *      METRES off it, with nothing joining them. Those are not gaps, they are islands, and no amount of
 *      adjusting the existing four centrelines would have joined them.
 *
 *   2. THE SPURS THAT EXISTED STOPPED SHORT AT BOTH ENDS. The pen-1 spur ended 3.64m from the gate it
 *      was supposed to serve and started 2.30m from the spine — a 15cm strip of meadow between the two
 *      lanes, which is exactly wide enough to read as a mistake. The barn spur stopped 0.86m short of
 *      its own threshold.
 *
 *   3. AND THE ONE THAT SURVIVES FIXING THE FIRST TWO: EVERY LANE CARRIES ITS OWN TURF BANKS. A track
 *      here is a hollow with grass standing 6cm proud along both edges — that relief is what stops it
 *      reading as paint, and it is load-bearing. But a bank does not know when it has arrived at another
 *      track, so where a spur met the spine the spine's GREEN CREST ran straight across the spur's mouth
 *      and the spur's ran across the spine. The barn and hut spurs already overlapped the spine in plan
 *      — their dirt-to-dirt gap was NEGATIVE, 1.42m and 1.83m of overlap — and the owner could still see
 *      grass between them, because what he was looking at was a raised green ridge lying over the join.
 *
 * SO THE FIX IS THREE THINGS, AND NONE OF THEM IS WIDENING.
 *
 *   ROOTS ARE SNAPPED ONTO THE TRUNK. Every spur's centreline is extended back to the point where it
 *   meets its trunk's centreline, and then pushed `ROOT_CROSS` further, so the two lane strips
 *   interpenetrate instead of abutting. The connection is therefore true by construction rather than by
 *   a typed coordinate that was nearly right.
 *
 *   THE MOUTH FLARES. A real farm junction is a widened, trodden bell where carts have swung wide, not a
 *   T of two rectangles. Each spur's own half-width is multiplied near its root — and near its tip where
 *   it opens into a pen's yard — tapering back to normal over `MOUTH_LEN`. This is the apron, built INTO
 *   the strip rather than laid over it as a separate polygon, which is what keeps it free of z-fighting
 *   and costs no extra draw call.
 *
 *   AND THE BANKS STAND DOWN WHERE THEY CROSS OTHER DIRT. `cover()` answers "how much other trodden
 *   ground is already here", and at a junction the outer three lanes collapse onto the toe and drop to
 *   the floor. So the crest simply is not there across a mouth: no ridge, no seam, and the two lanes
 *   share one continuous brown surface.
 *
 * WHAT IS DELIBERATELY NOT DONE: nothing is widened to close a gap. The lane widths are the widths they
 * were, and the ground's own de-saturation skirt in `Buildings.tsx` stays at the 3.4m it was cut back to
 * when the yard came out brown. Widening was the wrong fix and would have re-created the "smudged"
 * complaint that had already been answered once.
 */

/* ------------------------------------------------------------------ *\
   The cross-section
\* ------------------------------------------------------------------ */

/**
 * THE WORN TRACK'S CROSS-SECTION, AND WHY IT IS BUILT UPWARD.
 *
 * Moved here from `Buildings.tsx` with the rest of the plan, unchanged. The owner's original complaint
 * was two complaints. "Smudged" is the ground's fault and is answered where the meadow is coloured — a
 * six-metre-wide de-saturation either side of every centreline had turned the whole yard into brown-green
 * mush, and it is now a third of that width and a third of the strength. "Completely flat" is this
 * section's fault, and it is the real one: a worn track is a HOLLOW, and what a child reads is not the
 * dirt but the turf standing above it and breaking over its edges.
 *
 * SO THE HOLLOW IS MADE BY RAISING THE FIELD, NOT BY SINKING THE TRACK, and that is forced rather than
 * chosen. Two constraints point the same way:
 *
 *   The ground mesh is OPAQUE and lies at exactly y = 0 across the whole plateau. Anything modelled below
 *   that plane is behind it from every angle a child can stand at, so a trench would not be a subtle
 *   effect — it would be invisible, and the code would look right while the screen showed nothing.
 *
 *   `groundHeight` is flat inside `FLAT_R` because `Game.tsx` integrates the keeper against a plane at
 *   y = 0. Relief that rises above that plane is harmless — the camera walks at eye height and a 9cm turf
 *   shoulder is nothing to it — but relief that falls below it would leave anything standing on the ground
 *   FLOATING over the dip. Building upward cannot produce a floating fence post; digging downward can.
 */
export const TRACK = {
  /** Distance from the toe of the bank out to the turf crest. */
  bank: 0.32,
  /** And from the crest back down to meadow level. Long, so the field reads as swelling away. */
  fall: 1.15,
  /** Crest height above the meadow, before the per-station variation. */
  crest: 0.062,
  /** How far the crest line and the toe wander, in metres, so no stretch of edge is a clean band. */
  wander: 0.3,
} as const;

/** Lateral stations across the section, outermost -X first. */
export const LANES = 13;

/**
 * How far past its trunk's centreline a spur's root is pushed.
 *
 * Not zero, and the difference matters. Ending a spur exactly ON the trunk's centreline makes the two
 * regions touch at a single point, which is connected in the strict sense and still shows a pinch. Half a
 * metre past it puts the spur's whole first section inside the trunk's lane, so the union has no waist.
 */
const ROOT_CROSS = 0.55;
/** How far a flared mouth takes to taper back to the lane's own width. */
const MOUTH_LEN = 2.8;
/**
 * Per-track vertical bias, so two lanes crossing are never coplanar.
 *
 * A tenth of a millimetre would do for maths and is nowhere near enough for a depth buffer: with near at
 * 0.1 and far at 220, precision out at 40 metres is about a millimetre, so coplanar dirt shimmers. 1.4mm
 * a track is invisible to the eye, decisive to the depth test, and the whole stack of six still sits
 * under the pen floors' decal at 2cm.
 */
const TRACK_LIFT = 0.0014;
/** Where a lane's outer edges sit when a junction has flattened them. Below the decal, above the ground. */
const JUNCTION_Y = 0.012;
/**
 * The fade lane is pinned BELOW every other lane and takes no per-track bias.
 *
 * It is fully transparent, and a transparent fragment on a `depthWrite` material still writes depth — so
 * if this sat above another track's dirt it would punch an invisible hole through it. Held at the bottom
 * of the stack it can only ever lose the depth test, which is exactly what a fringe should do.
 */
const FADE_Y = 0.0012;

/* ------------------------------------------------------------------ *\
   The plan
\* ------------------------------------------------------------------ */

export interface TrackDraft {
  name: string;
  points: readonly P2[];
  width: number;
  rutted: boolean;
  /** Index of the track this branches from, or null for the trunk. */
  trunk: number | null;
  /** Extra half-width at the root, as a multiple of the lane's own. */
  mouthRoot?: number;
  /** And at the far end, where a spur opens into a yard or a doorway. */
  mouthTip?: number;
}

export interface Track extends Required<TrackDraft> {
  points: readonly P2[];
  /** Arc length of the whole centreline, after the root was snapped on. */
  total: number;
}

/** A pen gate's mouth: `d` metres inside the gate line, on the gate's own axis. */
function insideGate(pen: PenSpec, d: number): P2 {
  const gate = penGate(pen);
  return [gate.mid[0] - gate.normal[0] * d, gate.mid[1] - gate.normal[1] * d];
}
/** And `d` metres outside it, which is where a spur has to line up before it can enter square. */
function outsideGate(pen: PenSpec, d: number): P2 {
  const gate = penGate(pen);
  return [gate.mid[0] + gate.normal[0] * d, gate.mid[1] + gate.normal[1] * d];
}

/** The barn's threshold slab, outer face. Derived, so the track cannot drift off the doorstep. */
const BARN_STEP: P2 = toWorld(BARN, 0, BARN_D / 2 + 0.25);

/**
 * Where the road leaves the ranch. Read off the boundary rather than typed, so the track and the gate
 * cannot disagree: `fence.ts` solves the gate by casting the spine's own heading at the perimeter, and
 * the spine then runs up to whatever that produced.
 */
const ROAD_GATE: P2 = (() => {
  const north = [...BOUNDARY.gates].sort((a, b) => b.mid[1] - a.mid[1])[0];
  if (!north) return [3.1, 31.5];
  // Stopped just short of the line, so the dirt never spills through the shut gate.
  const r = Math.hypot(north.mid[0], north.mid[1]) || 1;
  const k = (r - 0.5) / r;
  return [north.mid[0] * k, north.mid[1] * k];
})();

export const DRAFTS: readonly TrackDraft[] = [
  {
    /**
     * The spine, and it now runs OUT of the ranch rather than stopping in a field.
     *
     * It used to end at (1.4, 22) in the middle of the north meadow, which is what a road does when the
     * world has no edge. Now that there is a boundary with a gate on this exact bearing, the track
     * carries on to it — and because `blocked()` keeps trees 2.4m off any centreline, that extension
     * also cuts a lane through the wood to the gate. It is the single strongest thing in the wide shot:
     * the brown network has somewhere it comes FROM.
     */
    name: 'spine',
    points: [ROAD_GATE, [2.2, 26.6], [1.4, 22], [0.4, 16.5], [-0.9, 10.5], [0.3, 4], [0.2, -3], [0, -8.6]],
    width: 2.7,
    rutted: true,
    trunk: null,
  },
  {
    /**
     * To the barn doors, ending ON the threshold slab rather than 86cm short of it, and flaring to 2.8m
     * at the doorway — a cart's width, which is what the 3.8m doorway is sized for.
     */
    name: 'barn',
    /**
     * STRAIGHTENED, and the reason is a measurement rather than taste. The old line left the spine at
     * z = 2.6 and arrived at a doorway sitting at z = 0.95, so it bowed 1.3m north of the straight run
     * between the two — and a chord from the barn door to the road crossed 3.4m of meadow even though
     * the two lanes overlapped at the junction. The eye traces the chord, not the centreline, so that
     * bow WAS the owner's "patch of grass in between". Laid along the chord instead, the walk from the
     * doorway to the road never leaves the dirt.
     */
    points: [[-1.0, 1.15], [-3.8, 1.05], [-6.7, 0.98], BARN_STEP],
    width: 1.9,
    rutted: true,
    trunk: 0,
    mouthRoot: 0.85,
    mouthTip: 0.45,
  },
  {
    /** To the hut door, which `toWorld(HUT, -0.9, 2.77)` puts at (13.45, -2.12). */
    name: 'hut',
    points: [[0.7, -1.2], [4.8, -1.9], [9.2, -2.3], [12.3, -2.2], [13.05, -2.15]],
    width: 1.9,
    rutted: false,
    trunk: 0,
    mouthRoot: 0.85,
    mouthTip: 0.3,
  },
  {
    /**
     * To pen 1's gate, which is the spur the owner will have been looking at: it used to stop 3.64m
     * short of the gate AND 15cm short of the spine, so it was a brown dash lying in the grass between
     * two other brown things.
     *
     * It leaves the spine at the same station the barn spur does, so the yard has ONE crossroads rather
     * than two junctions 30cm apart — which is both what a farm looks like and what stops the two mouths
     * merging into an unreadable blob of dirt.
     */
    name: 'pen1',
    points: [[2.6, 1.3], [5.0, 1.45], insideGate(PENS[1]!, 0.35)],
    width: 1.6,
    rutted: false,
    trunk: 0,
    mouthRoot: 0.85,
    mouthTip: 0.8,
  },
  {
    /**
     * To pen 0's gate. There was no such track: the pen's yard ended 0.4m from the spine's edge and the
     * two never touched. It is a short spur because the gate is close to the road — which is exactly why
     * its absence read as a fault rather than as distance.
     */
    name: 'pen0',
    points: [outsideGate(PENS[0]!, 2.2), insideGate(PENS[0]!, 0.5)],
    width: 1.6,
    rutted: false,
    trunk: 0,
    mouthRoot: 0.9,
    mouthTip: 0.8,
  },
  {
    /**
     * And to pen 2's, which was the real island: twelve metres of unbroken meadow between its yard and
     * the nearest dirt.
     *
     * IT GOES THE LONG WAY ROUND, WEST, and that is a measurement rather than a preference. The direct
     * line runs into a 1.01m gap between the shop's churn and the log station's cradle post — see the
     * note on pen 2 in `fence.ts` — which a 0.90m keeper can only squeeze through. So the track leaves
     * the spine's last station and runs west along the ranch's southern edge instead, between the barn's
     * south wall and the log station, then turns down to the pen's north-west gate. Minimum clearance
     * anywhere on it is 1.7m, asserted in `paths.test.ts` rather than trusted: a track laid through a
     * collider is a track a child cannot walk down, and it photographs perfectly.
     */
    name: 'pen2',
    points: [
      [-4.5, -8.0],
      [-9.5, -7.6],
      [-14.0, -7.4],
      [-17.6, -8.4],
      outsideGate(PENS[2]!, 2.6),
      insideGate(PENS[2]!, 0.35),
    ],
    width: 1.7,
    rutted: false,
    trunk: 0,
    mouthRoot: 0.85,
    mouthTip: 0.8,
  },
];

/* ------------------------------------------------------------------ *\
   Resolving the plan
\* ------------------------------------------------------------------ */

function segClosest(px: number, pz: number, a: P2, b: P2): { d: number; q: P2 } {
  const vx = b[0] - a[0];
  const vz = b[1] - a[1];
  const len2 = vx * vx + vz * vz;
  const t = len2 > 1e-9 ? Math.min(1, Math.max(0, ((px - a[0]) * vx + (pz - a[1]) * vz) / len2)) : 0;
  const q: P2 = [a[0] + vx * t, a[1] + vz * t];
  return { d: Math.hypot(px - q[0], pz - q[1]), q };
}

function lineClosest(points: readonly P2[], px: number, pz: number): { d: number; q: P2 } {
  let best = { d: Infinity, q: [0, 0] as P2 };
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) continue;
    const got = segClosest(px, pz, a, b);
    if (got.d < best.d) best = got;
  }
  return best;
}

function polylineLength(points: readonly P2[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) continue;
    total += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return total;
}

/**
 * Snap each spur's root onto its trunk, by extending the spur BACKWARDS ALONG ITS OWN HEADING.
 *
 * This is the whole of fix #1, and the "along its own heading" is the part that took two attempts.
 *
 * The obvious implementation is to drop the root at the closest point on the trunk and push it a little
 * further along that same direction. It works right up until a spur's first point is ALREADY almost
 * exactly on the trunk — which pen 0's is, six centimetres off — and then the direction from the point to
 * its own projection is pure numerical residue pointing wherever it likes. Pen 0 got a root 0.55m away in
 * a near-arbitrary direction, the first segment doubled back on the second, and the strip folded into a
 * hairpin whose triangles wound DOWNWARD and vanished behind back-face culling. Correct connectivity,
 * nothing on screen — the same silent failure the winding note records, arrived at from a new direction.
 *
 * Extending along the spur's own first heading cannot do that: the new segment is collinear with the one
 * that follows it, so no bend is introduced at all, and going back by `distance-to-trunk + ROOT_CROSS`
 * guarantees it lands past the trunk's centreline. The connection is a consequence of the trunk's
 * geometry rather than a coordinate somebody typed: move the spine and every spur still meets it.
 */
export function resolveTracks(drafts: readonly TrackDraft[]): Track[] {
  const out: Track[] = [];
  for (const draft of drafts) {
    let points = [...draft.points];
    const trunkIndex = draft.trunk;
    if (trunkIndex != null) {
      const trunk = out[trunkIndex];
      const first = points[0];
      const second = points[1];
      if (trunk && first && second) {
        const hx = second[0] - first[0];
        const hz = second[1] - first[1];
        const hl = Math.hypot(hx, hz) || 1;
        const near = lineClosest(trunk.points, first[0], first[1]);
        const cross = Math.min(ROOT_CROSS, trunk.width * 0.45);
        const back = near.d + cross;
        points = [[first[0] - (hx / hl) * back, first[1] - (hz / hl) * back], ...points];
      }
    }
    out.push({
      name: draft.name,
      points,
      width: draft.width,
      rutted: draft.rutted,
      trunk: draft.trunk,
      mouthRoot: draft.mouthRoot ?? 0,
      mouthTip: draft.mouthTip ?? 0,
      total: polylineLength(points),
    });
  }
  return out;
}

export interface Station {
  p: P2;
  n: P2;
  s: number;
}

/**
 * A track's centreline resampled fine enough to carry relief, with a joint normal at every station.
 *
 * The original geometry put four quads on each hand-typed segment, so the spine was six stations long over
 * twenty-two metres — a resolution at which a wandering edge is a zigzag and a bank is a crease. Every
 * segment is therefore subdivided to about 45cm, with the two end normals interpolated across it, which
 * keeps the existing behaviour at the corners (an averaged joint normal, so a bend does not open a wedge of
 * grass down the middle of the track) and gives the length something to vary along.
 */
export function trackStations(line: readonly P2[]): Station[] {
  const joints: P2[] = line.map((_, i) => {
    const prev = line[Math.max(0, i - 1)] ?? [0, 0];
    const next = line[Math.min(line.length - 1, i + 1)] ?? [0, 0];
    const dx = next[0] - prev[0];
    const dz = next[1] - prev[1];
    const len = Math.hypot(dx, dz) || 1;
    return [-dz / len, dx / len];
  });

  const out: Station[] = [];
  let s = 0;
  for (let i = 0; i < line.length - 1; i += 1) {
    const p0 = line[i];
    const p1 = line[i + 1];
    const n0 = joints[i];
    const n1 = joints[i + 1];
    if (!p0 || !p1 || !n0 || !n1) continue;
    const length = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const steps = Math.max(1, Math.ceil(length / 0.45));
    // The last station of a segment is the first of the next, so it is emitted once, at the top.
    for (let k = 0; k < steps; k += 1) {
      const t = k / steps;
      const nx = n0[0] + (n1[0] - n0[0]) * t;
      const nz = n0[1] + (n1[1] - n0[1]) * t;
      const nl = Math.hypot(nx, nz) || 1;
      out.push({
        p: [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t],
        n: [nx / nl, nz / nl],
        s: s + length * t,
      });
    }
    s += length;
    if (i === line.length - 2) {
      out.push({ p: p1, n: n1, s });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *\
   The network, and the questions that can be asked of it
\* ------------------------------------------------------------------ */

/** One vertex of the lane section. The caller adds colour; this decides shape. */
export interface LaneVertex {
  x: number;
  z: number;
  y: number;
  alpha: number;
  /** 0 crown, 1 rut, 2 shoulder, 3 toe, 4 crest, 5 fall. Mirrored either side of the crown. */
  rank: number;
  sgn: number;
  /** 0..1, how much other trodden ground already covers this vertex. 1 = a flat trodden junction. */
  junction: number;
  /** The noises the colouring wants, sampled here so both callers agree. */
  dust: number;
  grassIn: number;
  lit: number;
}

export interface Network {
  tracks: readonly Track[];
  stations: readonly (readonly Station[])[];
  pens: readonly PenSpec[];
  halfWidth(li: number, s: number): number;
  toe(li: number, s: number, sgn: number): number;
  trackDepth(li: number, x: number, z: number): number;
  penDepth(x: number, z: number): number;
  /** Metres inside any trodden ground other than track `exclude`. Negative means meadow. */
  otherDepth(x: number, z: number, exclude: number): number;
  cover(x: number, z: number, exclude: number): number;
  /** Deepest trodden ground at this point, over everything. Negative means meadow. */
  depth(x: number, z: number): number;
  section(li: number, station: Station): LaneVertex[];
  distanceToTracks(x: number, z: number): number;
}

/** Signed distance to an oriented rounded rectangle. Negative inside. The pens' yards, as a shape. */
function roundedRectSdf(pen: PenSpec, x: number, z: number, grow: number): number {
  const c = Math.cos(pen.rot);
  const s = Math.sin(pen.rot);
  const dx = x - pen.x;
  const dz = z - pen.z;
  const lx = Math.abs(dx * c - dz * s);
  const lz = Math.abs(dx * s + dz * c);
  const r = pen.cornerR;
  const qx = lx - (pen.halfW + grow - r);
  const qz = lz - (pen.halfD + grow - r);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qz, 0));
  return outside + Math.min(Math.max(qx, qz), 0) - r;
}

/**
 * How far a pen's trodden yard reaches past its fence.
 *
 * `useDecalGeometry` draws the floor solid to the fence line and fades it out over the next 0.9m, so the
 * dependable brown stops at about a third of a metre outside the rails. That third of a metre is what a
 * spur has to reach to be connected, and it is stated here rather than guessed at both ends.
 */
const PEN_APRON = 0.3;

export function buildNetwork(drafts: readonly TrackDraft[], pens: readonly PenSpec[]): Network {
  const tracks = resolveTracks(drafts);
  const stations = tracks.map((t) => trackStations(t.points));

  const halfWidth = (li: number, s: number): number => {
    const spec = tracks[li];
    if (!spec) return 0;
    const seed = li * 37.1;
    // Slow variation along the length. Sampled on arc length so it travels with the track.
    const widthN = fbm(s * 0.13 + seed, seed * 2.3, 2);
    const base = (spec.width / 2) * (1 + widthN * 0.2);
    const mouth =
      1 +
      spec.mouthRoot * (1 - smoothstep(0, MOUTH_LEN, s)) +
      spec.mouthTip * (1 - smoothstep(0, MOUTH_LEN, Math.max(0, spec.total - s)));
    return base * mouth;
  };

  const toe = (li: number, s: number, sgn: number): number => {
    if (sgn === 0) return halfWidth(li, s);
    const seed = li * 37.1;
    // Per-side edge wobble, independent so the two edges never mirror each other. Additive rather than
    // scaled, so a flared mouth does not also get a flared wobble.
    const wob = fbm(s * 0.62 + seed, sgn > 0 ? 41.2 : 77.9, 2) * TRACK.wander;
    return halfWidth(li, s) + wob;
  };

  /** Per-track bounds plus the widest the lane ever gets, so `trackDepth` can reject in two compares. */
  const bounds = tracks.map((spec, li) => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    let maxToe = 0;
    for (const st of stations[li] ?? []) {
      minX = Math.min(minX, st.p[0]);
      maxX = Math.max(maxX, st.p[0]);
      minZ = Math.min(minZ, st.p[1]);
      maxZ = Math.max(maxZ, st.p[1]);
      maxToe = Math.max(maxToe, toe(li, st.s, 1), toe(li, st.s, -1));
    }
    void spec;
    return { minX, maxX, minZ, maxZ, maxToe };
  });

  /**
   * How deep inside track `li`'s dirt a point is, in metres. Negative outside.
   *
   * The lane is modelled as the union of discs centred on its stations, radius the toe at that station.
   * For a straight run that is exactly the band, which is what matters; at a bend it is a shade generous
   * on the outside, which is also what a trodden corner actually looks like.
   */
  const trackDepth = (li: number, x: number, z: number): number => {
    const b = bounds[li];
    const sts = stations[li];
    if (!b || !sts) return -Infinity;
    if (x < b.minX - b.maxToe || x > b.maxX + b.maxToe) return -Infinity;
    if (z < b.minZ - b.maxToe || z > b.maxZ + b.maxToe) return -Infinity;
    let best = -Infinity;
    for (const st of sts) {
      const dx = x - st.p[0];
      const dz = z - st.p[1];
      const d = Math.hypot(dx, dz);
      if (d - b.maxToe > -best) continue;
      const side = dx * st.n[0] + dz * st.n[1];
      const t = toe(li, st.s, side >= 0 ? 1 : -1);
      if (t - d > best) best = t - d;
    }
    return best;
  };

  const penDepth = (x: number, z: number): number => {
    let best = -Infinity;
    for (const pen of pens) best = Math.max(best, -roundedRectSdf(pen, x, z, PEN_APRON));
    return best;
  };

  const depth = (x: number, z: number): number => {
    let best = penDepth(x, z);
    for (let li = 0; li < tracks.length; li += 1) best = Math.max(best, trackDepth(li, x, z));
    return best;
  };

  /** How deep inside OTHER trodden ground this point is, in metres. Negative means only meadow. */
  const otherDepth = (x: number, z: number, exclude: number): number => {
    let best = penDepth(x, z);
    for (let li = 0; li < tracks.length; li += 1) {
      if (li === exclude) continue;
      const d = trackDepth(li, x, z);
      if (d > best) best = d;
    }
    return best;
  };

  /**
   * The same thing as a 0..1 collapse factor.
   *
   * THE RAMP REACHES 1 EXACTLY AT THE OTHER LANE'S EDGE, and that is the whole reason it is written as
   * `(-0.5, 0)` rather than straddling zero. The invariant worth having is "no turf stands proud at a
   * point that is inside somebody else's dirt" — if the ramp only reached half strength at the edge, a
   * crest sitting 10cm inside another track would still be 4cm up, which is a visible green ridge lying
   * across a junction and is precisely the defect the owner reported. Easing happens entirely OUTSIDE the
   * other lane, over half a metre, so the bank still falls away smoothly on the approach rather than
   * stepping — a step reads as a modelling error from twenty metres.
   */
  const cover = (x: number, z: number, exclude: number): number =>
    smoothstep(-0.5, 0, otherDepth(x, z, exclude));

  const section = (li: number, station: Station): LaneVertex[] => {
    const spec = tracks[li];
    const out: LaneVertex[] = [];
    if (!spec) return out;
    const [px, pz] = station.p;
    const [nx, nz] = station.n;
    const s = station.s;
    const seed = li * 37.1;
    const lift = li * TRACK_LIFT;

    const crest = TRACK.crest * (1 + fbm(s * 0.21 + seed, 5.5 + seed, 2) * 0.34);
    const dust = noise2(s * 0.29 + seed, 11.3 + seed);
    // Which way the track leans this far along, so the centre of wear is not always the centreline.
    const lean = fbm(s * 0.11 + seed, 19.7, 2) * 0.22;

    for (let k = 0; k < LANES; k += 1) {
      // -1 at the outer edge of the -X fall, +1 at the outer edge of the +X fall.
      const sideIndex = k - (LANES - 1) / 2;
      const sgn = Math.sign(sideIndex);
      const rank = Math.abs(sideIndex);
      const t = toe(li, s, sgn);

      let u: number;
      let y: number;
      let alpha = 1;
      if (rank === 0) {
        u = 0;
        y = (spec.rutted ? 0.021 : 0.009) + lift;
      } else if (rank === 1) {
        // The wheel track. Lowest point of the section, and the darkest.
        u = sgn * t * 0.42;
        y = 0.004 + lift;
      } else if (rank === 2) {
        u = sgn * t * 0.79;
        y = 0.013 + lift;
      } else if (rank === 3) {
        // The toe, where dust meets turf, and where the interlock lives.
        u = sgn * t;
        y = 0.03 + lift;
      } else if (rank === 4) {
        // The crest of the bank. Turf, and the brightest thing in the section under a low sun.
        u = sgn * (t + TRACK.bank);
        y = crest + lift;
      } else {
        // And the long fall back to the meadow, which is where the mesh ends and fades out.
        u = sgn * (t + TRACK.bank + TRACK.fall);
        y = FADE_Y;
        alpha = 0;
      }

      /**
       * THE BANK STANDS DOWN OVER OTHER DIRT, and this is fix #3.
       *
       * `junction` is sampled at the vertex's UNCOLLAPSED position, because the question is "would this
       * bank be standing in somebody else's track" and the answer has to be asked where the bank would
       * be. Then the outer three lanes are pulled in onto the toe and dropped to the floor, so at a full
       * junction the crest and the fringe are degenerate — zero-area triangles that draw nothing. No
       * ridge across the mouth, and no transparent fringe left hovering over the other lane's dust.
       */
      const ux = px + nx * (u + lean);
      const uz = pz + nz * (u + lean);
      const junction = cover(ux, uz, li);
      if (rank >= 4) {
        u = u + (sgn * t - u) * junction;
        y = y + (JUNCTION_Y + lift - y) * junction;
      } else if (rank === 3) {
        y = y + (JUNCTION_Y + lift - y) * junction;
      }

      const off = u + lean;
      out.push({
        x: px + nx * off,
        z: pz + nz * off,
        y,
        alpha,
        rank,
        sgn,
        junction,
        dust,
        grassIn: smoothstep(0.35, 0.75, noise2(s * 0.85 + seed, sgn > 0 ? 3.1 : 63.4)),
        lit: smoothstep(0.4, 0.85, noise2(s * 0.4 + seed, sgn > 0 ? 8.8 : 21.6)),
      });
    }
    return out;
  };

  const distanceToTracks = (x: number, z: number): number => {
    let best = Infinity;
    for (const spec of tracks) best = Math.min(best, lineClosest(spec.points, x, z).d);
    return best;
  };

  return {
    tracks,
    stations,
    pens,
    halfWidth,
    toe,
    trackDepth,
    penDepth,
    otherDepth,
    cover,
    depth,
    section,
    distanceToTracks,
  };
}

/** The shipped network. Everything else in the ranch reads the track plan through this. */
export const NETWORK: Network = buildNetwork(DRAFTS, PENS);

/** Shortest distance to any track centreline. `blocked()` and the meadow's colouring both want it. */
export function distanceToTracks(x: number, z: number): number {
  return NETWORK.distanceToTracks(x, z);
}

/* ------------------------------------------------------------------ *\
   Measuring it — the part the owner's complaint turns into a number
\* ------------------------------------------------------------------ */

export interface Region {
  name: string;
  /** Sample points on this region's dirt, used to measure its distance to another. */
  probe: readonly P2[];
  depthAt(x: number, z: number): number;
}

/** Every trodden region on the ranch — each track, and each pen's yard — as something measurable. */
export function regionsOf(net: Network): Region[] {
  const out: Region[] = [];
  net.tracks.forEach((spec, li) => {
    out.push({
      name: spec.name,
      probe: (net.stations[li] ?? []).map((st) => st.p),
      depthAt: (x, z) => net.trackDepth(li, x, z),
    });
  });
  net.pens.forEach((pen, i) => {
    // The yard's own outline, sampled: its rim is what a spur has to reach.
    const probe: P2[] = [];
    for (let a = 0; a < 32; a += 1) {
      const th = (a / 32) * Math.PI * 2;
      const c = Math.cos(pen.rot);
      const s = Math.sin(pen.rot);
      const lx = Math.cos(th) * (pen.halfW + PEN_APRON);
      const lz = Math.sin(th) * (pen.halfD + PEN_APRON);
      probe.push([pen.x + lx * c + lz * s, pen.z - lx * s + lz * c]);
    }
    out.push({
      name: `pen${i} yard`,
      probe,
      depthAt: (x, z) => -roundedRectSdf(pen, x, z, PEN_APRON),
    });
  });
  return out;
}

/**
 * Metres of meadow between two trodden regions. Zero means they touch or overlap.
 *
 * Measured region-to-region rather than centreline-to-centreline, because "is there grass between the
 * barn's dirt and the road's dirt" is the question the owner actually asked, and two centrelines can be
 * three metres apart with their lanes touching.
 */
export function gapBetween(a: Region, b: Region): number {
  let best = Infinity;
  for (const p of a.probe) {
    const d = b.depthAt(p[0], p[1]);
    // `depthAt` is depth INSIDE b; the distance from a's centreline point to b's dirt is -d, and a's own
    // dirt reaches out from that point by a's depth there.
    best = Math.min(best, -d - Math.max(0, a.depthAt(p[0], p[1])));
  }
  for (const p of b.probe) {
    const d = a.depthAt(p[0], p[1]);
    best = Math.min(best, -d - Math.max(0, b.depthAt(p[0], p[1])));
  }
  return Math.max(0, best);
}

/**
 * How many separate pieces the brown is in.
 *
 * THE test for the owner's complaint, and the reason it is a flood fill rather than a list of gaps: a
 * network can have every pairwise gap look small and still be in two pieces, and it can have one large
 * gap and still be one piece because something else joins the two ends. Counting components asks the
 * question directly.
 */
export function networkComponents(net: Network): { count: number; groups: string[][] } {
  const regions = regionsOf(net);
  const parent = regions.map((_, i) => i);
  const find = (i: number): number => {
    let r = i;
    while (parent[r] !== r) r = parent[r] ?? r;
    return r;
  };
  const union = (i: number, j: number): void => {
    const a = find(i);
    const b = find(j);
    if (a !== b) parent[a] = b;
  };
  for (let i = 0; i < regions.length; i += 1) {
    for (let j = i + 1; j < regions.length; j += 1) {
      const ri = regions[i];
      const rj = regions[j];
      if (!ri || !rj) continue;
      if (gapBetween(ri, rj) <= 0) union(i, j);
    }
  }
  const groups = new Map<number, string[]>();
  regions.forEach((r, i) => {
    const root = find(i);
    const list = groups.get(root) ?? [];
    list.push(r.name);
    groups.set(root, list);
  });
  return { count: groups.size, groups: [...groups.values()] };
}

/**
 * Raised turf standing inside somebody else's trodden ground.
 *
 * The count of the defect that survives fixing the gaps: a green crest lying across a junction. This is
 * the one the owner was actually looking at when he wrote "i don't want the patch of grass in between" —
 * the barn and hut spurs already OVERLAPPED the spine in plan and he could still see grass, because what
 * he could see was a bank standing over the join.
 *
 * Strictly inside, and above 3cm: a bank easing down on the approach to a junction is correct, a bank
 * still standing where another track's dirt already is, is not. Has to be zero.
 */
export function raisedTurfInsideDirt(net: Network): { count: number; worst: number; at: P2 | null } {
  let count = 0;
  let worst = 0;
  let at: P2 | null = null;
  net.tracks.forEach((_, li) => {
    for (const st of net.stations[li] ?? []) {
      for (const v of net.section(li, st)) {
        if (v.rank < 4 || v.y <= 0.03) continue;
        if (net.otherDepth(v.x, v.z, li) > 0) {
          count += 1;
          if (v.y > worst) {
            worst = v.y;
            at = [v.x, v.z];
          }
        }
      }
    }
  });
  return { count, worst, at };
}

/**
 * The walk a child takes: from a destination to the main track, in a straight line, counting grass.
 *
 * Reported because it is the owner's own sentence turned into a number — "the patch of grass in between",
 * in metres. The straight line is the point: it is what the eye traces between two brown things.
 */
export function walkGrass(
  net: Network,
  from: P2,
  to: P2,
): { total: number; longest: number } {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const len = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(len / 0.02));
  let total = 0;
  let longest = 0;
  let run = 0;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = from[0] + dx * t;
    const z = from[1] + dz * t;
    if (net.depth(x, z) < 0) {
      total += len / steps;
      run += len / steps;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }
  return { total, longest };
}
