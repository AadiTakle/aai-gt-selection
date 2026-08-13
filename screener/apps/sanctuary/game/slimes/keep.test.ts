/**
 * THE TESTS FOR THE TWO REPORTS THAT WERE THE SAME LINE OF CODE.
 *
 *   "there's also some bug to where i tried sucking up a slime and it stayed there but i managed to get
 *    like 4 different copies of it. let's make sure that can never happen. it was outside the pen and i
 *    don't know if that has anything to do with that but maybe check just to see."
 *
 *   "sometimes when you dispense the slimes, such as for tow-line, the slimes are technically popped out
 *    but i swear they disappear immediately after and you can't find them again."
 *
 * Both of them are the herd's bookkeeping identifying a slime by something that is not its identity. The
 * capture resolved one by family, stage and nearest RECORDED position — which for a wandering slime is not
 * where it is — and the grant put the reward in a pen chosen by array length while the child watched a
 * hatchling that was only ever theatre. `keep.ts` argues both cases at length; this file measures them.
 *
 * EVERY TEST HERE THAT FIXES A BUG ALSO RUNS THE OLD BEHAVIOUR, as `oldTake` and `oldGrant` below, which
 * are transcriptions of the shipped `Game.tsx` code with nothing changed. A regression test whose teeth are
 * asserted rather than demonstrated is a regression test that might be checking nothing.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { FAMILIES, type Stage } from '../contract';
import { INTRO_SOLIDS } from '../intro/site';
import { SHOP_SOLIDS } from '../economy/site';
import { SITES, STATION_SOLIDS } from '../stations/sites';
import { BARN, barnSolids } from '../world/barn';
import { BOUNDARY, FENCE } from '../world/fence';
import { chainOutline, toWorld, type Solid } from '../world/plan';
import { capturedTrace, clearTraces, recordCapture, type CapturedTrace } from '../vacpack/identity';
import { tankPush, tankReset, tankShift } from '../vacpack/tank';
import { clearHerd, joinHerd, leaveHerd, type SlimeCollider } from './herd';
import { isFindable, ROAM, setRanchSolids } from './ground';
import { slimeRadius } from './gumdrop';
import {
  audit,
  grantSlime,
  herdSlimes,
  keptCount,
  nextSlimeUid,
  putSlime,
  resetHerd,
  seedHerd,
  setHerd,
  takeSlime,
  type Slimelet,
} from './keep';

/* The ranch, assembled from the plan modules on the same terms as `ground.test.ts`: this file is about
   bookkeeping rather than about geometry, and it only needs somewhere legal for a slime to stand. */
const HUT = { x: 13.0, z: -5.0, rot: 0.087 };
const ALL: Solid[] = [
  ...barnSolids(),
  ...chainOutline(HUT, 3.3, 2.7, 0.9, 1.4),
  ...FENCE.posts.map((p) => ({ position: [p.x, p.z] as [number, number], radius: p.gatePost ? 0.36 : 0.42 })),
  ...BOUNDARY.solids,
  ...STATION_SOLIDS,
  ...SHOP_SOLIDS,
  ...INTRO_SOLIDS,
];
setRanchSolids(ALL, { worldRadius: 34, from: [0, 8] });

const PENS: readonly (readonly [number, number])[] = [
  [-6, 15.5],
  [11.4, 4.2],
  [-15.5, -16.5],
];
const PEN_RADIUS = 3.4;

beforeEach(() => {
  resetHerd();
  clearHerd();
  clearTraces();
  tankReset();
});

/* ========================================================================== *
   The shipped behaviour, transcribed, so the teeth can be shown
 * ========================================================================== */

/**
 * `Game.tsx`'s `takeSlime`, exactly as it was. Nearest slime of the same family and stage to where the
 * capture says the slime was standing, and a silent no-op when nothing matches.
 */
