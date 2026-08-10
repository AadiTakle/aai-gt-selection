/**
 * THE TEST THAT WOULD HAVE CAUGHT THE SLIME THAT DIED IN THE BARN — twice.
 *
 * The owner, on the second time of asking: "i still can't put slimes in the stables in the barn. they
 * disappear into oblivion and die and i don't know where they go so. fix that please."
 *
 * A previous pass answered this report and verified it. What it verified was `placeSlime` — that a spot
 * inside a barn stall is reachable ground and that a slime put there is not moved out of it — by asking
 * `placeSlime` about hand-picked stall coordinates. Both halves of that are true, and neither of them is
 * the bug, because the bug is one step upstream: THE COORDINATE THE CHILD'S PLOP ASKS ABOUT WAS NEVER IN
 * THE STALL. `PLOP.reach` is five metres and was taken literally, the barn's walkable aisle is 2.5m wide
 * and a stall is 2.7m deep, so a child in the aisle looking at a stall was asking for a point five metres
 * away — through the stall, through the far wall, out into the field behind the barn. Legal, reachable,
 * and invisible to a child standing inside a building looking at the inside of a wall.
 *
 * So this file tests the ROUTE rather than the destination: it stands a keeper where the owner stands,
 * points them where the owner points, and follows the plop all the way through `plopTarget`,
 * `settleLanding` and `placeSlime` to the spot the slime actually appears. And it keeps the old behaviour
 * available as a call — `plopTarget` without its `clamp` argument IS the old code — so the teeth are
 * demonstrated rather than asserted.
 *
 * ── WHY IT IMPORTS `world/Buildings` ───────────────────────────────────────────────────────────────────
 *
 * `ground.test.ts` deliberately does not, and reassembles the ranch from the pure plan modules instead, to
 * keep a renderer out of node and to avoid going red while the world track is mid-edit. That was a
 * reasonable trade and it is part of why this bug survived a fix: the mirrored set is missing the
 * windmill, the troughs, the barn-yard props and every tree, so it is not the ranch the child is standing
 * in. A promise about where a thrown slime lands is a promise about the real collider set or it is nothing.
 */
import { describe, expect, it } from 'vitest';

import { INTRO_SOLIDS } from '../intro/site';
import { SHOP_SOLIDS } from '../economy/site';
import { STATION_SOLIDS } from '../stations/sites';
import { SOLIDS } from '../world/Buildings';
import { BARN, BARN_IN_HALF_D, BARN_IN_HALF_W, STALL_FRONT_X } from '../world/barn';
import { toWorld, worldYaw } from '../world/plan';
import { isFindable, placeSlime, ranchSolids, setRanchSolids } from '../slimes/ground';
import { PLOP, circlesFrom, clearReach, plopTarget, settleLanding, type Aim, type Ground } from './suction';

const ALL = [...SOLIDS, ...STATION_SOLIDS, ...SHOP_SOLIDS, ...INTRO_SOLIDS];
setRanchSolids(ALL, { worldRadius: 34, from: [0, 8] });

const WORLD_R = 34;
const GROUND: Ground = { worldRadius: WORLD_R, y: 0, solids: circlesFrom(ALL) };
/** A tuffet-ish slime, the size the vacpack falls back to and the size most of the herd is. */
const R = 0.42;

/** The inverse of `toWorld`, so a landing spot can be asked which room it is in. */
function toLocal(wx: number, wz: number): [number, number] {
  const dx = wx - BARN.x;
  const dz = wz - BARN.z;
  const c = Math.cos(BARN.rot);
  const s = Math.sin(BARN.rot);
  return [dx * c - dz * s, dx * s + dz * c];
}

function insideBarn(wx: number, wz: number): boolean {
  const [lx, lz] = toLocal(wx, wz);
  return Math.abs(lx) <= BARN_IN_HALF_W && Math.abs(lz) <= BARN_IN_HALF_D;
}

/** A keeper standing at barn-local (lx, lz) looking along barn-local heading `face`. */
function aimFrom(lx: number, lz: number, face: number): { aim: Aim; stand: [number, number] } {
  const stand = toWorld(BARN, lx, lz);
  const yaw = worldYaw(BARN, face);
  // Camera forward under three's YXZ yaw, which is what `Vacpack` hands to `plopTarget`.
  return {
    aim: { from: { x: stand[0], y: 1.35, z: stand[1] }, dir: { x: -Math.sin(yaw), y: 0, z: -Math.cos(yaw) } },
    stand: [stand[0], stand[1]],
  };
}

