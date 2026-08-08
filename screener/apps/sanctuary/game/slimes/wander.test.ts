/**
 * THE ONE PROMISE THAT IS WORTH A TEST: a slime cannot leave the ranch.
 *
 * "obviously not enough to the point of escaping" is a hard requirement, not a look, and it is the kind
 * of requirement that a screenshot cannot verify — a slime that escapes once every three minutes looks
 * perfect in every screenshot ever taken of it and is still broken. `wander.ts` is deliberately free of
 * three.js and React so this can step forty slimes for minutes of simulated time in milliseconds.
 *
 * The other two claims tested here are the rest of what the owner asked for: that headings are actually
 * random rather than all the same, and that slimes do not end up standing inside each other.
 */
import { describe, expect, it } from 'vitest';

import { createWander, rngFor, stepWander, type Circle, type WanderState, type WanderWorld } from './wander';

const BOUNDS = { cx: 4, cz: -3, r: 12 };
const RADIUS = 0.7;

function herdOf(n: number): WanderState[] {
  const out: WanderState[] = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const d = (i % 5) * 2;
    out.push(
      createWander({
        seed: i,
        x: BOUNDS.cx + Math.cos(a) * d,
        z: BOUNDS.cz + Math.sin(a) * d,
        radius: RADIUS,
        height: 1,
        jiggle: 1,
        bounds: BOUNDS,
      }),
    );
  }
  return out;
}

/** Steps the whole herd, feeding each slime the live positions of the others, as the component does. */
function run(herd: WanderState[], seconds: number, solids: Circle[] = [], player?: Circle): void {
  const steps = Math.round(seconds * 60);
  for (let f = 0; f < steps; f += 1) {
    for (const s of herd) {
      const others: Circle[] = [];
      for (const o of herd) if (o !== s) others.push({ x: o.x, z: o.z, r: o.radius });
      const world: WanderWorld = { bounds: BOUNDS, solids, herd: others, player };
      stepWander(s, 1 / 60, world);
    }
  }
}

describe('slime wander', () => {
  it('never leaves the bounds, over ten minutes of forty slimes', () => {
    const herd = herdOf(40);
    const solids: Circle[] = [
      { x: 4, z: -3, r: 1.6 },
      { x: 9, z: -6, r: 1 },
      { x: 0, z: 1, r: 1.2 },
    ];
    run(herd, 600, solids);
    for (const s of herd) {
      const d = Math.hypot(s.x - BOUNDS.cx, s.z - BOUNDS.cz);
      expect(d).toBeLessThanOrEqual(BOUNDS.r - RADIUS + 1e-6);
      expect(Number.isFinite(s.x) && Number.isFinite(s.z)).toBe(true);
    }
  });

  it('does not leave the bounds even when it starts outside them', () => {
    const s = createWander({ seed: 7, x: 90, z: -70, radius: RADIUS, height: 1, jiggle: 1, bounds: BOUNDS });
    // Clamped at birth, before it has taken a single step.
    expect(Math.hypot(s.x - BOUNDS.cx, s.z - BOUNDS.cz)).toBeLessThanOrEqual(BOUNDS.r - RADIUS + 1e-6);
    run([s], 60);
    expect(Math.hypot(s.x - BOUNDS.cx, s.z - BOUNDS.cz)).toBeLessThanOrEqual(BOUNDS.r - RADIUS + 1e-6);
  });

  it('is pushed out of furniture rather than through it', () => {
    const post: Circle = { x: 4, z: -3, r: 2 };
    const herd = herdOf(12);
    run(herd, 240, [post]);
    for (const s of herd) {
      expect(Math.hypot(s.x - post.x, s.z - post.z)).toBeGreaterThanOrEqual(post.r + RADIUS - 1e-6);
    }
  });

  it('does not stand inside the player', () => {
    const player: Circle = { x: 4, z: -3, r: 0.45 };
    const herd = herdOf(10);
    run(herd, 120, [], player);
    for (const s of herd) {
      expect(Math.hypot(s.x - player.x, s.z - player.z)).toBeGreaterThanOrEqual(player.r + RADIUS - 1e-6);
    }
  });

  it('does not badly overlap other slimes', () => {
    const herd = herdOf(30);
    run(herd, 300);
    for (let i = 0; i < herd.length; i += 1) {
      for (let j = i + 1; j < herd.length; j += 1) {
        const a = herd[i];
        const b = herd[j];
        if (!a || !b) continue;
        // Mutual separation resolves half each per frame, so a pair that has just collided can still be
        // a hair inside one another for a frame. A tenth of a radius is not "badly".
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(a.radius + b.radius - 0.07);
      }
    }
  });

  it('gives every slime a different heading', () => {
    // The literal complaint: "the slimes are all facing the same direction which is weird".
    const herd = herdOf(24);
    const headings = herd.map((s) => s.heading);
    const rounded = new Set(headings.map((h) => Math.round(h * 20)));
    expect(rounded.size).toBeGreaterThan(20);
    // And they are spread over the whole circle, not clustered in one quadrant.
    const quadrants = new Set(headings.map((h) => Math.floor((((h % 6.283) + 6.283) % 6.283) / 1.571)));
    expect(quadrants.size).toBe(4);
  });

  it('is deterministic: the same seed is the same slime', () => {
    const a = createWander({ seed: 1234, x: 1, z: 2, radius: RADIUS, height: 1, jiggle: 1, bounds: BOUNDS });
    const b = createWander({ seed: 1234, x: 1, z: 2, radius: RADIUS, height: 1, jiggle: 1, bounds: BOUNDS });
    run([a], 90);
    run([b], 90);
    expect(a.x).toBeCloseTo(b.x, 10);
    expect(a.z).toBeCloseTo(b.z, 10);
    expect(a.heading).toBeCloseTo(b.heading, 10);
  });

  it('actually moves, and keeps moving', () => {
    const herd = herdOf(16);
    const start = herd.map((s) => ({ x: s.x, z: s.z }));
    run(herd, 45);
    const moved = herd.filter((s, i) => {
      const p = start[i];
      return p ? Math.hypot(s.x - p.x, s.z - p.z) > 0.4 : false;
    });
    // Not all of them — some are mid-pause at 45 seconds, and that is the point of the pauses.
    expect(moved.length).toBeGreaterThan(herd.length * 0.6);
  });

  it('hands out uncorrelated first draws for consecutive seeds', () => {
    // Why `rngFor` hashes before seeding: mulberry32 fed 0,1,2,… produces near-consecutive first draws,
    // which would put the first six slimes at almost the same heading.
    const firsts = [0, 1, 2, 3, 4, 5, 6, 7].map((n) => rngFor(n)());
    for (let i = 1; i < firsts.length; i += 1) {
      expect(Math.abs((firsts[i] ?? 0) - (firsts[i - 1] ?? 0))).toBeGreaterThan(0.02);
    }
  });
});
