import { useState } from 'react';

/**
 * The debug tray.
 *
 * Docked to the bottom of the page and collapsed by default. When it opens it pushes the page up
 * rather than floating over it, because a panel that covers the question being answered is useless
 * during the one activity you would want to inspect.
 *
 * Everything the engine used is here. Nothing is summarised away, since the point of a debug view is
 * that the operator does not have to trust the summary.
 */

interface Attempt {
  ordinal: number;
  itemId: string;
  typeCode: string;
  domain: string;
  difficulty: number;
  correct: boolean | null;
  latencyMs: number;
  pAboveBefore: number;
  pAboveAfter: number;
  selectionReason: string;
  rawResponse?: unknown;
}

interface DebugPayload {
  seed?: number;
  poolSize?: number;
  poolUsed?: number;
  threshold?: number;
  thresholdInBankScale?: number;
  precision?: { label: string; confidenceAbove: number; confidenceBelow: number; minItems: number; maxItems: number };
  perDomainMinimum?: number;
  recommendProbability?: number;
  posteriorMean?: number;
  posteriorSd?: number;
  interval?: [number, number];
  difficultyMapping?: string;
  attempts?: Attempt[];
  state?: {
    pAbove: number;
    decision: string | null;
    stopReason: string | null;
    itemsServed: number;
    unscorable: number;
    perDomain: Record<string, number>;
  };
}

type Panel = 'run' | 'items' | 'raw';

export function DebugTray({ data }: { data: DebugPayload | null }) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>('run');

  const attempts = data?.attempts ?? [];
  const s = data?.state;

  return (
    <div className={open ? 'tray open' : 'tray'}>
      <button className="tray-handle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="tray-title">Debug</span>
        {data ? (
          <span className="tray-summary">
            {s ? `${s.itemsServed} asked · P(above) ${s.pAbove.toFixed(3)}` : 'idle'}
            {data.poolSize ? ` · pool ${data.poolUsed ?? 0}/${data.poolSize}` : ''}
            {s?.unscorable ? ` · ${s.unscorable} unmarkable` : ''}
          </span>
        ) : (
          <span className="tray-summary">no session yet</span>
        )}
        <span className="tray-chev">{open ? '▾' : '▴'}</span>
      </button>

      {open && (
        <div className="tray-body">
          {!data ? (
            <p className="note">Start a session and everything the engine used will appear here.</p>
          ) : (
            <>
              <div className="tray-tabs">
                {(['run', 'items', 'raw'] as Panel[]).map((p) => (
                  <button key={p} className={panel === p ? 'tab active' : 'tab'} onClick={() => setPanel(p)}>
                    {p === 'run' ? 'Run' : p === 'items' ? `Items (${attempts.length})` : 'Raw'}
                  </button>
                ))}
              </div>

              {panel === 'run' && (
                <dl className="kv">
                  <div><dt>Seed</dt><dd>{data.seed ?? '—'}</dd></div>
                  <div><dt>Precision</dt><dd>{data.precision?.label ?? '—'}</dd></div>
                  <div><dt>Confidence to pass</dt><dd>{data.precision?.confidenceAbove ?? '—'}</dd></div>
                  <div><dt>Confidence to rule out</dt><dd>{data.precision?.confidenceBelow ?? '—'}</dd></div>
                  <div><dt>Item budget</dt><dd>{data.precision ? `${data.precision.minItems}–${data.precision.maxItems}` : '—'}</dd></div>
                  <div><dt>Threshold, logits</dt><dd>{data.threshold?.toFixed(2) ?? '—'}</dd></div>
                  <div><dt>Threshold, bank scale</dt><dd>{data.thresholdInBankScale?.toFixed(2) ?? '—'}</dd></div>
                  <div><dt>Recommend at</dt><dd>{data.recommendProbability ?? '—'}</dd></div>
                  <div><dt>Posterior mean</dt><dd>{data.posteriorMean?.toFixed(3) ?? '—'}</dd></div>
                  <div><dt>Posterior SD</dt><dd>{data.posteriorSd?.toFixed(3) ?? '—'}</dd></div>
                  <div><dt>90% interval</dt><dd>{data.interval ? `[${data.interval[0].toFixed(2)}, ${data.interval[1].toFixed(2)}]` : '—'}</dd></div>
                  <div><dt>P(above threshold)</dt><dd>{s?.pAbove.toFixed(4) ?? '—'}</dd></div>
                  <div><dt>Decision</dt><dd>{s?.decision ?? 'not yet'}</dd></div>
                  <div><dt>Stop reason</dt><dd>{s?.stopReason ?? 'running'}</dd></div>
                  <div><dt>Pool used</dt><dd>{data.poolUsed ?? 0} of {data.poolSize ?? 0}</dd></div>
                  <div><dt>Unmarkable</dt><dd className={s?.unscorable ? 'warn' : ''}>{s?.unscorable ?? 0}</dd></div>
                  <div><dt>Per-domain minimum</dt><dd>{data.perDomainMinimum ?? '—'}</dd></div>
                  <div><dt>Domains served</dt><dd>{s ? Object.entries(s.perDomain).map(([k, v]) => `${k.slice(0, 4)} ${v}`).join(', ') : '—'}</dd></div>
                </dl>
              )}

              {panel === 'run' && data.difficultyMapping && (
                <p className="note strong">Difficulty mapping: {data.difficultyMapping}</p>
              )}

              {panel === 'items' && (
                attempts.length === 0 ? <p className="note">No items answered yet.</p> : (
                  <table className="grid-table">
                    <thead>
                      <tr>
                        <th>#</th><th>Type</th><th>Domain</th><th>Difficulty</th><th>Marked</th>
                        <th>P before</th><th>P after</th><th>Latency</th><th>Why this item</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attempts.map((a) => (
                        <tr key={a.ordinal} className={a.correct === null ? 'unmarkable' : ''}>
                          <td>{a.ordinal}</td>
                          <td className="mono small">{a.typeCode}</td>
                          <td className="small">{a.domain}</td>
                          <td>{a.difficulty.toFixed(2)}</td>
                          <td className={a.correct === null ? 'warn' : ''}>
                            {a.correct === null ? 'could not mark' : a.correct ? 'correct' : 'wrong'}
                          </td>
                          <td>{a.pAboveBefore.toFixed(3)}</td>
                          <td>{a.pAboveAfter.toFixed(3)}</td>
                          <td>{Math.round(a.latencyMs)} ms</td>
                          <td className="small">{a.selectionReason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {panel === 'raw' && (
                <pre className="tray-raw">{JSON.stringify(data, null, 2)}</pre>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
