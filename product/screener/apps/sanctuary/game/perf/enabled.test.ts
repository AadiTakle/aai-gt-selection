import { describe, expect, it } from 'vitest';

import { batchingEnabled, perfEnabled } from './enabled';

describe('the perf flag', () => {
  it('is off unless asked for, because a child must never meet the panel', () => {
    expect(perfEnabled('')).toBe(false);
    expect(perfEnabled('?reset=1')).toBe(false);
    expect(perfEnabled('?perf=1')).toBe(true);
  });
});

describe('the batching flag', () => {
  /* The only branching logic in this directory, and the mechanism that bisected a pixel difference
     to one wrapper — so it is worth a test of its own. */
  it('batches when nothing says otherwise', () => {
    expect(batchingEnabled('shop', '')).toBe(true);
    expect(batchingEnabled('shop', '?perf=1')).toBe(true);
  });

  it('turns everything off for ?nobatch=1 and for a bare ?nobatch', () => {
    expect(batchingEnabled('shop', '?nobatch=1')).toBe(false);
    expect(batchingEnabled('stations', '?nobatch=1')).toBe(false);
    expect(batchingEnabled('shop', '?nobatch')).toBe(false);
  });

  it('turns off only the named wrapper', () => {
    expect(batchingEnabled('shop', '?nobatch=shop')).toBe(false);
    expect(batchingEnabled('stations', '?nobatch=shop')).toBe(true);
  });

  it('accepts a comma-separated list', () => {
    expect(batchingEnabled('shop', '?nobatch=shop,stations')).toBe(false);
    expect(batchingEnabled('stations', '?nobatch=shop,stations')).toBe(false);
    expect(batchingEnabled('world', '?nobatch=shop,stations')).toBe(true);
  });
});
