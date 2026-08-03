import {
  E095_FLOORLESS_POSTERIOR_SE_LADDER,
  MEASURED_CONTAMINATION_FLOOR_30_TRIALS,
  MEASURED_POSTERIOR_SE_LADDER,
  learningRateIntervalSeries,
  type LearningRateIntervalStep,
} from '@gt-selection/exam-scoring';

import {
  IDEAL_GRID_POOL_ID,
  POOL_CHOICES,
  type LoadedPool,
} from '@/lib/exam/learning-interval-pools';
import {
  FIVE_OPTION_FLOOR,
  idealGridPool,
  simulateLearningBlock,
  type SimulatedChild,
} from '@/lib/exam/learning-interval-sim';

import styles from './learning-interval-view.module.css';

/**
 * DEVELOPMENT-ONLY view of the learning-rate interval contracting over a block.
 *
 * WHAT THIS IS FOR. `learningRateReadout` refuses to name a band on a 30-item block and is right to
 * (D-200, and the bank-recovery measurement). That refusal is correct but unwatchable — it reads "not enough to tell" at trial 8
 * and again at trial 30, so nothing appears to happen. Something measurable IS happening: the
 * posterior is contracting the whole time. This shows that, against the measured ladder, so the
 * two can be compared rather than trusted.
 *
 * WHAT IT DELIBERATELY DOES NOT SHOW. No band name, no rank, no percentile, no comparison between
 * this child and any other. `learningRateInterval` cannot produce one — it never receives a reference
 * distribution — and the bank-recovery measurement is why: on the purpose-built bank, tightening the posterior RAISED false
 * `above` verdicts from 12.8% to 16.5%, because a block too imprecise to name a band cannot name a
 * wrong one. A narrowing interval is not progress toward a verdict.
 */

const PLOT_WIDTH = 900;
const INTERVAL_PLOT_HEIGHT = 300;
const SE_PLOT_HEIGHT = 220;
const PAD = { left: 68, right: 118, top: 18, bottom: 34 } as const;

export interface LearningIntervalViewProps {
  readonly child: SimulatedChild;
  readonly blockLength: number;
  readonly poolId: string;
  readonly bankPool: LoadedPool | null;
  /** `(param, value) → href`, so the page owns the route and this owns the layout. */
  readonly hrefFor: (param: string, value: string) => string;
}

const LAMBDA_CHOICES = [
  { value: 0, label: '0.00 — learned nothing' },
  { value: 0.04, label: '0.04' },
  { value: 0.08, label: '0.08' },
  { value: 0.15, label: '0.15 — fastest simulated' },
];
const LENGTH_CHOICES = [8, 15, 30, 45, 60];
const SEED_CHOICES = [1, 2, 3, 5, 8, 13, 21, 22];

function f(value: number, places = 4): string {
  return value.toFixed(places);
}

export function LearningIntervalView({
  child,
  blockLength,
  poolId,
  bankPool,
  hrefFor,
}: LearningIntervalViewProps) {
  const pool = poolId === IDEAL_GRID_POOL_ID ? idealGridPool() : (bankPool?.items ?? []);
  const poolChoice = POOL_CHOICES.find((choice) => choice.id === poolId) ?? POOL_CHOICES[0]!;
  const unavailable = poolId === IDEAL_GRID_POOL_ID ? null : (bankPool?.unavailable ?? null);

  const block = pool.length > 0 ? simulateLearningBlock(pool, child, blockLength) : null;
  const floor = MEASURED_CONTAMINATION_FLOOR_30_TRIALS;
  const steps =
    block === null ? [] : learningRateIntervalSeries(block.trials, { contaminationFloor: floor });

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>development only · not reachable in production</p>
        <h1 className={styles.title}>The learning rate as a range that narrows</h1>
        <p className={styles.lede}>
          A 30-item block cannot support a reportable absolute learning rate (E-200, and the
          bank-recovery measurement on the bank purpose-built for it), so this reports no band, no
          rank and no comparison between children — it cannot, because{' '}
          <code>learningRateInterval</code> never receives a reference distribution. What it does
          report is the interval and its contraction, judged against the{' '}
          <strong>largest climb this path fits for a child who learned nothing</strong>: {f(floor)}{' '}
          ± 0.0011 at 30 trials, measured over 3,200 simulated children.
        </p>
      </header>

      <Controls
        child={child}
        blockLength={blockLength}
        poolId={poolId}
        poolChoice={poolChoice}
        hrefFor={hrefFor}
      />

      {unavailable !== null ? (
        <p className={styles.warn}>
          <strong>Pool unavailable.</strong> {unavailable} The idealised grid needs no files and is
          the bank-free lower bound, so switch to it to see the contraction regardless.
        </p>
      ) : null}

      {block === null || steps.length === 0 ? null : (
        <>
          {block.exhausted ? (
            <p className={styles.warn}>
              <strong>Pool exhausted</strong> after {String(block.trials.length)} of{' '}
              {String(blockLength)} trials, so the run past that point measures exhaustion rather
              than the block.
            </p>
          ) : null}

          <IntervalPlot steps={steps} floor={floor} />
          <PrecisionPlot steps={steps} />
          <LadderTable steps={steps} />
          <ContractionStrip steps={steps} floor={floor} />
        </>
      )}

      <footer className={styles.footer}>
        <p>
          The child is synthetic: a one-parameter logistic with a {f(child.responderFloor, 2)}
          {' chance '}
          floor and an ability climbing in a straight line. It models no fatigue, no strategy and no
          learning that is not linear. The administration path is the shipped one — the fit chooses
          the next difficulty and then reads its own walk back, which is exactly why the
          contamination floor is not zero. A contraction seen here is evidence about this block
          design&apos;s precision, and no evidence at all that a within-session climb measures
          learning in a person (D-030).
        </p>
      </footer>
    </main>
  );
}

