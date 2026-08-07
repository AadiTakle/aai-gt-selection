import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DemoPanel } from './DemoPanel';
import { DifficultyPanel } from './DifficultyPanel';
import { loadDesign, saveDesign } from '@gt/question-ui';
import { exportReview, hasComments, importReview, loadStore, saveStore } from './store';
import { CATS, type BankItem, type ReviewType, type Store } from './types';

/**
 * The GT Question-Type Review harness.
 *
 * A faithful port of `archive/research/exam-question-types/review.html`, with one addition: a UI-design
 * selector in the demo panel. Everything else — the sidebar, the filters, the difficulty explorer, the
 * five comment categories, the export format, even the localStorage key — is deliberately unchanged, so
 * that a reviewer's muscle memory and their existing saved comments both still work.
 *
 * The port is React rather than the original's direct DOM writes purely because the themed designs need
 * to share the resolver code, which is TypeScript. The markup and stylesheet are the original's.
 */

export default function App() {
  const [data, setData] = useState<ReviewType[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [banks, setBanks] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [fDomain, setFDomain] = useState('');
  const [fStage, setFStage] = useState('');
  const [fUnrev, setFUnrev] = useState(false);

  const [store, setStore] = useState<Store>(() => loadStore());
  const [storeTick, setStoreTick] = useState(0);
  const bumpStore = useCallback(() => setStoreTick((t) => t + 1), []);

  const [design, setDesign] = useState<string>(() => loadDesign());
  const [served, setServed] = useState<BankItem | undefined>(undefined);
  const [tutorial, setTutorial] = useState(false);
  const [answered, setAnswered] = useState(false);

  const importInput = useRef<HTMLInputElement | null>(null);
  const [noteFor, setNoteFor] = useState<string>('');
  const noteTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    fetch('/api/review-data')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${String(r.status)}`);
        return r.json() as Promise<ReviewType[]>;
      })
      .then((d) => {
        setData(d);
        if (d.length > 0) setActiveId(d[0]!.type_id);
      })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : String(e)));

    fetch('/api/banks')
      .then((r) => r.json() as Promise<{ banks: string[] }>)
      .then((b) => setBanks(new Set(b.banks)))
      .catch(() => setBanks(new Set()));
  }, []);

  const domains = useMemo(() => [...new Set((data ?? []).map((d) => d.domain))].sort(), [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((d) => {
      if (fDomain && d.domain !== fDomain) return false;
      if (fStage && d.stage !== fStage) return false;
      if (fUnrev && hasComments(store, d.type_id)) return false;
      if (q && !(d.type_id.toLowerCase().includes(q) || d.name.toLowerCase().includes(q))) return false;
      return true;
    });
    // storeTick is a dependency in spirit: comment edits change what "unreviewed" means.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, search, fDomain, fStage, fUnrev, store, storeTick]);

  const active = useMemo(() => (data ?? []).find((d) => d.type_id === activeId), [data, activeId]);

  const reviewedCount = useMemo(
    () => (data ?? []).filter((d) => hasComments(store, d.type_id)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, store, storeTick],
  );

  // Reset the per-item state whenever the reviewer moves to another type.
  useEffect(() => {
    setServed(undefined);
    setAnswered(false);
  }, [activeId]);

  const onServe = useCallback((item: BankItem, tut: boolean) => {
    setServed(item);
    setTutorial(tut);
    setAnswered(false);
  }, []);

  const onComment = useCallback(
    (cat: string, value: string) => {
      if (!activeId) return;
      const c = store[activeId] ?? (store[activeId] = {});
      c[cat] = value;
      saveStore(store);
      bumpStore();
      setNoteFor(cat);
      window.clearTimeout(noteTimer.current);
      noteTimer.current = window.setTimeout(() => setNoteFor(''), 900);
    },
    [activeId, store, bumpStore],
  );

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    meta: true,
    diff: true,
    risks: true,
    metrics: false,
  });
  const toggle = (k: string) => setCollapsed((c) => ({ ...c, [k]: !c[k] }));

  return (
    <>
      <header className="topbar">
        <h1>GT Question-Type Review</h1>
        <span className="prog" id="prog">
          {reviewedCount} / {data?.length ?? 0} reviewed
        </span>
        <span className="spacer" />
        <button
          className="ghost"
          title="Load a previously exported review JSON"
          onClick={() => importInput.current?.click()}
        >
          Import
        </button>
        <input
          type="file"
          ref={importInput}
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              importReview(f, (merged) => {
                setStore(merged);
                bumpStore();
                alert('Imported review comments.');
              });
            }
          }}
        />
        <button title="Download your comments as Markdown + JSON" onClick={() => exportReview(data ?? [], store)}>
          Export
        </button>
      </header>

      <div className="layout">
        <aside>
          <div className="filters">
            <input
              type="search"
              placeholder="Search name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="row">
              <select value={fDomain} onChange={(e) => setFDomain(e.target.value)}>
                <option value="">All domains</option>
                {domains.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select value={fStage} onChange={(e) => setFStage(e.target.value)}>
                <option value="">All stages</option>
                <option value="S1">Stage 1 (standing)</option>
                <option value="DUAL">Dual</option>
                <option value="S2">Stage 2 (learning-rate)</option>
              </select>
            </div>
            <label className="chk">
              <input type="checkbox" checked={fUnrev} onChange={(e) => setFUnrev(e.target.checked)} /> only unreviewed
            </label>
          </div>
          <ul className="types">
            {filtered.length === 0 ? (
              <li className="type">
                <span className="nm">
                  <b>No types match</b>
                </span>
              </li>
            ) : (
              filtered.map((d) => (
                <li
                  key={d.type_id}
                  className={`type ${d.type_id === activeId ? 'active' : ''}`}
                  data-id={d.type_id}
                  onClick={() => setActiveId(d.type_id)}
                >
                  <span className={`dot ${hasComments(store, d.type_id) ? 'done' : ''}`} />
                  <span className="nm">
                    <b>{d.name}</b>
                    <span>
                      {d.type_id} · {d.domain}
                      {banks.size > 0 && !banks.has(d.type_id) ? ' · no bank' : ''}
                    </span>
                  </span>
                  <span className={`badge b-${d.stage}`}>{d.stage}</span>
                </li>
              ))
            )}
          </ul>
        </aside>

        <main>
          {loadError ? (
            <div className="empty">
              Could not load <code>review-data.json</code>.
              <br />
              <small>{loadError}</small>
            </div>
          ) : !data ? (
            <div className="empty">Loading types…</div>
          ) : !active ? (
            <div className="empty">No types in review-data.json</div>
          ) : (
            <>
              <div className="head">
                <h2>
                  {active.name} <span className={`badge b-${active.stage}`}>{active.stage}</span>
                </h2>
                <div className="meta">
                  <code>{active.type_id}</code> · domain: <b>{active.domain}</b> · adaptivity: {active.works_well} ·
                  grades: {(active.age_bands ?? []).join(', ') || '—'}
                </div>
              </div>
              <div className="grid">
                <div>
                  <DemoPanel
                    type={active}
                    item={served}
                    tutorial={tutorial}
                    design={design}
                    onDesignChange={(id) => {
                      setDesign(id);
                      saveDesign(id);
                      setAnswered(false);
                    }}
                    onAnswered={() => setAnswered(true)}
                  />
                  <DifficultyPanel
                    key={active.type_id}
                    type={active}
                    store={store}
                    onStoreChange={bumpStore}
                    onServe={onServe}
                    answered={answered}
                  />
                  <section className={`card ${collapsed['metrics'] ? 'collapsed' : ''}`}>
                    <h3 onClick={() => toggle('metrics')}>
                      Metrics tracked &amp; how they are calculated
                      <span className="tw">{collapsed['metrics'] ? 'show' : 'hide'}</span>
                    </h3>
                    <div className="body">
                      {active.metrics && active.metrics.length > 0 ? (
                        <table className="metrics">
                          <thead>
                            <tr>
                              <th>Metric</th>
                              <th>What</th>
                              <th>How it is collected</th>
                            </tr>
                          </thead>
                          <tbody>
                            {active.metrics.map((m) => (
                              <tr key={m.id}>
                                <td>
                                  <code>{m.id}</code>
                                  <br />
                                  {m.name}
                                </td>
                                <td>{m.what}</td>
                                <td>{m.how_to_collect}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="kv">No metrics declared.</div>
                      )}
                      {active.tail_precision_rationale ? (
                        <p className="kv" style={{ marginTop: 8 }}>
                          <b>Why these separate the tail:</b> {active.tail_precision_rationale}
                        </p>
                      ) : null}
                    </div>
                  </section>
                </div>

                <div>
                  <div className="comments">
                    <h3>Your review comments</h3>
                    {CATS.map((cat) => (
                      <div className="field" key={cat.key}>
                        <label>
                          {cat.label} <span className="hint">— {cat.hint}</span>
                        </label>
                        <textarea
                          placeholder="Comments…"
                          value={String(store[active.type_id]?.[cat.key] ?? '')}
                          onChange={(e) => onComment(cat.key, e.target.value)}
                        />
                        <div className="savenote">{noteFor === cat.key ? 'saved' : ''}</div>
                      </div>
                    ))}
                    <div className="disc">
                      Comments auto-save to this browser. Use <b>Export</b> to hand them back. Born-synthetic review of
                      an unapproved, pluggable design.
                    </div>
                  </div>

                  <section className={`card ${collapsed['meta'] ? 'collapsed' : ''}`}>
                    <h3 onClick={() => toggle('meta')}>
                      Framing, interaction &amp; self-teach
                      <span className="tw">{collapsed['meta'] ? 'show' : 'hide'}</span>
                    </h3>
                    <div className="body">
                      {active.one_liner ? (
                        <p className="kv">
                          <b>In one line:</b> {active.one_liner}
                        </p>
                      ) : null}
                      {active.interaction ? (
                        <p className="kv">
                          <b>Interaction:</b> {active.interaction}
                        </p>
                      ) : null}
                      {active.self_teach ? (
                        <p className="kv">
                          <b>Self-teach:</b> {active.self_teach}
                        </p>
                      ) : null}
                      {active.engagement_hook ? (
                        <p className="kv">
                          <b>Engagement hook:</b> {active.engagement_hook}
                        </p>
                      ) : null}
                    </div>
                  </section>

                  <section className={`card ${collapsed['diff'] ? 'collapsed' : ''}`}>
                    <h3 onClick={() => toggle('diff')}>
                      Difficulty, grade level &amp; adaptivity
                      <span className="tw">{collapsed['diff'] ? 'show' : 'hide'}</span>
                    </h3>
                    <div className="body">
                      <p className="kv">
                        <b>Stage:</b> {active.stage_label}
                      </p>
                      <p className="kv">
                        <b>Age bands:</b> {(active.age_bands ?? []).join(', ') || '—'}
                      </p>
                      <p className="kv">
                        <b>Adaptivity (works_well):</b> {active.works_well}
                      </p>
                      {active.content_range ? (
                        <p className="kv">
                          <b>Content range:</b> {active.content_range}
                        </p>
                      ) : null}
                      {active.difficulty_levers ? (
                        <p className="kv">
                          <b>Difficulty levers:</b>{' '}
                          {Array.isArray(active.difficulty_levers)
                            ? active.difficulty_levers.join('; ')
                            : active.difficulty_levers}
                        </p>
                      ) : null}
                    </div>
                  </section>

                  {active.construct_irrelevant_risks ? (
                    <section className={`card ${collapsed['risks'] ? 'collapsed' : ''}`}>
                      <h3 onClick={() => toggle('risks')}>
                        Construct-irrelevant risks (from spec)
                        <span className="tw">{collapsed['risks'] ? 'show' : 'hide'}</span>
                      </h3>
                      <div className="body">
                        <div className="kv">{active.construct_irrelevant_risks}</div>
                      </div>
                    </section>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
