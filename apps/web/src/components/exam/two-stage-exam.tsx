'use client';

import { useMemo } from 'react';

import { domainLabel } from '@/lib/exam/bank';
import { syntheticTwoStageBank } from '@/lib/exam/sample-items-two-stage';
import {
  planFromResults,
  TwoStageSequencer,
  type DomainStanding,
} from '@/lib/exam/two-stage-sequencer';
import type { ExamItemResult } from '@/lib/exam/types';

import { ItemPlayer } from './item-player';
import { useExamSession } from './use-exam-session';
import shell from './exam-runner.module.css';
import styles from './two-stage-exam.module.css';

/**
 * Clickable, born-SYNTHETIC demo of the PROPOSED two-regime ("two-stage") test
 * structure — an UNAPPROVED, pluggable design, one of several possible
 * structures. It runs the SAME structure-agnostic {@link useExamSession} shell +
 * {@link ItemPlayer} as the fixed-order demo, but swaps in a
 * {@link TwoStageSequencer}: Phase 1 brackets each domain's standing (accuracy),
 * Phase 2 places an effort/interactive task at the difficulty nearest that
 * standing (learning-rate). Nothing here is calibrated or validated; it never
 * makes an admission or ability decision.
 */

function fmtLevel(n: number | null): string {
  if (n == null) return '—';
  return `L${Number.isInteger(n) ? n : n.toFixed(1)}`;
}

function standingValue(s: DomainStanding): string {
  if (s.stopped) return `~${fmtLevel(s.estimate)}`;
  if (s.estimate != null) return `probing ~${fmtLevel(s.estimate)}`;
  return 'probing…';
}

function telemetryPills(r: ExamItemResult | undefined): string[] {
  if (!r) return [];
  const pills: string[] = [];
  if (r.responseTimeMs != null) pills.push(`${(r.responseTimeMs / 1000).toFixed(1)}s`);
  for (const [k, v] of Object.entries(r.metrics)) {
    if (k.endsWith('_num')) continue;
    pills.push(`${k.replace(/^M-/, '')} ${v}`);
    if (pills.length >= 4) break;
  }
  return pills;
}

const PROPOSAL_TITLE = 'Proposed · unapproved · not merged';
const PROPOSAL_BODY =
  'This screen demonstrates ONE candidate test structure (a two-regime “two-stage” design) so it can be evaluated. It is a pluggable proposal, not a ratified requirement, and not the only option. Every item is born-synthetic (synthetic_only=true, validated=false), hand-authored, and uncalibrated. Results here are never an admission, ability, or eligibility decision.';

function ProposalBanner() {
  return (
    <div className={styles.proposalBanner}>
      <p className={styles.proposalBannerTitle}>⚠ {PROPOSAL_TITLE}</p>
      <p className={styles.proposalBannerBody}>{PROPOSAL_BODY}</p>
    </div>
  );
}

function PhaseChips({ current }: { current: 'standing' | 'learning-rate' | 'complete' }) {
  const p1 =
    current === 'standing'
      ? styles.phaseChipActive
      : `${styles.phaseChipDone}`;
  const p2 =
    current === 'learning-rate'
      ? styles.phaseChipActive
      : current === 'complete'
        ? styles.phaseChipDone
        : '';
  return (
    <div className={styles.phaseChips}>
      <span className={`${styles.phaseChip} ${p1}`}>Phase 1 · Standing (accuracy)</span>
      <span className={styles.phaseArrow}>→</span>
      <span className={`${styles.phaseChip} ${p2}`}>Phase 2 · Learning-rate (effort)</span>
    </div>
  );
}

