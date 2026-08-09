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
  /**
   * Static furniture within reach: buildings, the shop stall, stations, fence posts, trees.
   *
   * "Within reach" rather than "all of it" is the integrator's job, and it is why this is a plain array
   * rather than the whole world. There are 514 colliders on the ranch and up to a few dozen slimes, and
   * this list is walked three times a step; `ground.ts`'s grid hands back the handful that could matter.
   */
  solids: readonly Circle[];
  /** The other slimes, live. Mutual soft separation — each side pushes half. */
  herd: readonly Circle[];
  /** Where the child is standing, if known. Slimes yield rather than let themselves be stood inside. */
  player?: Circle | undefined;
  /**
   * THE RANCH ITSELF, as a second unconditional clamp.
   *
   * `bounds` is where this individual is meant to stay and is set by whoever placed it, so it is only as
   * trustworthy as that caller — and the caller got it wrong, which is how a slime ended up with a
   * sixteen-metre roaming circle centred on a pen it had never been in. This one is the world, it is the
   * same for every slime, and it is applied after everything else. Optional so a preview page with no
   * ranch around it still works.
   */
  ranch?: WanderBounds | undefined;
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

  /* --- where it was put down, and how far it may get from there ------------
     The second half of the fix for the vanished slime. See `ROAM` in `ground.ts`: a slime a child sets
     down anywhere other than a pen used to inherit a roaming circle big enough to cross the ranch. This
     is a leash on the spot it was actually placed, independent of `bounds`, and `Infinity` — the default —
     turns it off for the penned slimes, whose own bounds are already local. */
  homeX: number;
  homeZ: number;
  roam: number;

  /* --- not being stuck -----------------------------------------------------
     A slime pinned against a wall by its own steering is a worse bug than one that walks through the
     wall, because it is permanent. `stuck` accumulates while the brain wants to move and the body is not
     moving; when it runs out the slime gives up on the target and turns away. `turnBias` decides WHICH
     way it goes round an obstacle, and it is per-slime and constant so a slime does not dither between
     the two ways past a fence post. */
  stuck: number;
  turnBias: 1 | -1;

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
  /** Body height, so the hop is proportional: a tall fairy hops higher than a flat rock. */
  height: number;
  /** Family wobble multiplier from `look.ts`. A heavy slime is slower and wobbles less. */
  jiggle: number;
  bounds: WanderBounds;
  /** How far it may get from where it is being born. Default unlimited; see `ROAM` in `ground.ts`. */
  roam?: number | undefined;
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
    homeX: opts.x,
    homeZ: opts.z,
    roam: opts.roam ?? Infinity,
    stuck: 0,
    // Derived from the heading rather than drawn, ON PURPOSE. Every field below comes off `rng` in a
    // fixed order and a slime is defined by that order; slipping another draw in here would give every
    // existing slime a different gait, a different hop and a different set of pauses for a coin flip.
    turnBias: 1,
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

  s.turnBias = Math.sin(s.heading * 7.31 + s.phase) >= 0 ? 1 : -1;

  clampToBounds(s, opts.bounds);
  // The leash is measured from where it ENDED UP, not from where it was asked for, so a slime born just
  // outside its bounds does not spend its life pulling against a home it was never allowed to stand on.
  s.homeX = s.x;
  s.homeZ = s.z;
  return s;
}

/**
 * Move a slime's leash. For a slime that has been picked up and set down somewhere else without being
 * rebuilt — the vacpack's whole point is that what comes out is what went in.
 */