function Controls({
  child,
  blockLength,
  poolId,
  poolChoice,
  hrefFor,
}: {
  child: SimulatedChild;
  blockLength: number;
  poolId: string;
  poolChoice: (typeof POOL_CHOICES)[number];
  hrefFor: (param: string, value: string) => string;
}) {
  return (
    <section className={styles.controls}>
      <ControlRow label="pool">
        {POOL_CHOICES.map((choice) => (
          <a
            key={choice.id}
            className={choice.id === poolId ? styles.chipOn : styles.chip}
            href={hrefFor('pool', choice.id)}
          >
            {choice.label}
          </a>
        ))}
      </ControlRow>
      <ControlRow label="true climb λ">
        {LAMBDA_CHOICES.map((choice) => (
          <a
            key={choice.value}
            className={choice.value === child.lambda ? styles.chipOn : styles.chip}
            href={hrefFor('lambda', String(choice.value))}
          >
            {choice.label}
          </a>
        ))}
      </ControlRow>
      <ControlRow label="block length">
        {LENGTH_CHOICES.map((length) => (
          <a
            key={length}
            className={length === blockLength ? styles.chipOn : styles.chip}
            href={hrefFor('length', String(length))}
          >
            {length}
          </a>
        ))}
      </ControlRow>
      <ControlRow label="seed">
        {SEED_CHOICES.map((seed) => (
          <a
            key={seed}
            className={seed === child.seed ? styles.chipOn : styles.chip}
            href={hrefFor('seed', String(seed))}
          >
            {seed}
          </a>
        ))}
      </ControlRow>
      <p className={styles.poolNote}>
        {poolChoice.note} · standing handover {f(child.standing, 1)} against a true starting ability
        of {f(child.theta0, 1)}, so the handover noise E-095 included is present
      </p>
    </section>
  );
}

function ControlRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.controlRow}>
      <span className={styles.controlLabel}>{label}</span>
      <span className={styles.chips}>{children}</span>
    </div>
  );
}

/**
 * The interval itself, drawn only where it exists.
 *
 * The region below the trial floor is left visibly empty rather than filled with a very wide range.
 * A range needs a centre, and a centre on eight trials is a statement about the child that the
 * evidence does not support — whereas the precision plot below IS supportable there, because a width
 * with no centre cannot be read as a verdict.
 */
