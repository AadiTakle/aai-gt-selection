'use client';

import { estimateLearningCurve } from '@gt-selection/exam-scoring';
import { useState } from 'react';

import { domainLabel } from '@/lib/exam/bank';
import type { DebugAreaView, DebugInterval, DebugItemRow, DebugView } from '@/lib/exam/debug-view';

import styles from './exam-debug-panel.module.css';

/**
 * The `?debug=1` dock: the ability estimate converging, live, while the test is taken.
 *
 * Reading order is deliberate, because the point of the panel is one thing and everything else is
 * supporting detail:
 *
 *  1. the pooled estimate and its plausible range, in the largest type on screen;
 *  2. the same thing per reasoning area, each on a shared 1..20 axis so the shaded ranges can be
 *     compared by eye and watched to shrink;
 *  3. the width of that range after every answered item — the narrowing itself, as a series;
 *  4. only then the per-item detail that explains WHY each next item was chosen.
 *
 * The range is `deriveAbilityFit`'s conditional SE, the estimator the scorer uses. See
 * `lib/exam/debug-view.ts` for what that interval does and does not claim.
 */

const HOW_MANY_LOG_ROWS = 8;

function pos(value: number, min: number, max: number): number {
  return ((value - min) / (max - min)) * 100;
}

function fmt(n: number, digits = 1): string {
  return Number.isFinite(n) ? n.toFixed(digits) : '—';
}

/** `12.4 ±2.1` — the estimate with the half-width of its plausible range. */
function intervalLabel(interval: DebugInterval | null): string {
  if (!interval) return '—';
  const half = (interval.upper - interval.lower) / 2;
  return `${fmt(interval.estimate)} ±${fmt(half)}`;
}

function AreaRow({ view, scale }: { view: DebugAreaView; scale: { min: number; max: number } }) {
  const { interval } = view;
  return (
    <div className={styles.area}>
      <span className={styles.areaName}>{domainLabel(view.area)}</span>
      <span className={styles.areaTheta}>{interval ? fmt(interval.estimate) : '—'}</span>
      <div
        className={styles.axis}
        role="img"
        aria-label={`${domainLabel(view.area)} ability ${intervalLabel(interval)} on a ${scale.min} to ${scale.max} scale`}
      >
        <div className={styles.axisTicks} aria-hidden="true">
          <span>{scale.min}</span>
          <span>{Math.round((scale.min + scale.max) / 2)}</span>
          <span>{scale.max}</span>
        </div>
        {interval ? (
          <>
            <div
              className={styles.band}
              style={{
                left: `${pos(interval.lower, scale.min, scale.max)}%`,
                width: `${Math.max(0.6, pos(interval.upper, scale.min, scale.max) - pos(interval.lower, scale.min, scale.max))}%`,
              }}
            />
            <div
              className={styles.marker}
              style={{ left: `${pos(interval.estimate, scale.min, scale.max)}%` }}
            />
          </>
        ) : null}
        {/* Green hairline: where the engine will aim the next item in this area. */}
        <div
          className={styles.aim}
          style={{ left: `${pos(view.target, scale.min, scale.max)}%` }}
        />
      </div>
      <span className={styles.areaWidth}>
        {interval ? `±${fmt((interval.upper - interval.lower) / 2)}` : '—'} · {view.itemsSeen}q
      </span>
    </div>
  );
}

