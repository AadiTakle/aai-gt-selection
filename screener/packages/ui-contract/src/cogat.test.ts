/**
 * Every type says something about CogAT, even if what it says is "nothing".
 *
 * Task 2.2. An absent entry used to mean two different things — "deliberately not CogAT" for the working-memory
 * and game-based families, and "nobody has looked yet" for the rest — and no reader could tell which. These
 * tests hold the distinction open: absence is now a fault, and `subtest: 'none'` is the decision.
 */

import { describe, expect, it } from 'vitest';

import { COGAT_MAP, COGAT_NEEDS_AUTHOR_REVIEW, COGAT_NONE_TYPES, COGAT_SUBTESTS, uncoveredSubtests } from './cogat';
import { allTypeCodes } from './requirements';

describe('the mapping covers the library', () => {
  it('has an entry for every type in the bank', () => {
    // The acceptance criterion for 2.2, and the thing 2.3 will turn into a build failure.
    const missing = allTypeCodes().filter((code) => !(code in COGAT_MAP));
    expect(missing, `types with no CogAT decision recorded: ${missing.join(', ')}`).toEqual([]);
  });

  it('maps nothing that is not in the bank', () => {
    // The other direction. A stale entry for a deleted type is a quieter kind of wrong.
    const known = new Set(allTypeCodes());
    const orphans = Object.keys(COGAT_MAP).filter((code) => !known.has(code));
    expect(orphans, `mapped types that no longer exist: ${orphans.join(', ')}`).toEqual([]);
  });

  it('gives every entry a real subtest or an explicit none, and a reason', () => {
    for (const [code, mapping] of Object.entries(COGAT_MAP)) {
      if (mapping.subtest !== 'none') {
        expect(COGAT_SUBTESTS, `${code} names a subtest that does not exist`).toContain(mapping.subtest);
        expect(['direct', 'loose'], `${code} strength`).toContain(mapping.strength);
      }
      // A bare 'none' is the thing 2.2 was fixing. Every decision carries why.
      expect(mapping.note.length, `${code} has no note`).toBeGreaterThan(20);
    }
  });
});

describe('the gap against requirement 2 is still visible', () => {
  it('still reports Verbal Analogies as uncovered', () => {
    // 2.2 classifies; it does not build anything. If this ever goes green it is because 2.1 landed, and this
    // test should be updated deliberately rather than deleted in passing.
    expect(uncoveredSubtests()).toContain('verbal-analogies');
  });

  it('names the calls that want the bank author rather than hiding them', () => {
    expect(COGAT_NEEDS_AUTHOR_REVIEW.length).toBeGreaterThan(0);
    for (const code of COGAT_NEEDS_AUTHOR_REVIEW) expect(COGAT_MAP[code]).toBeDefined();
  });

  it('records more types as none than as mapped, which is the honest shape of this library', () => {
    // Not a target, an observation worth pinning: most of what this library measures is not CogAT, and a
    // future edit that quietly reclassified half of it should have to change this line.
    expect(COGAT_NONE_TYPES.length).toBeGreaterThan(Object.keys(COGAT_MAP).length - COGAT_NONE_TYPES.length);
  });
});
