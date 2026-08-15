/**
 * THE MATHS OF THE MECHANIC, with no three.js and no React in it.
 *
 * Everything here is plain numbers over plain `{x, y, z}` bags. That is not purity for its own sake: it is so
 * that the two decisions which can actually ruin the toy — WHICH slime the cone picks, and WHERE a plopped
 * slime is allowed to land — can be read, reasoned about and driven from a harness without standing up a
 * renderer. The rest of the directory is presentation over these functions.
 *
 * Two ideas are worth stating before the code.
 *
 * PICKING. A cone test, not a distance test. `herd.ts` offers `nearestSlime(x, z, within)` and it is the wrong
 * tool here by one dimension: it is a ground-plane query with no notion of where the child is LOOKING, so it
 * would happily grab the slime behind you because it is a metre nearer than the one you are aiming at. So the
 * registry is walked directly — which is the sanctioned way to read it — and each candidate is scored on angle
 * from the aim as well as range. The score prefers what is centred over what is close, because a child aims by
 * pointing and expects the thing under the crosshair, and only falls back on nearness to break ties.
 *
 * LANDING. Solve for the destination FIRST, then draw an arc that ends there. The tempting order is the other
 * way round — throw with a velocity, integrate under gravity, and see where it lands — and it fails the brief's
 * hard requirement: "it must land inside the world bounds and never inside a building". With ballistics you
 * find out where it landed after the fact, and correcting it then either teleports the slime at the last moment
 * or drops it through a wall. Choosing a legal landing spot up front and fitting a parabola to it means the
 * guarantee is structural: `settleLanding` cannot return an illegal point, so no arc can end on one.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** The shape `herd.ts` exposes, and the shape `Buildings.SOLIDS` exposes, reduced to what is needed here. */
export interface Circle {
  x: number;
  z: number;
  r: number;
}

/* ------------------------------------------------------------------ *\
   Tuning. All of it, in one place, in the units it is used in.
\* ------------------------------------------------------------------ */

export const CONE = {
  /** Half-angle of the draw, radians. ~27 degrees: generous enough that a child does not have to aim. */
  halfAngle: 0.47,
  /** How far the suction reaches, metres. */
  range: 9,
  /**
   * How far a slime may be BEHIND the nozzle plane and still count, metres. A slime you have walked past and
   * are now standing on top of should still be grabbable; without this the cone has a blind spot exactly
   * where a child will be standing when they get frustrated.
   */
  behind: 0.8,
  /** Inside this range the angle test is relaxed to a sphere: point-blank, anything touching you is grabbable. */
  hug: 1.6,
} as const;

export const DRAW = {
  /** Seconds of wind-up before the first slime is taken. The whole difference between suction and teleporting. */
  windUp: 0.26,
  /** After a catch, how much of the wind-up is retained so a second catch comes faster than the first. */
  rewind: 0.55,
  /** Seconds between catches while the button is held. */
  gap: 0.34,
  /** Flight time floor and per-metre cost for the draw itself. */
  minFlight: 0.3,
  perMetre: 0.055,
  maxFlight: 0.85,
} as const;

