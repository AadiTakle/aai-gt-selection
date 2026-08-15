import { describe, expect, it } from 'vitest';

import {
  BARN,
  BARN_IN_HALF_W,
  LADDER,
  LOFT,
  LOFT_EYE,
  LOFT_SOLIDS,
  LOFT_TOP,
} from './barn';
import { SOLIDS } from './Buildings';
import {
  CLIMB,
  EYE,
  LADDERS,
  type ClimbInput,
  type KeeperState,
  ladderAt,
  overLoft,
  stepKeeper,
  supportEye,
} from './ladder';
import { KEEPER_EYE, pushOut, solidBites, toWorld } from './plan';

/**
 * THE LADDER, PROVED RATHER THAN LOOKED AT.
 *
 * Everything here is a promise a screenshot cannot keep, which is the same reason `barn.test.ts` exists and
 * the same list of promises: a ladder a child cannot get onto photographs exactly like one they can; a loft
 * you fall through photographs exactly like a floor; a keeper trapped at the top of a ladder with no key
 * that helps photographs exactly like a keeper standing on a loft.
 *
 * IT IS ALSO THE ONLY EVIDENCE AVAILABLE. Pointer lock is refused in headless Chrome and unreliable headed,
 * so the keeper cannot be driven from outside the app at all — which is why the whole of climbing was
 * written as a pure function over a position, an input and a delta instead of as ten lines inside a
 * `useFrame`. These tests drive that function frame by frame at 60Hz, exactly as the game will.
 */

const KEEPER_RADIUS = 0.45;
const DT = 1 / 60;

const LADDER_ONE = LADDERS[0]!;

/** A no-op frame of input, so each test states only the keys it is actually pressing. */
function keys(over: Partial<ClimbInput> = {}): ClimbInput {
  return { forward: 0, strafe: 0, yaw: 0, jump: false, ...over };
}

/**
 * The yaw that points the camera's forward at a world point.
 *
 * DERIVED FROM `stepKeeper`'S OWN ARITHMETIC rather than guessed, and the derivation is worth writing out
 * because getting it wrong is a test that passes for the wrong reason. Pressing W alone gives the input
 * vector (0, 0, -1), which the step turns about +Y to `(-sin yaw, -cos yaw)`. Setting that proportional to
 * the offset `(dx, dz)` gives `sin yaw = -dx/L` and `cos yaw = -dz/L`, hence the two negations below.
 *
 * The first version of this had `atan2(dx, -dz)` — the x mirrored — and every test that walked ALONG the
 * barn still passed, because at the barn's 94.5° the mirrored heading is within a degree of the true one
 * for those particular directions. The one test that walked ACROSS it caught it, by facing exactly
 * backwards.
 */
function yawToward(from: { x: number; z: number }, to: readonly [number, number]): number {
  return Math.atan2(-(to[0] - from.x), -(to[1] - from.z));
}

/** Somewhere on the barn's threshing floor, an arm's length from the ladder. */
function atTheFoot(): KeeperState {
  const w = toWorld(BARN, LADDER.x - 1.3, LADDER.z);
  return { x: w[0], y: EYE, z: w[1], vy: 0, onLadder: null };
}

/** Run `n` frames of the same input and hand back the final state. */
function run(state: KeeperState, input: ClimbInput, n: number): KeeperState {
  let s = state;
  for (let i = 0; i < n; i += 1) s = stepKeeper(s, input, DT);
  return s;
}

/** Every frame of a run, for the tests that are about what happened on the way rather than the end. */
function trace(state: KeeperState, input: ClimbInput, n: number): KeeperState[] {
  const out: KeeperState[] = [];
  let s = state;
  for (let i = 0; i < n; i += 1) {
    s = stepKeeper(s, input, DT);
    out.push(s);
  }
  return out;
}

