'use client';

import type {
  DomainAbility,
  ExamSession,
  ItemResponse,
  ScreeningOutcome,
  ServedItem,
  TelemetryEvent,
} from '@gt-selection/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';

import { EXAM_NAME, EXAM_POLICY_VERSION } from '@/lib/exam/branding';
import { startProctoredExamAction, submitExamResponseAction } from '@/lib/exam/actions';

import styles from './ascend.module.css';

const AGE_BAND = '4-5' as const;

/** Live, telemetry-derived summary collected across the whole battery. */
export interface BatteryMetrics {
  itemsAnswered: number;
  meanRtMs: number | null;
  meanFirstActionMs: number | null;
  totalRevisions: number;
  engagementRate: number | null;
  hardestLevelReached: number;
}

export interface AscendResult {
  outcome: ScreeningOutcome;
  abilities: DomainAbility[];
  metrics: BatteryMetrics;
  policyVersion: string;
}

type Phase = 'preparing' | 'in_progress' | 'scoring';

function randomPseudonym(): string {
  return `PART-SYN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function domainLabel(domain: string): string {
  return domain.replace('_', ' ');
}

export function AscendBattery({
  onComplete,
  onError,
}: {
  onComplete: (result: AscendResult) => void;
  onError: (message: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>('preparing');
  const [session, setSession] = useState<ExamSession | null>(null);
  const [item, setItem] = useState<ServedItem | null>(null);
  const [answered, setAnswered] = useState(0);

  const sessionIdRef = useRef<string | null>(null);
  const itemRef = useRef<ServedItem | null>(null);
  const telemetryRef = useRef<TelemetryEvent[]>([]);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastInitRef = useRef<string | null>(null);
  const submittingRef = useRef(false);
  const startedRef = useRef(false);

  // Running telemetry accumulators for the results screen.
  const metricsRef = useRef({
    rts: [] as number[],
    firstActions: [] as number[],
    revisions: 0,
    engaged: 0,
    items: 0,
    hardestLevel: 0,
  });

  useEffect(() => {
    // Guard with a ref so React 18 StrictMode's dev double-invoke starts the
    // session exactly once; results are applied to the persisted instance.
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const step = await startProctoredExamAction({
          pseudonymCode: randomPseudonym(),
          ageBand: AGE_BAND,
          policyVersion: EXAM_POLICY_VERSION,
        });
        sessionIdRef.current = step.session.sessionId;
        setSession(step.session);
        itemRef.current = step.nextItem;
        setItem(step.nextItem);
        setPhase('in_progress');
      } catch (startError) {
        onError(startError instanceof Error ? startError.message : 'Failed to start the session.');
      }
    })();
  }, [onError]);

  const postInit = useCallback(() => {
    const frame = iframeRef.current;
    const current = itemRef.current;
    if (!frame?.contentWindow || !current || !sessionIdRef.current) return;
    if (lastInitRef.current === current.itemId) return;
    lastInitRef.current = current.itemId;
    frame.contentWindow.postMessage(
      { source: 'gt-exam-host', type: 'init', sessionId: sessionIdRef.current, item: current },
      '*',
    );
  }, []);

  const accumulate = useCallback((response: ItemResponse) => {
    const m = metricsRef.current;
    m.items += 1;
    m.rts.push(response.rtMs);
    if (response.firstActionMs != null) m.firstActions.push(response.firstActionMs);
    m.revisions += response.revisions;
    if (response.engaged) m.engaged += 1;
    const reach = response.measurements['M-DIFFREACH'];
    if (typeof reach === 'number' && reach > m.hardestLevel) m.hardestLevel = reach;
  }, []);

  const summarize = useCallback((): BatteryMetrics => {
    const m = metricsRef.current;
    const avg = (xs: number[]) =>
      xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
    return {
      itemsAnswered: m.items,
      meanRtMs: avg(m.rts),
      meanFirstActionMs: avg(m.firstActions),
      totalRevisions: m.revisions,
      engagementRate: m.items ? m.engaged / m.items : null,
      hardestLevelReached: m.hardestLevel,
    };
  }, []);

  const handleResponse = useCallback(
    async (response: ItemResponse) => {
      if (submittingRef.current || !sessionIdRef.current) return;
      submittingRef.current = true;
      try {
        const step = await submitExamResponseAction({
          sessionId: sessionIdRef.current,
          response,
          telemetry: telemetryRef.current,
        });
        telemetryRef.current = [];
        accumulate(response);
        setSession(step.session);
        setAnswered((count) => count + 1);
        if (step.outcome) {
          setPhase('scoring');
          itemRef.current = null;
          setItem(null);
          onComplete({
            outcome: step.outcome,
            abilities: step.session.abilities,
            metrics: summarize(),
            policyVersion: step.session.policyVersion,
          });
        } else {
          itemRef.current = step.nextItem;
          setItem(step.nextItem);
        }
      } catch (submitError) {
        onError(submitError instanceof Error ? submitError.message : 'Failed to submit a response.');
      } finally {
        submittingRef.current = false;
      }
    },
    [accumulate, onComplete, onError, summarize],
  );

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const frame = iframeRef.current;
      if (frame && event.source !== frame.contentWindow) return;
      const message = event.data as {
        source?: string;
        type?: string;
        event?: TelemetryEvent;
        response?: ItemResponse;
      };
      if (!message || message.source !== 'gt-exam-demo') return;
      if (message.type === 'ready') {
        postInit();
      } else if (message.type === 'telemetry' && message.event) {
        telemetryRef.current.push(message.event);
      } else if (message.type === 'response' && message.response) {
        void handleResponse(message.response);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [handleResponse, postInit]);

  return (
    <div className={styles.battery}>
      <header className={styles.batteryHead}>
        <div>
          <p className={styles.eyebrow}>{EXAM_NAME} adaptive assessment</p>
          <p className={styles.batterySub}>
            {phase === 'in_progress' && item
              ? `Question ${answered + 1} · ${domainLabel(item.domain)}`
              : phase === 'scoring'
                ? 'Scoring your session…'
                : 'Preparing a secure synthetic session…'}
          </p>
        </div>
        <span className={styles.protoTag}>Prototype · synthetic</span>
      </header>

      {session ? (
        <section className={styles.abilityGrid} aria-label="Live per-domain ability">
          {session.abilities.map((ability) => (
            <div
              key={ability.domain}
              className={`${styles.ability} ${ability.done ? styles.abilityDone : ''}`}
            >
              <span className={styles.abilityDomain}>{domainLabel(ability.domain)}</span>
              <span className={styles.abilityTheta}>θ {ability.theta.toFixed(2)}</span>
              <span className={styles.abilityMeta}>SE {ability.se.toFixed(2)}</span>
              <span className={styles.abilityMeta}>
                {ability.itemsAdministered} item{ability.itemsAdministered === 1 ? '' : 's'}
                {ability.done ? ' ✓' : ''}
              </span>
            </div>
          ))}
        </section>
      ) : null}

      {phase === 'in_progress' && item ? (
        <section className={styles.stage}>
          <div className={styles.itemMeta}>
            <span className={styles.itemType}>{item.typeCode}</span>
            <span>{domainLabel(item.domain)}</span>
            <span className={styles.difficulty}>difficulty {item.difficultyLevel}/6</span>
          </div>
          <iframe
            key={item.itemId}
            ref={iframeRef}
            title={`${EXAM_NAME} question renderer`}
            src={`/exam-demos/${item.demoPath}`}
            className={styles.demoFrame}
            onLoad={postInit}
          />
        </section>
      ) : (
        <section className={styles.preparing}>
          <div className={styles.spinner} aria-hidden="true" />
          <p>
            {phase === 'scoring'
              ? 'Combining per-domain ability with your engagement signals…'
              : 'Opening the adaptive engine…'}
          </p>
        </section>
      )}
    </div>
  );
}