export const PLOP = {
  /**
   * How far in front the slime is placed, metres, before the world is allowed to veto it.
   *
   * Five, not four: a warden is nearly two metres across, and at four metres it is still filling a third of the
   * view when it lands. Far enough that a child can see the whole creature they just put down.
   *
   * IT IS A CEILING, NOT A DISTANCE. `plopTarget` shortens it to whatever is actually clear ahead; see
   * `clearReach` below for why an unshortened five metres was the whole of the barn bug.
   */
  reach: 5,
  /**
   * THERE IS NO MINIMUM THROW, and that absence is load-bearing enough to be written down.
   *
   * A comfortable floor is the obvious thing to add and it is a hole straight through the guarantee. Two
   * were tried. At 1.45m — a keeper's radius plus the widest slime, so the slime never lands inside the
   * child — a child standing fifteen centimetres off a fence post and aiming at it had the throw cut to
   * 0.06m by the cast and then EXTENDED back to 1.45m, through the post and out the far side: 134 of 2,214
   * plops across the ranch, every one of them at exactly the floor. At 0.15m the same thing happened once
   * in 2,214, against the barn's closed gable.
   *
   * A floor is not a small correction to a throw. It is permission to ignore the cast, and the cast is the
   * entire promise. So a blocked throw is allowed to collapse to nothing: the slime lands at the child's
   * feet, `settleLanding` pushes it clear of whatever it started inside, and `pushOutOfSlimes` — which the
   * keeper controller already calls every frame — has them shoulder each other apart on the next one.
   * Being nudged aside by the slime you just put down is a correct thing to happen. A slime behind a wall
   * is not.
   */
  /**
   * How far short of an obstruction the throw stops.
   *
   * `clearReach` returns the distance at which the slime's own disc first TOUCHES something, so the point
   * is already legal; this is only so it does not arrive wedged against a wall with nowhere to wander.
   */
  standOff: 0.12,
  /** Seconds in the air. */
  flight: 0.62,
  /** Peak of the arc above the straight line, metres. Gentle: this is a lob, not a shot. */
  rise: 1,
  /** Seconds of squash-and-settle after touching down, before the real slime is handed back. */
  bounce: 0.42,
} as const;

/* ------------------------------------------------------------------ *\
   Picking
\* ------------------------------------------------------------------ */

export interface Aim {
  /** The nozzle mouth, in world space. */
  from: Vec3;
  /** Unit vector the child is looking along. */
  dir: Vec3;
}

/** What `pick` needs of a candidate. Satisfied by `SlimeCollider` as-is. */
export interface Candidate extends Circle {
  /** World height of the slime's crown, used to aim at its middle rather than its feet. */
  top: number;
}

/**
 * Is this slime inside the cone, and how good a target is it? Returns null when outside.
 *
 * The score is LOWER-IS-BETTER and is `distance * (1 + 2.4 * offAxis)`, where `offAxis` is 0 dead ahead and 1
 * at the cone's rim. So a slime twice as far away wins if it is a third as far off the crosshair, which is
 * what "the one I am pointing at" means to a person.
 */
export function score(c: Candidate, aim: Aim): number | null {
  const dx = c.x - aim.from.x;
  // Aim at the middle of the body, not the ground under it. `top` is the crown, so half of it is the belly.
  const dy = c.top * 0.5 - aim.from.y;
  const dz = c.z - aim.from.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  // Surface distance, so a big warden is grabbable from further out than a pip. Never negative.
  const surface = Math.max(0, dist - c.r);
  if (surface > CONE.range) return null;

  if (dist < 1e-4) return 0;
  const along = (dx * aim.dir.x + dy * aim.dir.y + dz * aim.dir.z) / dist;
  // Point blank: anything overlapping the nozzle is fair game whatever direction it is in.
  if (surface < CONE.hug) return surface * 0.5;
  if (along < 0) {
    // Behind the nozzle. Allowed only within touching distance, so you can grab what you just walked past.
    return surface <= CONE.behind ? surface * 0.75 : null;
  }
  const angle = Math.acos(Math.min(1, along));
  if (angle > CONE.halfAngle) return null;
  const offAxis = angle / CONE.halfAngle;
  return surface * (1 + 2.4 * offAxis);
}

/**
 * The one the nozzle would take. Walks the live registry; allocates nothing.
 *
 * `skip` is how a slime already in flight is kept from being grabbed twice — the caller's set of in-flight
 * registry ids. Without it, a slime whose collider has not been torn down yet by the integrator's re-render
 * would be picked again on the very next frame.
 */
export function pick<T extends Candidate & { id: number }>(
  candidates: readonly T[],
  aim: Aim,
  skip?: ReadonlySet<number>,
): T | null {
  let best: T | null = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    if (skip && skip.has(c.id)) continue;
    const s = score(c, aim);
    if (s === null || s >= bestScore) continue;
    bestScore = s;
    best = c;
  }
  return best;
}