describe('the ladder is where the barn says it is', () => {
  it('stands on the barn ladder, not somewhere near it', () => {
    const stiles = toWorld(BARN, LADDER.x, LADDER.z);
    const off = Math.hypot(LADDER_ONE.hold[0] - stiles[0], LADDER_ONE.hold[1] - stiles[1]);
    // Close enough that the rungs are in front of your face, far enough that they are not through it.
    expect(off).toBeGreaterThan(0.45);
    expect(off).toBeLessThan(0.65);
  });

  it('climbs from the floor to the loft deck and no further', () => {
    expect(LADDER_ONE.footEye).toBe(KEEPER_EYE);
    expect(LADDER_ONE.headEye).toBeCloseTo(LOFT_TOP + KEEPER_EYE, 10);
  });

  it('lands somewhere that is actually on the loft', () => {
    expect(overLoft(LADDER_ONE.landing[0], LADDER_ONE.landing[1])).toBe(true);
  });

  it('leaves the landing outside its own grab circle, or a child could never get off', () => {
    const d = Math.hypot(
      LADDER_ONE.landing[0] - LADDER_ONE.hold[0],
      LADDER_ONE.landing[1] - LADDER_ONE.hold[1],
    );
    expect(d).toBeGreaterThan(LADDER_ONE.grab + 0.3);
  });

  it('is reachable: the floor colliders let a keeper get inside the grab circle', () => {
    /**
     * THE TEST THAT WOULD HAVE CAUGHT THE WHOLE FEATURE BEING DEAD. The ladder carries a 0.36m collider
     * and stands against a wall that carries a 0.55m chain; between them they could easily hold a 0.45m
     * keeper further from the hold than the grab radius, and the symptom would be a ladder that simply
     * never responds — with nothing on screen to suggest why.
     *
     * Walked in along the barn's own -X, which is the way a child comes at it.
     */
    let best = Infinity;
    for (let back = 0; back <= 2.5; back += 0.02) {
      const w = toWorld(BARN, LADDER.x - back, LADDER.z);
      if (pushOut(SOLIDS, w[0], w[1], KEEPER_RADIUS).pushed > 0) continue;
      best = Math.min(best, Math.hypot(w[0] - LADDER_ONE.hold[0], w[1] - LADDER_ONE.hold[1]));
    }
    expect(best).toBeLessThan(LADDER_ONE.grab);
  });

  it('reports itself from a point inside the circle and not from one outside', () => {
    expect(ladderAt(LADDER_ONE.hold[0], LADDER_ONE.hold[1])?.name).toBe('barn loft');
    expect(ladderAt(LADDER_ONE.hold[0] + LADDER_ONE.grab + 0.2, LADDER_ONE.hold[1])).toBeNull();
    // And nowhere else on the ranch is a ladder.
    expect(ladderAt(0, 0)).toBeNull();
  });
});

describe('taking hold of it', () => {
  it('walking at it takes it', () => {
    const start = atTheFoot();
    const input = keys({ forward: 1, yaw: yawToward(start, LADDER_ONE.hold) });
    const end = run(start, input, 30);
    expect(end.onLadder?.name).toBe('barn loft');
  });

  it('walking PAST it does not', () => {
    /**
     * The ladder is on the wall a child walks along to reach the back of the barn. Grabbing on proximity
     * alone would snatch them onto it in passing, which is the difference between a feature and a hazard.
     */
    const start = atTheFoot();
    // Along the barn's own +Z: across the ladder's face rather than into it.
    const along = toWorld(BARN, LADDER.x - 1.3, LADDER.z + 4);
    const input = keys({ forward: 1, yaw: yawToward(start, [along[0], along[1]]) });
    for (const s of trace(start, input, 60)) expect(s.onLadder).toBeNull();
  });

  it('standing next to it doing nothing does not', () => {
    const start = { ...atTheFoot() };
    const w = toWorld(BARN, LADDER.x - 0.9, LADDER.z);
    start.x = w[0];
    start.z = w[1];
    expect(ladderAt(start.x, start.z)).not.toBeNull();
    expect(run(start, keys(), 60).onLadder).toBeNull();
  });
});

