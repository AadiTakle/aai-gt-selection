import { notFound } from 'next/navigation';

import {
  LearningIntervalView,
  defaultSimulatedChild,
} from '@/components/exam/learning-interval-view';
import { IDEAL_GRID_POOL_ID, POOL_CHOICES, loadBankPool } from '@/lib/exam/learning-interval-pools';

/**
 * DEVELOPMENT-ONLY view of the learning-rate interval contracting over a simulated block.
 *
 * WHY IT IS GATED SHUT, the same way `/api/exam-emulate` is. This page reports a learning rate as a
 * number, and a learning rate is a labelled hypothesis that D-030 keeps out of the scored decision
 * precisely so that adopting it has to be someone's explicit choice. A route that renders λ where a
 * family might reach it would make that choice quietly. So it requires BOTH a non-production build
 * and an explicit opt-in (`GT_LEARNING_INTERVAL_VIEW_ENABLED=true`), and answers 404 otherwise so it
 * does not advertise itself.
 *
 * Nothing here reads or writes a real session. The block is simulated, in memory, per request.
 */

export const dynamic = 'force-dynamic';

function enabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.GT_LEARNING_INTERVAL_VIEW_ENABLED === 'true'
  );
}

/** Read one search param as a number, falling back when it is absent or unparseable. */
function num(raw: string | string[] | undefined, fallback: number, allowed?: readonly number[]) {
  const first = Array.isArray(raw) ? raw[0] : raw;
  const parsed = first === undefined ? Number.NaN : Number(first);
  if (!Number.isFinite(parsed)) return fallback;
  if (allowed !== undefined && !allowed.includes(parsed)) return fallback;
  return parsed;
}

export default async function LearningIntervalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!enabled()) notFound();

  const params = await searchParams;
  const rawPool = Array.isArray(params['pool']) ? params['pool'][0] : params['pool'];
  const poolId = POOL_CHOICES.find((choice) => choice.id === rawPool)?.id ?? POOL_CHOICES[0]!.id;
  const blockLength = num(params['length'], 60, [8, 15, 30, 45, 60]);
  const lambda = num(params['lambda'], 0.08, [0, 0.04, 0.08, 0.15]);
  const seed = num(params['seed'], 21, [1, 2, 3, 5, 8, 13, 21, 22]);

  const bankPool = poolId === IDEAL_GRID_POOL_ID ? null : await loadBankPool(poolId);

  const hrefFor = (param: string, value: string): string => {
    const next = new URLSearchParams();
    next.set('pool', poolId);
    next.set('length', String(blockLength));
    next.set('lambda', String(lambda));
    next.set('seed', String(seed));
    next.set(param, value);
    return `/dev/learning-interval?${next.toString()}`;
  };

  return (
    <LearningIntervalView
      child={defaultSimulatedChild({ lambda, seed })}
      blockLength={blockLength}
      poolId={poolId}
      bankPool={bankPool}
      hrefFor={hrefFor}
    />
  );
}