function IntervalPlot({ steps, floor }: { steps: LearningRateIntervalStep[]; floor: number }) {
  const withBounds = steps.filter((step) => step.interval.bounds !== null);
  const maxTrials = steps[steps.length - 1]!.trialCount;

  if (withBounds.length === 0) {
    return (
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>The interval</h2>
        <p className={styles.empty}>
          <strong>No interval at any point in this block.</strong> All {String(maxTrials)} trials
          sit below the {String(steps[0]!.interval.minTrials)}-trial floor, so there is nothing to
          draw. This is a first-class state, not a rendering gap: the alternative is a very wide
          range whose width would be read as the finding.
        </p>
      </section>
    );
  }

  const lows = withBounds.map((step) => step.interval.bounds!.lower);
  const highs = withBounds.map((step) => step.interval.bounds!.upper);
  const yMin = Math.min(0, floor, ...lows);
  const yMax = Math.max(floor, ...highs);
  const span = yMax - yMin || 1;

  const plotW = PLOT_WIDTH - PAD.left - PAD.right;
  const plotH = INTERVAL_PLOT_HEIGHT - PAD.top - PAD.bottom;
  const x = (trial: number) => PAD.left + ((trial - 1) / Math.max(1, maxTrials - 1)) * plotW;
  const y = (value: number) => PAD.top + plotH - ((value - yMin) / span) * plotH;

  const upperPath = withBounds
    .map((step) => `${f(x(step.trialCount), 1)},${f(y(step.interval.bounds!.upper), 1)}`)
    .join(' ');
  const lowerPath = [...withBounds]
    .reverse()
    .map((step) => `${f(x(step.trialCount), 1)},${f(y(step.interval.bounds!.lower), 1)}`)
    .join(' ');
  const centreLine = withBounds
    .map((step) => `${f(x(step.trialCount), 1)},${f(y(step.interval.bounds!.centre), 1)}`)
    .join(' ');

  const first = withBounds[0]!;
  const last = withBounds[withBounds.length - 1]!;
  const firstWidth = first.interval.bounds!.width;
  const lastWidth = last.interval.bounds!.width;

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>The interval, and the floor it is judged against</h2>
      <p className={styles.panelNote}>
        Range {f(firstWidth)} wide at trial {String(first.trialCount)}, {f(lastWidth)} at trial{' '}
        {String(last.trialCount)} — a factor of {f(firstWidth / lastWidth, 2)}. The state is decided
        by the <strong>lower end</strong> against the floor, never by the centre.
      </p>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${String(PLOT_WIDTH)} ${String(INTERVAL_PLOT_HEIGHT)}`}
        role="img"
        aria-label={`Learning-rate interval from trial ${String(first.trialCount)} to ${String(last.trialCount)}, narrowing from ${f(firstWidth)} to ${f(lastWidth)} scale points per trial`}
      >
        <defs>
          <pattern
            id="preFloor"
            width="7"
            height="7"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="7" className={styles.hatchLine} />
          </pattern>
        </defs>

        {first.trialCount > 1 ? (
          <>
            <rect
              x={PAD.left}
              y={PAD.top}
              width={Math.max(0, x(first.trialCount) - PAD.left)}
              height={plotH}
              fill="url(#preFloor)"
            />
            <text
              x={PAD.left + 8}
              y={PAD.top + 16}
              className={styles.hatchLabel}
            >{`below the ${String(first.interval.minTrials)}-trial floor — no interval`}</text>
          </>
        ) : null}

        <line
          x1={PAD.left}
          x2={PLOT_WIDTH - PAD.right}
          y1={y(0)}
          y2={y(0)}
          className={styles.zeroLine}
        />
        <line
          x1={PAD.left}
          x2={PLOT_WIDTH - PAD.right}
          y1={y(floor)}
          y2={y(floor)}
          className={styles.floorLine}
        />

        <polygon points={`${upperPath} ${lowerPath}`} className={styles.ribbon} />
        {/* One tick per repetition. The ribbon shows the shape; the ticks are what make the
            contraction countable, because a shrinking error bar is read faster than a tapering band. */}
        {withBounds.map((step) => (
          <line
            key={step.trialCount}
            x1={x(step.trialCount)}
            x2={x(step.trialCount)}
            y1={y(step.interval.bounds!.lower)}
            y2={y(step.interval.bounds!.upper)}
            className={
              step.interval.distinguishableFromNoLearning === true
                ? styles.tickSeparated
                : styles.tickOverlap
            }
          />
        ))}
        <polyline points={centreLine} className={styles.centreLine} />

        {/* Right-hand labels last so the marks cannot paint over them, and offset from each other
            because the floor sits within a hair of zero at any honest y-scale. */}
        <text x={PLOT_WIDTH - PAD.right + 6} y={y(floor) - 5} className={styles.floorLabel}>
          floor {f(floor)}
        </text>
        <text x={PLOT_WIDTH - PAD.right + 6} y={y(0) + 12} className={styles.axisLabel}>
          no climb
        </text>

        <line
          x1={PAD.left}
          x2={PAD.left}
          y1={PAD.top}
          y2={PAD.top + plotH}
          className={styles.axis}
        />
        <text x={4} y={PAD.top + 10} className={styles.axisLabel}>
          {f(yMax, 3)}
        </text>
        <text x={4} y={PAD.top + plotH} className={styles.axisLabel}>
          {f(yMin, 3)}
        </text>
        <text x={PAD.left} y={INTERVAL_PLOT_HEIGHT - 10} className={styles.axisLabel}>
          trial 1
        </text>
        <text
          x={PLOT_WIDTH - PAD.right}
          y={INTERVAL_PLOT_HEIGHT - 10}
          textAnchor="end"
          className={styles.axisLabel}
        >
          trial {String(maxTrials)}
        </text>
      </svg>
      <p className={styles.reason}>{last.interval.reason}</p>
    </section>
  );
}

/**
 * Posterior SE against the measured ladder.
 *
 * This plot starts at trial 1 because precision is a property of the BLOCK, not a claim about the
 * child — it is exactly the quantity the measured ladder tabulates at 8 and 15 trials, where no interval exists.
 * The dashed line is interpolation between five measured cells, so the cells are drawn as points
 * too: a run that tracks the points is behaving as the simulation says, and one that does not is
 * telling you the pool or the responder is not the one the ladder was measured on.
 */
function PrecisionPlot({ steps }: { steps: LearningRateIntervalStep[] }) {
  const observed = steps.filter((step) => step.posteriorSe !== null);
  if (observed.length === 0) return null;

  const maxTrials = steps[steps.length - 1]!.trialCount;
  const ladderInRange = MEASURED_POSTERIOR_SE_LADDER.filter((rung) => rung.trials <= maxTrials);
  const floorlessInRange = E095_FLOORLESS_POSTERIOR_SE_LADDER.filter(
    (rung) => rung.trials <= maxTrials,
  );
  const yMax =
    Math.max(
      ...observed.map((step) => step.posteriorSe!),
      ...ladderInRange.map((rung) => rung.meanPosteriorSe),
      0.02,
    ) * 1.08;

  const plotW = PLOT_WIDTH - PAD.left - PAD.right;
  const plotH = SE_PLOT_HEIGHT - PAD.top - PAD.bottom;
  const x = (trial: number) => PAD.left + ((trial - 1) / Math.max(1, maxTrials - 1)) * plotW;
  const y = (value: number) => PAD.top + plotH - (value / yMax) * plotH;

  const observedLine = observed
    .map((step) => `${f(x(step.trialCount), 1)},${f(y(step.posteriorSe!), 1)}`)
    .join(' ');
  const expectedLine = steps
    .filter((step) => step.expectedPosteriorSe !== null)
    .map((step) => `${f(x(step.trialCount), 1)},${f(y(step.expectedPosteriorSe!), 1)}`)
    .join(' ');

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Precision, against the measured ladder</h2>
      <p className={styles.panelNote}>
        <span className={styles.legendObserved}>———</span> this run.{' '}
        <span className={styles.legendExpected}>– – –</span> the measured mean, interpolated between
        the five cells it measured, which are drawn as points.{' '}
        <span className={styles.legendFloorless}>••</span> the floorless ladder E-095 published,
        shown only so a narrower reference quoted from memory can be recognised — it was measured
        against a constructed-response child and nothing in any bank is one.
      </p>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${String(PLOT_WIDTH)} ${String(SE_PLOT_HEIGHT)}`}
        role="img"
        aria-label={`Posterior standard error against trial count, from ${f(observed[0]!.posteriorSe!)} at trial ${String(observed[0]!.trialCount)} to ${f(observed[observed.length - 1]!.posteriorSe!)} at trial ${String(maxTrials)}`}
      >
        <polyline points={expectedLine} className={styles.expectedLine} />
        <polyline points={observedLine} className={styles.observedLine} />

        {floorlessInRange.map((rung) => (
          <circle
            key={`floorless-${String(rung.trials)}`}
            cx={x(rung.trials)}
            cy={y(rung.meanPosteriorSe)}
            r={2.5}
            className={styles.floorlessDot}
          />
        ))}
        {ladderInRange.map((rung) => (
          <g key={`rung-${String(rung.trials)}`}>
            <circle
              cx={x(rung.trials)}
              cy={y(rung.meanPosteriorSe)}
              r={4}
              className={styles.rung}
            />
            <text
              x={x(rung.trials)}
              y={y(rung.meanPosteriorSe) - 9}
              textAnchor="middle"
              className={styles.rungLabel}
            >
              {f(rung.meanPosteriorSe, 3)}
            </text>
          </g>
        ))}

        <line
          x1={PAD.left}
          x2={PAD.left}
          y1={PAD.top}
          y2={PAD.top + plotH}
          className={styles.axis}
        />
        <line
          x1={PAD.left}
          x2={PLOT_WIDTH - PAD.right}
          y1={PAD.top + plotH}
          y2={PAD.top + plotH}
          className={styles.axis}
        />
        <text x={4} y={PAD.top + 10} className={styles.axisLabel}>
          {f(yMax, 3)}
        </text>
        <text x={4} y={PAD.top + plotH} className={styles.axisLabel}>
          0
        </text>
        <text x={PAD.left} y={SE_PLOT_HEIGHT - 10} className={styles.axisLabel}>
          trial 1
        </text>
        <text
          x={PLOT_WIDTH - PAD.right}
          y={SE_PLOT_HEIGHT - 10}
          textAnchor="end"
          className={styles.axisLabel}
        >
          trial {String(maxTrials)}
        </text>
      </svg>
    </section>
  );
}