describe('climbing up', () => {
  const climbed = (): KeeperState => {
    const start = atTheFoot();
    return run(start, keys({ forward: 1, yaw: yawToward(start, LADDER_ONE.hold) }), 40);
  };

  it('W goes up', () => {
    const s = climbed();
    expect(s.onLadder).not.toBeNull();
    expect(s.y).toBeGreaterThan(EYE + 0.3);
  });

  it('gravity never gets a turn while holding on', () => {
    /**
     * The failure this catches is the whole first half of the job: `Keeper` runs -18 m/s² every frame and
     * clamps to the meadow, so a climb that leaves gravity integrating is a child who slides down a ladder
     * at increasing speed. `vy` must be zero on every frame of a climb, not merely at the end of it.
     */
    const start = atTheFoot();
    const input = keys({ forward: 1, yaw: yawToward(start, LADDER_ONE.hold) });
    let held = 0;
    for (const s of trace(start, input, 80)) {
      if (!s.onLadder) continue;
      held += 1;
      expect(s.vy).toBe(0);
    }
    expect(held).toBeGreaterThan(40);
  });

  it('holds still on the ladder when nothing is pressed, rather than sinking', () => {
    const s = climbed();
    const parked = run(s, keys(), 120);
    expect(parked.onLadder).not.toBeNull();
    expect(parked.y).toBeCloseTo(s.y, 6);
  });

  it('rises at the climb rate, not the walk rate', () => {
    const s = climbed();
    const after = run(s, keys({ forward: 1 }), 30);
    expect(after.y - s.y).toBeCloseTo(CLIMB * 30 * DT, 4);
  });

  it('slides onto the ladder axis instead of teleporting to it', () => {
    const start = atTheFoot();
    const input = keys({ forward: 1, yaw: yawToward(start, LADDER_ONE.hold) });
    let previous = start;
    for (const s of trace(start, input, 40)) {
      expect(Math.hypot(s.x - previous.x, s.z - previous.z)).toBeLessThan(0.12);
      previous = s;
    }
  });

  it('space does nothing at all up there', () => {
    const s = climbed();
    const jumped = run(s, keys({ jump: true }), 60);
    expect(jumped.onLadder).not.toBeNull();
    expect(jumped.y).toBeCloseTo(s.y, 6);
    expect(jumped.vy).toBe(0);
  });

  it('A and D do nothing halfway up', () => {
    const s = climbed();
    expect(s.y).toBeGreaterThan(LADDER_ONE.footEye + 0.4);
    const shoved = run(s, keys({ strafe: 1 }), 60);
    expect(shoved.onLadder).not.toBeNull();
    expect(shoved.y).toBeCloseTo(s.y, 6);
  });
});

describe('arriving on the loft', () => {
  /** Walk at the ladder and keep pressing W until it puts them down somewhere. */
  const upAndOff = (): KeeperState => {
    const start = atTheFoot();
    const input = keys({ forward: 1, yaw: yawToward(start, LADDER_ONE.hold) });
    let s = start;
    for (let i = 0; i < 400; i += 1) {
      s = stepKeeper(s, input, DT);
      if (!s.onLadder && s.y > EYE + 0.5) return s;
    }
    throw new Error(`never got off the top: y=${s.y} onLadder=${s.onLadder?.name}`);
  };

  it('W all the way up steps them onto the loft, without anything else being pressed', () => {
    const s = upAndOff();
    expect(s.onLadder).toBeNull();
    expect(overLoft(s.x, s.z)).toBe(true);
    expect(s.y).toBeCloseTo(LOFT_EYE, 6);
  });

  it('takes a second or two, which is a climb rather than a lift', () => {
    const start = atTheFoot();
    const input = keys({ forward: 1, yaw: yawToward(start, LADDER_ONE.hold) });
    let frames = 0;
    let s = start;
    while (frames < 600) {
      s = stepKeeper(s, input, DT);
      frames += 1;
      if (!s.onLadder && s.y > EYE + 0.5) break;
    }
    expect(frames * DT).toBeGreaterThan(1.2);
    expect(frames * DT).toBeLessThan(4);
  });

  it('does not immediately take the ladder again and bounce', () => {
    /**
     * THE PING-PONG. The way back onto the ladder is to walk into the loft's opening, and a child doing
     * that is holding W — so if reaching the head while pressing W always dismounted, one held key would
     * bounce them between the landing and the edge forever. `stepKeeper` only steps them off the top if
     * they were BELOW it at the start of the frame; this walks straight on holding W and checks that they
     * end up standing rather than oscillating.
     */
    const s = upAndOff();
    const on = run(s, keys({ forward: 1, yaw: 0 }), 5);
    expect(on.onLadder).toBeNull();
  });

  it('lands somewhere the collider set actually lets them stand', () => {
    /**
     * The landing is chosen, so it can be chosen wrong — and the two candidates for pushing a child back
     * off it are exactly the ones this loft has: the posts holding it up, which stand right where you
     * arrive, and the guard rail along the edge you have just come over. Both are banded, and this proves
     * the bands are the right way round rather than merely present.
     */
    const s = upAndOff();
    const all = [...SOLIDS, ...LOFT_SOLIDS];
    expect(pushOut(all, s.x, s.z, KEEPER_RADIUS, s.y).pushed).toBe(0);
    // And the same point at ground level IS blocked, by the post that is banded to exist down there.
    expect(pushOut(all, s.x, s.z, KEEPER_RADIUS, KEEPER_EYE).pushed).toBeGreaterThan(0);
  });
});

