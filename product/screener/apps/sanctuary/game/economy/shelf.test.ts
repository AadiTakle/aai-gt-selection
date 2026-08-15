import { describe, expect, it } from 'vitest';

import { FAMILIES } from '../contract';
import { featureGeometry } from '../slimes/crests';
import { bodyOutline } from '../slimes/gumdrop';
import { SHELF, crestSky, cubbyBody, shelfLayout } from './site';

/**
 * EVERY SLIME MUST FIT IN ITS CUBBY, CREST AND ALL.
 *
 * The bug this exists to prevent, in the shape it actually took: the top shelf row had **eighteen
 * millimetres** of clear air between a body's top and the underside of the head beam, so seventeen of
 * the nineteen families lost their crest. The bunny was a bare dome. Wood kept two leaf tips of an
 * entire branch. Two families whose crests were both cut off were, to a child, the same slime.
 *
 * ══ WHY NOTHING CAUGHT IT ═════════════════════════════════════════════════════════════════════════
 *
 * `cubbyBody` budgets a cubby for a BODY, and a slime is taller than its body — `slimes/crests.ts`
 * authors the signature feature above the profile. Nothing in the layout knew that, and nothing
 * measured it. The two lower rows were fine by ACCIDENT: the row above each starts with a price shelf
 * and a gap, which happens to leave enough air. So the shelf looked right in two rows out of three, and
 * the failing row was the one nobody photographed.
 *
 * It was found only because a worker fixing the bunny's EARS noticed its cubby was pixel-identical
 * before and after their own change. That is not a process anyone should rely on twice.
 *
 * ══ WHAT THIS ASSERTS, AND WHY IT IS THE RIGHT SHAPE ══════════════════════════════════════════════
 *
 * It builds all nineteen crests FOR REAL — `featureGeometry` is the same function the shop draws from,
 * not a table of numbers copied out of it — and checks each against the sky the layout derives. So a
 * twentieth family with a monster crest fails here instead of quietly losing its head, and it fails for
 * every row at once rather than only in the top one, because `crestSky` is now a property of the layout
 * rather than of a particular row.
 *
 * It also runs over the layouts a different family count would produce, since `shelfLayout` sizes the
 * grid from the number of families: the guarantee has to survive someone adding a slime, which is
 * exactly the change that would otherwise reintroduce this.
 */

/** The stage the shop puts on its shelf. `Effigy.tsx` fixes it at `crested`, its reference silhouette. */
const SHELF_STAGE = 'crested' as const;

/**
 * How far a family's crest reaches above its body, in the units the cubby is measured in.
 *
 * The bake is in the slime's own frame, where the body is `outline.height` tall; the shop scales the
 * whole portrait so the BODY is `bodyH`. So the crest's overhang scales with it, and comparing the two
 * without that conversion would compare a ratio against a length.
 */
function crestAboveBody(family: (typeof FAMILIES)[number], bodyH: number): number {
  const outline = bodyOutline(family);
  const bake = featureGeometry(family, SHELF_STAGE);
  let top = outline.height;
  for (const g of [bake.trim, bake.glaze, bake.aura]) {
    if (!g) continue;
    g.computeBoundingBox();
    const y = g.boundingBox?.max.y;
    if (typeof y === 'number' && Number.isFinite(y)) top = Math.max(top, y);
  }
  return ((top - outline.height) / outline.height) * bodyH;
}

describe('a slime fits its cubby, crest and all', () => {
  it('every family clears the sky the current shelf gives it', () => {
    const sky = crestSky(SHELF);
    const { bodyH } = cubbyBody(SHELF.halfH);
    expect(sky).toBeGreaterThan(0);

    const tight: string[] = [];
    for (const family of FAMILIES) {
      const crest = crestAboveBody(family, bodyH);
      expect(
        crest,
        `${family}'s crest reaches ${(crest * 1000).toFixed(0)}mm above its body but the cubby gives it ${(
          sky * 1000
        ).toFixed(0)}mm — it will be cut off, and a slime without its crest is unidentifiable`,
      ).toBeLessThanOrEqual(sky);
      if (crest > sky * 0.9) tight.push(`${family} ${(crest * 1000).toFixed(0)}mm`);
    }
    /* Not a failure, but worth seeing in the output: anything within 10% of the ceiling is one authoring
       tweak away from being clipped. */
    if (tight.length) console.info('crests close to the ceiling:', tight.join(', '));
  });

  it('holds as the shelf GROWS, which is the change that would put the bug back', () => {
    /* `shelfLayout` sizes the grid from the number of families, so adding a slime changes the geometry
       for every one of them. Adding a family is the realistic future edit — the owner has asked for more
       slimes twice — so the guarantee is asserted across the whole range the shop could grow into. */
    for (const count of [10, 12, 14, 16, 19, 22, 26, 32]) {
      const shelf = shelfLayout(count);
      const sky = crestSky(shelf);
      const { bodyH } = cubbyBody(shelf.halfH);
      for (const family of FAMILIES) {
        const crest = crestAboveBody(family, bodyH);
        expect(crest, `${family} is clipped in a ${count}-family shelf`).toBeLessThanOrEqual(sky);
      }
    }
  });

  it('records the floor: a shelf under three rows clips the tallest crest', () => {
    /**
     * A REAL LIMIT, WRITTEN DOWN RATHER THAN ASSERTED AWAY.
     *
     * `shelfLayout` gives 1 or 2 rows for eight families or fewer, and those cubbies are much larger. The
     * crest scales with the body while the sky does not scale with it, so the tallest crest overruns:
     *
     *     4, 6, 8 families   sky 513mm   wood's branch 576mm   CLIPS
     *     10 and above       sky 476mm   wood's branch 409mm   fits, and stays fitting to 32
     *
     * The shop ships nineteen so this is unreachable today, but `CEILING` in `site.ts` is derived over
     * layouts of 4, 8 and 9 — so smaller shelves are already contemplated somewhere in this file, and a
     * future stock list that shrank below ten would silently decapitate wood, ice and frost again.
     *
     * Asserted as a KNOWN failure rather than skipped, so that if someone later makes small shelves safe
     * this test fails and tells them to delete it, instead of quietly passing and hiding the improvement.
     */
    const shelf = shelfLayout(8);
    const sky = crestSky(shelf);
    const { bodyH } = cubbyBody(shelf.halfH);
    const worst = Math.max(...FAMILIES.map((f) => crestAboveBody(f, bodyH)));
    expect(worst, 'small shelves now fit — good; delete this test and widen the one above').toBeGreaterThan(
      sky,
    );
  });

  it('the sky is real rather than nominal', () => {
    /* The regression in numbers. The old top row left 18mm, which is less than every crest in the stock
       and less than a tenth of the smallest. A test that only asserted "sky > 0" would have passed the
       broken build, so it asserts against the tallest crest actually authored. */
    const { bodyH } = cubbyBody(SHELF.halfH);
    const tallest = Math.max(...FAMILIES.map((f) => crestAboveBody(f, bodyH)));
    expect(tallest).toBeGreaterThan(0.018);
    expect(crestSky(SHELF)).toBeGreaterThanOrEqual(tallest);
  });
});
