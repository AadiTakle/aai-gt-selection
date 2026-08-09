import { describe, expect, it } from 'vitest';

import { VERBS, type Battery } from '../../shared/batteries';
import { IN_WORLD } from '../screener/inWorld';
import { SITES, extentOf, siteTypes } from './sites';

/**
 * The station registry has to agree with itself, and once it did not.
 *
 * A station derives the question styles it may serve from the drawn set. If a style can be SERVED but has
 * no PRESENTATION, the child walks up, presses E, and gets a blank panel — no error, nothing in the
 * console, because a missing key in a lookup table is not a failure, it is an absence. That shipped: four
 * new presentations were registered in one of two duplicate registries, and the two stations that had
 * gained new styles stopped showing questions entirely. The owner found it by playing.
 *
 * These tests are cheap and they close that whole class. The duplicate registry is gone (see
 * `screener/inWorld.ts`), so what is left to guarantee is that the served set and the drawable set are
 * the same set, in both directions.
 */
describe('every style a station can serve can also be drawn', () => {
  const BATTERIES: Battery[] = ['Nonverbal', 'Quantitative', 'Verbal'];

  for (const battery of BATTERIES) {
    it(`${battery}: every type in the site's set has a presentation`, () => {
      const types = siteTypes(battery);
      expect(types.length).toBeGreaterThan(0);
      for (const t of types) {
        expect(IN_WORLD[t], `${t} is servable at the ${battery} station but has no presentation`).toBeTruthy();
      }
    });

    it(`${battery}: every type in the site's set has measured extents`, () => {
      /* The fallback is 7.25 x 3.5, which over-shrinks a panel by 22-28% and pushes candidates below the
         sill. A type reaching it is legible-ish rather than broken, so nothing would report it. */
      for (const t of siteTypes(battery)) {
        const e = extentOf(t, {});
        expect(
          e.halfW === 7.25 && e.halfH === 3.5,
          `${t} falls through to extentOf's fallback; measure it`,
        ).toBe(false);
      }
    });
  }

  it('every site declares a non-empty type set', () => {
    for (const site of SITES) {
      expect(site.types.length, `${site.verbId} has no types`).toBeGreaterThan(0);
    }
  });

  it('every drawable type is reachable at exactly one station', () => {
    /* The other direction, and the one that hid thirteen slime families for a night: a presentation that
       exists, typechecks and is never served is indistinguishable from one that was never written. */
    const reachable = new Set(SITES.flatMap((s) => s.types));
    for (const typeCode of Object.keys(IN_WORLD)) {
      expect(reachable.has(typeCode), `${typeCode} has a presentation but no station serves it`).toBe(true);
    }
    const homes = (t: string) => SITES.filter((s) => s.types.includes(t)).length;
    for (const t of reachable) expect(homes(t), `${t} is served at more than one station`).toBe(1);
  });

  it('every servable type belongs to the battery whose station serves it', () => {
    for (const site of SITES) {
      for (const t of site.types) {
        const verb = VERBS.find((v) => v.typeCode === t);
        expect(verb?.battery, `${t} is served at the ${site.battery} station`).toBe(site.battery);
      }
    }
  });
});
