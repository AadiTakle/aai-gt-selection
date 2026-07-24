'use client';

import type { ScreenDecision } from '@gt-selection/contracts';
import Link from 'next/link';
import { useState } from 'react';

import { EXAM_FEE_USD, EXAM_NAME } from '@/lib/exam/branding';

import { AscendBattery, type AscendResult } from './ascend-battery';
import styles from './ascend.module.css';

type Phase = 'intro' | 'payment' | 'battery' | 'results' | 'error';

/** Standard-normal CDF (Abramowitz & Stegun 7.1.26) — mirrors the CAT engine. */
function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-0.5 * x * x);
  const poly =
    t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const p = d * poly;
  return x >= 0 ? 1 - p : p;
}

/** 0-100 headline "Ascend Score": accuracy/ability (theta) dominant via fitIndex. */
function ascendScore(fitIndex: number): number {
  return Math.round(Math.max(0, Math.min(100, normalCdf(fitIndex) * 100)));
}

const RECOMMENDATION: Record<ScreenDecision, { label: string; tone: string; blurb: string }> = {
  admit: {
    label: 'Recommended',
    tone: 'good',
    blurb: `${EXAM_NAME} indicates a strong match for gifted programming on this synthetic run.`,
  },
  defer: {
    label: 'Review',
    tone: 'warn',
    blurb: 'A closer human review is suggested before any next step.',
  },
  retry: {
    label: 'Retry',
    tone: 'bad',
    blurb: 'Signals were inconclusive or engagement was low — a re-take is suggested.',
  },
};

function domainLabel(domain: string): string {
  return domain.replace('_', ' ');
}

function fmt(value: number | null): string {
  return value == null ? '—' : value.toFixed(2);
}

function CardField({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input type="text" inputMode="text" placeholder={placeholder} autoComplete="off" />
    </label>
  );
}

