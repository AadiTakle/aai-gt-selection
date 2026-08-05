import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AgeBand, RenderedItem, SurfaceConfig } from '@gt/contracts';
import { ContentView } from './ItemView.js';
import { Practice } from './Practice.js';

type Tab = 'screener' | 'practice' | 'library' | 'stats';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json() as Promise<T>;
}

const pct = (x: number | null | undefined) =>
  x === null || x === undefined || Number.isNaN(x) ? 'not available' : `${(x * 100).toFixed(1)}%`;

export default function App() {
  const [tab, setTab] = useState<Tab>('screener');
  return (
    <div className="app">
      <header>
        <div>
          <h1>GT screener library</h1>
          <p className="sub">
            A shared item library and adaptive engine. The screener and the practice tool are two
            consumers of it, and the library is the product.
          </p>
        </div>
        <nav>
          {(['screener', 'practice', 'library', 'stats'] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? 'tab active' : 'tab'} onClick={() => setTab(t)}>
              {t === 'screener' ? 'Screener' : t === 'practice' ? 'Practice' : t === 'library' ? 'Library studio' : 'Statistics'}
            </button>
          ))}
        </nav>
      </header>
      {tab === 'screener' && <Screener />}
      {tab === 'practice' && <Practice />}
      {tab === 'library' && <LibraryStudio />}
      {tab === 'stats' && <Stats />}
      <footer>
        Every item type here carries an assumed difficulty rather than a calibrated one, so the
        probability this tool reports is a demonstration of the mechanism and not a measurement
        of a child.
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screener
// ---------------------------------------------------------------------------

interface SessionState {
  stopped: boolean;
  stopReason: string | null;
  pAbove: number;
  decision: string | null;
  itemsServed: number;
  interval: [number, number];
}

