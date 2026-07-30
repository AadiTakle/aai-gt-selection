import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The gate, pinned shut.
 *
 * This page renders a learning rate as a number, and D-030 keeps that number out of the scored
 * decision so that adopting it has to be an explicit choice rather than something that already
 * happened quietly. So it is gated the same way `/api/exam-emulate` is: a non-production build AND an
 * explicit opt-in, with a 404 otherwise.
 */

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

const originalFlag = process.env.GT_LEARNING_INTERVAL_VIEW_ENABLED;

afterEach(() => {
  if (originalFlag === undefined) delete process.env.GT_LEARNING_INTERVAL_VIEW_ENABLED;
  else process.env.GT_LEARNING_INTERVAL_VIEW_ENABLED = originalFlag;
  vi.unstubAllEnvs();
});

async function render(searchParams: Record<string, string> = {}) {
  const { default: page } = await import('./page');
  return page({ searchParams: Promise.resolve(searchParams) });
}

describe('the /dev/learning-interval gate', () => {
  it('is not found when the opt-in is absent', async () => {
    delete process.env.GT_LEARNING_INTERVAL_VIEW_ENABLED;
    await expect(render()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('is not found when the opt-in is set to anything other than true', async () => {
    for (const value of ['1', 'yes', 'TRUE', '']) {
      process.env.GT_LEARNING_INTERVAL_VIEW_ENABLED = value;
      await expect(render()).rejects.toThrow('NEXT_NOT_FOUND');
    }
  });

  it('is not found in a production build even with the opt-in set', async () => {
    process.env.GT_LEARNING_INTERVAL_VIEW_ENABLED = 'true';
    vi.stubEnv('NODE_ENV', 'production');
    await expect(render()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('renders when a non-production build has opted in', async () => {
    process.env.GT_LEARNING_INTERVAL_VIEW_ENABLED = 'true';
    await expect(render()).resolves.toBeTruthy();
  });

  /**
   * Unrecognised parameters fall back rather than reaching the estimator. A `length` of `1e9` would
   * hang the page and a `lambda` the ladder was never measured at would be plotted against a
   * reference line that does not describe it.
   */
  it('falls back on any parameter it does not recognise', async () => {
    process.env.GT_LEARNING_INTERVAL_VIEW_ENABLED = 'true';
    await expect(
      render({ pool: '../../etc/passwd', length: '1000000', lambda: '99', seed: 'nonsense' }),
    ).resolves.toBeTruthy();
  });
});
