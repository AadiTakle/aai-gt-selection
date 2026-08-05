import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgeBand, ItemExplanation, RenderedItem } from '@gt/contracts';
import { QBANK_HOST, QBANK_THEMES, applyThemeToFrame, isQbankMessage, themeById } from '@gt/qbank';
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

/** Same call, but takes a JSON body. Keeps `api` free for the generator half's existing uses. */
async function post<T>(path: string, body: unknown): Promise<T> {
  return api<T>(path, { method: 'POST', body: JSON.stringify(body) });
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

/**
 * Practice over the real banks.
 *
 * The same renderer handshake the screener uses, and two deliberate differences. Items are aimed a
 * little above the learner's running estimate rather than at a decision threshold, and the correct
 * key is revealed after each attempt. A screener may never do the second thing, which is why the two
 * talk to different endpoints rather than sharing one with a flag.
 */
function BankPractice() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [serve, setServe] = useState<{ served: { itemId: string; typeCode: string }; typeCode: string; domain: string; difficulty: number } | null>(null);
  const [state, setState] = useState<{ itemsServed: number; stopped: boolean; estimate: number } | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean | null; correctKey: string | null; difficulty: number | null } | null>(null);
  const [frameReady, setFrameReady] = useState(false);
  const [themeId, setThemeId] = useState('institutional');
  const [err, setErr] = useState<string | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const shownAt = useRef(Date.now());
  const live = useRef<{ id: string | null; itemId: string | null }>({ id: null, itemId: null });

  useEffect(() => { live.current = { id: sessionId, itemId: serve?.served.itemId ?? null }; }, [sessionId, serve]);

  const loadNext = useCallback(async (id: string) => {
    const next = await api<{ done: boolean; state: typeof state } & Record<string, never>>(`/bank/practice/${id}/next`);
    setState(next.state as never);
    if (next.done || !(next as Record<string, unknown>).served) { setServe(null); return; }
    setFrameReady(false);
    setServe(next as never);
    shownAt.current = Date.now();
  }, []);

  const start = useCallback(async () => {
    setErr(null); setFeedback(null);
    try {
      const res = await post<{ sessionId: string; state: typeof state }>('/bank/practice', { precisionIndex: 3 });
      setSessionId(res.sessionId); setState(res.state as never);
      await loadNext(res.sessionId);
    } catch (e) { setErr(String((e as Error).message ?? e)); }
  }, [loadNext]);

  useEffect(() => {
    if (!frameReady || !serve) return;
    const win = frameRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ source: QBANK_HOST, type: 'init', item: serve.served }, '*');
    win.postMessage({ source: QBANK_HOST, type: 'start', tutorial: false }, '*');
    applyThemeToFrame(frameRef.current, themeById(themeId).vars);
  }, [frameReady, serve, themeId]);

  useEffect(() => {
    const onMessage = async (ev: MessageEvent) => {
      if (!isQbankMessage(ev.data)) return;
      if (ev.data.type === 'ready') { setFrameReady(true); return; }
      if (ev.data.type !== 'result') return;
      const { id, itemId } = live.current;
      if (!id) return;
      try {
        const out = await post<{ correct: boolean | null; correctKey: string | null; difficulty: number | null; state: typeof state }>(
          `/bank/practice/${id}/answer`,
          { response: (ev.data.result ?? {}).response, itemId, latencyMs: Date.now() - shownAt.current },
        );
        setFeedback({ correct: out.correct, correctKey: out.correctKey, difficulty: out.difficulty });
        setState(out.state as never);
      } catch (e) { setErr(String((e as Error).message ?? e)); }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const next = useCallback(async () => {
    if (!sessionId) return;
    setFeedback(null);
    await loadNext(sessionId);
  }, [sessionId, loadNext]);

  return (
    <>
      <section className="panel">
        <h2>Practice on the real banks</h2>
        <p className="note">
          Same renderers as the screener and the same marking on the server. Two differences on
          purpose: items are aimed a little above where the learner currently is rather than at a
          decision threshold, and the correct answer is shown afterwards. A screener may never do the
          second, which is why this talks to its own endpoint.
        </p>
        <div className="controls">
          <label>
            Theme
            <select value={themeId} onChange={(e) => setThemeId(e.target.value)}>
              {QBANK_THEMES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <button className="primary" onClick={start}>{sessionId && !state?.stopped ? 'Restart' : 'Start practising'}</button>
        </div>
        {err && <p className="error">{err}</p>}
      </section>

      {serve && !feedback && (
        <section className="panel">
          <div className="frame-head">
            <div>
              <strong>{serve.typeCode}</strong>
              <div className="mono small">{serve.domain} · bank difficulty {serve.difficulty.toFixed(2)}</div>
            </div>
            <div className="frame-flags">
              <span className="flag">question {(state?.itemsServed ?? 0) + 1}</span>
              <span className={frameReady ? 'flag on' : 'flag'}>{frameReady ? 'item handed over' : 'loading renderer'}</span>
            </div>
          </div>
          <iframe
            ref={frameRef} key={`${serve.typeCode}-${serve.served.itemId}`}
            src={`/qbank/items/${serve.typeCode}.html`} title={serve.typeCode}
            onLoad={() => applyThemeToFrame(frameRef.current, themeById(themeId).vars)}
            className="qbank-frame"
          />
        </section>
      )}

      {feedback && (
        <section className="panel item-panel">
          <h3 style={{ color: feedback.correct ? 'var(--ok)' : 'var(--warn)' }}>
            {feedback.correct === null ? 'That answer could not be marked' : feedback.correct ? 'That is right' : 'Not this time'}
          </h3>
          <div className="explanation">
            {feedback.correctKey ? (
              <p><strong>The answer was {feedback.correctKey}.</strong> These hand-built items carry a key but no written
              explanation, so a practice tool can say what was right and not yet why. The generator families can do both,
              which is the case for writing explanations into new content rather than retrofitting them here.</p>
            ) : (
              <p>No key was available for this item, so it is excluded from the estimate rather than guessed at.</p>
            )}
          </div>
          <div className="controls">
            <button className="primary" onClick={next} disabled={state?.stopped}>
              {state?.stopped ? 'Session complete' : 'Next question'}
            </button>
          </div>
        </section>
      )}
    </>
  );
}

export function Practice() {
  const [source, setSource] = useState<'bank' | 'generated'>('bank');
  return (
    <main>
      <section className="panel">
        <h2>Reasoning practice</h2>
        <div className="controls">
          <label>
            Item source
            <select value={source} onChange={(e) => setSource(e.target.value as 'bank' | 'generated')}>
              <option value="bank">Question bank, thousands of hand-built items</option>
              <option value="generated">Generators, with written explanations</option>
            </select>
          </label>
        </div>
        <p className="note">
          {source === 'bank'
            ? 'The hand-built banks. Far more breadth, and a key without a written explanation.'
            : 'The generator families. Fewer types, and each one explains its own answer because the generator knows the rule it built the item from.'}
        </p>
      </section>
      {source === 'bank' ? <BankPractice /> : <GeneratedPractice />}
    </main>
  );
}

function GeneratedPractice() {
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
    <>
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
    </>
  );
}