/** Observed against measured at the five lengths the ladder was measured at, which is where the two are comparable. */
function LadderTable({ steps }: { steps: LearningRateIntervalStep[] }) {
  const rows = MEASURED_POSTERIOR_SE_LADDER.map((rung) => {
    const step = steps[rung.trials - 1];
    const observedSe = step?.posteriorSe ?? null;
    return { rung, observedSe };
  }).filter((row) => row.observedSe !== null);

  if (rows.length === 0) return null;

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>
        This run against the measured cells (STAGE2_BANK_RECOVERY_MEASUREMENT §4–5)
      </h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>trials</th>
            <th>this run</th>
            <th>measured mean</th>
            <th>ratio</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ rung, observedSe }) => {
            const ratio = observedSe! / rung.meanPosteriorSe;
            const wide = ratio > 1.5 || ratio < 0.667;
            return (
              <tr key={rung.trials} className={wide ? styles.rowDiverged : undefined}>
                <td>{rung.trials}</td>
                <td>{f(observedSe!, 4)}</td>
                <td>{f(rung.meanPosteriorSe, 3)}</td>
                <td>
                  {f(ratio, 2)}×{wide ? ' — diverged' : ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className={styles.panelNote}>
        The measured column is a mean over 8 seeds × 400 children, so a single run scattering around
        it is expected and a run consistently outside 0.67×–1.5× is not. That is the diagnostic: it
        says the pool, the item format or the responder is not the one the ladder was measured on.
      </p>
    </section>
  );
}

/**
 * One bar per repetition, on a shared λ axis, so the pinch is legible without reading numbers.
 *
 * Colour carries the state and nothing else — there is no "fast" or "slow" here to encode.
 */
function ContractionStrip({ steps, floor }: { steps: LearningRateIntervalStep[]; floor: number }) {
  const withBounds = steps.filter((step) => step.interval.bounds !== null);
  if (withBounds.length === 0) return null;

  const lows = withBounds.map((step) => step.interval.bounds!.lower);
  const highs = withBounds.map((step) => step.interval.bounds!.upper);
  const axisMin = Math.min(0, floor, ...lows);
  const axisMax = Math.max(floor, ...highs);
  const span = axisMax - axisMin || 1;
  const pct = (value: number) => ((value - axisMin) / span) * 100;

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Every repetition, as a bar</h2>
      <p className={styles.panelNote}>
        Shared λ axis from {f(axisMin, 3)} to {f(axisMax, 3)} scale points per trial. The dotted
        rule is the contamination floor; a bar that touches or crosses it is not distinguishable
        from no learning.
      </p>
      <ol className={styles.strip}>
        {withBounds.map((step) => {
          const bounds = step.interval.bounds!;
          const separated = step.interval.distinguishableFromNoLearning === true;
          return (
            <li key={step.trialCount} className={styles.stripRow}>
              <span className={styles.stripTrial}>{step.trialCount}</span>
              <span className={styles.stripTrack}>
                <span className={styles.stripFloor} style={{ left: `${f(pct(floor), 3)}%` }} />
                <span
                  className={separated ? styles.stripBarSeparated : styles.stripBarOverlap}
                  style={{
                    left: `${f(pct(bounds.lower), 3)}%`,
                    width: `${f(Math.max(0.4, pct(bounds.upper) - pct(bounds.lower)), 3)}%`,
                  }}
                />
              </span>
              <span className={styles.stripWidth}>{f(bounds.width)}</span>
              <span className={separated ? styles.stateSeparated : styles.stateOverlap}>
                {separated ? 'above the floor' : 'not distinguishable from no learning'}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** The synthetic child the view runs by default, and the pieces a caller may override. */
export function defaultSimulatedChild(overrides: Partial<SimulatedChild> = {}): SimulatedChild {
  return {
    theta0: 11,
    lambda: 0.08,
    // Offset from `theta0` on purpose: the handover from Phase 1 is noisy, and a simulation that
    // handed over the truth would flatter the estimator (E-095 included the same noise).
    standing: 10.4,
    responderFloor: FIVE_OPTION_FLOOR,
    seed: 21,
    ...overrides,
  };
}
