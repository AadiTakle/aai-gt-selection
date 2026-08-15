import {
  BARN,
  BARN_IN_HALF_D,
  BARN_IN_HALF_W,
  LADDER,
  LOFT,
  LOFT_EYE,
  LOFT_TOP,
} from './barn';
import { KEEPER_EYE, toLocal, toWorld, type P2 } from './plan';

/**
 * RE-EXPORTED SO `Game.tsx` ADDS EXACTLY ONE IMPORT LINE.
 *
 * The two of them are the other half of climbing and they live in the two files this one is built on:
 * `LOFT_SOLIDS` is the guard rail and the gable infill that only exist upstairs, and `solidBites` is the
 * one-line test the push-out loop needs so a banded circle is asked about at the right height. Making the
 * controller reach into three modules to enable one feature is how an integration gets done wrong; this
 * module is the feature, so it hands over everything the feature needs.
 */
export { LOFT_SOLIDS } from './barn';
export { solidBites, type Solid } from './plan';

/**
 * CLIMBING THE LADDER IN THE BARN, as arithmetic.
 *
 * THE OWNER'S ASK, verbatim: "i want to be able to climb the ladder in the barn, basically by using w and
 * d up and down it as if we are continuing the walking mechanic just up and down the ladder."
 *
 * W AND S, NOT W AND D, and the substitution is worth stating rather than quietly making. W and S are
 * already forward and back, and the sentence's own words are "as if we are continuing the walking
 * mechanic" — the whole request is that climbing should be the SAME two keys doing the same thing in a
 * different direction. D is strafe; binding "up" to it would be a new control, which is precisely what the
 * ask says not to do. So W goes up the ladder and S comes down it, and nothing new has to be taught.
 *
 * WHY THIS IS A FILE AND NOT TEN LINES IN `Game.tsx`.
 *
 * Pointer lock is refused in headless Chrome and unreliable even headed, so nobody can drive the keeper
 * from outside the app. The controller in `Game.tsx` has therefore never been under test, and everything
 * about climbing is exactly the kind of thing that is invisible until a child finds it: a keeper who
 * cannot get off a ladder, a loft you fall through, a collider that shrugs you off a rung halfway up. All
 * of that is pure arithmetic over a position, an input and a delta, so it lives here where a test can run
 * it ten thousand times in a millisecond, and `Game.tsx` calls one function.
 *
 * THE FIVE THINGS THIS HAS TO GET RIGHT, each of which is a way the obvious implementation fails:
 *
 *   GRAVITY MUST STOP. `Keeper` applies -18 m/s² every frame and clamps to the meadow at eye 1.5. A
 *   climbing child with gravity still running is a child sliding down a ladder. So the ladder branch does
 *   not integrate gravity at all and holds `vy` at zero, which also means letting go anywhere begins a
 *   fall from rest rather than from whatever speed had accumulated while they were holding on.
 *
 *   THE LOFT MUST BE A FLOOR. Same clamp: without one the child arrives at the top and is instantly
 *   returned to the ground. `supportEye` is a one-way platform — the deck holds you only if you were at or
 *   above it, so it is a floor from above and thin air from below, which is what stops it becoming a lid
 *   over the threshing floor.
 *
 *   THE COLLIDERS MUST LET GO. The barn's +X wall chain and the ladder's own circle both sit within a
 *   metre of the rungs; run the push-out on a climbing keeper and it walks them sideways off the ladder in
 *   about four frames. So `Keeper` skips the whole chain while `onLadder` is set — which is safe precisely
 *   because a keeper on a ladder is not being moved by anything except this file.
 *
 *   GETTING OFF MUST BE AUTOMATIC. A five-year-old will not find a key. Reaching the top steps them onto
 *   the loft; reaching the bottom steps them back into the barn; both happen because they kept pressing
 *   the key they were already pressing.
 *
 *   AND IT MUST NOT TRAP. There is no state from which the only exit is a key nobody would try. Whatever
 *   height they are at, S brings them down and off; whatever they do up top, walking into the loft's
 *   opening puts them back on the ladder.
 *
 * WHAT SPACE DOES: NOTHING. See `jump` in `ClimbInput`.
 */