/** Everything the vacpack does between the button and the slime appearing, in order. */
function plop(aim: Aim, radius: number, clamp: boolean): { x: number; z: number } {
  const want = plopTarget(
    aim,
    { x: 0, z: 0 },
    clamp
      ? { radius, ground: { worldRadius: WORLD_R, y: 0, solids: ranchSolids() }, findable: isFindable }
      : undefined,
  );
  const p = { x: want.x, z: want.z };
  settleLanding(p, radius, GROUND);
  // `pushOutOfSlimes` sits here in the real flow. It is live registry state and empty in this test.
  settleLanding(p, radius, GROUND);
  const legal = placeSlime(p.x, p.z, radius);
  return { x: legal.x, z: legal.z };
}

/**
 * Fifteen places a child can stand in the barn, on four bearings each.
 *
 * Local +Z (`face = π`) is the open doorway, and it is kept in the set on purpose: a slime thrown out
 * through open doors that the child is looking through has NOT been lost, and a test that forbade it would
 * be forbidding the barn from having a door. The wall-facing bearings are called out separately below.
 */
const IN_BARN: { lx: number; lz: number; face: number }[] = [];
for (const lz of [-5, -3, -1, 0.5, 2]) {
  for (const lx of [-1.2, 0, 1.2]) {
    for (const face of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) IN_BARN.push({ lx, lz, face });
  }
}
/** The bearings that face a wall rather than the doorway: the closed gable and the two stall runs. */
const AT_A_WALL = (face: number): boolean => Math.abs(face - Math.PI) > 1e-6;