describe('the loft is a floor', () => {
  it('holds a keeper who is standing on it', () => {
    const stand: KeeperState = {
      x: LADDER_ONE.landing[0],
      y: LOFT_EYE,
      z: LADDER_ONE.landing[1],
      vy: 0,
      onLadder: null,
    };
    const after = run(stand, keys(), 120);
    expect(after.y).toBeCloseTo(LOFT_EYE, 6);
    expect(after.vy).toBe(0);
  });

  it('does not let them fall through it at any speed', () => {
    /**
     * A ONE-WAY PLATFORM RESOLVED FROM WHERE THEY WERE, not from where they are. At 20 m/s a 50ms frame
     * moves a metre, so a floor tested after the move is a floor a fast fall goes straight through — and
     * the child would land on the barn's threshing floor having done nothing wrong. Dropped from every
     * height up to twelve metres, at a delta three times the frame time the game runs at.
     */
    for (let drop = 0.1; drop <= 12; drop += 0.37) {
      let s: KeeperState = {
        x: LADDER_ONE.landing[0],
        y: LOFT_EYE + drop,
        z: LADDER_ONE.landing[1],
        vy: 0,
        onLadder: null,
      };
      for (let i = 0; i < 200; i += 1) s = stepKeeper(s, keys(), 0.05);
      expect(s.y, `dropped from ${drop.toFixed(2)}m above the deck`).toBeCloseTo(LOFT_EYE, 6);
    }
  });

  it('is not a lid: a keeper on the threshing floor underneath is unaffected by it', () => {
    const under = toWorld(BARN, 0, LOFT.from + 2);
    expect(overLoft(under[0], under[1])).toBe(true);
    const s: KeeperState = { x: under[0], y: EYE, z: under[1], vy: 0, onLadder: null };
    expect(supportEye(s.x, s.z, s.y)).toBe(EYE);
    // And jumping under it cannot reach it: 6.4 m/s against -18 is 1.14m, the deck is 1.9m over their head.
    const jumped = trace(s, keys({ jump: true }), 90);
    expect(Math.max(...jumped.map((f) => f.y))).toBeLessThan(LOFT_EYE - 0.5);
  });

  it('walking off the loft where there is no rail drops them to the barn floor', () => {
    // Straight off the -Z edge in the middle, where the rail's collider is the only thing stopping them
    // in the real game. The physics must still be a fall rather than a hover.
    const mid = toWorld(BARN, 0, LOFT.from + 0.5);
    let s: KeeperState = { x: mid[0], y: LOFT_EYE, z: mid[1], vy: 0, onLadder: null };
    const away = toWorld(BARN, 0, LOFT.from - 4);
    s = run(s, keys({ forward: 1, yaw: yawToward(s, [away[0], away[1]]) }), 120);
    expect(s.y).toBeCloseTo(EYE, 6);
  });

  it('the guard rail is the only thing between the loft and a three-metre drop, and it holds', () => {
    /**
     * Walked along the whole open edge in 5cm steps at loft height. Every point a keeper can actually
     * stand on within half a metre of the edge must either be held off it by the rail or be inside the
     * ladder's grab circle — those are the only two acceptable answers, and "neither" is a child stepping
     * into the air.
     */
    const all = [...SOLIDS, ...LOFT_SOLIDS];
    let openings = 0;
    for (let lx = -BARN_IN_HALF_W; lx <= BARN_IN_HALF_W; lx += 0.05) {
      const w = toWorld(BARN, lx, LOFT.from + 0.02);
      if (pushOut(all, w[0], w[1], KEEPER_RADIUS, LOFT_EYE).pushed > 0) continue;
      if (ladderAt(w[0], w[1])) continue;
      openings += 1;
    }
    expect(openings).toBe(0);
  });

  it('and a keeper on the ground floor can still walk under all of it', () => {
    /**
     * The other half of the same claim, and the one that would silently wreck the barn: the rail and the
     * gable infill are 3.4m in the air, so at ground level they must not exist. This walks the doorway
     * centreline and the length of the loft's edge downstairs and expects nothing to push.
     */
    const all = [...SOLIDS, ...LOFT_SOLIDS];
    for (let lz = -2; lz <= 9; lz += 0.1) {
      const w = toWorld(BARN, 0, lz);
      expect(pushOut(all, w[0], w[1], KEEPER_RADIUS).pushed, `centreline at z=${lz.toFixed(1)}`).toBe(0);
    }
  });

  it('closes the top of the doorway, so they cannot walk out of the barn three metres up', () => {
    /**
     * The loft's deck is at 3.41 and the head of the big doors is at 4.06, so there is a 65cm slot in the
     * gable right at a child's feet up there — and the doorway's collider is deliberately open across it,
     * because that gap is the entire point of the doorway downstairs. A flat collider set cannot tell the
     * two apart. Without the infill a child walks off the front of the barn.
     */
    const all = [...SOLIDS, ...LOFT_SOLIDS];
    const inside = toWorld(BARN, 0, LOFT.from + 1);
    let s: KeeperState = { x: inside[0], y: LOFT_EYE, z: inside[1], vy: 0, onLadder: null };
    const outward = toWorld(BARN, 0, 30);
    const input = keys({ forward: 1, yaw: yawToward(s, [outward[0], outward[1]]) });
    for (let i = 0; i < 240; i += 1) {
      s = stepKeeper(s, input, DT);
      for (const solid of all) {
        if (!solidBites(solid, s.y)) continue;
        const dx = s.x - solid.position[0];
        const dz = s.z - solid.position[1];
        const d = Math.hypot(dx, dz);
        const min = solid.radius + KEEPER_RADIUS;
        if (d < min && d > 1e-4) {
          s.x += (dx / d) * (min - d);
          s.z += (dz / d) * (min - d);
        }
      }
    }
    expect(s.y).toBeCloseTo(LOFT_EYE, 6);
    expect(overLoft(s.x, s.z)).toBe(true);
  });
});