export function AscendFlow() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [result, setResult] = useState<AscendResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  function startPayment() {
    setPhase('payment');
  }

  function pay() {
    setProcessing(true);
    // No real processor or charge — illustrative prototype only.
    window.setTimeout(() => {
      setProcessing(false);
      setPhase('battery');
    }, 650);
  }

  function skipPayment() {
    setPhase('battery');
  }

  function restart() {
    setResult(null);
    setError(null);
    setPhase('intro');
  }

  return (
    <div className={styles.shell}>
      <div className={styles.claimBanner}>
        {EXAM_NAME} is a born-synthetic prototype. Numbers here are illustrative and are not a
        validated determination or an admission decision (R10).
      </div>

      {phase === 'intro' ? (
        <section className={styles.card}>
          <p className={styles.eyebrow}>Family application · assessment step</p>
          <h1 className={styles.h1}>Start the {EXAM_NAME} Assessment</h1>
          <p className={styles.lede}>
            {EXAM_NAME} is a short, adaptive reasoning session across four domains — fluid
            reasoning, verbal, quantitative, and spatial. Questions get harder as your child
            succeeds, so every session finds the right level.
          </p>
          <ul className={styles.points}>
            <li>Adaptive difficulty powered by a real computerized-adaptive-testing engine</li>
            <li>~12–15 questions across the four reasoning domains</li>
            <li>Live per-domain ability and engagement telemetry</li>
          </ul>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={startPayment}>
              Start the {EXAM_NAME} Assessment →
            </button>
            <Link className={styles.ghostLink} href="/family">
              Back to the family portal
            </Link>
          </div>
        </section>
      ) : null}

      {phase === 'payment' ? (
        <section className={styles.card}>
          <p className={styles.eyebrow}>Assessment fee</p>
          <h1 className={styles.h1}>Pay the {EXAM_NAME} fee</h1>
          <p className={styles.lede}>
            A one-time ${EXAM_FEE_USD.toFixed(2)} fee covers this adaptive session. This is a
            prototype — no card is charged and no payment data is stored.
          </p>

          <div className={styles.payGrid}>
            <div className={styles.cardForm}>
              <CardField label="Name on card" placeholder="Alex Rivera" />
              <CardField label="Card number" placeholder="4242 4242 4242 4242" />
              <div className={styles.fieldRow}>
                <CardField label="Expiry" placeholder="04 / 29" />
                <CardField label="CVC" placeholder="123" />
              </div>
              <CardField label="ZIP / Postal code" placeholder="30332" />
              <p className={styles.demoNote}>Prototype payment — inputs are not sent anywhere.</p>
            </div>

            <aside className={styles.summary}>
              <p className={styles.summaryKicker}>Order summary</p>
              <div className={styles.summaryRow}>
                <span>{EXAM_NAME} adaptive assessment</span>
                <span>${EXAM_FEE_USD.toFixed(2)}</span>
              </div>
              <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                <span>Total due</span>
                <span>${EXAM_FEE_USD.toFixed(2)}</span>
              </div>
              <button
                type="button"
                className={styles.primary}
                onClick={pay}
                disabled={processing}
              >
                {processing ? 'Processing…' : `Pay $${EXAM_FEE_USD.toFixed(2)}`}
              </button>
              <button type="button" className={styles.skip} onClick={skipPayment}>
                Skip (demo) →
              </button>
            </aside>
          </div>
        </section>
      ) : null}

      {phase === 'battery' ? (
        <AscendBattery
          onComplete={(res) => {
            setResult(res);
            setPhase('results');
          }}
          onError={(message) => {
            setError(message);
            setPhase('error');
          }}
        />
      ) : null}

      {phase === 'results' && result ? (
        <ResultsScreen result={result} onRestart={restart} />
      ) : null}

      {phase === 'error' ? (
        <section className={styles.card}>
          <p className={styles.eyebrow}>{EXAM_NAME} assessment</p>
          <h1 className={styles.h1}>We hit a synthetic snag</h1>
          <p className={styles.errorText}>{error}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={restart}>
              Start over
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ResultsScreen({ result, onRestart }: { result: AscendResult; onRestart: () => void }) {
  const { outcome, metrics } = result;
  const score = ascendScore(outcome.fitIndex);
  const rec = RECOMMENDATION[outcome.decision];
  const rtSeconds = metrics.meanRtMs != null ? (metrics.meanRtMs / 1000).toFixed(1) : '—';
  const firstActionSeconds =
    metrics.meanFirstActionMs != null ? (metrics.meanFirstActionMs / 1000).toFixed(1) : '—';
  const engagementPct =
    metrics.engagementRate != null ? Math.round(metrics.engagementRate * 100) : null;

  return (
    <section className={styles.results}>
      <div className={`${styles.scoreCard} ${styles[`tone_${rec.tone}`]}`}>
        <div className={styles.scoreBlock}>
          <p className={styles.scoreLabel}>{EXAM_NAME} Score</p>
          <p className={styles.scoreValue}>{score}</p>
          <p className={styles.scoreOutOf}>/ 100</p>
        </div>
        <div className={styles.scoreMeta}>
          <span className={`${styles.recPill} ${styles[`pill_${rec.tone}`]}`}>{rec.label}</span>
          <p className={styles.recBlurb}>{rec.blurb}</p>
          <p className={styles.scoreSub}>
            Composite θ {fmt(outcome.compositeTheta)} · fit index {fmt(outcome.fitIndex)} ·
            engagement {outcome.engagementValid ? 'valid' : 'provisional'}
          </p>
        </div>
      </div>

      <div className={styles.panels}>
        <div className={styles.panel}>
          <p className={styles.panelTitle}>Per-domain breakdown</p>
          <table className={styles.scoreTable}>
            <thead>
              <tr>
                <th>Domain</th>
                <th>θ</th>
                <th>%ile</th>
                <th>Items</th>
                <th>Hardest</th>
                <th>Learn</th>
                <th>Consist.</th>
              </tr>
            </thead>
            <tbody>
              {outcome.domainScores.map((d) => (
                <tr key={d.domain}>
                  <td className={styles.domCell}>{domainLabel(d.domain)}</td>
                  <td>{fmt(d.theta)}</td>
                  <td>{d.percentile == null ? '—' : Math.round(d.percentile)}</td>
                  <td>{d.itemsAdministered}</td>
                  <td>{d.maxDifficultyReached}/6</td>
                  <td>{fmt(d.learningRate)}</td>
                  <td>{fmt(d.consistency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.panel}>
          <p className={styles.panelTitle}>Collected telemetry</p>
          <dl className={styles.metrics}>
            <div>
              <dt>Items answered</dt>
              <dd>{metrics.itemsAnswered}</dd>
            </div>
            <div>
              <dt>Mean response time</dt>
              <dd>{rtSeconds}s</dd>
            </div>
            <div>
              <dt>Mean first-action</dt>
              <dd>{firstActionSeconds}s</dd>
            </div>
            <div>
              <dt>Answer revisions</dt>
              <dd>{metrics.totalRevisions}</dd>
            </div>
            <div>
              <dt>Engagement</dt>
              <dd>{engagementPct == null ? '—' : `${engagementPct}%`}</dd>
            </div>
            <div>
              <dt>Hardest level reached</dt>
              <dd>{metrics.hardestLevelReached}/6</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className={styles.claimBox}>
        <strong>Prototype — synthetic, not a validated determination.</strong>
        <span>{outcome.claimBoundary}</span>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={onRestart}>
          Run another synthetic session
        </button>
        <Link className={styles.ghostLink} href="/family">
          Back to the family portal
        </Link>
      </div>
    </section>
  );
}