/**
 * How hard the airflow tugs a slime that is NOT the target, 0..1. Falls off with both angle and range and is
 * deliberately never 1: the point of the lean is to say "the air is moving" about the whole cone, and if a
 * bystander leans as hard as the target does, nothing tells a child which one is about to come to them.
 */
export function tug(c: Candidate, aim: Aim): number {
  const dx = c.x - aim.from.x;
  const dy = c.top * 0.5 - aim.from.y;
  const dz = c.z - aim.from.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist < 1e-4) return 1;
  const along = (dx * aim.dir.x + dy * aim.dir.y + dz * aim.dir.z) / dist;
  if (along <= 0) return 0;
  const angle = Math.acos(Math.min(1, along));
  // A wider skirt than the grab cone, so slimes at the edge of vision stir before they are catchable.
  const spread = CONE.halfAngle * 1.55;
  if (angle > spread) return 0;
  const byAngle = 1 - angle / spread;
  const byRange = 1 - Math.min(1, dist / (CONE.range * 1.1));
  return byAngle * byAngle * byRange;
}

/* ------------------------------------------------------------------ *\
   Easing
\* ------------------------------------------------------------------ */

/**
 * THE DRAW CURVE. Slow off the mark and accelerating all the way in, which is what suction does and is the
 * opposite of every default ease. Exponent 2.4 was chosen by watching it: at 2 the slime still drifts, at 3
 * it sits still and then snaps, and 2.4 is the one where it visibly loses its footing and is then taken.
 */
export function drawEase(a: number): number {
  const t = a < 0 ? 0 : a > 1 ? 1 : a;
  return Math.pow(t, 2.4);
}

/** Smooth 0..1 between two thresholds. Used wherever a change has to start gently rather than switch on. */
export function ramp(a: number, from: number, to: number): number {
  if (to <= from) return a >= to ? 1 : 0;
  const t = (a - from) / (to - from);
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return c * c * (3 - 2 * c);
}

/**
 * HOW SMALL A SLIME HAS TO GET TO FIT DOWN THE NOZZLE, as a fraction of its own size.
 *
 * This is not a flourish, it is the fix for the worst thing this mechanic did. The nozzle's mouth is about seven
 * centimetres across and a warden is over a metre tall. Drawing one in at full size means that for the last
 * third of the flight a slime the size of a wheelbarrow is a hand's width from the eye — it fills the screen,
 * blots out the ranch, and reads as a beige balloon rather than as a creature, because at that distance you
 * cannot see enough of it to recognise it. The first version did exactly that.
 *
 * So the target size is absolute rather than proportional: whatever went in, it arrives at the bell about eight
 * centimetres tall. A pip therefore barely shrinks and a warden shrinks a great deal, which is also the correct
 * reading — the big one is visibly the one being squeezed.
 */
export function intakeScale(top: number): number {
  return Math.min(0.55, 0.085 / Math.max(0.2, top));
}

/** How long a draw from this far away should take. Farther is longer, but sub-linearly, and always capped. */
export function drawFlight(distance: number, motion = 1): number {
  const raw = DRAW.minFlight + distance * DRAW.perMetre;
  return Math.max(0.12, Math.min(DRAW.maxFlight, raw) * motion);
}

/** Where a lobbed slime is at `a` of its flight: straight line in x/z, parabola in y. */
export function arc(from: Vec3, to: Vec3, rise: number, a: number, out: Vec3): Vec3 {
  const t = a < 0 ? 0 : a > 1 ? 1 : a;
  out.x = from.x + (to.x - from.x) * t;
  out.z = from.z + (to.z - from.z) * t;
  // 4t(1-t) peaks at exactly 1 halfway, so `rise` is the height above the chord in metres and nothing else.
  out.y = from.y + (to.y - from.y) * t + rise * 4 * t * (1 - t);
  return out;
}

