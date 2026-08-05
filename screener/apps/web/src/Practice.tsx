import { useCallback, useEffect, useState } from 'react';
import type { AgeBand, ItemExplanation, RenderedItem } from '@gt/contracts';
import { ContentView } from './ItemView.js';

/**
 * The practice tool.
 *
 * Kept in its own file and talking to its own routes, because the point it exists to make is
 * that a second tool can be built on the shared library without touching the screener. If this
 * file imported anything from the screener view, that point would be false.
 */

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json() as Promise<T>;
}

interface FamilySummary {
  id: string;
  version: string;
  title: string;
  domain: string;
  usage: string;
}

interface PracticeState {
  served: number;
  correct: number;
  finished: boolean;
  estimate: number;
  recentAccuracy: number | null;
  familiesSeen: number;
}

type ItemNoKey = Omit<RenderedItem, 'correctOptionId' | 'explanation'>;

export function Practice() {
  const [ageBand, setAgeBand] = useState<AgeBand>('3-5');
  const [avail, setAvail] = useState<{ practice: FamilySummary[]; screening: FamilySummary[]; inLibrary: number } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [item, setItem] = useState<ItemNoKey | null>(null);
  const [state, setState] = useState<PracticeState | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; explanation?: ItemExplanation; correctOptionId: string } | null>(null);
  const [reason, setReason] = useState<string>('');
  const [shownAt, setShownAt] = useState(Date.now());
  const [err, setErr] = useState<string | null>(null);

  const loadAvail = useCallback(() => {
    api<typeof avail>(`/practice/available?ageBand=${ageBand}`).then(setAvail).catch((e) => setErr(String(e.message ?? e)));
  }, [ageBand]);
  useEffect(loadAvail, [loadAvail]);

  const start = useCallback(async () => {
    setErr(null); setFeedback(null);
    try {
      const res = await api<{ sessionId: string; state: PracticeState }>('/practice/sessions', {
        method: 'POST', body: JSON.stringify({ ageBand }),
      });
      setSessionId(res.sessionId); setState(res.state);
      await advance(res.sessionId);
    } catch (e) { setErr(String((e as Error).message ?? e)); }
  }, [ageBand]);

  const advance = useCallback(async (id: string) => {
    const next = await api<{ done: boolean; item?: ItemNoKey; state: PracticeState; selectionReason?: string }>(
      `/practice/sessions/${id}/next`,
    );
    setState(next.state);
    setItem(next.item ?? null);
    setReason(next.selectionReason ?? '');
    setShownAt(Date.now());
  }, []);

  const answer = useCallback(async (optionId: string) => {
    if (!sessionId) return;
    try {
      const res = await api<{ correct: boolean; explanation?: ItemExplanation; correctOptionId: string; state: PracticeState }>(
        `/practice/sessions/${sessionId}/answer`,
        { method: 'POST', body: JSON.stringify({ optionId, latencyMs: Date.now() - shownAt }) },
      );
      setFeedback(res); setState(res.state);
    } catch (e) { setErr(String((e as Error).message ?? e)); }
  }, [sessionId, shownAt]);

  const next = useCallback(async () => {
    if (!sessionId) return;
    setFeedback(null);
    await advance(sessionId);
  }, [sessionId, advance]);

  return (
    <main>
      <section className="panel">
        <h2>Reasoning practice</h2>
        <p className="note">
          A second tool on the same library. It reads the same snapshot the screener reads, and it
          shares none of the screener's machinery: no threshold, no stopping rule, no decision.
          Nothing here is recorded about whether a child should apply anywhere.
        </p>
        <div className="controls">
          <label>
            Age band
            <select value={ageBand} onChange={(e) => setAgeBand(e.target.value as AgeBand)} disabled={!!sessionId && !state?.finished}>
              <option value="k-2">k-2</option>
              <option value="3-5">3-5</option>
              <option value="6-8">6-8</option>
            </select>
          </label>
          <button className="primary" onClick={start}>{sessionId && !state?.finished ? 'Restart' : 'Start practising'}</button>
        </div>
        {err && <p className="error">{err}</p>}

        {avail && (
          <>
            <p className="note strong">
              Of {avail.inLibrary} families in the library, {avail.practice.length} are marked teachable
              and reach this tool, and {avail.screening.length} reach the screener. The gap is the
              partition, and it is what stops a practice tool coaching candidates on a screener's own
              item families.
            </p>
            <table className="grid-table">
              <thead><tr><th>Family</th><th>Domain</th><th>Declared usage</th><th>Reaches practice</th><th>Reaches screener</th></tr></thead>
              <tbody>
                {[...new Map([...avail.practice, ...avail.screening].map((f) => [`${f.id}@${f.version}`, f])).values()]
                  .sort((a, b) => a.domain.localeCompare(b.domain) || a.id.localeCompare(b.id))
                  .map((f) => {
                    const inPractice = avail.practice.some((x) => x.id === f.id);
                    const inScreen = avail.screening.some((x) => x.id === f.id);
                    return (
                      <tr key={`${f.id}@${f.version}`}>
                        <td><strong>{f.title}</strong><div className="mono small">{f.id}</div></td>
                        <td>{f.domain}</td>
                        <td>{f.usage}</td>
                        <td className={inPractice ? '' : 'warn'}>{inPractice ? 'yes' : 'no'}</td>
                        <td className={inScreen ? '' : 'warn'}>{inScreen ? 'yes' : 'no'}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </>
        )}
      </section>

      {item && !feedback && (
        <section className="panel item-panel">
          <p className="prompt">{item.prompt}</p>
          <div className="stem"><ContentView content={item.stem} /></div>
          <div className="options">
            {item.options.map((o) => (
              <button key={o.id} className="option" onClick={() => answer(o.id)}>
                <ContentView content={o.content} size="sm" />
              </button>
            ))}
          </div>
          {state && <p className="internals">question {state.served + 1} &middot; {reason}</p>}
        </section>
      )}

      {feedback && (
        <section className="panel item-panel">
          <h3 style={{ color: feedback.correct ? 'var(--ok)' : 'var(--warn)' }}>
            {feedback.correct ? 'That is right' : 'Not this time'}
          </h3>
          {feedback.explanation ? (
            <div className="explanation">
              <p><strong>The rule.</strong> {feedback.explanation.rule}</p>
              <p><strong>Why this answer.</strong> {feedback.explanation.working}</p>
              {feedback.explanation.commonError && (
                <p><strong>The usual slip.</strong> {feedback.explanation.commonError}</p>
              )}
            </div>
          ) : (
            <p className="error">No explanation was written for this family, which should have stopped it being served here.</p>
          )}
          <div className="controls">
            <button className="primary" onClick={next} disabled={state?.finished}>
              {state?.finished ? 'Session complete' : 'Next question'}
            </button>
          </div>
        </section>
      )}

      {state && (
        <section className="panel">
          <h2>Progress</h2>
          <dl className="kv">
            <div><dt>Questions</dt><dd>{state.served}</dd></div>
            <div><dt>Correct</dt><dd>{state.correct}</dd></div>
            <div><dt>Last five</dt><dd>{state.recentAccuracy === null ? 'not started' : `${Math.round(state.recentAccuracy * 100)}%`}</dd></div>
            <div><dt>Families practised</dt><dd>{state.familiesSeen}</dd></div>
          </dl>
          <p className="note">
            No score, percentile or ability estimate is shown. The tool tracks one internally to
            choose the next question's difficulty, and reporting it to a learner would be claiming
            a precision that ten uncalibrated questions cannot support.
          </p>
        </section>
      )}
    </main>
  );
}
