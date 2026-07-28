import { describe, expect, it } from 'vitest';

import { METRIC_IDS } from './metric-ids';
import {
  ALL_METRIC_SPECS,
  BASIC_CORE_METRICS,
  getMetricSpec,
  isBasicCore,
  metricsWithInfluence,
  TRACKED_INERT_METRICS,
} from './metric-registry';

/** The basic-core ids fixed by BUILD_PLAN §4 (the ~16, 20 rows incl. domain-specific). */
const EXPECTED_CORE_IDS = [
  'M-ACC',
  'M-DIFFREACH',
  'M-RT',
  'M-RTFIRST',
  'M-RTVAR',
  'M-REV',
  'M-ERRTYPE',
  'M-CONSIST',
  'M-LEARNRATE',
  'M-PATH',
  'M-EFF',
  'M-PLANFUL',
  'M-ENGAGE',
  'M-RAPIDGUESS',
  'M-RULEID',
  'M-VOCABLVL',
  'M-LURETYPE',
  'M-PAE',
  'M-ROTSLOPE',
  'M-IDEAFLU',
] as const;

describe('metric registry — completeness', () => {
  it('registers every canonical measurement id exactly once', () => {
    expect(ALL_METRIC_SPECS).toHaveLength(METRIC_IDS.length);
    const ids = ALL_METRIC_SPECS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of METRIC_IDS) {
      expect(getMetricSpec(id), `spec for ${id}`).toBeDefined();
    }
  });

  it('splits into basic-core and tracked-inert with no overlap', () => {
    expect(BASIC_CORE_METRICS.length + TRACKED_INERT_METRICS.length).toBe(METRIC_IDS.length);
    const core = new Set(BASIC_CORE_METRICS.map((s) => s.id));
    const inert = new Set(TRACKED_INERT_METRICS.map((s) => s.id));
    for (const id of core) expect(inert.has(id)).toBe(false);
  });
});

describe('metric registry — basic-core set (BUILD_PLAN §4)', () => {
  it('is exactly the §4 metric list', () => {
    const core = BASIC_CORE_METRICS.map((s) => s.id).sort();
    expect(core).toEqual([...EXPECTED_CORE_IDS].sort());
  });

  it('every core metric influences select and/or score (or is a tracked gate/select-only)', () => {
    for (const spec of BASIC_CORE_METRICS) {
      expect(spec.tier).toBe('basic_core');
      expect(spec.influences.length).toBeGreaterThan(0);
      expect(spec.minSamples).toBeGreaterThan(0);
      expect(spec.rationale).toMatch(/MEASUREMENTS/);
    }
  });

  it('tags the gate metrics as tracked-but-not-enforced', () => {
    expect(getMetricSpec('M-ENGAGE')?.trackedNotEnforced).toBe(true);
    expect(getMetricSpec('M-RAPIDGUESS')?.trackedNotEnforced).toBe(true);
  });

  it('flags stop-rule and profile-contributing metrics', () => {
    expect(getMetricSpec('M-CONSIST')?.drivesStopRule).toBe(true);
    expect(getMetricSpec('M-LEARNRATE')?.contributesToProfile).toBe(true);
    expect(getMetricSpec('M-RTVAR')?.contributesToProfile).toBe(true);
  });
});

describe('metric registry — tracked-inert set', () => {
  it('only ever influences track (never select/score)', () => {
    for (const spec of TRACKED_INERT_METRICS) {
      expect(spec.tier).toBe('tracked_inert');
      expect(spec.influences).toEqual(['track']);
      expect(isBasicCore(spec.id)).toBe(false);
    }
  });

  it('metricsWithInfluence("score") returns only basic-core metrics', () => {
    const scorers = metricsWithInfluence('score');
    expect(scorers.length).toBeGreaterThan(0);
    for (const spec of scorers) expect(spec.tier).toBe('basic_core');
  });
});