describe('getting back down', () => {
  /** On the ladder, three quarters of the way up. */
  const halfway = (): KeeperState => {
    const start = atTheFoot();
    let s = run(start, keys({ forward: 1, yaw: yawToward(start, LADDER_ONE.hold) }), 12);
    s = run(s, keys({ forward: 1 }), 40);
    expect(s.onLadder).not.toBeNull();
    return s;
  };

  it('S goes down', () => {
    const s = halfway();
    const lower = run(s, keys({ forward: -1 }), 20);
    expect(lower.y).toBeLessThan(s.y);
    expect(lower.onLadder).not.toBeNull();
  });

  it('reaching the bottom steps them off automatically, standing on the barn floor', () => {
    const s = halfway();
    const off = run(s, keys({ forward: -1 }), 240);
    expect(off.onLadder).toBeNull();
    expect(off.y).toBeCloseTo(EYE, 6);
  });

  it('and does not immediately take hold again', () => {
    const s = run(halfway(), keys({ forward: -1 }), 240);
    expect(s.onLadder).toBeNull();
    // Still pressing down, for another two seconds.
    expect(run(s, keys({ forward: -1 }), 120).onLadder).toBeNull();
  });

  it('steps them off somewhere the collider set lets them stand', () => {
    const off = run(halfway(), keys({ forward: -1 }), 240);
    expect(pushOut([...SOLIDS, ...LOFT_SOLIDS], off.x, off.z, KEEPER_RADIUS, off.y).pushed).toBe(0);
  });

  it('A or D at the foot steps off sideways rather than doing nothing', () => {
    const start = atTheFoot();
    const on = run(start, keys({ forward: 1, yaw: yawToward(start, LADDER_ONE.hold) }), 9);
    expect(on.onLadder).not.toBeNull();
    expect(on.y).toBeLessThan(LADDER_ONE.footEye + 0.4);
    const off = run(on, keys({ strafe: 1 }), 2);
    expect(off.onLadder).toBeNull();
  });

  it('from the loft: walking into the opening puts them on the ladder, and S brings them down', () => {
    const landing: KeeperState = {
      x: LADDER_ONE.landing[0],
      y: LOFT_EYE,
      z: LADDER_ONE.landing[1],
      vy: 0,
      onLadder: null,
    };
    const toward = keys({ forward: 1, yaw: yawToward(landing, LADDER_ONE.hold) });
    const grabbed = run(landing, toward, 40);
    expect(grabbed.onLadder?.name).toBe('barn loft');
    expect(grabbed.y).toBeCloseTo(LOFT_EYE, 6);
    const down = run(grabbed, keys({ forward: -1 }), 240);
    expect(down.onLadder).toBeNull();
    expect(down.y).toBeCloseTo(EYE, 6);
  });
});

