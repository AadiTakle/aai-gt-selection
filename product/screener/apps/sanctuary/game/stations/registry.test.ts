import { describe, expect, it } from 'vitest';

import { RETIRED, RETIRED_TYPES, VERBS, domainOf, type Battery } from '../../shared/batteries';
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

  it('every drawable type is reachable at exactly one station, unless it is retired by name', () => {
    /* The other direction, and the one that hid thirteen slime families for a night: a presentation that
       exists, typechecks and is never served is indistinguishable from one that was never written.

       THE `RETIRED` ESCAPE IS DELIBERATELY NARROW. A withdrawn type keeps its component — `StoneBed.tsx`
       is good work and nobody's file gets deleted over a measurement decision — so its presentation is
       still here and still unreachable, which is this clause's own definition of the bug it catches. The
       difference between the two cases is INTENT, and intent has to be written down: a type may be
       exempt only by appearing in `shared/batteries.ts`'s `RETIRED`, with what it measures and why that
       is not its battery. Forgetting a presentation still fails. Withdrawing one costs an argument. */
    const reachable = new Set(SITES.flatMap((s) => s.types));
    for (const typeCode of Object.keys(IN_WORLD)) {
      if (RETIRED_TYPES.includes(typeCode)) continue;
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

  it('a retired type is unreachable everywhere, by every route', () => {
    /* Retirement has to mean the same thing as never having existed, or it is decoration. Three routes
       could put a type back in front of a child and all three are closed here: `VERBS` (which is what
       `siteTypes` filters on), a site's own `types`, and the `typeCode` field a site may still carry. */
    for (const r of RETIRED) {
      expect(VERBS.some((v) => v.typeCode === r.typeCode), `${r.typeCode} is retired but still in VERBS`).toBe(false);
      for (const site of SITES) {
        expect(site.types.includes(r.typeCode), `${r.typeCode} is retired but served at ${site.verbId}`).toBe(false);
      }
      expect(r.measures.length, `${r.typeCode} is retired without saying what it measures`).toBeGreaterThan(40);
      expect(r.why.length, `${r.typeCode} is retired without a reason`).toBeGreaterThan(40);
    }
  });

  it("every station's key names a verb of that station's own battery", () => {
    /* THE SILENT CONTAMINATION THIS EXISTS TO STOP, and it is one deleted line away at all times.
       `Game.tsx` opens a round with `VERBS.find(v => v.id === verbId)` and then takes
       `verb?.battery ?? 'Nonverbal'`. A station whose key no longer names a verb does not fail: it
       reports itself as Nonverbal, so `/sanctuary/chunk` steers it from the child's NONVERBAL theta and
       `/sanctuary/close` folds its verbal posterior back into the NONVERBAL estimate. No error, no log,
       and two of the three batteries quietly wrong. Retiring a battery's tier-1 type is exactly the edit
       that triggers it — which is why the retirement note in `batteries.ts` says to rename the surviving
       verb in the same commit, and why this fails if anyone does not. */
    for (const site of SITES) {
      const verb = VERBS.find((v) => v.id === site.verbId);
      expect(verb, `site ${site.verbId} names no verb; Game.tsx would call it Nonverbal`).toBeTruthy();
      expect(verb?.battery, `site ${site.verbId} is ${site.battery} but its key names a ${verb?.battery} verb`).toBe(
        site.battery,
      );
    }
  });

  it('every battery is one engine domain, so a served item can be checked against its station', () => {
    /* Not a law of nature — Paper Folding is `spatial` and belongs in Nonverbal — but a tripwire. The
       one type that ever sat in the wrong battery here was the one type whose domain disagreed with its
       neighbours', and the scorer discards `domain`, so nothing else in the system would ever have
       looked. Adding a legitimate second domain to a battery means editing this test and writing down
       why, which is the point: it makes the exception deliberate instead of accidental. */
    const expected: Record<Battery, string> = {
      Nonverbal: 'fluid',
      Quantitative: 'quantitative',
      Verbal: 'verbal',
    };
    for (const battery of BATTERIES) {
      expect(domainOf(battery), `${battery} spans more than one engine domain`).toBe(expected[battery]);
    }
  });
});
