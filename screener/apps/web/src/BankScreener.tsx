import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QBANK_HOST, QBANK_THEMES, applyThemeToFrame, isQbankMessage, themeById } from '@gt/qbank';
import { DESIGNS, ThemedQuestion, designById, loadDesign, planFor, saveDesign, useKit } from '@gt/question-ui';

/**
 * The screener, running on the real item banks.
 *
 * The loop this implements is the one the catalogue items were built for and nothing had used:
 *
 *   1. the host picks a bank item by information at the decision threshold
 *   2. the host strips the answer and posts the rest to the frame as `{type:'init', item}`
 *   3. the frame renders it and the child answers
 *   4. the frame posts a `result` carrying the response and its metrics, never a correctness flag
 *   5. the host marks the response against the key it kept, and updates the posterior
 *
 * The key never reaches the browser, which is why scoring is a round trip rather than local.
 *
 * THE UI DESIGN PICKER changes step 3 and nothing else. The default design hands the item to the
 * catalogue's own prebuilt renderer in an iframe; the themed designs draw it in-page from a kit. Both
 * report a response the same way and both are marked by the same server round trip, so switching design
 * cannot change what a child's answer is worth — which is the property that makes it safe to offer as a
 * choice rather than a rebuild.
 */

interface PrecisionStep {
  label: string;
  confidenceAbove: number;
  confidenceBelow: number;
  minItems: number;
  maxItems: number;
  note: string;
}

interface BankSummary {
  typeCount: number;
  scorable: number;
  total: number;
  precisionSteps: PrecisionStep[];
  difficultyMapping: { midpoint: number; divisor: number; note: string };
}

interface Serve {
  served: { itemId: string; typeCode: string; difficulty: number; content: Record<string, unknown> };
  typeCode: string;
  domain: string;
  difficulty: number;
  informationAtThreshold: number;
  selectionReason: string;
}

interface State {
  stopped: boolean;
  stopReason: string | null;
  pAbove: number;
  decision: string | null;
  itemsServed: number;
  unscorable: number;
  estimate: number;
  interval: [number, number];
  perDomain: Record<string, number>;
}

async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? res.statusText);
  return data as T;
}

