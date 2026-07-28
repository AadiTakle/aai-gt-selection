import { describe, expect, it } from 'vitest';

import {
  ABILITY_CORE_METRICS,
  CONSISTENCY_METRICS,
  CROSS_CUTTING_METRICS,
  ENGAGEMENT_GATE_METRICS,
  MEASUREMENTS,
  getMeasurement,
  hasMeasurement,
  measurementIds,
  registryIntegrityIssues,
} from './measurements';

describe('measurement registry', () => {
  it('bundles the full registry with unique ids', () => {
    expect(MEASUREMENTS.length).toBeGreaterThanOrEqual(60);
    const ids = measurementIds();
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every measurement has non-empty canonical fields', () => {
    for (const m of MEASUREMENTS) {
      expect(m.id).toMatch(/^M-/);
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.what.length).toBeGreaterThan(0);
      expect(m.usefulness_tail.length).toBeGreaterThan(0);
      expect(m.how_to_collect.length).toBeGreaterThan(0);
      expect(m.how_much_to_collect.length).toBeGreaterThan(0);
    }
  });

  it('looks up known ids and rejects unknown ones', () => {
    expect(getMeasurement('M-RAPIDGUESS')?.name).toContain('Rapid-guessing');
    expect(hasMeasurement('M-LEARNRATE')).toBe(true);
    expect(hasMeasurement('M-DIFFREACH')).toBe(true);
    expect(getMeasurement('M-DOES-NOT-EXIST')).toBeUndefined();
    expect(hasMeasurement('M-DOES-NOT-EXIST')).toBe(false);
  });

  it('semantic groupings only reference ids present in the registry', () => {
    expect(registryIntegrityIssues()).toEqual([]);
    for (const id of ENGAGEMENT_GATE_METRICS) expect(hasMeasurement(id)).toBe(true);
    for (const id of ABILITY_CORE_METRICS) expect(hasMeasurement(id)).toBe(true);
    for (const id of CONSISTENCY_METRICS) expect(hasMeasurement(id)).toBe(true);
    for (const id of CROSS_CUTTING_METRICS.working_memory) expect(hasMeasurement(id)).toBe(true);
    for (const id of CROSS_CUTTING_METRICS.executive_control) expect(hasMeasurement(id)).toBe(true);
  });

  it('includes the effort-gate metric that drives the RTE filter', () => {
    expect(ENGAGEMENT_GATE_METRICS).toContain('M-RAPIDGUESS');
  });
});
