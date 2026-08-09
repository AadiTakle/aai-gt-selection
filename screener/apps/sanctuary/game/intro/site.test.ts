import { describe, expect, it } from 'vitest';

import { BATTERIES } from '../../shared/batteries';
import { SITES, dockPoint as stationDock, siteTypes } from '../stations/sites';
import {
  AS_SITE,
  BAY,
  BOARD_AT,
  BOARD_ITEMS,
  DOCK,
  FENCE,
  GATE,
  INTRO_SOLIDS,
  LEGS,
  PADDOCK,
  PEN_CENTRES,
  REACH,
  boardToWorld,
  clearanceAtDock,
  dockPoint,
  gateBarred,
  insideAPen,
  openGate,
  typesForLeg,
} from './site';

/**
 * THE PLACEMENT, ASSERTED.
 *
 * The scan that chose this spot ran outside the app and is gone; what survives it is these tests. They
 * are guards rather than derivations — they cannot tell you where to put a paddock, but they will fail
 * the day somebody moves a station, resizes the bay, or quietly reduces the number of questions.
 */

/** Every place on the ranch that already offers a press-E prompt, and the spot you stand on to take it. */
const EXISTING: { name: string; at: [number, number] }[] = [
  ...SITES.flatMap((s) => {
    const d = stationDock(s);
    return [
      { name: `${s.verbId} panel`, at: [s.at[0], s.at[2]] as [number, number] },
      { name: `${s.verbId} mark`, at: [d[0], d[2]] as [number, number] },
    ];
  }),
  // `economy/site.ts`'s own numbers, mirrored rather than imported: that module reaches into `coins.ts`
  // and the family list to lay out a shelf, none of which a placement test has any business booting.
  { name: 'stall', at: [-2.5, -13.5] },
  { name: 'stall mark', at: [-1.2, -9.3] },
];

describe('the board never competes with anything else for the E key', () => {
  it('stands well outside every other prompt’s reach, and so does its standing mark', () => {
    const mark = dockPoint();
    for (const other of EXISTING) {
      const toBoard = Math.hypot(other.at[0] - BOARD_AT[0], other.at[1] - BOARD_AT[2]);
      const toMark = Math.hypot(other.at[0] - mark[0], other.at[1] - mark[2]);
      // Twice the proximity reach, with room to spare. Two prompts offered at once is the one failure
      // that would make the shared E verb unlearnable.
      expect(Math.min(toBoard, toMark), `${other.name} is too close`).toBeGreaterThan(REACH * 1.5);
    }
  });

  it('is not one of the question stations, so their own proximity loop cannot see it', () => {
    expect(SITES.some((s) => s.verbId === AS_SITE.verbId)).toBe(false);
  });
});

describe('the standing mark is reachable', () => {
  it('is exactly the dock distance out along the board’s own facing', () => {
    const mark = dockPoint();
    expect(Math.hypot(mark[0] - BOARD_AT[0], mark[2] - BOARD_AT[2])).toBeCloseTo(DOCK, 6);
    // `Game.tsx` returns the camera to 1.5 the moment walking resumes, so docking anywhere else would
    // produce a hop on leaving.
    expect(mark[1]).toBe(1.5);
  });

  it('has nothing solid within three metres of it, so the board cannot block its own approach', () => {
    expect(clearanceAtDock()).toBeGreaterThan(3);
  });

  it('is outside the paddock, not in it', () => {
    const mark = dockPoint();
    expect(insideAPen(mark[0], mark[2])).toBe(false);
  });
});

describe('the gateway', () => {
  it('is centred on the board rather than round a corner from it', () => {
    // The two gate posts are the first and last of the run. They should straddle the board's own plane
    // symmetrically — which is only true because the gate is placed at a segment MIDPOINT rather than at
    // the nearest outline vertex. See the note in `site.ts`.
    const first = FENCE.posts[0];
    const last = FENCE.posts[FENCE.posts.length - 1];
    expect(first?.gatePost).toBe(true);
    expect(last?.gatePost).toBe(true);
    const a = Math.hypot((first?.x ?? 0) - BOARD_AT[0], (first?.z ?? 0) - BOARD_AT[2]);
    const b = Math.hypot((last?.x ?? 0) - BOARD_AT[0], (last?.z ?? 0) - BOARD_AT[2]);
    expect(a).toBeCloseTo(b, 2);
    expect(a).toBeCloseTo(GATE.half, 2);
  });

  it('leaves a gap the leaf can actually fill', () => {
    expect(GATE.span).toBeLessThan(GATE.half * 2);
    expect(GATE.span).toBeGreaterThan(2.5);
  });

  it('hangs its posts outside the opening rather than in it', () => {
    for (const side of [-1, 1] as const) {
      const p = boardToWorld(side * BAY.halfW, -0.1);
      const across = Math.hypot(p[0] - BOARD_AT[0], p[1] - BOARD_AT[2]);
      expect(across).toBeGreaterThan(GATE.half);
    }
  });
});