export function TwoStageExam() {
  const bank = useMemo(() => syntheticTwoStageBank(), []);
  // The one-line strategy swap: FixedSequencer → TwoStageSequencer, same interface.
  const sequencer = useMemo(() => new TwoStageSequencer(), []);

  const { phase, currentItem, answeredCount, results, error, start, handleOutcome, retry } =
    useExamSession({ bank, sequencer, studentName: 'Demo Learner (synthetic)', ageBand: '6-8' });

  // Pure reconstruction of the phase plan from results (the shell hides the
  // presented-id list); drives both the live regime indicator and the summary.
  const plan = useMemo(() => planFromResults(bank, results), [bank, results]);
  const resultByType = useMemo(
    () => new Map(results.map((r) => [r.typeCode, r])),
    [results],
  );

  // ---- intro ---------------------------------------------------------------
  if (phase === 'intro') {
    return (
      <div className={shell.wrap}>
        <ProposalBanner />
        <section className={shell.hero}>
          <div className={shell.heroText}>
            <span className={styles.proposalBadge}>PROPOSAL · synthetic · validated=false</span>
            <p className={shell.kicker}>Pluggable sequencer demo</p>
            <h1 className={shell.title}>Two-stage screener — standing, then learning-rate</h1>
            <p className={shell.lede}>
              A proposed structure that measures two different things with two different regimes.
              <strong> Phase 1</strong> finds each reasoning area’s <em>standing</em> with quick
              accuracy items, <strong>bracketing</strong> the child’s level from both sides instead
              of ramping to failure. <strong>Phase 2</strong> then places an interactive
              <em> effort</em> task right at that level to watch <em>learning-rate</em>. Same shell,
              same player as the fixed demo — only the swappable sequencer changed.
            </p>
            <PhaseChips current="standing" />
            <button type="button" className={shell.primary} onClick={start}>
              Start the proposed demo →
            </button>
          </div>
        </section>
        <p className={shell.boundary}>
          Maps to the author’s Spiky PoV in{' '}
          <span className={styles.mono}>brainlifting/test-structure-brainlift</span> (Insight 1:
          standing vs learning-rate need different structures; Insight 2: bracket the limit, don’t
          ramp to failure; Insight 3: desirable difficulty belongs only in the learning-rate stage).
          Unapproved, pluggable, born-synthetic — the fixed-order demo remains the reachable default.
        </p>
      </div>
    );
  }

  // ---- saving --------------------------------------------------------------
  if (phase === 'saving') {
    return (
      <div className={shell.wrap}>
        <section className={shell.centered}>
          <div className={shell.spinner} aria-hidden="true" />
          <p>Scoring the synthetic session…</p>
        </section>
      </div>
    );
  }

  // ---- summary (done or error both render the two-regime story) -------------
  if (phase === 'done' || phase === 'error') {
    const standingItems = plan.presented.filter((p) => p.phase === 'standing');
    const effortItems = plan.presented.filter((p) => p.phase === 'learning-rate');
    return (
      <div className={shell.wrap}>
        <ProposalBanner />
        <section className={shell.hero}>
          <div className={shell.heroText}>
            <span className={styles.proposalBadge}>PROPOSAL summary · synthetic</span>
            <p className={shell.kicker}>Two-regime result</p>
            <h1 className={shell.title}>What the two stages captured</h1>
            <p className={shell.lede}>
              The session ran through the shared shell with the proposed{' '}
              <span className={styles.mono}>TwoStageSequencer</span>. Below: the Phase-1 per-domain
              standing baseline, how Phase-2 difficulty was calibrated to it, and the effort /
              engagement telemetry Phase-2 captured. {standingItems.length} standing items +{' '}
              {effortItems.length} effort tasks.
            </p>
          </div>
        </section>

        {phase === 'error' && error ? (
          <p className={shell.boundary}>Note: {error} The two-regime view below is computed locally.</p>
        ) : null}

        {/* Phase 1 — standing baseline */}
        <section className={shell.summaryCard}>
          <p className={shell.cardKicker}>Phase 1 · Standing baseline (bracketed, not ramped)</p>
          <table className={styles.baselineTable}>
            <thead>
              <tr>
                <th>Reasoning area</th>
                <th>Standing estimate</th>
                <th>Bracket [floor…ceiling]</th>
                <th>Items used</th>
                <th>Stopped by</th>
              </tr>
            </thead>
            <tbody>
              {plan.standings.map((s) => (
                <tr key={s.domain}>
                  <td>{domainLabel(s.domain)}</td>
                  <td className={styles.mono}>{fmtLevel(s.estimate)}</td>
                  <td className={styles.mono}>
                    [{fmtLevel(s.floorCorrect)} … {fmtLevel(s.ceilingIncorrect)}]
                  </td>
                  <td className={styles.mono}>{s.presented}</td>
                  <td className={styles.mono}>
                    {s.stopReason === 'bracketed' ? 'precision' : s.stopReason ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.legend}>
            The estimate is the midpoint of the highest rung answered correctly (floor) and the
            lowest answered incorrectly (ceiling) — the bracket closed in from both sides. Ordinal
            “L” rungs are a design scale, not calibrated ability.
          </p>
        </section>

        {/* Phase 2 — calibration + telemetry */}
        <section className={shell.summaryCard}>
          <p className={shell.cardKicker}>Phase 2 · Difficulty calibrated to standing → effort captured</p>
          <div className={styles.placementGrid}>
            {plan.placements.map((pl) => {
              const r = resultByType.get(pl.typeCode);
              const item = bank.find((b) => b.itemId === pl.itemId);
              return (
                <div key={pl.itemId} className={styles.placementCard}>
                  <div className={styles.placementHead}>
                    <span className={styles.placementDomain}>{domainLabel(pl.domain)}</span>
                    <span className={styles.placementTask}>{item?.title}</span>
                  </div>
                  <div className={styles.calibration}>
                    <span className={styles.calChip}>standing {fmtLevel(pl.estimate)}</span>
                    <span aria-hidden="true">→</span>
                    <span className={`${styles.calChip} ${styles.calChipEffort}`}>
                      effort {fmtLevel(pl.chosenRung)}
                    </span>
                  </div>
                  <div className={styles.telemetry}>
                    {telemetryPills(r).length ? (
                      telemetryPills(r).map((t, i) => (
                        <span key={i} className={styles.telemetryPill}>
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className={styles.telemetryPill}>no telemetry harvested</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className={styles.legend}>
            Each effort task was placed at the rung nearest that area’s Phase-1 standing (desirable
            difficulty — hard enough to struggle, still learnable). In Phase 2 the signal is
            engagement / telemetry, not a single right-or-wrong.
          </p>
        </section>

        {/* Per-item audit trail */}
        <section className={shell.summaryCard}>
          <p className={shell.cardKicker}>Per-item audit (what the sequencer chose, in order)</p>
          <table className={styles.auditTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>Phase</th>
                <th>Area</th>
                <th>Rung</th>
                <th>Signal</th>
              </tr>
            </thead>
            <tbody>
              {plan.presented.map((p) => {
                const r = resultByType.get(p.typeCode);
                const isStanding = p.phase === 'standing';
                const mark = p.skipped
                  ? { text: 'skipped', cls: styles.skippedRow }
                  : isStanding
                    ? p.accuracy === 1
                      ? { text: '✓ correct', cls: styles.correct }
                      : { text: '✗ incorrect', cls: styles.incorrect }
                    : { text: telemetryPills(r).join(' · ') || 'effort captured', cls: styles.mono };
                return (
                  <tr key={`${p.itemId}-${p.order}`}>
                    <td className={styles.mono}>{p.order}</td>
                    <td>
                      <span
                        className={`${styles.phaseTag} ${
                          isStanding ? styles.phaseTagStanding : styles.phaseTagEffort
                        }`}
                      >
                        {isStanding ? 'standing' : 'effort'}
                      </span>
                    </td>
                    <td>{domainLabel(p.domain)}</td>
                    <td className={styles.mono}>
                      {fmtLevel(p.difficultyLevel)}
                      {!isStanding && p.targetedEstimate != null
                        ? ` (→ ${fmtLevel(p.targetedEstimate)})`
                        : ''}
                    </td>
                    <td className={mark.cls}>{mark.text}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <button type="button" className={shell.primary} onClick={phase === 'error' ? retry : start}>
          {phase === 'error' ? 'Try scoring again' : 'Run the proposed demo again →'}
        </button>
        <p className={shell.boundary}>
          Synthetic result (validated=false). The standing “levels”, difficulty rungs, and telemetry
          are hand-authored placeholders to make the proposed structure legible — not a calibrated
          screen, not evidence of ability, and never an admission decision.
        </p>
      </div>
    );
  }

  // ---- running -------------------------------------------------------------
  const runningPhase = plan.currentPhase === 'complete' ? 'learning-rate' : plan.currentPhase;
  const currentStanding = currentItem
    ? plan.standings.find((s) => s.domain === currentItem.domain)
    : undefined;
  const isEffortNow = currentItem?.renderKind === 'embedded-demo';

  return (
    <div className={shell.runWrap}>
      <ProposalBanner />

      <header className={shell.runHead}>
        <div>
          <p className={shell.kicker}>
            {isEffortNow ? 'Phase 2 · Learning-rate' : 'Phase 1 · Standing'} ·{' '}
            {currentItem ? domainLabel(currentItem.domain) : ''} · item {answeredCount + 1}
          </p>
          <p className={shell.runTitle}>{currentItem?.title}</p>
        </div>
        <span className={styles.proposalBadge}>PROPOSAL</span>
      </header>

      <PhaseChips current={runningPhase} />

      <div className={styles.regimeCard}>
        {isEffortNow ? (
          <>
            <p className={styles.regimeName}>Phase 2 — effort / learning-rate</p>
            <p className={styles.regimeNote}>
              An interactive task placed at a <strong>desirable difficulty</strong> near this area’s
              Phase-1 standing. The signal is how the child engages and improves under struggle —
              telemetry, not a single right/wrong.
            </p>
            {currentItem ? (
              <span className={styles.calloutRow}>
                placed at {fmtLevel(currentItem.difficultyLevel)} · targeting standing{' '}
                {fmtLevel(currentStanding?.estimate ?? null)} for {domainLabel(currentItem.domain)}
              </span>
            ) : null}
          </>
        ) : (
          <>
            <p className={styles.regimeName}>Phase 1 — standing / accuracy</p>
            <p className={styles.regimeNote}>
              Quick accuracy items with load kept low. The sequencer <strong>brackets</strong> the
              child’s level, closing in from both sides rather than ramping to failure.
            </p>
          </>
        )}
      </div>

      <div className={styles.standingStrip}>
        {plan.standings.map((s) => (
          <div
            key={s.domain}
            className={`${styles.domainChip} ${s.stopped ? styles.domainChipLocalised : ''}`}
          >
            <span className={styles.domainChipLabel}>{domainLabel(s.domain)}</span>
            <span className={styles.domainChipValue}>{standingValue(s)}</span>
          </div>
        ))}
      </div>

      {currentItem ? (
        <ItemPlayer item={currentItem} onComplete={handleOutcome} frameClassName={shell.frame} />
      ) : null}

      <p className={shell.frameNote}>
        {currentItem?.blurb} · Synthetic item · PROPOSED structure · scored server-side.
      </p>
    </div>
  );
}