describe('walking is still exactly what it was', () => {
  /**
   * THE TEST THAT MAKES THE SWAP SAFE TO MAKE.
   *
   * `stepKeeper` replaces four blocks of `Game.tsx` — the walk, the jump, the gravity and the floor clamp
   * — so the first thing it has to be is a faithful copy of them. If it is not, this change is not "the
   * barn has a ladder", it is "the whole game moves differently", and the difference would be a feel
   * nobody could point at. The old arithmetic is restated here verbatim from the controller and stepped
   * beside the new one, out on the meadow where no ladder and no loft can be involved.
   */
  const old = (
    p: { x: number; y: number; z: number; vy: number },
    f: number,
    s: number,
    yaw: number,
    jump: boolean,
    dt: number,
  ) => {
    const n = { ...p };
    let dx = s;
    let dz = -f;
    const len = Math.hypot(dx, dz);
    if (len > 0) {
      dx /= len;
      dz /= len;
      const c = Math.cos(yaw);
      const sn = Math.sin(yaw);
      const rx = dx * c + dz * sn;
      const rz = -dx * sn + dz * c;
      dx = rx;
      dz = rz;
    }
    n.x += dx * WALK_MIRROR * dt;
    n.z += dz * WALK_MIRROR * dt;
    const onGround = n.y <= EYE + 1e-3;
    if (onGround && jump) n.vy = JUMP_MIRROR;
    n.vy += GRAVITY_MIRROR * dt;
    n.y += n.vy * dt;
    if (n.y < EYE) {
      n.y = EYE;
      n.vy = 0;
    }
    return n;
  };
  // `Game.tsx`'s own numbers, typed out rather than imported, so the comparison is against the values in
  // that file rather than against the ones this module happens to export.
  const WALK_MIRROR = 4.2;
  const GRAVITY_MIRROR = -18;
  const JUMP_MIRROR = 6.4;

  it('matches the old integrator frame for frame, out on the meadow', () => {
    let mine: KeeperState = { x: 3, y: EYE, z: 9, vy: 0, onLadder: null };
    let theirs = { x: 3, y: EYE, z: 9, vy: 0 };
    let walked = 0;
    for (let i = 0; i < 300; i += 1) {
      const before = { x: mine.x, z: mine.z };
      const f = [1, 0, -1, 1][i % 4] ?? 0;
      const s = [0, 1, 0, -1][i % 4] ?? 0;
      const yaw = i * 0.07;
      const jump = i % 31 === 0;
      mine = stepKeeper(mine, { forward: f, strafe: s, yaw, jump }, DT);
      theirs = old(theirs, f, s, yaw, jump, DT);
      expect(mine.x).toBeCloseTo(theirs.x, 9);
      expect(mine.y).toBeCloseTo(theirs.y, 9);
      expect(mine.z).toBeCloseTo(theirs.z, 9);
      expect(mine.vy).toBeCloseTo(theirs.vy, 9);
      walked += Math.hypot(mine.x - before.x, mine.z - before.z);
    }
    // And they really did walk, rather than agreeing about standing still. The yaw turns through three
    // whole revolutions over the run, so the two end up near where they started — it is the PATH that has
    // to be long, not the displacement.
    expect(walked).toBeGreaterThan(10);
  });
});

describe('there is no way to get stuck', () => {
  it('S always ends standing on a floor, from anywhere on the climb', () => {
    /**
     * The one promise that matters most for a five-year-old, so it is checked exhaustively rather than at
     * a couple of heights: take hold, climb for n frames for every n up to the full height, then hold S
     * and expect to be standing on the barn floor, off the ladder, every time.
     */
    const start = atTheFoot();
    const grabbing = keys({ forward: 1, yaw: yawToward(start, LADDER_ONE.hold) });
    for (let n = 12; n <= 130; n += 2) {
      const up = run(start, grabbing, n);
      const down = run(up, keys({ forward: -1 }), 400);
      expect(down.onLadder, `after ${n} frames of climbing`).toBeNull();
      expect(down.y, `after ${n} frames of climbing`).toBeCloseTo(EYE, 6);
    }
  });

  it('never produces a position that is not a number', () => {
    const start = atTheFoot();
    let s = start;
    // Every combination of the three axes, twenty frames each, four hundred frames in all.
    for (let i = 0; i < 400; i += 1) {
      s = stepKeeper(
        s,
        keys({
          forward: [1, -1, 0, 1, -1][Math.floor(i / 20) % 5] ?? 0,
          strafe: [0, 1, -1, 0][Math.floor(i / 13) % 4] ?? 0,
          yaw: (i * 0.31) % (Math.PI * 2),
          jump: i % 7 === 0,
        }),
        DT,
      );
      expect(Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(s.z)).toBe(true);
    }
  });
});
