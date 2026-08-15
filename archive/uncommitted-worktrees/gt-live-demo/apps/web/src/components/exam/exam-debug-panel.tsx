'use client';

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

function AreaRow({
  view,
  scale,
}: {
  view: DebugAreaView;
  scale: { min: number; max: number };
}) {
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
        <div className={styles.aim} style={{ left: `${pos(view.target, scale.min, scale.max)}%` }} />
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

export function ExamDebugPanel({
  view,
  children,
}: {
  view: DebugView;
  /** Controls that belong to the runner rather than the panel (the Emulate button). */
  children?: React.ReactNode;
}) {
  const [showLog, setShowLog] = useState(true);
  const [open, setOpen] = useState(false);
  const recent = view.log.slice(-HOW_MANY_LOG_ROWS);

  return (
    <aside className={styles.tray} aria-label="Debug: ability convergence">
      <div className={styles.handle}>
        <button
          type="button"
          className={styles.handleBtn}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className={styles.handleTag}>θ</span>
          <span className={styles.handleTheta}>
            {view.overall ? fmt(view.overall.estimate) : '—'}
          </span>
          <span className={styles.handleRange}>
            {view.overall
              ? `± ${fmt((view.overall.upper - view.overall.lower) / 2)}`
              : 'no answers yet'}
          </span>
          <span className={styles.handleMeta}>{view.itemsServed}q</span>
          <span className={styles.handleCaret} aria-hidden="true">
            {open ? '▼' : '▲'}
          </span>
          <span className={styles.handleHint}>{open ? 'hide' : 'show convergence'}</span>
        </button>
        <div className={styles.handleActions}>{children}</div>
      </div>

      {!open ? null : (
        <div className={styles.body}>
      <div className={styles.head}>
        <h2 className={styles.title}>Ability estimate</h2>
        <div className={styles.headline}>
          <span className={styles.bigTheta}>
            {view.overall ? fmt(view.overall.estimate) : '—'}
          </span>
          <span className={styles.bigRange}>
            {view.overall
              ? `± ${fmt((view.overall.upper - view.overall.lower) / 2)}  (range ${fmt(view.overall.lower)}–${fmt(view.overall.upper)})`
              : 'waiting for the first answer'}
          </span>
        </div>
        <span className={styles.headMeta}>
          {view.itemsServed} question{view.itemsServed === 1 ? '' : 's'} answered · scale{' '}
          {view.scale.min}–{view.scale.max}
        </span>
        <div className={styles.actions}>
          <button type="button" className={styles.toggle} onClick={() => setShowLog((v) => !v)}>
            {showLog ? 'Hide per-item detail' : 'Show per-item detail'}
          </button>
        </div>
      </div>

      {view.itemsServed === 0 ? (
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

      <p className={styles.foot}>
        White marker = fitted ability (<code>deriveAbilityFit</code>, the scorer&apos;s own
        estimator). Shaded band = ±1.96 SE from that fit. Green hairline = where the next item in
        that area will be aimed. The band is sampling error under a 1PL that assumes no guessing
        floor, while every wired item is multiple choice — so watch it narrow, but do not read it as
        a 95% claim about the child. Born-synthetic, <code>validated=false</code>.
      </p>
        </div>
      )}
    </aside>
  );
}