function oldTake(prev: readonly Slimelet[], t: CapturedTrace): { next: Slimelet[]; took: Slimelet | null } {
  let best = -1;
  let bestD = Infinity;
  prev.forEach((sl, i) => {
    if (sl.family !== t.family || sl.stage !== t.stage) return;
    const d = Math.hypot(sl.position[0] - t.x, sl.position[2] - t.z);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  if (best < 0) return { next: [...prev], took: null };
  return { next: prev.filter((_, i) => i !== best), took: prev[best] ?? null };
}

/** `Game.tsx`'s `grant`, exactly as it was: a pen chosen by how many slimes there happen to be. */
function oldGrant(count: number): [number, number] {
  const pen = PENS[count % PENS.length]!;
  const a = count * 1.7;
  const r = 1.0 + (count % 3) * 0.8;
  return [pen[0] + Math.cos(a) * r, pen[1] + Math.sin(a) * r];
}

/* ========================================================================== *
   A herd that is mounted, wanders, and can be sucked at
 * ========================================================================== */

/**
 * Mount every slime in the world into `herd.ts` the way `Slime.tsx` does, uid included.
 *
 * This is the join that closes the bug, so it is the join the test exercises rather than a stand-in.
 */
function mount(world: readonly Slimelet[]): Map<number, SlimeCollider> {
  const live = new Map<number, SlimeCollider>();
  for (const sl of world) {
    live.set(
      sl.uid,
      joinHerd({
        uid: sl.uid,
        family: sl.family,
        stage: sl.stage,
        x: sl.position[0],
        z: sl.position[2],
        // The ground under it, which `Slime.tsx` resolves per frame. Nothing about identity reads it.
        y: sl.position[1],
        top: 0.95,
        r: slimeRadius(sl.family, sl.stage),
      }),
    );
  }
  return live;
}

/** The whole grab, as `Vacpack` performs it: record the live collider, then tell the world. */
function suck(c: SlimeCollider): { id: string; trace: CapturedTrace } {
  const id = recordCapture(c);
  const trace = capturedTrace(id)!;
  return { id, trace };
}

/* ========================================================================== *
   Identity
 * ========================================================================== */

describe('a capture removes the slime that was captured', () => {
  it('REGRESSION: the old matcher took the wrong slime when the sucked one had wandered', () => {
    /**
     * THE EXACT SHAPE OF THE OWNER'S REPORT, with his own detail in it: the slime was OUTSIDE A PEN.
     *
     * A slime put down outside a pen is leashed to `ROAM` — six metres — from where it was put, and that
     * leash is the whole of the reason the old matcher was wrong so often. `sl.position` is where it was
     * PUT; wandering happens in the frame loop and never writes back. So:
     *
     *   X is the slime the child is pointing at. It was put down at (0, 8) and has wandered to (0, 13.4),
     *     which is inside its leash and perfectly legal.
     *   Y is another slime of the same family and stage, sitting quietly two metres from its own mark.
     *
     * The capture reports "a crested rose slime at (0, 13.4)". Y's RECORDED position is 1.4m from that.
     * X's is 5.4m from it. So the old code removed Y.
     */
    const family = FAMILIES[0]!;
    const stage: Stage = 'crested';
    const X: Slimelet = {
      uid: nextSlimeUid(),
      family,
      stage,
      position: [0, 0, 8],
      seed: 11,
      bounds: { center: [0, 8], radius: ROAM },
    };
    const Y: Slimelet = {
      uid: nextSlimeUid(),
      family,
      stage,
      position: [0, 0, 14.8],
      seed: 22,
      bounds: { center: [0, 14.8], radius: ROAM },
    };
    const world = [X, Y];
    const live = mount(world);
    // X wanders. Its collider follows it; its record does not, which is correct and is the whole problem.
    const cx = live.get(X.uid)!;
    cx.z = 13.4;

    const { trace } = suck(cx);

    // The old code. It is handed a trace that names X and it removes Y.
    const before = oldTake(world, trace);
    expect(before.took?.uid, 'the old matcher took the wrong slime').toBe(Y.uid);
    expect(before.next.map((s) => s.uid), 'and left the one the child was sucking standing there').toContain(X.uid);

    // The new code, through the real store, resolving on the uid the collider now carries.
    resetHerd();
    setHerd(world);
    const took = takeSlime(trace);
    expect(took?.uid).toBe(X.uid);
    expect(herdSlimes().map((s) => s.uid)).toEqual([Y.uid]);
    expect(audit().byUid).toBe(1);
    expect(audit().byPosition).toBe(0);
    expect(audit().unmatched).toBe(0);
  });

  it('REGRESSION: sucking one slime four times used to make four copies of it', () => {
    /**
     * THE OWNER'S REPORT, DRIVEN. Once a capture removes the wrong slime, the one the child is pointing at
     * is still standing there — and still in the herd, so the cone picks it again on the very next grab.
     * Four grabs, four innocent slimes deleted from the far side of the ranch to pay for them, and four
     * creatures plopped out at the child's feet beside the one that never left. That is "it stayed there
     * but i managed to get like 4 different copies of it", exactly.
     */
    const family = FAMILIES[0]!;
    const stage: Stage = 'crested';
    const world: Slimelet[] = [];
    // The one the child is pointing at, out in the open where it has wandered from its mark.
    const target: Slimelet = {
      uid: nextSlimeUid(),
      family,
      stage,
      position: [0, 0, 8],
      seed: 1,
      bounds: { center: [0, 8], radius: ROAM },
    };
    world.push(target);
    // Four bystanders of the same family and stage, each nearer to the target's LIVE spot than the
    // target's own recorded one — which is exactly what a pen full of the same family looks like.
    for (let i = 0; i < 4; i += 1) {
      world.push({
        uid: nextSlimeUid(),
        family,
        stage,
        position: [1 + i * 0.6, 0, 12.6],
        seed: 100 + i,
        bounds: { center: [1 + i * 0.6, 12.6], radius: ROAM },
      });
    }

    /* --- the old behaviour --------------------------------------------------- */
    let old: readonly Slimelet[] = world;
    const oldHeld: Slimelet[] = [];
    for (let grab = 0; grab < 4; grab += 1) {
      clearHerd();
      const live = mount(old);
      const c = live.get(target.uid);
      // If the target had been removed the child could not keep sucking it; it never is.
      expect(c, `grab ${grab}: the target should still be standing there`).toBeTruthy();
      c!.z = 13.0;
      const { trace } = suck(c!);
      const step = oldTake(old, trace);
      expect(step.took, `grab ${grab}`).toBeTruthy();
      oldHeld.push(step.took!);
      old = step.next;
    }
    // The slime the child sucked four times is still standing in the field.
    expect(old.map((s) => s.uid)).toContain(target.uid);
    // And four DIFFERENT creatures were taken out of the world to produce the four it plopped back.
    expect(new Set(oldHeld.map((s) => s.uid)).size).toBe(4);
    expect(oldHeld.some((s) => s.uid === target.uid)).toBe(false);

    /* --- the new behaviour --------------------------------------------------- */
    resetHerd();
    clearHerd();
    clearTraces();
    setHerd(world);
    const live = mount(herdSlimes());
    const c = live.get(target.uid)!;
    c.z = 13.0;
    const first = takeSlime(suck(c).trace);
    expect(first?.uid).toBe(target.uid);
    // It is gone from the world, so it leaves the herd, so it can never be grabbed a second time.
    expect(herdSlimes().map((s) => s.uid)).not.toContain(target.uid);
    leaveHerd(c);
    expect(herdSlimes().length).toBe(4);
    expect(audit().byPosition).toBe(0);
  });

  it('gives back exactly the creature that went in — family, stage, size and seed', () => {
    // The mechanism a previous bug broke by rebuilding the released slime from scratch: a warden came back
    // a tuffet, two stages smaller, with a fresh seed, so it was a different creature in the same colour.
    seedHerd(PENS, PEN_RADIUS, FAMILIES);
    const before = herdSlimes().slice();
    const live = mount(before);
    // Every one of them, in one long pass through the tank, four at a time.
    for (let from = 0; from < before.length; from += 4) {
      const batch = before.slice(from, from + 4);
      for (const sl of batch) {
        const { id } = suck(live.get(sl.uid)!);
        expect(takeSlime(capturedTrace(id)!)?.uid).toBe(sl.uid);
        expect(tankPush({ id, family: sl.family })).toBe(true);
      }
      for (let i = 0; i < batch.length; i += 1) {
        const out = tankShift()!;
        const back = putSlime(out.family, [3 + i, 0, 3]);
        const was = batch[i]!;
        expect(back.uid, 'the same creature').toBe(was.uid);
        expect(back.family).toBe(was.family);
        expect(back.stage, 'the same stage — this is the one that used to shrink').toBe(was.stage);
        expect(back.seed, 'the same seed, so the same body').toBe(was.seed);
      }
    }
    expect(herdSlimes().length).toBe(before.length);
    expect(audit().invented).toBe(0);
  });

  it('never records a held slime for a capture that removed nothing', () => {
    /**
     * THE AMPLIFIER, closed. A capture that removed nothing while the tank believed it was holding
     * something is what turned a mis-match into an extra creature: the release found an empty queue and
     * INVENTED one. Nothing is recorded now unless something was taken.
     */
    seedHerd(PENS, PEN_RADIUS, FAMILIES);
    const before = herdSlimes().length;
    const bogus: CapturedTrace = {
      herdId: 999,
      uid: 123456,
      family: FAMILIES[0]!,
      stage: 'pip',
      x: 0,
      z: 8,
      r: 0.42,
      top: 0.9,
      at: 0,
    };
    // A uid nothing carries, and a family and stage combination nothing in the pens has either.
    expect(takeSlime({ ...bogus, family: FAMILIES[3]!, stage: 'pip' })).toBe(null);
    expect(herdSlimes().length).toBe(before);
    expect(keptCount()).toBe(0);
    expect(audit().unmatched).toBe(1);
  });
});

/* ========================================================================== *
   The reward slime
 * ========================================================================== */

describe('a granted slime appears where the child is standing', () => {
  it('REGRESSION: the old grant put the reward in a pen up to 25 metres from the station', () => {
    /**
     * THE FIRST REPORT, MEASURED. The station's cradle hatches a `Hatchling`, which `stations/Cradle.tsx`
     * says in as many words is NOT a `<Slime>` — no collider, no brain, two seconds of theatre, and then it
     * unmounts. The real slime went to `PENS[prev.length % PENS.length]`. So the child watched a creature
     * come out of an egg and stop existing.
     *
     * The tide-line is the station the owner named, and it is the worst of the three.
     */
    for (const site of SITES) {
      const at = [site.at[0], site.at[2]] as const;
      let worst = 0;
      // Whatever the herd happens to number when the round ends — every one of the three pens, in turn.
      for (let count = 15; count < 21; count += 1) {
        const [gx, gz] = oldGrant(count);
        worst = Math.max(worst, Math.hypot(gx - at[0], gz - at[1]));
      }
      expect(worst, `${site.verbId}: the reward could land ${worst.toFixed(1)}m away`).toBeGreaterThan(14);
    }
  });

  it('puts it 1.8m in front of the keeper, in view, and always on findable ground', () => {
    // Every station, and all the way round the compass at each of them, because a child docks from
    // whichever side they walked up on and the spot has to work from all of them.
    seedHerd(PENS, PEN_RADIUS, FAMILIES);
    for (const site of SITES) {
      for (let deg = 0; deg < 360; deg += 15) {
        const yaw = (deg * Math.PI) / 180;
        // `Game.tsx`'s `pose`, and the same 1.8m ahead the shop already uses.
        const ahead = 1.8;
        const want = {
          x: site.at[0] - Math.sin(yaw) * ahead,
          z: site.at[2] - Math.cos(yaw) * ahead,
        };
        const born = grantSlime(FAMILIES[deg % FAMILIES.length]!, want);
        const r = slimeRadius(born.family, born.stage);
        expect(isFindable(born.position[0], born.position[2], r), `${site.verbId} at ${deg}deg`).toBe(true);
        // Near enough that it is the thing the child is looking at, even after `placeSlime` has had its say.
        const off = Math.hypot(born.position[0] - site.at[0], born.position[2] - site.at[2]);
        expect(off, `${site.verbId} at ${deg}deg: ${off.toFixed(2)}m from the station`).toBeLessThan(4.5);
        // And it is leashed to where it was born rather than to a pen it has never been in.
        expect(born.bounds.radius).toBe(ROAM);
        expect(born.bounds.center[0]).toBe(born.position[0]);
      }
    }
  });
});

/* ========================================================================== *
   Conservation
 * ========================================================================== */

describe('the population only ever changes by the things that are meant to change it', () => {
  it('conserves every slime over a long session of captures, releases, grants and purchases', () => {
    /**
     * THE WHOLE INVARIANT, IN ONE ASSERTION, CHECKED AFTER EVERY SINGLE OPERATION.
     *
     *      slimes in the world  +  slimes in the tank  ==  what we started with + grants + purchases
     *
     * Driven through the real `tank.ts`, the real `identity.ts` and the real `herd.ts`, with a herd that
     * wanders between operations so the capture is always resolving a slime that has moved since it was
     * put down. A deterministic pseudo-random script, so a failure is reproducible.
     */
    seedHerd(PENS, PEN_RADIUS, FAMILIES);
    let expected = herdSlimes().length;
    expect(expected).toBe(15);
    let added = 0;

    let seed = 20260810;
    const rnd = (): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    let live = mount(herdSlimes());
    /** Re-mount the herd, which is what a React re-render does. Colliders are keyed by uid here. */
    const remount = (): void => {
      clearHerd();
      live = mount(herdSlimes());
    };

    let captures = 0;
    let releases = 0;
    let grants = 0;
    let buys = 0;

    for (let op = 0; op < 4000; op += 1) {
      // Everybody drifts, inside their own leash, exactly as the frame loop drifts them.
      for (const c of live.values()) {
        c.x += (rnd() - 0.5) * 0.9;
        c.z += (rnd() - 0.5) * 0.9;
      }

      const roll = rnd();
      if (roll < 0.34 && keptCount() < 4 && herdSlimes().length > 0) {
        // A capture. The cone picks whichever collider it likes; here, any of them.
        const all = [...live.values()];
        const c = all[Math.floor(rnd() * all.length)]!;
        const { id } = suck(c);
        const took = takeSlime(capturedTrace(id)!);
        expect(took, `op ${op}: a capture must always remove exactly one slime`).toBeTruthy();
        expect(tankPush({ id, family: took!.family })).toBe(true);
        captures += 1;
        remount();
      } else if (roll < 0.68) {
        // A release. Nothing in the tank is a puff of air and must not add a slime.
        const out = tankShift();
        if (out) {
          putSlime(out.family, [(rnd() - 0.5) * 20, 0, (rnd() - 0.5) * 20]);
          releases += 1;
          remount();
        }
      } else if (roll < 0.84) {
        grantSlime(FAMILIES[Math.floor(rnd() * FAMILIES.length)]!, { x: (rnd() - 0.5) * 30, z: (rnd() - 0.5) * 30 });
        grants += 1;
        added += 1;
        expected += 1;
        remount();
      } else {
        // A purchase, which is a release with nothing behind it in the queue for that family — the shop
        // hands the slime straight to the world. It goes through `grantSlime` for the same reason.
        grantSlime(FAMILIES[Math.floor(rnd() * FAMILIES.length)]!, { x: (rnd() - 0.5) * 30, z: (rnd() - 0.5) * 30 });
        buys += 1;
        added += 1;
        expected += 1;
        remount();
      }

      const total = herdSlimes().length + keptCount();
      expect(total, `after op ${op} (${captures} captures, ${releases} releases, ${added} added)`).toBe(expected);
    }

    // The session actually did all four things, so the invariant was exercised rather than trivially held.
    expect(captures).toBeGreaterThan(300);
    expect(releases).toBeGreaterThan(300);
    expect(grants).toBeGreaterThan(300);
    expect(buys).toBeGreaterThan(300);
    expect(15 + grants + buys).toBe(expected);

    // And every one of the thousands of captures resolved on identity. Not one fell back on position, not
    // one failed to match, and not one release had to invent a creature.
    const a = audit();
    expect(a.byUid).toBe(captures);
    expect(a.byPosition).toBe(0);
    expect(a.unmatched).toBe(0);
    expect(a.invented).toBe(0);
    expect(a.restored).toBe(releases);
    expect(a.granted).toBe(grants + buys);

    // Every uid in the world is still unique. Duplication would show here even if the count did not.
    const uids = herdSlimes().map((s) => s.uid);
    expect(new Set(uids).size).toBe(uids.length);
  });

  it('a slime plopped in the barn is leashed to the barn and not to a pen', () => {
    // The other half of the barn report, and the half the leash answers. `vacpack/suction.test.ts` proves
    // the throw lands it inside the building; `ground.test.ts` proves a leashed slime is still within
    // `ROAM` of its mark and still findable after five simulated minutes. This is the record that carries
    // the leash: it used to be the nearest PEN with the radius stretched to reach it, which for the barn
    // was a 16.4m roaming circle centred somewhere the slime had never been.
    seedHerd(PENS, PEN_RADIUS, FAMILIES);
    const inStall = toWorld(BARN, 1.1, -3);
    const born = putSlime(FAMILIES[0]!, [inStall[0], 0, inStall[1]]);
    expect(born.bounds.radius).toBe(ROAM);
    expect(born.bounds.center).toEqual([inStall[0], inStall[1]]);
    expect(isFindable(born.position[0], born.position[2], slimeRadius(born.family, born.stage))).toBe(true);
    // It was invented rather than restored, because nothing was captured first — that is the shop path.
    expect(audit().invented).toBe(1);
  });
});