/** The narrowing, as a bar per answered item. Tallest bar = widest the range has been. */
function Narrowing({ widths }: { widths: readonly number[] }) {
  if (widths.length === 0) return null;
  const peak = Math.max(...widths, 0.001);
  return (
    <div>
      <p className={styles.narrowLabel}>
        Plausible range after each question — first {fmt(widths[0] ?? 0)}, now{' '}
        {fmt(widths[widths.length - 1] ?? 0)} wide
      </p>
      <div className={styles.narrowWrap} aria-hidden="true">
        {widths.map((width, i) => (
          <span
            key={i}
            className={styles.narrowBar}
            style={{ height: `${Math.max(4, (width / peak) * 100)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function LogRow({ row }: { row: DebugItemRow }) {
  return (
    <tr>
      <td>{row.sessionIndex}</td>
      <td>{row.typeCode}</td>
      <td>{fmt(row.targetDifficulty)}</td>
      <td>{fmt(row.servedDifficulty)}</td>
      <td className={row.correct ? styles.ok : styles.no}>{row.correct ? '✓' : '✗'}</td>
      <td>{fmt(row.step, 2)}</td>
      <td>
        {row.delta >= 0 ? '+' : ''}
        {fmt(row.delta, 2)}
      </td>
      <td>{fmt(row.targetAfter)}</td>
      <td>{row.interval ? `±${fmt((row.interval.upper - row.interval.lower) / 2)}` : '—'}</td>
      <td className={styles.rev}>{row.reversal ? '↩' : ''}</td>
      <td>
        {row.burst ? (
          <span className={styles.burstTag}>
            {row.burst.index}/{row.burst.length}
          </span>
        ) : null}
      </td>
    </tr>
  );
}

/** What the dock shows while a Phase 2 activity is running. */
export interface Stage2DebugView {
  readonly label: string;
  /** 0-based position in the queue this child was offered. */
  readonly activityIndex: number;
  readonly activityCount: number;
  readonly length: number;
  readonly standing: number;
  readonly trials: readonly { readonly difficulty: number; readonly score: number }[];
  /** TRUE climb of the emulated child, in scale points per trial. */
  readonly emulatedLambda: number;
  readonly onEmulatedLambda: (value: number) => void;
  readonly autoRun: boolean;
  readonly onAutoRun: (value: boolean) => void;
}

/** Presets spanning the cases the block has to be able to tell apart. */
const LEARNER_PRESETS: readonly { label: string; lambda: number }[] = [
  { label: 'none', lambda: 0 },
  { label: 'slow', lambda: 0.03 },
  { label: 'typical', lambda: 0.06 },
  { label: 'fast', lambda: 0.12 },
];

const COLLAPSE_KEY = 'gt-exam-debug-collapsed';

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Phase 2 body. Deliberately NOT the Phase 1 convergence view: nothing is bracketing here, so
 * "estimate ± range", reversals and bursts would all be describing a search that is not running.
 * A learning block is a fixed-length run, and what there is to watch is the climb.
 */
function Stage2Body({ view }: { view: Stage2DebugView }) {
  const done = view.trials.length;
  const correct = view.trials.reduce((n, t) => n + (t.score > 0 ? 1 : 0), 0);
  const fit =
    done >= 4 ? estimateLearningCurve(view.trials.map((t, i) => ({ ...t, trialIndex: i }))) : null;

  return (
    <>
      <div className={styles.areas}>
        <p className={styles.headMeta}>
          Trial {Math.min(done + 1, view.length)} of {view.length} · {correct}/{done || 0} correct
          {done > 0 ? ` (${Math.round((correct / done) * 100)}%)` : ''} · aimed from standing{' '}
          {fmt(view.standing)}
        </p>
        <div className={styles.trialStrip} aria-hidden="true">
          {Array.from({ length: view.length }, (_, i) => {
            const trial = view.trials[i];
            const state = !trial ? 'trialPending' : trial.score > 0 ? 'trialOk' : 'trialNo';
            return (
              <span
                key={i}
                className={`${styles.trialCell} ${styles[state] ?? ''}`}
                style={
                  trial
                    ? { height: `${Math.max(6, Math.min(100, trial.difficulty * 5))}%` }
                    : undefined
                }
                title={trial ? `#${i + 1} difficulty ${fmt(trial.difficulty)}` : `#${i + 1}`}
              />
            );
          })}
        </div>
      </div>
      <div className={styles.actions}>
        <span className={styles.headMeta}>Emulated learner λ</span>
        {LEARNER_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className={`${styles.toggle} ${
              Math.abs(view.emulatedLambda - preset.lambda) < 1e-9 ? styles.presetOn : ''
            }`}
            onClick={() => view.onEmulatedLambda(preset.lambda)}
          >
            {preset.label} ({preset.lambda})
          </button>
        ))}
        <button
          type="button"
          className={styles.toggle}
          onClick={() => view.onAutoRun(!view.autoRun)}
        >
          {view.autoRun ? 'Stop auto-run' : 'Auto-run block →'}
        </button>
      </div>
      <p className={styles.foot}>
        Bar height is the difficulty served; green is correct. λ is the fitted climb and is{' '}
        <strong>diagnostic only</strong> — at this block length a child who learned nothing still
        fits a positive value, so it is never shown to a family and never gates anything.{' '}
        {fit?.converged
          ? `Current fit: λ ${fit.lambda.toFixed(3)} ± ${fit.lambdaSe.toFixed(3)} against a true ` +
            `λ of ${view.emulatedLambda} in the emulator.`
          : 'Not enough trials to fit a climb yet.'}{' '}
        The emulator generates from the SAME curve this fit inverts, so agreement here is a
        self-consistency check on the estimator — never evidence that a within-session climb
        measures real learning.
      </p>
    </>
  );
}