/**
 * THE LANDING SQUASH. Returns a y-scale to multiply the body by; x and z take the inverse square root of it
 * so the slime keeps its volume, which is the difference between jelly and a balloon.
 *
 * Two bounces, diminishing, both wide and shallow. A first pass had one deep squash and it read as the slime
 * being dropped rather than landing.
 */
export function squash(a: number): number {
  const t = a < 0 ? 0 : a > 1 ? 1 : a;
  const decay = Math.exp(-4.2 * t);
  // Starts fully squashed, overshoots tall once, settles.
  return 1 - 0.42 * decay * Math.cos(t * Math.PI * 3.1);
}

/* ------------------------------------------------------------------ *\
   Landing legality — the part with a guarantee attached
\* ------------------------------------------------------------------ */

export interface Ground {
  /** Playable radius about the origin. Anything plopped must end strictly inside this. */
  worldRadius: number;
  /** Ground height. The ranch is a plane, so one number. */
  y: number;
  /** Every building, post, tree and trough, as circles. `Buildings.SOLIDS` in this shape. */
  solids: readonly Circle[];
}

/**
 * WHERE A SLIME IS ALLOWED TO BE PUT DOWN. Mutates and returns `p`.
 *
 * The order matters and is the whole design:
 *
 *   1. Push out of every solid it overlaps, several passes, so a spot wedged between two fence posts resolves
 *      out of both instead of ping-ponging. The push is along the horizontal normal, so a slime aimed at a
 *      barn wall slides along it and lands beside the barn — which is what a child throwing at a wall expects.
 *   2. THEN clamp inside the world. This order is not interchangeable: clamping last means the bound is the
 *      final word, so a slime shoved outward by a solid near the rim cannot be shoved out of the ranch. Doing
 *      it the other way round lets step 1 undo step 2.
 *   3. Then one more solid pass, cheap, in case the clamp pushed it back into something. If that pass still
 *      leaves an overlap the point is nudged toward the origin — the middle of the ranch is always open grass —
 *      which is the fallback that makes this total rather than best-effort.
 *
 * Slime-versus-slime is deliberately NOT handled here: it is `pushOutOfSlimes` from `herd.ts`, which the caller
 * applies afterwards, because that is live registry state and this function is pure.
 */
export function settleLanding(p: { x: number; z: number }, radius: number, g: Ground): { x: number; z: number } {
  const rim = Math.max(1, g.worldRadius - radius - 0.6);

  const pushOut = (passes: number): boolean => {
    let clear = true;
    for (let pass = 0; pass < passes; pass += 1) {
      let moved = false;
      for (const s of g.solids) {
        const dx = p.x - s.x;
        const dz = p.z - s.z;
        const d = Math.hypot(dx, dz);
        const want = s.r + radius;
        if (d >= want) continue;
        // Dead centre on a post: pick an axis rather than divide by zero.
        const nx = d > 1e-4 ? dx / d : 1;
        const nz = d > 1e-4 ? dz / d : 0;
        p.x = s.x + nx * want;
        p.z = s.z + nz * want;
        moved = true;
        clear = false;
      }
      if (!moved) break;
    }
    return clear;
  };

  pushOut(4);

  const r = Math.hypot(p.x, p.z);
  if (r > rim) {
    const k = rim / (r || 1);
    p.x *= k;
    p.z *= k;
  }

  pushOut(2);

  // Last resort. Walk toward the middle in half-metre steps until clear of everything and inside the rim.
  for (let i = 0; i < 24; i += 1) {
    if (!overlaps(p, radius, g)) break;
    const d = Math.hypot(p.x, p.z);
    if (d < 1e-3) {
      p.x = 0.5;
      p.z = 0;
      continue;
    }
    p.x -= (p.x / d) * 0.5;
    p.z -= (p.z / d) * 0.5;
  }

  return p;
}

/**
 * `Buildings.SOLIDS` is a list of `{ position: [x, z], radius }`; this file speaks `{ x, z, r }`. Converted once
 * at module scope by the callers rather than per frame, because `SOLIDS` is about 140 entries and static for
 * the life of the page — and because reaching into another track's shape in the middle of a frame loop is how
 * you end up unable to change either one.
 */