export function reseatWander(s: WanderState, x: number, z: number, roam = s.roam): void {
  s.x = x;
  s.z = z;
  s.tx = x;
  s.tz = z;
  s.homeX = x;
  s.homeZ = z;
  s.roam = roam;
  s.stuck = 0;
  s.mode = 'rest';
  s.timer = 0.4 + s.rng() * 2.2;
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

/**
 * And the leash on where it was put down. Same arithmetic, different circle, applied independently.
 *
 * Two circles rather than one intersected circle because they mean different things and come from
 * different places: `bounds` is the pen or the pasture the integrator assigned, and this is "near where
 * the child left you". Applying both in sequence is their intersection, and neither has to know about
 * the other.
 */
function clampToHome(s: WanderState): boolean {
  if (!Number.isFinite(s.roam)) return false;
  const dx = s.x - s.homeX;
  const dz = s.z - s.homeZ;
  const d = Math.hypot(dx, dz);
  if (d <= s.roam) return false;
  const k = s.roam / (d || 1);
  s.x = s.homeX + dx * k;
  s.z = s.homeZ + dz * k;
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
  // And inside the leash, for the same reason and in the same spirit: the clamp in `stepWander` is the
  // guarantee, and this is what keeps it from ever visibly firing.
  if (Number.isFinite(s.roam)) {
    const hx = bestX - s.homeX;
    const hz = bestZ - s.homeZ;
    const hd = Math.hypot(hx, hz);
    const most = Math.max(0.3, s.roam - 0.3);
    if (hd > most) {
      const k = most / (hd || 1);
      bestX = s.homeX + hx * k;
      bestZ = s.homeZ + hz * k;
    }
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

  // Where it was before anything touched it, so the jam watchdog at the bottom can compare what the
  // brain WANTED to travel against what the body actually did. Intent minus outcome is the only honest
  // definition of stuck; a slime standing still because it chose to rest is not stuck.
  const fromX = s.x;
  const fromZ = s.z;

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
    const seekX = away > 1e-4 ? toX / away : Math.sin(s.heading);
    const seekZ = away > 1e-4 ? toZ / away : Math.cos(s.heading);

    /**
     * Avoidance is accumulated SEPARATELY from the seek, which is the change that stops a slime
     * head-butting a wall.
     *
     * Summed straight into the desired direction — which is what this used to do — an obstacle dead ahead
     * produces a push pointing exactly back down the seek, the two cancel, and the slime's desired
     * direction becomes the zero vector. It then keeps whatever heading it had, walks into the wall,
     * gets pushed out, walks back in, and vibrates there until the target's timer runs out. Two walls
     * meeting at a corner cancel it in both axes and it never gets out at all.
     *
     * Keeping the two apart means the opposition can be MEASURED, and a sideways term added in proportion
     * to it. That term is what turns "press into the wall" into "walk along the wall", which is what an
     * animal does and what the eye expects.
     */
    let ax = 0;
    let az = 0;
    const feel = 1.7;
    for (const o of w.solids) {
      const dx = s.x - o.x;
      const dz = s.z - o.z;
      const d = Math.hypot(dx, dz);
      const gap = d - (o.r + s.radius);
      if (gap < feel) {
        const push = ((feel - Math.max(0, gap)) / feel) * 2.4;
        ax += (dx / (d || 1)) * push;
        az += (dz / (d || 1)) * push;
      }
    }
    for (const o of w.herd) {
      const dx = s.x - o.x;
      const dz = s.z - o.z;
      const d = Math.hypot(dx, dz);
      const gap = d - (o.r + s.radius);
      if (gap < 1.1) {
        const push = ((1.1 - Math.max(0, gap)) / 1.1) * 1.5;
        ax += (dx / (d || 1)) * push;
        az += (dz / (d || 1)) * push;
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
        ax += (dx / (d || 1)) * push;
        az += (dz / (d || 1)) * push;
      }
    }

    // Steer away from the rim before the clamp has to do it, so the guarantee stays invisible. Both
    // rings, and the leash gets a tighter skirt because it is a smaller circle.
    const rimPush = (cx: number, cz: number, r: number, skirt: number, weight: number): void => {
      const rx = s.x - cx;
      const rz = s.z - cz;
      const rd = Math.hypot(rx, rz);
      const rim = r - s.radius - rd;
      if (rim < skirt && rd > 1e-4) {
        const push = ((skirt - Math.max(0, rim)) / skirt) * weight;
        ax -= (rx / rd) * push;
        az -= (rz / rd) * push;
      }
    };
    rimPush(w.bounds.cx, w.bounds.cz, w.bounds.r, 2.2, 3);
    if (Number.isFinite(s.roam)) rimPush(s.homeX, s.homeZ, s.roam + s.radius, 1.4, 3);
    if (w.ranch) rimPush(w.ranch.cx, w.ranch.cz, w.ranch.r, 2.2, 3);

    let vx = seekX + ax;
    let vz = seekZ + az;

    /**
     * THE SIDESTEP. How much the avoidance is fighting the seek, as a number, and a tangent added in
     * proportion to it.
     *
     * `opp` is zero when the obstacle is off to one side (the sum already turns the slime, which is the
     * old behaviour and is correct) and approaches the avoidance's own magnitude when the obstacle is
     * dead ahead. `turnBias` picks a side once per slime and never changes, so it commits to going round
     * one way instead of oscillating between two equally good ways — the dithering that makes a stuck
     * creature look broken even in the frames where it is technically moving.
     */
    const opp = -(seekX * ax + seekZ * az);
    if (opp > 0.25) {
      const al = Math.hypot(ax, az);
      if (al > 1e-4) {
        const k = Math.min(2.2, opp) * 1.5 * s.turnBias;
        vx += (-az / al) * k;
        vz += (ax / al) * k;
      }
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

  /**
   * Furniture does not move for a slime, so it takes the whole correction.
   *
   * THREE PASSES, not one, and the reason is the fence. Every collider on this ranch is a small circle in
   * a chain — a barn wall is thirty of them, the boundary is 258 — so being pushed out of one routinely
   * puts a slime inside the next, and a single pass leaves it embedded in a wall it has already been
   * "resolved" out of. Three is enough for every arrangement on the ranch: the tightest is a pen's gate
   * jamb, where two posts and a rail end meet.
   *
   * The correction is along the horizontal normal only, so it SLIDES: a slime walking into a wall at an
   * angle keeps its sideways travel and carries on along the wall, rather than sticking to the spot it
   * touched. That, and the sidestep above, are the two halves of not jamming.
   */
  for (let pass = 0; pass < 3; pass += 1) {
    let moved = false;
    for (const o of w.solids) {
      const dx = s.x - o.x;
      const dz = s.z - o.z;
      const d = Math.hypot(dx, dz);
      const want = o.r + s.radius;
      if (d >= want) continue;
      const nx = d > 1e-4 ? dx / d : 1;
      const nz = d > 1e-4 ? dz / d : 0;
      s.x = o.x + nx * want;
      s.z = o.z + nz * want;
      moved = true;
    }
    if (!moved) break;
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

  /* --- the guarantees. Last, unconditional, after everything that could have moved a slime. -------
     Three rings, applied in order of authority: the assigned bounds, the leash on where it was put
     down, and the ranch. Each is a hard clamp rather than a suggestion, and any of them firing means
     the current target is unreachable, so the slime thinks again rather than grinding on a rim. */
  let pinned = clampToBounds(s, w.bounds);
  if (clampToHome(s)) pinned = true;
  if (w.ranch && clampToBounds(s, w.ranch)) pinned = true;
  if (pinned && s.mode === 'walk') rethink(s);

  /**
   * THE JAM WATCHDOG, and it is the difference between a bug that looks bad and a bug that never ends.
   *
   * A slime that walks through a fence is wrong for a second. A slime wedged in a corner, vibrating,
   * is wrong until the page is reloaded — and a child watching one creature shudder against a post
   * while the others amble about will decide that one is broken. The steering above is what should stop
   * it happening; this is what stops it lasting.
   *
   * Intent against outcome: `effort` is how hard the brain is trying, so the distance it EXPECTED to
   * cover this step is known exactly, and anything under a third of it while genuinely trying counts as
   * being held. It has to be an accumulator rather than a per-frame test, because one held frame is a
   * normal part of sliding along a wall and there is nothing wrong with it. Nine tenths of a second of
   * them is not.
   *
   * The recovery is deliberately not "push harder". It gives up on the target — which is the thing that
   * was unreachable — turns most of the way round, and rests, which is also the only recovery that looks
   * like an animal changing its mind rather than like a physics glitch resolving.
   */
  const went = Math.hypot(s.x - fromX, s.z - fromZ);
  const meant = s.speed * s.effort * step;
  if (s.mode === 'walk' && s.effort > 0.12 && went < meant * 0.35) s.stuck += step;
  else s.stuck = Math.max(0, s.stuck - step * 2);
  if (s.stuck > 0.9) rethink(s);

  writePose(s, step);
}

/** Give up on the current target, turn well away from it, and take a moment. */
function rethink(s: WanderState): void {
  s.stuck = 0;
  s.mode = 'rest';
  s.timer = 0.5 + s.rng() * 1.5;
  s.heading += s.turnBias * Math.PI * (0.4 + s.rng() * 0.4);
  if (s.heading > Math.PI) s.heading -= TAU;
  if (s.heading < -Math.PI) s.heading += TAU;
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
 * a tenth of body height — because a big hop on a wide flat rock looks like a bouncing ball, and
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
