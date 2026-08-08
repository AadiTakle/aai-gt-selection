/**
 * WHY A SLIME IS NEVER STILL AND NEVER THE SAME WAY UP — the whole movement brain, as plain numbers.
 *
 * The note this answers: "the slimes are all facing the same direction which is weird. they should be
 * more randomized PLUS they should have the ability to just move randomly around the ranch. obviously
 * not enough to the point of escaping but enough to move around."
 *
 * There is no three.js in this file and no React in it. Everything is a number on a plain object, for
 * two reasons. Forty of these are stepped every frame, so allocating a Vector3 per slime per frame is
 * forty allocations a frame and a garbage collection pause every few seconds — which on a game for a
 * five-year-old shows up as a stutter exactly when something interesting is happening. And a brain
 * made of numbers can be stepped a thousand times in a test to prove the one hard promise below.
 *
 * THE ONE HARD PROMISE: a slime cannot leave `bounds`. It is kept in two independent ways, because a
 * steering rule alone is a suggestion and a child WILL find the corner where a suggestion loses.
 * Slimes only ever pick targets inside the ring, AND the position is clamped into the ring after every
 * step no matter what moved it. The clamp is the guarantee; the steering only exists so the guarantee
 * never visibly fires, because a creature sliding along an invisible wall looks broken.
 *
 * WHY WANDERING IS A STATE MACHINE AND NOT A NOISE FIELD. Drifting a position through Perlin noise is
 * fewer lines and reads as floating debris: constant speed, no intent. A real animal picks somewhere,
 * goes there, then stops and thinks about it. So: rest, choose, ease out, ease in, rest. The pauses are
 * what make it look alive, and they are also what keeps forty of them from looking like a screensaver.
 */

/** A thing that takes up room on the ground plane. */
export interface Circle {
  x: number;
  z: number;
  r: number;
}

export interface WanderBounds {
  cx: number;
  cz: number;
  /** Slimes stay inside this, less their own radius. */
  r: number;
}

export interface WanderWorld {
  bounds: WanderBounds;
  /** Static furniture. Pushed out of hard, and steered around from a distance. */
  solids: readonly Circle[];
  /** The other slimes, live. Mutual soft separation — each side pushes half. */
  herd: readonly Circle[];
  /** Where the child is standing, if known. Slimes yield rather than let themselves be stood inside. */
  player?: Circle | undefined;
}

export interface WanderState {
  /* pose */
  x: number;
  z: number;
  /** Radians. Forward is (sin h, cos h), which is the direction local +Z points at rotation.y = h. */
  heading: number;

  /* intent */
  mode: 'rest' | 'walk';
  timer: number;
  tx: number;
  tz: number;
  /** Seconds spent in the current walk, for the ease-in. */
  walked: number;

  /* animation outputs, read by the component and written only here */
  /** Height off the ground, in body units. */
  bob: number;
  /** Vertical scale multiplier. Volume is preserved by the component, not here. */
  squash: number;
  /** 0..1, how much of full speed it is doing. Drives the hop amplitude. */
  effort: number;

  /* constants for this individual */
  speed: number;
  turnRate: number;
  hopPeriod: number;
  hopHeight: number;
  breathe: number;
  phase: number;
  radius: number;
  clock: number;
  hop: number;
  rng: () => number;
}

/* ============================================================================
   determinism
   ========================================================================== */

/**
 * A seeded generator, so slime #7 is the same slime on every reload.
 *
 * The seed is hashed before use rather than fed in raw. Callers hand out seeds like 0, 1, 2, and
 * mulberry32 seeded with small consecutive integers produces first draws that are themselves nearly
 * consecutive — which would have the first six slimes facing almost the same way, reintroducing the
 * exact complaint this file exists to fix.
 */