function Screener() {
  const [surfaces, setSurfaces] = useState<SurfaceConfig[]>([]);
  const [surfaceId, setSurfaceId] = useState('web-plain');
  const [ageBand, setAgeBand] = useState<AgeBand>('3-5');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [item, setItem] = useState<Omit<RenderedItem, 'correctOptionId'> | null>(null);
  const [state, setState] = useState<SessionState | null>(null);
  const [shownAt, setShownAt] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    api<{ surfaces: SurfaceConfig[] }>('/config')
      .then((c) => setSurfaces(c.surfaces))
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setLastCorrect(null);
    try {
      const res = await api<{ sessionId: string; state: SessionState }>('/sessions', {
        method: 'POST',
        body: JSON.stringify({ ageBand, surfaceId }),
      });
      setSessionId(res.sessionId);
      setState(res.state);
      const next = await api<{ done: boolean; item?: Omit<RenderedItem, 'correctOptionId'>; state: SessionState }>(
        `/sessions/${res.sessionId}/next`,
      );
      setItem(next.item ?? null);
      setState(next.state);
      setShownAt(Date.now());
    } catch (e) {
      setError(String((e as Error).message ?? e));
    }
  }, [ageBand, surfaceId]);

  const answer = useCallback(
    async (optionId: string) => {
      if (!sessionId) return;
      try {
        const res = await api<{ state: SessionState; correct: boolean | null }>(
          `/sessions/${sessionId}/answer`,
          { method: 'POST', body: JSON.stringify({ optionId, latencyMs: Date.now() - shownAt }) },
        );
        setState(res.state);
        setLastCorrect(res.correct);
        if (res.state.stopped) {
          setItem(null);
          return;
        }
        const next = await api<{ done: boolean; item?: Omit<RenderedItem, 'correctOptionId'>; state: SessionState }>(
          `/sessions/${sessionId}/next`,
        );
        setItem(next.item ?? null);
        setState(next.state);
        setShownAt(Date.now());
      } catch (e) {
        setError(String((e as Error).message ?? e));
      }
    },
    [sessionId, shownAt],
  );

  const surface = surfaces.find((s) => s.id === surfaceId);

  return (
    <main>
      <section className="panel">
        <h2>Take the screener</h2>
        <div className="controls">
          <label>
            Age band
            <select value={ageBand} onChange={(e) => setAgeBand(e.target.value as AgeBand)} disabled={!!sessionId && !state?.stopped}>
              <option value="k-2">k-2</option>
              <option value="3-5">3-5</option>
              <option value="6-8">6-8</option>
            </select>
          </label>
          <label>
            Surface
            <select value={surfaceId} onChange={(e) => setSurfaceId(e.target.value)} disabled={!!sessionId && !state?.stopped}>
              {surfaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={reveal} onChange={(e) => setReveal(e.target.checked)} />
            Show the engine's internals
          </label>
          <button className="primary" onClick={start}>
            {sessionId && !state?.stopped ? 'Restart' : 'Start'}
          </button>
        </div>
        {surface && (
          <p className="note">
            This surface recommends applying once the engine is {Math.round(surface.recommendProbability * 100)}%
            confident the candidate is above the threshold. Surfaces carry their own thresholds
            because a game-delivered version and a plain page are different instruments.
          </p>
        )}
        {error && <p className="error">{error}</p>}
      </section>

      {item && (
        <section className="panel item-panel">
          <p className="prompt">{item.prompt}</p>
          <div className="stem">
            <ContentView content={item.stem} />
          </div>
          <div className="options">
            {item.options.map((o) => (
              <button key={o.id} className="option" onClick={() => answer(o.id)}>
                <ContentView content={o.content} size="sm" />
              </button>
            ))}
          </div>
          {reveal && state && (
            <p className="internals">
              item {state.itemsServed + 1} &middot; P(above threshold) {state.pAbove.toFixed(3)} &middot;
              90% interval [{state.interval[0].toFixed(2)}, {state.interval[1].toFixed(2)}]
              {lastCorrect !== null && <> &middot; last answer {lastCorrect ? 'correct' : 'wrong'}</>}
            </p>
          )}
        </section>
      )}

      {state?.stopped && (
        <section className="panel result">
          <h3>{state.decision === 'recommend' ? 'Worth applying to GT' : 'Here is more about GT'}</h3>
          <p>
            {state.decision === 'recommend'
              ? 'On this short screener your child looks like a fit for the kind of work GT does. The next step is an application.'
              : 'This short screener does not tell us enough to suggest an application either way. It is fifteen minutes of questions, not a verdict on your child, and families are welcome to apply regardless.'}
          </p>
          <p className="note">
            The tool has two outcomes and neither of them is a rejection. That is deliberate: it
            can only ever open a door.
          </p>
          <dl className="kv">
            <div><dt>Items asked</dt><dd>{state.itemsServed}</dd></div>
            <div><dt>Stopped because</dt><dd>{state.stopReason}</dd></div>
            {reveal && <div><dt>P(above threshold)</dt><dd>{state.pAbove.toFixed(3)}</dd></div>}
            {reveal && <div><dt>90% interval</dt><dd>[{state.interval[0].toFixed(2)}, {state.interval[1].toFixed(2)}]</dd></div>}
          </dl>
        </section>
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Library studio
// ---------------------------------------------------------------------------

interface GeneratorSummary {
  id: string;
  version: string;
  title: string;
  construct: string;
  domain: string;
  ageBands: string[];
  readingLoad: string;
  difficulty: { b: number; a: number; se: number; source: string; n: number };
  status: string;
  deprecationNote: string | null;
}

function LibraryStudio() {
  const [data, setData] = useState<{ generators: GeneratorSummary[]; snapshots: { id: string; label: string; entries: unknown[]; createdAt: string }[] } | null>(null);
  const [selected, setSelected] = useState<GeneratorSummary | null>(null);
  const [preview, setPreview] = useState<{ items: RenderedItem[]; validation: { issues: { check: string; severity: string; message: string }[]; publishable: boolean } } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    api<typeof data>('/library').then(setData).catch((e) => setMsg(String(e.message ?? e)));
  }, []);
  useEffect(load, [load]);

  const openPreview = useCallback(async (g: GeneratorSummary) => {
    setSelected(g);
    setPreview(null);
    try {
      setPreview(await api(`/library/${g.id}/${g.version}/preview?count=6`));
    } catch (e) {
      setMsg(String((e as Error).message ?? e));
    }
  }, []);

  const deprecate = useCallback(
    async (g: GeneratorSummary) => {
      setBusy(true);
      try {
        const res = await api<{ affectedLiveSnapshots: number }>(`/library/${g.id}/${g.version}/deprecate`, {
          method: 'POST',
          body: JSON.stringify({ note: 'deprecated from the studio' }),
        });
        setMsg(
          `${g.id}@${g.version} deprecated. Live snapshots affected: ${res.affectedLiveSnapshots}. It will not enter new snapshots, and every existing one still serves it.`,
        );
        load();
      } catch (e) {
        setMsg(String((e as Error).message ?? e));
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const cutSnapshot = useCallback(async () => {
    setBusy(true);
    try {
      const snap = await api<{ id: string; entries: unknown[] }>('/snapshots', {
        method: 'POST',
        body: JSON.stringify({ label: `cut from studio ${new Date().toISOString()}`, createdBy: 'studio' }),
      });
      setMsg(`Created ${snap.id} pinning ${snap.entries.length} generator versions.`);
      load();
    } catch (e) {
      setMsg(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }, [load]);

  if (!data) return <main><section className="panel"><p>Loading the library…</p>{msg && <p className="error">{msg}</p>}</section></main>;

  return (
    <main>
      <section className="panel">
        <h2>The library</h2>
        <p className="note">
          Published versions are immutable. Editing an item type means publishing a new version,
          and removing one means deprecating it, so nothing here can disturb a screener that is
          already running. A screener reads a snapshot, and a snapshot is frozen when it is cut.
        </p>
        <div className="controls">
          <button className="primary" onClick={cutSnapshot} disabled={busy}>Cut a new snapshot</button>
          <span className="note">{data.snapshots.length} snapshot(s) exist</span>
        </div>
        {msg && <p className="note strong">{msg}</p>}
        <table className="grid-table">
          <thead>
            <tr>
              <th>Item type</th><th>Domain</th><th>Ages</th><th>Reading</th>
              <th>b</th><th>a</th><th>Difficulty from</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {data.generators.map((g) => (
              <tr key={`${g.id}@${g.version}`} className={g.status === 'deprecated' ? 'deprecated' : ''}>
                <td>
                  <strong>{g.title}</strong>
                  <div className="mono small">{g.id}@{g.version}</div>
                </td>
                <td>{g.domain}</td>
                <td className="small">{g.ageBands.join(', ')}</td>
                <td className={g.readingLoad === 'high' ? 'warn' : ''}>{g.readingLoad}</td>
                <td>{g.difficulty.b.toFixed(1)}</td>
                <td>{g.difficulty.a.toFixed(1)}</td>
                <td className={g.difficulty.source === 'assumed' ? 'warn' : ''}>
                  {g.difficulty.source}{g.difficulty.n > 0 ? ` (n=${g.difficulty.n})` : ''}
                </td>
                <td>{g.status}</td>
                <td className="actions">
                  <button onClick={() => openPreview(g)}>Preview</button>
                  {g.status !== 'deprecated' && (
                    <button onClick={() => deprecate(g)} disabled={busy}>Deprecate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {selected && preview && (
        <section className="panel">
          <h2>{selected.title}</h2>
          <p className="note">{selected.construct}</p>
          <div className={preview.validation.publishable ? 'validation ok' : 'validation bad'}>
            <strong>{preview.validation.publishable ? 'Passes publish checks' : 'Would be rejected at publish'}</strong>
            {preview.validation.issues.length === 0 ? (
              <span> &middot; no issues</span>
            ) : (
              <ul>
                {preview.validation.issues.map((i, n) => (
                  <li key={n} className={i.severity}>{i.severity}: {i.check} &mdash; {i.message}</li>
                ))}
              </ul>
            )}
          </div>
          <p className="note">
            Six instances from consecutive seeds. Same seed always renders the same item, which is
            checked at publish time rather than assumed, because session replay depends on it.
          </p>
          <div className="preview-grid">
            {preview.items.map((it) => (
              <div key={it.seed} className="preview-item">
                <div className="mono small">seed {it.seed}</div>
                <p className="prompt small">{it.prompt}</p>
                <div className="stem small"><ContentView content={it.stem} size="sm" /></div>
                <div className="options small">
                  {it.options.map((o) => (
                    <span key={o.id} className={o.id === it.correctOptionId ? 'option key' : 'option'}>
                      <ContentView content={o.content} size="sm" />
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

function Stats() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api('/stats').then(setData).catch((e) => setErr(String(e.message ?? e)));
  }, []);

  const totals = useMemo(() => data?.overall, [data]);
  if (err) return <main><section className="panel"><p className="error">{err}</p></section></main>;
  if (!data) return <main><section className="panel"><p>Loading statistics…</p></section></main>;

  return (
    <main>
      <section className="panel">
        <h2>Sessions</h2>
        <p className="note">Persisted to an append-only log at <span className="mono">{data.dataDir}</span>.</p>
        <dl className="kv">
          <div><dt>Sessions</dt><dd>{totals.sessions}</dd></div>
          <div><dt>Completed</dt><dd>{totals.completed}</dd></div>
          <div><dt>Abandoned</dt><dd>{totals.abandoned}</dd></div>
          <div><dt>Median items</dt><dd>{totals.medianItems}</dd></div>
          <div><dt>Mean items</dt><dd>{totals.meanItems.toFixed(1)}</dd></div>
          <div><dt>Recommended</dt><dd>{totals.decisions.recommend}</dd></div>
          <div><dt>No recommendation</dt><dd>{totals.decisions.noRecommendation}</dd></div>
          <div><dt>Served uncalibrated items</dt><dd>{pct(totals.uncalibratedShare)}</dd></div>
        </dl>
      </section>

      <section className="panel">
        <h2>Screener effectiveness, by surface</h2>
        <p className="note">
          These stay unavailable rather than zero until a real outcome is attached to a session,
          because "we do not know yet" and "it scored zero" are different statements.
        </p>
        {data.surfaces.length === 0 ? (
          <p>No sessions yet.</p>
        ) : (
          <table className="grid-table">
            <thead>
              <tr>
                <th>Surface</th><th>Sessions</th><th>Outcomes known</th><th>Sensitivity</th>
                <th>Specificity</th><th>PPV</th><th>Youden J</th><th>Net benefit over recommend-all</th>
              </tr>
            </thead>
            <tbody>
              {data.surfaces.map((s: any) => (
                <tr key={s.surfaceId}>
                  <td>{s.label}</td>
                  <td>{s.screener.sessions}</td>
                  <td className={s.effectiveness.outcomesKnown === 0 ? 'warn' : ''}>{s.effectiveness.outcomesKnown}</td>
                  <td>{pct(s.effectiveness.sensitivity)}</td>
                  <td>{pct(s.effectiveness.specificity)}</td>
                  <td>{pct(s.effectiveness.positivePredictiveValue)}</td>
                  <td>{s.effectiveness.youdenJ === null ? 'not available' : s.effectiveness.youdenJ.toFixed(3)}</td>
                  <td>{s.effectiveness.netBenefitOverTreatAll === null ? 'not available' : s.effectiveness.netBenefitOverTreatAll.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <h2>Item types</h2>
        <p className="note">
          Keyed by version, so a change to an item type does not get pooled with the behaviour of
          the version it replaced.
        </p>
        {data.generators.length === 0 ? (
          <p>No responses yet.</p>
        ) : (
          <table className="grid-table">
            <thead>
              <tr>
                <th>Item type</th><th>Responses</th><th>Proportion correct</th>
                <th>Point-biserial</th><th>Median latency</th><th>Distinct seeds</th><th>Exposure</th>
              </tr>
            </thead>
            <tbody>
              {data.generators.map((g: any) => (
                <tr key={`${g.generatorId}@${g.generatorVersion}`}>
                  <td className="mono small">{g.generatorId}@{g.generatorVersion}</td>
                  <td>{g.responses}</td>
                  <td>{pct(g.proportionCorrect)}</td>
                  <td>{g.pointBiserial === null ? 'not available' : g.pointBiserial.toFixed(3)}</td>
                  <td>{Math.round(g.medianLatencyMs)} ms</td>
                  <td>{g.distinctSeeds}</td>
                  <td>{pct(g.exposureRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