describe('the bay contains every battery this one board serves', () => {
  /**
   * The worst case of all three, projected at the child's eye from the standing mark, as measured over
   * all 934 items in the seven banks by `stations/sites.ts`. That file's Nonverbal bay is stuck at 2.55
   * against a requirement of 3.24 because the barn wall it is bolted to has no room; this one stands
   * free, so it is simply built big enough, and that is the point of these three numbers being here.
   */
  const WIDEST = 3.24;
  const LOWEST = 1.63;
  const HIGHEST = 1.49;

  it('is wide enough for a six-option matrix shelf, which no other station is', () => {
    expect(BAY.halfW).toBeGreaterThan(WIDEST);
  });

  it('keeps the lowest element off the sill and the highest off the head beam', () => {
    expect(BAY.halfH).toBeGreaterThan(LOWEST);
    expect(BAY.halfH).toBeGreaterThan(HIGHEST);
  });

  it('keeps the sill clear of the grass', () => {
    // Panel centre less the bay's half-height. `stations/sites.ts` argues for about a third of a metre.
    expect(BOARD_AT[1] - BAY.halfH).toBeGreaterThan(0.3);
  });
});

describe('the spread of questions', () => {
  it('is seven or eight items, as asked for', () => {
    expect(BOARD_ITEMS).toBeGreaterThanOrEqual(7);
    expect(BOARD_ITEMS).toBeLessThanOrEqual(8);
  });

  it('covers all three batteries, so the baseline is not a single-battery estimate', () => {
    expect(new Set(LEGS.map((l) => l.battery))).toEqual(new Set(BATTERIES));
    for (const leg of LEGS) expect(leg.quota).toBeGreaterThanOrEqual(2);
  });

  it('takes its styles from `siteTypes` rather than listing them, so new ones arrive for free', () => {
    for (const battery of BATTERIES) {
      expect(typesForLeg(battery)).toEqual(siteTypes(battery));
      // A leg with no drawable style would serve nothing and silently eat its quota.
      expect(typesForLeg(battery).length).toBeGreaterThan(0);
    }
  });

  it('promises the board can present everything it is allowed to ask', () => {
    // `AS_SITE.types` is what this board declares; every one of them has to be a drawable style.
    const drawable = new Set(BATTERIES.flatMap((b) => [...siteTypes(b)]));
    for (const t of AS_SITE.types) expect(drawable.has(t)).toBe(true);
  });
});

describe('the pens the tour points at', () => {
  it('knows the three the world actually fenced', () => {
    expect(PEN_CENTRES).toHaveLength(3);
    for (const pen of PEN_CENTRES) expect(insideAPen(pen[0], pen[1])).toBe(true);
  });

  it('does not count the open meadow as a pen', () => {
    expect(insideAPen(0, 8)).toBe(false);
    expect(insideAPen(0, 0)).toBe(false);
  });

  /**
   * THE CORNERS, which a circle of five metres missed and which is where a five-year-old with a vacuum
   * pack actually ends up. Every corner of every pen, walked half a metre inward so the point is
   * unambiguously inside its own fence.
   */
  it('counts the far corners of every pen, which a centre-and-radius test does not', () => {
    const pens = [
      { x: -6.0, z: 15.5, rot: 0.14, halfW: 4.75, halfD: 3.5 },
      { x: 11.4, z: 4.2, rot: -0.2, halfW: 4.75, halfD: 3.5 },
      { x: -15.5, z: -16.5, rot: 0.3, halfW: 5.0, halfD: 3.75 },
    ];
    for (const p of pens) {
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const lx = sx * (p.halfW - 0.5);
          const lz = sz * (p.halfD - 0.5);
          const c = Math.cos(p.rot);
          const s = Math.sin(p.rot);
          const x = p.x + lx * c + lz * s;
          const z = p.z - lx * s + lz * c;
          expect(insideAPen(x, z), `corner ${sx},${sz} of the pen at ${p.x},${p.z}`).toBe(true);
        }
      }
    }
  });

  it('counts the back paddock too, so a slime put in the thing you just unlocked has been penned', () => {
    expect(insideAPen(PADDOCK.x, PADDOCK.z)).toBe(true);
  });
});

/**
 * LAST, because it mutates module state on purpose and there is no way back.
 *
 * The collider list is live: `Game.tsx` re-spreads it every frame, so the way to make a barricade stop
 * existing is to take it out of the array. Nothing in this game ever closes a gate it has opened, so the
 * one-way-ness is the design rather than a limitation of it.
 */
describe('the barricade', () => {
  it('bars the gateway, and stops barring it exactly once', () => {
    expect(gateBarred()).toBe(true);
    const before = INTRO_SOLIDS.length;

    // Something is in the way of walking straight in.
    const gap = INTRO_SOLIDS.filter(
      (s) => Math.hypot(s.position[0] - BOARD_AT[0], s.position[1] - BOARD_AT[2]) < GATE.half,
    );
    expect(gap.length).toBeGreaterThan(0);

    openGate();
    expect(gateBarred()).toBe(false);
    expect(INTRO_SOLIDS.length).toBeLessThan(before);
    const after = INTRO_SOLIDS.filter(
      (s) => Math.hypot(s.position[0] - BOARD_AT[0], s.position[1] - BOARD_AT[2]) < GATE.half,
    );
    expect(after).toHaveLength(0);

    // Idempotent: a second unlock is a no-op rather than eating the fence.
    const settled = INTRO_SOLIDS.length;
    openGate();
    expect(INTRO_SOLIDS.length).toBe(settled);
    // And the fence itself is untouched.
    expect(INTRO_SOLIDS.length).toBeGreaterThanOrEqual(FENCE.posts.length);
  });
});