/* ------------------------------------------------------------------ *\
   The controller's constants, mirrored

   These four are `Game.tsx`'s `WALK`, `GRAVITY`, `JUMP` and `KEEPER_HEIGHT`. They are declared here so
   that this module is a complete statement of how the keeper moves and can be tested as one — and they
   are EXPORTED so `Game.tsx` can delete its own copies and import these instead, which is the only way
   the two can be guaranteed to agree. `plan.ts` makes the same argument for the same reason about the
   push-out loop; the difference is that a divergent walk speed is merely wrong, while a divergent eye
   height puts a child's feet through the loft.
\* ------------------------------------------------------------------ */

/** Eye height above whatever floor the keeper is standing on. */
export const EYE = KEEPER_EYE;
/** Metres per second on the flat. */
export const WALK = 4.2;
export const GRAVITY = -18;
export const JUMP = 6.4;

/**
 * How fast a child goes up a ladder, in metres per second.
 *
 * Half the walk speed and no more. A ladder taken at walking pace reads as an elevator — the whole reason
 * a ladder is worth climbing is that it is slow enough to feel like effort — and at 2.1 m/s the 3.4m to
 * the loft takes a beat over a second and a half, which is long enough to be a climb and short enough that
 * a child does not let go halfway up to see what else the keys do.
 */
export const CLIMB = 2.1;

/* ------------------------------------------------------------------ *\
   What a ladder is
\* ------------------------------------------------------------------ */

export interface Ladder {
  /** For messages and tests. */
  readonly name: string;
  /**
   * World x/z of the HOLD, which is where the keeper's body is while climbing — on the ladder's axis but
   * stood off the rungs, not inside the stiles.
   */
  readonly hold: P2;
  /** Eye height at the foot of the climb: standing on the floor the ladder rises from. */
  readonly footEye: number;
  /** Eye height at the head of it: standing on the surface it leads to. */
  readonly headEye: number;
  /** How near the hold a keeper has to be, in plan, before the ladder is theirs to take. */
  readonly grab: number;
  /**
   * World x/z the keeper is put down on when they reach the top, and the eye height they stand at there.
   *
   * A LANDING RATHER THAN "WHEREVER THEY WERE PLUS A BIT". The hold is 55cm short of the loft's edge —
   * the ladder is deliberately clear of it, or a climber's head meets the underside of the deck — so
   * arriving at the top and simply stopping would leave a child standing in mid-air beside a floor. The
   * step onto the loft has to be part of the climb, and it has to land somewhere chosen: far enough in
   * that the guard rail's collider does not shove them, far enough from the hold that they do not
   * immediately re-take the ladder they have just got off.
   */
  readonly landing: P2;
  readonly landingEye: number;
  /**
   * Unit world direction pointing AWAY from the ladder, into the room it stands in. Getting off at the
   * bottom steps this way, so a child who has come down is facing the barn rather than the rungs.
   */
  readonly out: P2;
}

/**
 * How far the keeper's body stands off the ladder's centreline while climbing.
 *
 * 55cm, and it is set from both ends. Nearer than about 45 and the rungs are through the near plane;
 * further than about 60 and the hold crosses the line the barn's +X wall chain holds a keeper on, so the
 * frame they let go they are pushed — which would make the release at the bottom look like a shove.
 */
const HOLD_OFF = 0.55;

/**
 * THE ONE LADDER ON THE RANCH, and a list rather than a constant because the shape of the problem is "is
 * the keeper on a ladder", not "is the keeper on THE ladder". A second one anywhere costs an entry.
 *
 * Every number is derived from the barn's own plan. `LADDER` and `LOFT` are where the geometry in
 * `barnInterior.tsx` puts the stiles and the deck, so the climb cannot end at a height the floor is not
 * at, and the landing cannot be somewhere the loft is not.
 */
