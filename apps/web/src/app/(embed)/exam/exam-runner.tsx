'use client';

import type {
  ExamSession,
  ItemResponse,
  ScreeningOutcome,
  ServedItem,
  TelemetryEvent,
} from '@gt-selection/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createExamParticipantAction,
  startExamSessionAction,
  submitExamResponseAction,
} from '@/lib/exam/actions';

type Phase = 'starting' | 'in_progress' | 'complete' | 'error';

const DEMO_SRC = '/exam-demos/generic.html';

function randomPseudonym(): string {
  return `PART-SYN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function fmt(value: number | null): string {
  return value == null ? '—' : value.toFixed(2);
}

const decisionColor: Record<string, string> = {
  admit: '#15803d',
  defer: '#b45309',
  retry: '#b91c1c',
};

export function ExamRunner({ policyVersion }: { policyVersion: string }) {
  const [phase, setPhase] = useState<Phase>('starting');
  const [session, setSession] = useState<ExamSession | null>(null);
  const [item, setItem] = useState<ServedItem | null>(null);
  const [outcome, setOutcome] = useState<ScreeningOutcome | null>(null);
  const [answered, setAnswered] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  const itemRef = useRef<ServedItem | null>(null);
  const telemetryRef = useRef<TelemetryEvent[]>([]);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastInitRef = useRef<string | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const participant = await createExamParticipantAction({
          pseudonymCode: randomPseudonym(),
          ageBand: '4-5',
        });
        const step = await startExamSessionAction({
          participantId: participant.participantId,
          policyVersion,
        });
        if (cancelled) return;
        sessionIdRef.current = step.session.sessionId;
        setSession(step.session);
        itemRef.current = step.nextItem;
        setItem(step.nextItem);
        setPhase(step.nextItem ? 'in_progress' : 'complete');
      } catch (startError) {
        if (!cancelled) {
          setError(startError instanceof Error ? startError.message : 'Failed to start session.');
          setPhase('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [policyVersion]);

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

  const handleResponse = useCallback(async (response: ItemResponse) => {
    if (submittingRef.current || !sessionIdRef.current) return;
    submittingRef.current = true;
    try {
      const step = await submitExamResponseAction({
        sessionId: sessionIdRef.current,
        response,
        telemetry: telemetryRef.current,
      });
      telemetryRef.current = [];
      setSession(step.session);
      setAnswered((count) => count + 1);
      if (step.outcome) {
        setOutcome(step.outcome);
        itemRef.current = null;
        setItem(null);
        setPhase('complete');
      } else {
        itemRef.current = step.nextItem;
        setItem(step.nextItem);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to submit response.');
      setPhase('error');
    } finally {
      submittingRef.current = false;
    }
  }, []);

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
    <main className="exam-shell">
      <style>{STYLES}</style>
      <header className="exam-head">
        <div>
          <h1>Adaptive Screening</h1>
          <p className="sub">
            Synthetic prototype · policy <code>{policyVersion}</code> · items answered: {answered}
          </p>
        </div>
        <span className="badge">born-synthetic · validated=false</span>
      </header>

      {session ? (
        <section className="ability-grid" aria-label="Per-domain ability">
          {session.abilities.map((ability) => (
            <div key={ability.domain} className={`ability ${ability.done ? 'done' : ''}`}>
              <span className="dom">{ability.domain.replace('_', ' ')}</span>
              <span className="theta">θ {fmt(ability.theta)}</span>
              <span className="se">SE {fmt(ability.se)}</span>
              <span className="n">{ability.itemsAdministered} items{ability.done ? ' ✓' : ''}</span>
            </div>
          ))}
        </section>
      ) : null}

      {phase === 'starting' ? <p className="notice">Preparing adaptive session…</p> : null}
      {phase === 'error' ? <p className="notice error">{error}</p> : null}

      {phase === 'in_progress' && item ? (
        <section className="stage">
          <div className="item-meta">
            Serving <strong>{item.typeCode}</strong> · {item.domain.replace('_', ' ')} · difficulty{' '}
            {item.difficultyLevel}
          </div>
          <iframe
            key={item.itemId}
            ref={iframeRef}
            title="Question renderer"
            src={DEMO_SRC}
            className="demo-frame"
            onLoad={postInit}
          />
        </section>
      ) : null}

      {phase === 'complete' && outcome ? (
        <section className="results">
          <div className="decision" style={{ background: decisionColor[outcome.decision] ?? '#334155' }}>
            {outcome.decision.toUpperCase()}
          </div>
          <div className="summary">
            <div>
              Timeback-fit index <strong>{fmt(outcome.fitIndex)}</strong>
            </div>
            <div>
              Composite θ <strong>{fmt(outcome.compositeTheta)}</strong>
            </div>
            <div>Engagement valid: {outcome.engagementValid ? 'yes' : 'no (provisional)'}</div>
          </div>
          <table className="scores">
            <thead>
              <tr>
                <th>Domain</th>
                <th>θ</th>
                <th>%ile</th>
                <th>Items</th>
                <th>Max diff.</th>
                <th>Learning rate</th>
                <th>Consistency</th>
              </tr>
            </thead>
            <tbody>
              {outcome.domainScores.map((score) => (
                <tr key={score.domain}>
                  <td>{score.domain.replace('_', ' ')}</td>
                  <td>{fmt(score.theta)}</td>
                  <td>{score.percentile == null ? '—' : Math.round(score.percentile)}</td>
                  <td>{score.itemsAdministered}</td>
                  <td>{score.maxDifficultyReached}</td>
                  <td>{fmt(score.learningRate)}</td>
                  <td>{fmt(score.consistency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="claim">{outcome.claimBoundary}</p>
        </section>
      ) : null}
    </main>
  );
}

const STYLES = `
.exam-shell { max-width: 60rem; margin: 1.5rem auto; padding: 0 1.5rem; font-family: system-ui, sans-serif; color: #0f172a; }
.exam-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.exam-head h1 { font-size: 1.4rem; margin: 0; }
.exam-head .sub { color: #64748b; margin: 0.25rem 0 0; font-size: 0.85rem; }
.badge { background: #eef2ff; color: #4338ca; border-radius: 999px; padding: 0.25rem 0.7rem; font-size: 0.72rem; white-space: nowrap; }
.ability-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.6rem; margin: 1rem 0; }
.ability { border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.6rem; display: flex; flex-direction: column; gap: 0.15rem; font-size: 0.8rem; }
.ability.done { border-color: #86efac; background: #f0fdf4; }
.ability .dom { font-weight: 600; text-transform: capitalize; }
.ability .theta { color: #4f46e5; }
.ability .se, .ability .n { color: #64748b; }
.notice { padding: 1rem; color: #475569; }
.notice.error { color: #b91c1c; }
.stage .item-meta { font-size: 0.8rem; color: #64748b; margin-bottom: 0.4rem; text-transform: capitalize; }
.demo-frame { width: 100%; height: 30rem; border: 1px solid #e2e8f0; border-radius: 12px; background: white; }
.results .decision { display: inline-block; color: white; font-weight: 700; letter-spacing: 0.05em; padding: 0.5rem 1.25rem; border-radius: 10px; }
.results .summary { display: flex; gap: 1.5rem; margin: 1rem 0; flex-wrap: wrap; color: #334155; }
.scores { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.scores th, .scores td { border-bottom: 1px solid #e2e8f0; padding: 0.4rem 0.5rem; text-align: left; text-transform: capitalize; }
.scores th { color: #64748b; font-weight: 600; }
.claim { margin-top: 1rem; font-size: 0.8rem; color: #64748b; border-left: 3px solid #cbd5e1; padding-left: 0.75rem; }
`;