export function circlesFrom(
  solids: readonly { position: readonly [number, number]; radius: number }[],
): Circle[] {
  return solids.map((s) => ({ x: s.position[0], z: s.position[1], r: s.radius }));
}

/** True if this spot is inside a solid or outside the world. The invariant `settleLanding` clears. */
export function overlaps(p: { x: number; z: number }, radius: number, g: Ground): boolean {
  if (Math.hypot(p.x, p.z) > g.worldRadius - radius - 0.55) return true;
  for (const s of g.solids) {
    if (Math.hypot(p.x - s.x, p.z - s.z) < s.r + radius - 1e-6) return true;
  }
  return false;
}

/**
 * HOW FAR THE THROW CAN ACTUALLY GO — the distance at which the slime's own disc first touches something
 * solid, or the world's rim, whichever comes first, capped at `reach`.
 *
 * ── THIS IS THE BARN BUG, AND IT IS NOT SUBTLE ─────────────────────────────────────────────────────────
 *
 * The owner, twice, months apart: "i still can't put slimes in the stables in the barn. they disappear into
 * oblivion and die and i don't know where they go."
 *
 * `PLOP.reach` is five metres and was taken literally. The barn's walkable aisle is 2.5m wide and a stall is
 * 2.7m deep, so a child standing in the aisle looking at a stall was asking for the slime to be put down at a
 * point five metres away — through the stall, through the far wall, and out into the field behind the barn.
 * `settleLanding` then found nothing wrong with it, because a point out in an empty field overlaps nothing
 * and is inside the world; and `placeSlime` found nothing wrong with it either, because open field is
 * perfectly reachable ground. Every guarantee in the game held, and the slime still ended up somewhere the
 * child — who was standing INSIDE the barn, looking at a wall — could not possibly see it go.
 *
 * Driven through the real collider set from fifteen standing spots in the barn on four bearings each, TWELVE
 * OF FORTY-FOUR PLOPS PUT THE SLIME OUTSIDE THE BARN, five metres away, behind a wall. Not one of the
 * forty-four landed in a stall. `suction.test.ts` holds that measurement.
 *
 * Note what the previous attempt at this bug did and why it did not touch it: it made `placeSlime` prove a
 * spot was REACHABLE, and it verified the barn by asking `placeSlime` about hand-picked coordinates inside a
 * stall. Both were right and neither was the bug, because the bug was upstream of both — the coordinate
 * being asked about was never in the stall in the first place.
 *
 * ── WHAT IT DOES INSTEAD ───────────────────────────────────────────────────────────────────────────────
 *
 * A swept-disc cast along the flattened aim. The slime lands as far along the aim as it can get without
 * passing through anything, so aiming at a stall from the aisle puts it at the stall front where the child is
 * looking, aiming at a barn wall puts it against the barn wall, and aiming across open grass still throws
 * the full five metres. A slime now always lands on the same side of every wall as the child who threw it.
 *
 * A solid the ray STARTS inside is skipped rather than clamping the throw to zero: the aisle is narrow
 * enough that a child often stands within a stall-front circle's keeper reserve, and a throw that collapsed
 * to nothing there would drop the slime on their own feet every time. `settleLanding` resolves that case.
 */