export const LADDERS: readonly Ladder[] = (() => {
  const holdLocal = { x: LADDER.x - HOLD_OFF, z: LADDER.z };
  const hold = toWorld(BARN, holdLocal.x, holdLocal.z);
  /**
   * 75cm past the loft's edge. Inside the rail's collider reach at the ladder bay by about 20cm, and 1.3m
   * from the hold against a 0.85m grab — so the child who steps off is out of the ladder's reach and has
   * to walk back into the opening to take it again, which is the behaviour that makes the loft feel like
   * a floor rather than like the top of a ladder.
   */
  const landing = toWorld(BARN, holdLocal.x, LOFT.from + 0.75);
  /**
   * Local -X as a world DIRECTION: away from the wall the ladder is on, into the middle of the barn.
   * A direction is the difference of two points through the same transform, which is why the barn's own
   * origin is subtracted rather than the vector being written out from a sine and a cosine — one frame
   * convention, `toWorld`, used for this the way it is used for everything else.
   */
  const origin = toWorld(BARN, 0, 0);
  const away = toWorld(BARN, -1, 0);
  const out: P2 = [away[0] - origin[0], away[1] - origin[1]];
  return [
    {
      name: 'barn loft',
      hold,
      footEye: EYE,
      headEye: LOFT_EYE,
      /**
       * 0.85m. The floor of the barn holds a keeper 0.81m off the ladder's own collider circle, which puts
       * the closest they can stand 0.39m from the hold — so anything over about half a metre is reachable.
       * The ceiling on it is the landing: at 1.3m away, a grab radius past about 1.2 would re-take the
       * ladder the instant a child was set down on the loft, and they would never get off it.
       */
      grab: 0.85,
      landing,
      landingEye: LOFT_EYE,
      out,
    },
  ];
})();

/**
 * The ladder whose reach contains this point in plan, or null.
 *
 * POSITION ONLY, deliberately: this answers "is there a ladder here", which is a fact about the world, and
 * it is separately useful — a test asks it, and a hint prompt could. Whether the keeper actually TAKES the
 * ladder is a question about intent as well, and that decision lives in `stepKeeper` where the input is.
 */
export function ladderAt(x: number, z: number): Ladder | null {
  for (const l of LADDERS) {
    if (Math.hypot(x - l.hold[0], z - l.hold[1]) <= l.grab) return l;
  }
  return null;
}

/* ------------------------------------------------------------------ *\
   The loft, as a floor
\* ------------------------------------------------------------------ */

/** Whether a point in plan is over the loft's deck. */
export function overLoft(x: number, z: number): boolean {
  // World back into the barn's frame: the inverse of `toWorld`, which is the same rotation the other way.
  const [lx, lz] = toLocal(BARN, x, z);
  return Math.abs(lx) < BARN_IN_HALF_W && lz > LOFT.from && lz < BARN_IN_HALF_D;
}

/**
 * The eye height of the floor under a keeper who was at `fromEye` and is now over `(x, z)`.
 *
 * A ONE-WAY PLATFORM, which is the whole of it. The deck holds you if you were already at or above its
 * surface and drops you through if you were not, so the same slab is a floor to walk on from above and
 * nothing at all from below. Two-sided instead, it would be a lid: the barn's ceiling would become solid
 * at head height for anybody on the threshing floor.
 *
 * The 2cm of slack is against float drift only. It cannot be used to climb: `JUMP` is 6.4 m/s against
 * -18 m/s², which is 1.14m of rise, and the deck is 1.9m over the head of a keeper standing under it.
 */
export function supportEye(x: number, z: number, fromEye: number): number {
  if (fromEye >= LOFT_EYE - 0.02 && overLoft(x, z)) return LOFT_EYE;
  return EYE;
}

/* ------------------------------------------------------------------ *\
   The step
\* ------------------------------------------------------------------ */

export interface ClimbInput {
  /** W minus S, in -1..1. Forward on the flat; UP the ladder on a ladder. */
  forward: number;
  /** D minus A, in -1..1. Strafe on the flat; see `stepKeeper` for what it does on a ladder. */
  strafe: number;
  /** The camera's yaw, in three's convention — the same number `Keeper` already keeps. */
  yaw: number;
  /**
   * Space.
   *
   * ON A LADDER IT DOES NOTHING, AND THAT IS A DECISION RATHER THAN AN OMISSION. The two candidates were
   * "jump off" and "ignore", and ignore wins on three counts. A jump needs something to push against and
   * a child holding a ladder has nothing, so it is also the honest answer. Making it let go would give
   * Space two meanings — up here it is not a jump, it is a three-metre fall — and the only way for a
   * five-year-old to discover the second meaning is to suffer it, having pressed the key that has been
   * harmless everywhere else in the game. And it buys nothing: S already comes down the ladder, faster to
   * reach and impossible to regret. Space stays a jump, and a jump is a thing you do standing up.
   */
  jump: boolean;
}