export function ExamDebugPanel({
  view,
  stage2,
  children,
}: {
  view: DebugView;
  /** Present while a Phase 2 activity is running; switches the dock to the learning-block view. */
  stage2?: Stage2DebugView | null;
  /** Controls that belong to the runner rather than the panel (the Emulate button). */
  children?: React.ReactNode;
}) {
  const [showLog, setShowLog] = useState(true);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const recent = view.log.slice(-HOW_MANY_LOG_ROWS);

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        // a non-persisted toggle still works for this session
      }
      return next;
    });
  }

  const fit =
    stage2 && stage2.trials.length >= 4
      ? estimateLearningCurve(stage2.trials.map((t, i) => ({ ...t, trialIndex: i })))
      : null;

  return (
    <aside
      className={`${styles.dock} ${collapsed ? styles.collapsed : ''}`}
      aria-label={stage2 ? 'Debug: learning block' : 'Debug: ability convergence'}
    >
      <div className={styles.head}>
        <h2 className={styles.title}>
          {stage2
            ? `${stage2.label} · activity ${stage2.activityIndex + 1}/${stage2.activityCount}`
            : 'Ability estimate'}
        </h2>
        <div className={styles.headline}>
          <span className={styles.bigTheta}>
            {stage2
              ? fit?.converged
                ? `λ ${fit.lambda.toFixed(3)}`
                : 'λ —'
              : view.overall
                ? fmt(view.overall.estimate)
                : '—'}
          </span>
          <span className={styles.bigRange}>
            {stage2
              ? fit?.converged
                ? `± ${fit.lambdaSe.toFixed(3)} · diagnostic only, never reported`
                : 'fitting starts after a few trials'
              : view.overall
                ? `± ${fmt((view.overall.upper - view.overall.lower) / 2)}  (range ${fmt(view.overall.lower)}–${fmt(view.overall.upper)})`
                : 'waiting for the first answer'}
          </span>
        </div>
        {!stage2 ? (
          <span className={styles.headMeta}>
            {view.itemsServed} question{view.itemsServed === 1 ? '' : 's'} answered · scale{' '}
            {view.scale.min}–{view.scale.max}
          </span>
        ) : null}
        <div className={styles.actions}>
          {children}
          {!collapsed && !stage2 ? (
            <button type="button" className={styles.toggle} onClick={() => setShowLog((v) => !v)}>
              {showLog ? 'Hide per-item detail' : 'Show per-item detail'}
            </button>
          ) : null}
          <button
            type="button"
            className={styles.toggle}
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
          >
            {collapsed ? 'Expand ▲' : 'Collapse ▼'}
          </button>
        </div>
      </div>

      {collapsed ? null : stage2 ? (
        <Stage2Body view={stage2} />
      ) : view.itemsServed === 0 ? (
        <p className={styles.empty}>
          Answer the first question and the estimate, its plausible range, and the narrowing will
          appear here.
        </p>
      ) : (
        <>
          <Narrowing widths={view.overallWidths} />

          <div className={styles.areas}>
            {view.areas.map((area) => (
              <AreaRow key={area.area} view={area} scale={view.scale} />
            ))}
          </div>

          {showLog ? (
            <table className={styles.log}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>type</th>
                  <th>aimed</th>
                  <th>served</th>
                  <th>ok</th>
                  <th>step</th>
                  <th>move</th>
                  <th>new aim</th>
                  <th>±range</th>
                  <th>rev</th>
                  <th>burst</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((row) => (
                  <LogRow key={row.itemId} row={row} />
                ))}
              </tbody>
            </table>
          ) : null}
        </>
      )}

      {collapsed || stage2 ? null : (
        <p className={styles.foot}>
          White marker = fitted ability (<code>deriveAbilityFit</code>, the scorer&apos;s own
          estimator). Shaded band = ±1.96 SE from that fit. Green hairline = where the next item in
          that area will be aimed. The band is sampling error under a 1PL that assumes no guessing
          floor, while every wired item is multiple choice — so watch it narrow, but do not read it
          as a 95% claim about the child. Born-synthetic, <code>validated=false</code>.
        </p>
      )}
    </aside>
  );
}