describe('a plop can never throw a slime through a wall', () => {
  it('REGRESSION: the old unclamped throw put a slime outside the barn from inside it', () => {
    /**
     * THE TEETH. `plopTarget` with no `clamp` is the old function, unchanged, so this is a measurement of
     * the shipped behaviour rather than a reconstruction of it.
     */
    let escaped = 0;
    let stood = 0;
    for (const { lx, lz, face } of IN_BARN) {
      if (!AT_A_WALL(face)) continue;
      const { aim, stand } = aimFrom(lx, lz, face);
      if (!insideBarn(stand[0], stand[1]) || !isFindable(stand[0], stand[1], 0.45)) continue;
      stood += 1;
      const at = plop(aim, R, false);
      if (!insideBarn(at.x, at.z)) escaped += 1;
    }
    // Twelve of the forty-five wall-facing combinations are places a 0.45m keeper cannot actually get to.
    expect(stood).toBe(33);
    // More than one in four plops aimed at a wall from inside the barn ended up on the other side of it.
    expect(escaped).toBeGreaterThan(6);
  });

  it('the clamped throw never leaves the barn through a wall', () => {
    for (const { lx, lz, face } of IN_BARN) {
      if (!AT_A_WALL(face)) continue;
      const { aim, stand } = aimFrom(lx, lz, face);
      if (!insideBarn(stand[0], stand[1]) || !isFindable(stand[0], stand[1], 0.45)) continue;
      const at = plop(aim, R, true);
      const [alx, alz] = toLocal(at.x, at.z);
      expect(
        insideBarn(at.x, at.z),
        `standing at barn-local (${lx}, ${lz}) facing ${((face * 180) / Math.PI).toFixed(0)}deg, ` +
          `the slime landed at barn-local (${alx.toFixed(2)}, ${alz.toFixed(2)}) — outside the building`,
      ).toBe(true);
    }
  });

  it('sends the slime AT the stall the child is looking at, instead of past it', () => {
    // Facing local +X or -X from the aisle is "I am looking at that stall". The slime has to end up on
    // that side of the aisle and nearer the stall than the child is, which is what "in the stables" means
    // to a five-year-old. It used to end up five metres away in the field behind the barn.
    for (const lz of [-5, -3, -1]) {
      for (const side of [1, -1] as const) {
        const { aim, stand } = aimFrom(0, lz, (side * Math.PI) / 2);
        if (!isFindable(stand[0], stand[1], 0.45)) continue;
        const at = plop(aim, R, true);
        const [alx] = toLocal(at.x, at.z);
        expect(insideBarn(at.x, at.z), `stall side ${side}, aisle z=${lz}`).toBe(true);
        expect(alx * side, `stall side ${side}, aisle z=${lz}: landed at local x ${alx.toFixed(2)}`).toBeGreaterThan(
          0.8,
        );
        // And it is against the stall front rather than lost in the middle of the aisle.
        expect(Math.abs(alx), `stall side ${side}, aisle z=${lz}`).toBeGreaterThan(STALL_FRONT_X - 1.5);
      }
    }
  });

  it('never puts a slime on the far side of anything solid, anywhere on the ranch', () => {
    /**
     * THE GENERAL INVARIANT, and the one that makes this a property rather than four barn cases: the
     * segment from where the child is standing to where the slime lands does not pass through a collider.
     * A slime always ends up on the same side of every wall as the child who threw it.
     *
     * Solids the keeper is already standing inside the reserve of are exempt — the barn aisle is narrow
     * enough that this is normal — because a throw cannot be blamed for where it started.
     */
    const circles = ranchSolids();
    /** Does the segment from the child to the landing spot pass through a collider it did not start in? */
    const crossesAWall = (sx: number, sz: number, at: { x: number; z: number }): boolean => {
      const dx = at.x - sx;
      const dz = at.z - sz;
      const len = Math.hypot(dx, dz);
      if (len < 1e-6) return false;
      const fx = dx / len;
      const fz = dz / len;
      for (const c of circles) {
        const ox = sx - c.x;
        const oz = sz - c.z;
        const want = c.r + R;
        const cc = ox * ox + oz * oz - want * want;
        if (cc <= 0) continue; // already overlapping at the start
        const bb = ox * fx + oz * fz;
        const disc = bb * bb - cc;
        if (disc < 0) continue;
        const t = -bb - Math.sqrt(disc);
        // A tolerance of one grid cell, because `placeSlime` snaps to a 40cm lattice and may land the
        // slime a cell nearer a wall than the cast stopped it.
        if (t >= 0 && t + 0.45 < len) return true;
      }
      return false;
    };

    let checked = 0;
    let crossed = 0;
    let crossedBefore = 0;
    for (let i = 0; i < 900; i += 1) {
      const a = (i * 2.399963) % (Math.PI * 2);
      const r = ((i * 13) % 320) / 10;
      const sx = Math.cos(a) * r;
      const sz = Math.sin(a) * r;
      if (!isFindable(sx, sz, 0.45)) continue;
      for (let b = 0; b < 6; b += 1) {
        const yaw = (b / 6) * Math.PI * 2;
        const aim: Aim = {
          from: { x: sx, y: 1.35, z: sz },
          dir: { x: -Math.sin(yaw), y: 0, z: -Math.cos(yaw) },
        };
        checked += 1;
        if (crossesAWall(sx, sz, plop(aim, R, true))) crossed += 1;
        if (crossesAWall(sx, sz, plop(aim, R, false))) crossedBefore += 1;
      }
    }
    expect(checked).toBeGreaterThan(2000);
    // The teeth, over the whole ranch rather than only in the barn.
    expect(crossedBefore).toBeGreaterThan(100);
    expect(crossed).toBe(0);
  });

  it('still throws the full distance across open ground', () => {
    // The clamp must not have quietly turned every plop into a short lob. Out in the middle of the meadow
    // there is nothing in the way and the slime should go where a five-metre throw goes.
    const { aim } = { aim: { from: { x: 0, y: 1.35, z: 8 }, dir: { x: 0, y: 0, z: -1 } } as Aim };
    const reach = clearReach(aim.from, aim.dir.x, aim.dir.z, PLOP.reach, R, GROUND);
    expect(reach).toBeCloseTo(PLOP.reach, 6);
  });

  it('never answers with a distance longer than the cast, however short the cast is', () => {
    /**
     * THE HOLE THE FIRST TWO VERSIONS OF THIS FIX HAD. Any minimum throw is permission to ignore the cast,
     * and the cast is the entire promise: at a 1.45m floor 134 of 2,214 plops across the ranch landed on
     * the far side of something solid and at a 0.15m floor one still did, always with the child's nose
     * against a wall. So a blocked throw collapses to nothing rather than being padded out.
     */
    for (const lz of [-BARN_IN_HALF_D + 0.6, -BARN_IN_HALF_D + 1.1]) {
      for (const face of [0, Math.PI / 2, -Math.PI / 2]) {
        const { aim } = aimFrom(0, lz, face);
        const reach = clearReach(aim.from, aim.dir.x, aim.dir.z, PLOP.reach, R, GROUND);
        expect(reach).toBeGreaterThanOrEqual(0);
        expect(reach).toBeLessThanOrEqual(PLOP.reach);
        // Cast the same ray by hand and prove the answer is on the near side of the first thing hit.
        let firstHit = Infinity;
        for (const c of GROUND.solids) {
          const ox = aim.from.x - c.x;
          const oz = aim.from.z - c.z;
          const want = c.r + R;
          const cc = ox * ox + oz * oz - want * want;
          if (cc <= 0) continue;
          const bb = ox * aim.dir.x + oz * aim.dir.z;
          const disc = bb * bb - cc;
          if (disc < 0) continue;
          const t = -bb - Math.sqrt(disc);
          if (t >= 0 && t < firstHit) firstHit = t;
        }
        expect(reach, `barn-local z=${lz} face=${face}: cast stopped at ${firstHit.toFixed(2)}`).toBeLessThanOrEqual(
          firstHit,
        );
      }
    }
  });
});