export function BankScreener({ onDebug }: { onDebug: (d: unknown) => void }) {
  const [summary, setSummary] = useState<BankSummary | null>(null);
  const [precisionIndex, setPrecisionIndex] = useState(2);
  const [themeId, setThemeId] = useState('institutional');
  const [design, setDesign] = useState<string>(() => loadDesign());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [serve, setServe] = useState<Serve | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [frameReady, setFrameReady] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const shownAt = useRef(Date.now());
  // Held in a ref as well as state, because the message handler is registered once and would
  // otherwise close over a stale session id.
  const live = useRef<{ sessionId: string | null; serve: Serve | null }>({ sessionId: null, serve: null });

  useEffect(() => { live.current = { sessionId, serve }; }, [sessionId, serve]);

  useEffect(() => { api<BankSummary>('/bank').then(setSummary).catch((e) => setErr(String(e.message ?? e))); }, []);

  const precision = summary?.precisionSteps[precisionIndex];

  const pushDebug = useCallback(async (id: string) => {
    try { onDebug(await api(`/bank/sessions/${id}/debug`)); } catch { /* tray simply stays stale */ }
  }, [onDebug]);

  const loadNext = useCallback(async (id: string) => {
    const next = await api<{ done: boolean; state: State } & Partial<Serve>>(`/bank/sessions/${id}/next`);
    setState(next.state);
    if (next.done || !next.served) { setServe(null); await pushDebug(id); return; }
    setFrameReady(false);
    setServe(next as Serve);
    shownAt.current = Date.now();
    await pushDebug(id);
  }, [pushDebug]);

  const start = useCallback(async () => {
    setErr(null); setLastCorrect(null);
    try {
      const res = await api<{ sessionId: string; state: State }>('/bank/sessions', { precisionIndex, seed: Math.floor(Math.random() * 1e6) });
      setSessionId(res.sessionId); setState(res.state);
      await loadNext(res.sessionId);
    } catch (e) { setErr(String((e as Error).message ?? e)); }
  }, [precisionIndex, loadNext]);

  // Hand the item to the frame once it says it is ready, then let it run.
  useEffect(() => {
    if (!frameReady || !serve) return;
    const win = frameRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ source: QBANK_HOST, type: 'init', item: serve.served }, '*');
    win.postMessage({ source: QBANK_HOST, type: 'start', tutorial: false }, '*');
    applyThemeToFrame(frameRef.current, themeById(themeId).vars);
  }, [frameReady, serve, themeId]);

  /**
   * Send a response and advance. Shared by both render paths on purpose: the marking, the latency and
   * the posterior update must not depend on which design drew the question.
   */
  const submit = useCallback(async (response: unknown) => {
    const { sessionId: id } = live.current;
    if (!id) return;
    try {
      const out = await api<{ state: State; correct: boolean | null }>(
        `/bank/sessions/${id}/answer`,
        { response, latencyMs: Date.now() - shownAt.current },
      );
      setState(out.state); setLastCorrect(out.correct);
      if (!out.state.stopped) await loadNext(id);
      else { setServe(null); await pushDebug(id); }
    } catch (e) { setErr(String((e as Error).message ?? e)); }
  }, [loadNext, pushDebug]);

  useEffect(() => {
    const onMessage = async (ev: MessageEvent) => {
      if (!isQbankMessage(ev.data)) return;
      if (ev.data.type === 'ready') { setFrameReady(true); return; }
      if (ev.data.type !== 'result') return;
      const { sessionId: id } = live.current;
      if (!id) return;
      await submit((ev.data.result ?? {}).response);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [submit]);

  const frameSrc = serve ? `/qbank/items/${serve.typeCode}.html` : null;

  /**
   * Can the chosen kit actually draw this item?
   *
   * Asked here rather than inside the renderer because the answer decides which path renders at all. A
   * themed design that cannot dress a type must not strand the child on an unanswerable screen, and it
   * must not cause the item to be skipped either — skipping would narrow the pool and quietly change
   * what the session measures. So the catalogue's own renderer is the fallback, every time.
   */
  const kitId = designById(design).kit ?? '';
  const activeKit = useKit(kitId);
  const kitPlan = useMemo(() => {
    if (!serve || designById(design).kind === 'archive' || !activeKit.kit) return null;
    return planFor({
      item: serve.served,
      kit: activeKit.kit,
      seed: serve.served.itemId.length + Math.round(serve.difficulty * 10),
    });
  }, [serve, design, activeKit.kit]);
  const drawnByKit = kitPlan?.ok === true;
  const kitRefusal = kitPlan && !kitPlan.ok ? kitPlan.why : null;

  const lengthHint = useMemo(() => {
    if (!precision) return '';
    return `${precision.minItems} to ${precision.maxItems} questions, stopping once the engine is ${Math.round(precision.confidenceAbove * 100)}% sure a candidate is above the line or ${Math.round(precision.confidenceBelow * 100)}% sure they are below it.`;
  }, [precision]);

  return (
    <>
      <section className="panel">
        <h2>Adaptive session on the real item banks</h2>
        {summary ? (
          <p className="note">
            Drawing on {summary.scorable.toLocaleString()} markable items of {summary.total.toLocaleString()} across{' '}
            {summary.typeCount} types. The engine picks by difficulty, the frame renders what it is handed, and the answer
            key stays on the server, so every mark is a round trip rather than a check in the browser.
          </p>
        ) : (
          <p className="note">Loading the banks…</p>
        )}
        {err && <p className="error">{err}</p>}

        <div className="controls">
          <label className="slider-label">
            Test length and confidence
            <input
              type="range" min={0} max={(summary?.precisionSteps.length ?? 5) - 1} step={1}
              value={precisionIndex}
              onChange={(e) => setPrecisionIndex(Number(e.target.value))}
              disabled={!!sessionId && !state?.stopped}
            />
            <span className="slider-value">{precision?.label ?? '—'}</span>
          </label>
          <label>
            UI design
            <select
              value={design}
              onChange={(e) => { setDesign(e.target.value); saveDesign(e.target.value); }}
            >
              {DESIGNS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </label>
          <label>
            Theme
            <select
              value={themeId}
              onChange={(e) => setThemeId(e.target.value)}
              disabled={designById(design).kind !== 'archive'}
              title={designById(design).kind === 'archive' ? undefined : 'Theme recolours the catalogue renderer, which the themed designs do not use.'}
            >
              {QBANK_THEMES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <button className="primary" onClick={start}>
            {sessionId && !state?.stopped ? 'Restart' : 'Start session'}
          </button>
        </div>

        {precision && (
          <>
            <p className="note strong">{lengthHint}</p>
            <p className="note">{precision.note}</p>
            <p className="note">
              Length is an outcome of the confidence you ask for rather than a number you set
              independently, which is why this one slider moves both. Asking for more certainty buys
              more questions, and at a demanding threshold the extra questions go almost entirely into
              being able to say yes rather than no.
            </p>
          </>
        )}
      </section>

      {serve && frameSrc && (
        <section className="panel">
          <div className="frame-head">
            <div>
              <strong>{serve.typeCode}</strong>
              <div className="mono small">
                {serve.domain} · bank difficulty {serve.difficulty.toFixed(2)} · information {serve.informationAtThreshold.toFixed(3)}
              </div>
            </div>
            <div className="frame-flags">
              <span className="flag">question {(state?.itemsServed ?? 0) + 1}</span>
              <span className={frameReady ? 'flag on' : 'flag'}>{frameReady ? 'item handed over' : 'loading renderer'}</span>
              {lastCorrect !== null && (
                <span className={lastCorrect ? 'flag on' : 'flag warn'}>last {lastCorrect ? 'correct' : 'wrong'}</span>
              )}
            </div>
          </div>
          {drawnByKit ? (
            <KitQuestion
              design={design}
              serve={serve}
              onAnswer={(index, key) => void submit({ selectedKey: key, selectedIndex: index })}
            />
          ) : (
            <>
              {designById(design).kind !== 'archive' && (
                <p className="note">
                  This question is drawn by the catalogue instead. {kitRefusal ?? 'The kit cannot dress this type.'}{' '}
                  A session never stops on a design choice, so the item is shown the way it was built rather than
                  skipped — skipping it would quietly narrow what the session measures.
                </p>
              )}
              <iframe
                ref={frameRef}
                key={serve.typeCode}
                src={frameSrc}
                title={serve.typeCode}
                onLoad={() => applyThemeToFrame(frameRef.current, themeById(themeId).vars)}
                className="qbank-frame"
              />
            </>
          )}
        </section>
      )}

      {state?.stopped && (
        <section className="panel result">
          <h3>{state.decision === 'recommend' ? 'Worth applying to GT' : 'Here is more about GT'}</h3>
          <p>
            {state.decision === 'recommend'
              ? 'On this short session your child looks like a fit for the kind of work GT does. The next step is an application.'
              : 'This session does not tell us enough to suggest an application either way. It is a short set of puzzles, not a verdict on your child, and families are welcome to apply regardless.'}
          </p>
          <dl className="kv">
            <div><dt>Questions asked</dt><dd>{state.itemsServed}</dd></div>
            <div><dt>Stopped because</dt><dd>{state.stopReason}</dd></div>
            {state.unscorable > 0 && (
              <div><dt>Could not be marked</dt><dd className="warn">{state.unscorable}</dd></div>
            )}
          </dl>
          {state.unscorable > 0 && (
            <p className="note">
              Some responses came back in a shape this host could not interpret. Those are counted and
              excluded from the estimate rather than guessed at, because inventing evidence is worse
              than having less of it. The types involved are in the debug tray.
            </p>
          )}
        </section>
      )}
    </>
  );
}

/**
 * A served item drawn in-page from a kit instead of handed to the catalogue's iframe.
 *
 * The seed is derived from the item id so the same question comes back looking the same on a re-render,
 * and differently for the next question. A kit that fails to load says so rather than falling back to
 * the iframe silently, because a design picker that quietly ignores you is worse than one that errors.
 */
function KitQuestion({
  design,
  serve,
  onAnswer,
}: {
  design: string;
  serve: Serve;
  onAnswer: (index: number, key: string) => void;
}) {
  const kitId = designById(design).kit ?? '';
  const { kit, sprite, error } = useKit(kitId);
  const seed = useMemo(
    () => serve.served.itemId.length + Math.round(serve.difficulty * 10),
    [serve.served.itemId, serve.difficulty],
  );

  if (error) return <p className="error">Could not load the {kitId} kit: {error}</p>;
  if (!kit) return <p className="note">Loading the {kitId} kit…</p>;

  return (
    <div className="kit-question">
      <ThemedQuestion item={serve.served} kit={kit} sprite={sprite} seed={seed} onAnswer={onAnswer} />
    </div>
  );
}