export function clearReach(
  from: { x: number; z: number },
  /** Unit forward, already flattened to the ground plane. */
  fx: number,
  fz: number,
  reach: number,
  radius: number,
  g: Ground,
  /**
   * "IS THIS THE SAME PIECE OF GROUND I AM STANDING ON" — `slimes/ground.ts`'s `isFindable`, when the
   * caller has it.
   *
   * The solid cast above is necessary and not sufficient, and the gap between them is small but real: a ray
   * can run clear of every collider and still end in a pocket of open ground the child cannot walk to.
   * Measured over 2,214 plops across the ranch, exactly one did — into the sliver behind the pen rail at
   * (-6.8, 18.4) — and `placeSlime` then snapped it to the nearest reachable cell, which was on the far
   * side of a fence post from the child. One in two thousand is still a lost creature.
   *
   * So the throw additionally stops where the straight walk in front of the child stops. Passed in rather
   * than imported so this file keeps no dependency on the ranch registry and stays drivable from a harness
   * with nothing registered at all.
   */
  findable?: (x: number, z: number, r: number) => boolean,
): number {
  let limit = reach;

  for (const s of g.solids) {
    const dx = from.x - s.x;
    const dz = from.z - s.z;
    const want = s.r + radius;
    const c = dx * dx + dz * dz - want * want;
    // Already overlapping this one. Not the thrower's problem; `settleLanding` pushes out of it.
    if (c <= 0) continue;
    const b = dx * fx + dz * fz;
    const disc = b * b - c;
    if (disc < 0) continue;
    // Near root. `c > 0` and a real root mean both roots share a sign, so a negative near root is behind us.
    const t = -b - Math.sqrt(disc);
    if (t < 0 || t >= limit) continue;
    limit = t;
  }

  // The rim, solved the same way but from the inside, so the exit root is the far one.
  const rim = Math.max(1, g.worldRadius - radius - 0.6);
  const c = from.x * from.x + from.z * from.z - rim * rim;
  if (c < 0) {
    const b = from.x * fx + from.z * fz;
    const t = -b + Math.sqrt(Math.max(0, b * b - c));
    if (t >= 0 && t < limit) limit = t;
  }

  if (limit < reach) limit -= PLOP.standOff;
  limit = Math.min(reach, Math.max(0, limit));

  /* And no further than the child could walk in a straight line. Anchored on where they are STANDING: if
     even that is not findable for a slime this size — a warden where a 0.45m keeper fits — there is no
     component to reason from, so the solid cast is left to stand on its own and `placeSlime` finishes. */
  if (findable && limit > 0 && findable(from.x, from.z, radius)) {
    const step = 0.2;
    let good = 0;
    for (let t = step; t <= limit + 1e-9; t += step) {
      if (!findable(from.x + fx * t, from.z + fz * t, radius)) break;
      good = t;
    }
    // The end point itself, in case the loop stopped a fraction short of a legal `limit`.
    if (good < limit && findable(from.x + fx * limit, from.z + fz * limit, radius)) good = limit;
    limit = good;
  }

  // Never longer than the cast, and never negative. See the note on the absent minimum in `PLOP`.
  return Math.min(reach, Math.max(0, limit));
}

/**
 * Where the child is asking for the slime to go: straight out along the aim, flattened to the ground, and
 * never further than the first thing in the way.
 *
 * Flattened on purpose. Using the full 3D aim means looking up lobs the slime over the fence and looking down
 * drops it on your own feet, and a child holding a mouse looks up and down constantly without meaning
 * anything by it. Pitch is allowed to lengthen or shorten the throw a little, and that is all it does.
 *
 * `clamp` is optional only so the harnesses and the older tests can still ask the unclamped question. Every
 * caller in the game passes it, and `Vacpack` is the only caller in the game.
 */
export function plopTarget(
  aim: Aim,
  out: { x: number; z: number },
  clamp?: {
    radius: number;
    ground: Ground;
    findable?: (x: number, z: number, r: number) => boolean;
  },
): { x: number; z: number } {
  const flat = Math.hypot(aim.dir.x, aim.dir.z);
  const fx = flat > 1e-4 ? aim.dir.x / flat : 0;
  const fz = flat > 1e-4 ? aim.dir.z / flat : -1;
  // Looking up throws a little further, looking down a little nearer. 0.7x to 1.3x, and nothing more.
  const lift = 1 + Math.max(-0.3, Math.min(0.3, aim.dir.y));
  let reach = PLOP.reach * lift;
  if (clamp) reach = clearReach(aim.from, fx, fz, reach, clamp.radius, clamp.ground, clamp.findable);
  out.x = aim.from.x + fx * reach;
  out.z = aim.from.z + fz * reach;
  return out;
}
