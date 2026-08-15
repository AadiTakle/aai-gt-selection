import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { COGAT_ALIGNED_TYPES } from './cogat';
import {
  CONTEXT_PROFILES,
  contextProfileFor,
  costBreakdown,
  lexicalSignals,
  validateTheme,
  type ThemePack,
} from './context';
import { allTypeCodes } from './requirements';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXAMPLE_THEME = join(HERE, '..', 'themes', 'gem-collector.example.json');

function loadExample(): ThemePack {
  return JSON.parse(readFileSync(EXAMPLE_THEME, 'utf8')) as ThemePack;
}

describe('context cost classification', () => {
  it('classifies every type in the library', () => {
    for (const code of allTypeCodes()) {
      expect(CONTEXT_PROFILES[code], `${code} is unclassified`).toBeDefined();
    }
  });

  it('gives every classification a reason', () => {
    for (const profile of Object.values(CONTEXT_PROFILES)) {
      expect(profile.why.length).toBeGreaterThan(10);
    }
  });

  it('tells a reauthor type what it has to be supplied', () => {
    for (const [code, profile] of Object.entries(CONTEXT_PROFILES)) {
      if (profile.cost !== 'reauthor') continue;
      expect(profile.authorSupplies, `${code} says reauthor but not what to write`).toBeDefined();
      expect(profile.authorSupplies!.length).toBeGreaterThan(0);
    }
  });

  /**
   * The check that keeps the declarations honest when a bank is regenerated. A type carrying
   * sentences or word lists cannot be a legend-only re-skin, whatever the table says.
   */
  it('never claims a type with natural-language material is cheap to theme', () => {
    for (const code of allTypeCodes()) {
      const signals = lexicalSignals(code);
      if (signals.length === 0) continue;
      expect(
        contextProfileFor(code).cost,
        `${code} carries ${signals.join(', ')} but is classified as ${contextProfileFor(code).cost}`,
      ).toBe('reauthor');
    }
  });

  it('defaults an unknown type to the expensive case rather than the cheap one', () => {
    expect(contextProfileFor('NOT-A-REAL-TYPE').cost).toBe('reauthor');
  });

  it('reports that most of the library needs no new writing', () => {
    const breakdown = costBreakdown(allTypeCodes());
    const free = breakdown['legend-only'].length + breakdown.revoice.length;
    expect(free).toBeGreaterThan(breakdown.reauthor.length);
  });

  it('leaves only the two verbal types needing new writing in the CogAT set', () => {
    const breakdown = costBreakdown([...COGAT_ALIGNED_TYPES]);
    expect(breakdown.reauthor.sort()).toEqual(['VER-CLOZE-01', 'VER-SORTBOT-01']);
    expect(breakdown['legend-only'].length).toBe(8);
  });

  it('classifies the figural and quantitative CogAT types as legend-only', () => {
    for (const code of ['FLU-MATRIX-01', 'QUANT-SERIES-01', 'SPA-PUNCH-01']) {
      expect(contextProfileFor(code).cost).toBe('legend-only');
    }
  });
});

describe('theme validation', () => {
  it('accepts the bundled example against the CogAT set', () => {
    const issues = validateTheme(loadExample(), [...COGAT_ALIGNED_TYPES]);
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors, `errors: ${errors.map((e) => `${e.typeCode}: ${e.message}`).join(' | ')}`)
      .toHaveLength(0);
  });

  /** The failure the ordering declaration exists to prevent, and the reason it is an error. */
  it('rejects a theme that maps a progression onto unordered values', () => {
    const broken: ThemePack = {
      theme: 'all-nominal',
      describes: 'colours only',
      legend: {
        x: { label: 'colour', order: 'nominal', values: ['red', 'blue', 'green', 'gold'] },
      },
    };
    const issues = validateTheme(broken, ['QUANT-SERIES-01']);
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]!.message).toContain('ordered');
  });

  it('rejects a theme whose variable has too few values', () => {
    const thin: ThemePack = {
      theme: 'thin',
      describes: 'two of everything',
      legend: {
        x: { label: 'size', order: 'ordered', values: ['small', 'big'] },
        y: { label: 'kind', order: 'nominal', values: ['a', 'b'] },
      },
    };
    const errors = validateTheme(thin, ['FLU-MATRIX-01']).filter((i) => i.severity === 'error');
    expect(errors.some((e) => e.message.includes('values'))).toBe(true);
  });

  it('requires material for a reauthor type and does not for a legend-only one', () => {
    const legendOnly: ThemePack = {
      theme: 'legend-only',
      describes: 'rich enough legend, no writing',
      legend: {
        x: { label: 'count', order: 'ordered', values: ['1', '2', '3', '4', '5'] },
        y: { label: 'kind', order: 'nominal', values: ['a', 'b', 'c', 'd', 'e', 'f'] },
        z: { label: 'facing', order: 'cyclic', values: ['n', 'e', 's', 'w'] },
      },
    };

    expect(
      validateTheme(legendOnly, ['FLU-MATRIX-01']).filter((i) => i.severity === 'error'),
    ).toHaveLength(0);

    const errors = validateTheme(legendOnly, ['VER-CLOZE-01']).filter((i) => i.severity === 'error');
    expect(errors.some((e) => e.message.includes('material'))).toBe(true);
  });

  it('flags a legend variable with no values at all', () => {
    const empty: ThemePack = {
      theme: 'empty',
      describes: 'forgot to fill one in',
      legend: { x: { label: 'unset', order: 'nominal', values: [] } },
    };
    const errors = validateTheme(empty, []).filter((i) => i.severity === 'error');
    expect(errors.some((e) => e.message.includes('no values'))).toBe(true);
  });

  it('warns rather than blocks when a scenario type has no re-voiced prompt', () => {
    const pack: ThemePack = {
      theme: 'no-voice',
      describes: 'legend only, no voice entries',
      legend: {
        x: { label: 'count', order: 'ordered', values: ['1', '2', '3', '4', '5'] },
        y: { label: 'kind', order: 'nominal', values: ['a', 'b', 'c', 'd'] },
      },
    };
    const issues = validateTheme(pack, ['SPA-MAZE-01']);
    expect(issues.some((i) => i.severity === 'warning')).toBe(true);
    expect(issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('says the example theme covers what it claims to voice', () => {
    const pack = loadExample();
    for (const code of Object.keys(pack.voice ?? {})) {
      expect(allTypeCodes(), `voice names unknown type ${code}`).toContain(code);
    }
    for (const code of Object.keys(pack.material ?? {})) {
      expect(allTypeCodes(), `material names unknown type ${code}`).toContain(code);
      expect(contextProfileFor(code).cost).toBe('reauthor');
    }
  });
});