export interface KeeperState {
  x: number;
  /** The camera's y: an EYE height, not a floor height. */
  y: number;
  z: number;
  /** Vertical velocity, m/s. Always zero while on a ladder. */
  vy: number;
  /** The ladder being held, or null. `Keeper` keeps this in a ref and hands it straight back. */
  onLadder: Ladder | null;
}

/** How close to the bottom of a climb counts as "at the bottom", for stepping off sideways. */
const NEAR_FOOT = 0.4;

/**
 * One frame of keeper movement: walking, gravity, floors and ladders, as one pure function.
 *
 * ALL OF IT RATHER THAN JUST THE LADDER PART, and that is the point of the shape. Climbing is not a mode
 * bolted beside walking — it is the same two keys, and the transitions between the two are where every
 * bug in this feature would live. A function that only handled the ladder would leave the interesting
 * half (when do you take it, when do you let go, what is your vertical velocity at the moment you do) in
 * the file nobody can test.
 *
 * `Keeper` still owns everything AFTER this: the slime push, the collider chain, the soft bound. It must
 * skip all three while `onLadder` is set — see the note at the top of the file, and the insertion
 * `world/ladder.ts` is written to be dropped into.
 */
export function stepKeeper(state: KeeperState, input: ClimbInput, dt: number): KeeperState {
  const next: KeeperState = { ...state };

  /**
   * The walk direction, in world. Straight out of `Keeper`: strafe on local X, forward on local -Z, turned
   * by the yaw. It is computed even on a ladder, because whether the keeper is trying to walk INTO the
   * ladder is what decides whether they take hold of it.
   */
  const len = Math.hypot(input.strafe, input.forward);
  let wantX = 0;
  let wantZ = 0;
  if (len > 1e-6) {
    const nx = input.strafe / len;
    const nz = -input.forward / len;
    const c = Math.cos(input.yaw);
    const s = Math.sin(input.yaw);
    // Rotation about +Y by yaw, matching `applyAxisAngle(new Vector3(0, 1, 0), yaw)`.
    wantX = nx * c + nz * s;
    wantZ = -nx * s + nz * c;
  }

  /* ---- take hold of a ladder? ------------------------------------------ */
  if (!next.onLadder) {
    const near = ladderAt(next.x, next.z);
    if (near && next.y > near.footEye - 0.1 && next.y < near.headEye + 0.6) {
      /**
       * WALKING INTO IT IS WHAT TAKES IT, which is the owner's "continuing the walking mechanic" read as
       * literally as it can be: the ladder is a thing in the room and you get on it by walking at it.
       *
       * The alternative — grab on proximity alone — was tried on paper and fails in one obvious place and
       * one subtle one. Obviously, the ladder stands against the wall a child walks along to reach the
       * back of the barn, and being snatched onto it in passing is maddening. Subtly, it makes getting OFF
       * at the bottom impossible: the release puts the keeper 40cm from the hold, still inside the grab
       * circle, and they are taken straight back. Requiring intent solves both with one test, because a
       * child stepping away is by definition not walking toward it.
       *
       * 0.4 is about 66° either side of straight at it — wide enough that nobody has to aim, narrow enough
       * that walking past along the wall does not count.
       */
      const dx = near.hold[0] - next.x;
      const dz = near.hold[1] - next.z;
      const d = Math.hypot(dx, dz);
      const toward = d > 1e-4 ? (wantX * dx + wantZ * dz) / d : 0;
      if (toward > 0.4) {
        next.onLadder = near;
        next.vy = 0;
      }
    }
  }

  /* ---- on a ladder ------------------------------------------------------ */
  const ladder = next.onLadder;
  if (ladder) {
    /**
     * Slide onto the ladder's axis rather than snapping to it. The grab can happen up to 85cm away and a
     * teleport of that size at a child's eye height is a lurch; closing at the walk speed reads as the
     * last step of the walk that took them there, which is exactly what it is.
     */
    const dx = ladder.hold[0] - next.x;
    const dz = ladder.hold[1] - next.z;
    const d = Math.hypot(dx, dz);
    const move = Math.min(d, WALK * dt);
    if (d > 1e-6) {
      next.x += (dx / d) * move;
      next.z += (dz / d) * move;
    }

    // No gravity, no jump. See `ClimbInput.jump`.
    next.vy = 0;
    const wasBelowHead = next.y < ladder.headEye - 1e-6;
    next.y += input.forward * CLIMB * dt;

    /* ---- off the top ---------------------------------------------------- */
    if (next.y >= ladder.headEye) {
      if (input.forward > 0 && wasBelowHead) {
        /**
         * CLIMBED TO THE TOP, so they are put down on the loft. It happens because they kept pressing the
         * key they were already pressing, which is the whole of "getting off must be automatic".
         *
         * `wasBelowHead` IS WHAT STOPS A LOOP, and the loop it stops is not obvious until it is drawn.
         * The way back ONTO the ladder from the loft is to walk into its opening, and a child doing that
         * is holding W — so without this test the sequence is: grab at head height, forward is positive,
         * dismount straight back to the landing, walk into the opening again, grab again. Holding one key
         * would bounce them between the edge and the landing forever, and the ladder could never be
         * descended from the top at all.
         *
         * With it, the rule is one sentence a child can hold: THE TOP OF THE LADDER IS LEVEL WITH THE
         * LOFT. Climb up to it and you step onto the floor; take hold of it FROM the floor and you are
         * already at the top, so the only way is down. Pressing up at the top of a ladder does nothing,
         * which is what pressing up at the top of a ladder should do — and nobody is stuck, because S
         * comes down and off from any height.
         */
        next.x = ladder.landing[0];
        next.z = ladder.landing[1];
        next.y = ladder.landingEye;
        next.onLadder = null;
        return next;
      }
      next.y = ladder.headEye;
    }

    /* ---- off the bottom -------------------------------------------------- */
    if (next.y <= ladder.footEye) {
      next.y = ladder.footEye;
      if (input.forward < 0) {
        /**
         * Came all the way down and is still pressing down, so they step back off it. Automatic, because
         * the alternative is a child standing at the foot of a ladder holding a key that has stopped doing
         * anything — which is a trap even though nothing is stopping them from walking away, since they
         * have no way of knowing they are allowed to.
         *
         * The step is 30cm into the room. Enough that the release cannot be undone by the same frame's
         * intent test, not so much that it reads as being pushed.
         */
        next.x += ladder.out[0] * 0.3;
        next.z += ladder.out[1] * 0.3;
        next.onLadder = null;
        return next;
      }
    }

    /* ---- sideways --------------------------------------------------------- */
    if (Math.abs(input.strafe) > 0.01 && next.y <= ladder.footEye + NEAR_FOOT) {
      /**
       * A/D near the bottom steps off; A/D anywhere higher does nothing.
       *
       * "A child who climbs half way and walks sideways should end up somewhere sensible", and the
       * sensible thing three metres up is to keep hold. Letting strafe drop them would make the two most
       * likely accidental keys on the board — the ones either side of the one they are holding — into a
       * fall, and there would be no cue that it was coming. Near the floor there is nothing to fall from,
       * so it steps off the way anybody steps off the bottom rung, and the child who is only fidgeting
       * gets what they expect.
       *
       * They are not stuck when it is ignored: S is still down and off, from any height.
       */
      next.x += ladder.out[0] * 0.3;
      next.z += ladder.out[1] * 0.3;
      next.onLadder = null;
    }
    return next;
  }

  /* ---- walking ---------------------------------------------------------- */
  next.x += wantX * WALK * dt;
  next.z += wantZ * WALK * dt;

  const floor = supportEye(next.x, next.z, next.y);
  const onGround = next.y <= floor + 1e-3;
  if (onGround && input.jump) next.vy = JUMP;
  next.vy += GRAVITY * dt;
  const wasY = next.y;
  next.y += next.vy * dt;

  /**
   * The floor is resolved from where they WERE, not from where they are now.
   *
   * A fast fall crosses the loft's deck inside one frame — at 10 m/s a 50ms frame moves half a metre —
   * and asking "am I above the deck" after the move would answer no, so the child would drop straight
   * through the floor they had been standing on. Asking with the height they started the frame at makes
   * the deck a swept surface, which is what a one-way platform has to be.
   */
  const support = supportEye(next.x, next.z, wasY);
  if (next.y < support) {
    next.y = support;
    next.vy = 0;
  }
  return next;
}