export function rngFor(seed: number): () => number {
  let h = (seed | 0) ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 0x21f0aaad);
  h = Math.imul(h ^ (h >>> 15), 0x735a2d97);
  let a = (h ^ (h >>> 15)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAU = Math.PI * 2;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

/** Shortest signed turn from a to b. */
function angleTo(a: number, b: number): number {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

/* ============================================================================
   birth
   ========================================================================== */

export function createWander(opts: {
  seed: number;
  x: number;
  z: number;
  radius: number;
  /** Overrides the seeded heading, for a slime posed on purpose (a lineup, a card, a corral gate). */
  facing?: number | undefined;
  /** Body height, so the hop is proportional: a tall kite hops higher than a flat bellow. */
  height: number;
  /** Family wobble multiplier from `look.ts`. A heavy slime is slower and wobbles less. */
  jiggle: number;
  bounds: WanderBounds;
}): WanderState {
  const rng = rngFor(opts.seed);
  // Burn a few draws so the fields below are not correlated across neighbouring seeds.
  rng();
  rng();

  const s: WanderState = {
    x: opts.x,
    z: opts.z,
    // THE FIX FOR "all facing the same direction": a full turn of the circle, from the seed, before
    // anything else happens. Not a small jitter around a default — a whole random heading.
    heading: opts.facing ?? rng() * TAU,
    mode: 'rest',
    timer: 0.4 + rng() * 3.2,
    tx: opts.x,
    tz: opts.z,
    walked: 0,
    bob: 0,
    squash: 1,
    effort: 0,
    // Slow. A slime crossing the ranch should take most of a minute, so a child never feels chased
    // and can always catch one it has decided to care for.
    speed: (0.34 + rng() * 0.3) * (0.7 + opts.jiggle * 0.3),
    turnRate: 1.5 + rng() * 1.1,
    hopPeriod: 0.62 + rng() * 0.3,
    hopHeight: opts.height * (0.075 + rng() * 0.05),
    breathe: (1.35 + rng() * 0.6) * opts.jiggle,
    phase: rng() * TAU,
    radius: opts.radius,
    clock: rng() * 10,
    hop: rng(),
    rng,
  };

  clampToBounds(s, opts.bounds);
  return s;
}

/* ============================================================================
   the promise
   ========================================================================== */

/** Pull a slime back inside the ring. Returns true if it had to. */
function clampToBounds(s: WanderState, b: WanderBounds): boolean {
  const dx = s.x - b.cx;
  const dz = s.z - b.cz;
  const d = Math.hypot(dx, dz);
  const max = Math.max(0.05, b.r - s.radius - 0.05);
  if (d <= max) return false;
  const k = max / (d || 1);
  s.x = b.cx + dx * k;
  s.z = b.cz + dz * k;
  return true;
}

/* ============================================================================
   choosing somewhere to be
   ========================================================================== */

/**
 * Pick a nearby spot to amble to.
 *
 * Biased FORWARD (a narrow-ish cone around the current heading) rather than uniform over the circle,
 * because a creature that reverses on the spot every time it stops reads as confused. Occasionally it
 * does turn right around, which is the difference between a bias and a rule.
 *
 * Candidates are rejected if they land inside furniture or outside the ring, and after a few tries it
 * settles for whatever was closest to acceptable — a slime must always end up with a target, since a
 * failed pick would leave it resting forever and it would be the one slime that never moves.
 */
function chooseTarget(s: WanderState, w: WanderWorld): void {
  const b = w.bounds;
  const reach = Math.max(0.6, b.r - s.radius - 0.35);

  let bestX = s.x;
  let bestZ = s.z;
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < 7; attempt += 1) {
    const wide = s.rng() < 0.18;
    const spread = wide ? Math.PI : 1.1;
    const a = s.heading + (s.rng() * 2 - 1) * spread;
    const dist = 1.1 + s.rng() * 3.4;
    const cx = s.x + Math.sin(a) * dist;
    const cz = s.z + Math.cos(a) * dist;

    // How far inside the ring, and how clear of furniture. Both as signed clearances so a candidate
    // can be scored rather than merely accepted or rejected.
    const fromCentre = Math.hypot(cx - b.cx, cz - b.cz);
    let score = (reach - fromCentre) * 2;
    for (const o of w.solids) {
      const gap = Math.hypot(cx - o.x, cz - o.z) - (o.r + s.radius + 0.25);
      if (gap < score) score = gap;
    }
    for (const o of w.herd) {
      const gap = Math.hypot(cx - o.x, cz - o.z) - (o.r + s.radius + 0.15);
      if (gap < score) score = gap;
    }

    if (score > bestScore) {
      bestScore = score;
      bestX = cx;
      bestZ = cz;
    }
    // Good enough: clear of everything with room to spare. Stop spending random numbers.
    if (score > 0.4) break;
  }

  // Even the best candidate is pulled inside the ring before it is accepted, so a slime never sets
  // off toward somewhere it is not allowed to be. This is the steering half of the bounds promise.
  const dx = bestX - b.cx;
  const dz = bestZ - b.cz;
  const d = Math.hypot(dx, dz);
  if (d > reach) {
    const k = reach / (d || 1);
    bestX = b.cx + dx * k;
    bestZ = b.cz + dz * k;
  }

  s.tx = bestX;
  s.tz = bestZ;
  s.mode = 'walk';
  s.walked = 0;
  // A generous ceiling, not a schedule: it only fires if avoidance has the slime going nowhere, and
  // then it gives up on this target and thinks again rather than pressing into an obstacle forever.
  s.timer = Math.hypot(bestX - s.x, bestZ - s.z) / s.speed + 2.5;
}

/* ============================================================================
   one step
   ========================================================================== */

/**
 * Advance one slime.
 *
 * Order matters, and this is the order: decide where to face, move, then fix up overlaps, then clamp.
 * Resolution last means a push-out can never be undone by movement within the same frame, which is
 * what stops the shivering you get when two slimes each move into where the other just was.
 */
export function stepWander(s: WanderState, dt: number, w: WanderWorld): void {
  const step = Math.min(dt, 1 / 30);
  s.clock += step;

  if (s.mode === 'rest') {
    s.timer -= step;
    s.effort += (0 - s.effort) * Math.min(1, step * 5);
    if (s.timer <= 0) chooseTarget(s, w);
  }

  if (s.mode === 'walk') {
    s.timer -= step;
    s.walked += step;

    const toX = s.tx - s.x;
    const toZ = s.tz - s.z;
    const away = Math.hypot(toX, toZ);

    // Seek, as a unit vector.
    let vx = away > 1e-4 ? toX / away : Math.sin(s.heading);
    let vz = away > 1e-4 ? toZ / away : Math.cos(s.heading);

    // Avoid. Anything close bends the desired direction sideways rather than stopping the slime, so
    // it walks AROUND the hut instead of standing against it. Weighted by how close, so a slime with
    // a clear path is not steered by furniture across the ranch.
    const feel = 1.7;
    for (const o of w.solids) {
      const dx = s.x - o.x;
      const dz = s.z - o.z;
      const d = Math.hypot(dx, dz);
      const gap = d - (o.r + s.radius);
      if (gap < feel) {
        const push = ((feel - Math.max(0, gap)) / feel) * 2.4;
        vx += (dx / (d || 1)) * push;
        vz += (dz / (d || 1)) * push;
      }
    }
    for (const o of w.herd) {
      const dx = s.x - o.x;
      const dz = s.z - o.z;
      const d = Math.hypot(dx, dz);
      const gap = d - (o.r + s.radius);
      if (gap < 1.1) {
        const push = ((1.1 - Math.max(0, gap)) / 1.1) * 1.5;
        vx += (dx / (d || 1)) * push;
        vz += (dz / (d || 1)) * push;
      }
    }
    if (w.player) {
      const dx = s.x - w.player.x;
      const dz = s.z - w.player.z;
      const d = Math.hypot(dx, dz);
      const gap = d - (w.player.r + s.radius);
      // A soft shyness only. They do not flee — a child who cannot get near the creatures has no
      // game — they just prefer not to be walked through.
      if (gap < 0.9) {
        const push = ((0.9 - Math.max(0, gap)) / 0.9) * 1.8;
        vx += (dx / (d || 1)) * push;
        vz += (dz / (d || 1)) * push;
      }
    }

    // Steer away from the rim before the clamp has to do it, so the guarantee stays invisible.
    const rx = s.x - w.bounds.cx;
    const rz = s.z - w.bounds.cz;
    const rd = Math.hypot(rx, rz);
    const rim = w.bounds.r - s.radius - rd;
    if (rim < 2.2 && rd > 1e-4) {
      const push = ((2.2 - Math.max(0, rim)) / 2.2) * 3;
      vx -= (rx / rd) * push;
      vz -= (rz / rd) * push;
    }

    const vlen = Math.hypot(vx, vz);
    if (vlen > 1e-5) {
      const want = Math.atan2(vx / vlen, vz / vlen);
      const turn = angleTo(s.heading, want);
      const most = s.turnRate * step;
      s.heading += Math.abs(turn) < most ? turn : Math.sign(turn) * most;
      if (s.heading > Math.PI) s.heading -= TAU;
      if (s.heading < -Math.PI) s.heading += TAU;
    }

    // Ease out of rest and back into it. A slime at constant speed from the first frame slides; the
    // ramp is what sells weight. Arrival easing is by DISTANCE so it settles exactly on the spot.
    const easeIn = smooth(s.walked / 0.55);
    const easeOut = smooth(away / 0.85);
    // Only walk in the direction it is actually facing. Turning first, then moving, is what makes
    // the turn read as a decision instead of a drift.
    const facing = Math.max(0, Math.cos(angleTo(s.heading, Math.atan2(vx, vz) || s.heading)));
    const goal = easeIn * easeOut * (0.35 + 0.65 * facing);
    s.effort += (goal - s.effort) * Math.min(1, step * 6);

    s.x += Math.sin(s.heading) * s.speed * s.effort * step;
    s.z += Math.cos(s.heading) * s.speed * s.effort * step;

    if (away < 0.28 || s.timer <= 0) {
      s.mode = 'rest';
      // Long, varied pauses. Forty slimes all pausing for the same beat would pulse in unison.
      s.timer = 0.9 + s.rng() * 4.5;
    }
  }

  /* --- resolution. Overlaps are fixed here and nowhere else. --------------- */

  // Other slimes: each side takes half, so a pair separates without either one winning.
  for (const o of w.herd) {
    const dx = s.x - o.x;
    const dz = s.z - o.z;
    const d = Math.hypot(dx, dz);
    const want = o.r + s.radius;
    if (d < want) {
      // Exactly coincident: nudge along a fixed axis rather than dividing by zero. Rare, but two
      // slimes seeded at the same spot would otherwise produce NaN and vanish from the scene.
      const nx = d > 1e-4 ? dx / d : 1;
      const nz = d > 1e-4 ? dz / d : 0;
      const fix = (want - d) * 0.5;
      s.x += nx * fix;
      s.z += nz * fix;
    }
  }

  // Furniture and the player do not move for a slime, so it takes the whole correction.
  for (const o of w.solids) {
    const dx = s.x - o.x;
    const dz = s.z - o.z;
    const d = Math.hypot(dx, dz);
    const want = o.r + s.radius;
    if (d < want) {
      const nx = d > 1e-4 ? dx / d : 1;
      const nz = d > 1e-4 ? dz / d : 0;
      s.x = o.x + nx * want;
      s.z = o.z + nz * want;
    }
  }
  if (w.player) {
    const dx = s.x - w.player.x;
    const dz = s.z - w.player.z;
    const d = Math.hypot(dx, dz);
    const want = w.player.r + s.radius;
    if (d < want) {
      const nx = d > 1e-4 ? dx / d : 1;
      const nz = d > 1e-4 ? dz / d : 0;
      s.x = w.player.x + nx * want;
      s.z = w.player.z + nz * want;
    }
  }

  // THE GUARANTEE. Last, unconditional, and after everything that could have moved a slime.
  if (clampToBounds(s, w.bounds) && s.mode === 'walk') {
    // If it did fire, the current target is unreachable. Think again rather than grind on the rim.
    s.mode = 'rest';
    s.timer = 0.5 + s.rng() * 1.5;
    s.heading += Math.PI * (0.4 + s.rng() * 0.4);
  }

  writePose(s, step);
}

/**
 * Stand still and breathe.
 *
 * For a slime that has been asked not to wander — one posed in a lineup, held in a UI card, or belonging
 * to a player who has turned motion down. It keeps the idle squash and the blink, because a creature
 * that is completely static reads as a prop, and the point of the squash is that it costs nothing.
 */
export function holdWander(s: WanderState, dt: number): void {
  const step = Math.min(dt, 1 / 30);
  s.clock += step;
  s.mode = 'rest';
  s.timer = 999;
  s.effort += (0 - s.effort) * Math.min(1, step * 5);
  writePose(s, step);
}

/**
 * The hop, the landing squash, and the resting breath.
 *
 * A slime that slides is a texture on a stick; the hop is what makes it a creature. It is small — under
 * a tenth of body height — because a big hop on a wide flat bellow looks like a bouncing ball, and
 * because forty things bouncing high at once is visual noise. The landing compression is the half that
 * actually reads: the eye is much better at seeing something squash against the ground than at seeing
 * it rise off it.
 */
function writePose(s: WanderState, step: number): void {
  if (s.effort > 0.02) {
    s.hop += step / s.hopPeriod;
    const p = s.hop % 1;
    const air = 0.56;
    if (p < air) {
      const k = Math.sin((p / air) * Math.PI);
      s.bob = k * s.hopHeight * s.effort;
      // Stretched while off the ground, and the stretch leads the lift slightly.
      s.squash = 1 + 0.1 * k * s.effort;
    } else {
      const since = (p - air) / (1 - air);
      s.bob = 0;
      s.squash = 1 - 0.15 * Math.exp(-since * 5.5) * s.effort;
    }
  } else {
    // At rest: settle to the ground and breathe. Slow, and slower for the heavy families.
    s.bob += (0 - s.bob) * Math.min(1, step * 6);
    const target = 1 + Math.sin(s.clock * s.breathe + s.phase) * 0.042;
    s.squash += (target - s.squash) * Math.min(1, step * 8);
    s.hop = 0;
  }
}
