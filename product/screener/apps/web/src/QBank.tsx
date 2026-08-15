import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  QBANK_AREAS,
  QBANK_THEMES,
  THEMABLE_VARS,
  applyThemeToFrame,
  isQbankMessage,
  themeById,
  themeCoverage,
} from '@gt/qbank';

/**
 * The playable catalogue, embedded and themed.
 *
 * Two things are being demonstrated here and they are worth keeping separate in your head. That
 * the 52 existing items can be served inside this app and observed while a child works, without
 * editing any of them. And that their visual identity is a setting rather than a property of the
 * questions, again without editing any of them.
 */

interface CatalogueItem {
  file: string;
  code: string;
  name: string;
  area: string;
  readingFree: boolean;
  url: string;
}

interface Observed {
  ready: boolean;
  telemetryCount: number;
  result: {
    itemId?: string;
    typeCode?: string;
    domain?: string;
    response?: unknown;
    metrics?: Record<string, unknown>;
  } | null;
}

const AREA_LABEL: Record<string, string> = Object.fromEntries(
  QBANK_AREAS.map((a) => [a.code, a.label]),
);

export function QBank() {
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [area, setArea] = useState<string>('SPA');
  const [selected, setSelected] = useState<CatalogueItem | null>(null);
  const [themeId, setThemeId] = useState('institutional');
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [observed, setObserved] = useState<Observed>({ ready: false, telemetryCount: 0, result: null });
  const [coverage, setCoverage] = useState<{ applied: string[]; unused: string[] } | null>(null);
  const [themable, setThemable] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const theme = useMemo(() => {
    const base = themeById(themeId);
    return { ...base, vars: { ...base.vars, ...overrides } };
  }, [themeId, overrides]);

  useEffect(() => {
    fetch('/api/qbank')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setItems(d.items);
        const first = d.items.find((i: CatalogueItem) => i.area === 'SPA') ?? d.items[0];
        setSelected(first ?? null);
      })
      .catch((e) => setErr(String(e.message ?? e)));
  }, []);

  // The items already broadcast to their parent, so observing a session needs no changes to them.
  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      if (!isQbankMessage(ev.data)) return;
      if (ev.data.type === 'ready') setObserved((o) => ({ ...o, ready: true }));
      else if (ev.data.type === 'telemetry') setObserved((o) => ({ ...o, telemetryCount: o.telemetryCount + 1 }));
      else if (ev.data.type === 'result') setObserved((o) => ({ ...o, result: ev.data.result }));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const paint = useCallback(() => {
    const ok = applyThemeToFrame(frameRef.current, theme.vars);
    setThemable(ok);
    setCoverage(themeCoverage(frameRef.current, theme.vars));
  }, [theme]);

  // Repaint whenever the palette changes, since the frame is not reloaded for a theme switch.
  useEffect(() => { paint(); }, [paint]);

  const onLoad = useCallback(() => {
    setObserved({ ready: false, telemetryCount: 0, result: null });
    paint();
  }, [paint]);

  const shown = items.filter((i) => i.area === area);

  return (
    <main>
      <section className="panel">
        <h2>The playable catalogue, running inside the app</h2>
        <p className="note">
          These are the 52 existing question types, served from this origin and embedded live. Not one
          of the files has been edited. They already broadcast to their parent window, so the session
          below is observed rather than instrumented, and they already declare their palette as CSS
          custom properties, so the theme is applied from out here rather than baked in.
        </p>
        {err && <p className="error">{err}</p>}

        <div className="controls">
          <label>
            Area
            <select value={area} onChange={(e) => { setArea(e.target.value); const f = items.find((i) => i.area === e.target.value); if (f) setSelected(f); }}>
              {QBANK_AREAS.filter((a) => items.some((i) => i.area === a.code)).map((a) => (
                <option key={a.code} value={a.code}>
                  {a.label} ({items.filter((i) => i.area === a.code).length})
                </option>
              ))}
            </select>
          </label>
          <label>
            Question
            <select value={selected?.file ?? ''} onChange={(e) => setSelected(shown.find((i) => i.file === e.target.value) ?? null)}>
              {shown.map((i) => <option key={i.file} value={i.file}>{i.code} · {i.name}</option>)}
            </select>
          </label>
          <label>
            Theme
            <select value={themeId} onChange={(e) => { setThemeId(e.target.value); setOverrides({}); }}>
              {QBANK_THEMES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          {selected && (
            <a className="tab" href={selected.url} target="_blank" rel="noreferrer">Open unstyled in a new tab</a>
          )}
        </div>
        <p className="note">{themeById(themeId).description}</p>
        {selected?.readingFree && (
          <p className="note strong">
            This area needs no reading at all, which is the property that lets a child whose decoding
            lags their reasoning show what they can actually do.
          </p>
        )}
      </section>

      {selected && (
        <section className="panel">
          <div className="frame-head">
            <div>
              <strong>{selected.code}</strong> <span className="note">{selected.name}</span>
              <div className="mono small">{AREA_LABEL[selected.area] ?? selected.area} · {selected.url}</div>
            </div>
            <div className="frame-flags">
              <span className={observed.ready ? 'flag on' : 'flag'}>{observed.ready ? 'ready' : 'waiting'}</span>
              <span className="flag">{observed.telemetryCount} telemetry</span>
              <span className={observed.result ? 'flag on' : 'flag'}>{observed.result ? 'result received' : 'no result yet'}</span>
              <span className={themable === false ? 'flag warn' : 'flag on'}>
                {themable === false ? 'theming unavailable' : 'themed from host'}
              </span>
            </div>
          </div>
          <iframe
            ref={frameRef}
            key={selected.file}
            src={selected.url}
            title={`${selected.code} ${selected.name}`}
            onLoad={onLoad}
            className="qbank-frame"
          />
        </section>
      )}

      <section className="panel">
        <h2>What the item told us</h2>
        <p className="note">
          Captured from the messages the item already sends. Note what is missing: the items report a
          response and its metrics and deliberately never say whether it was correct. The comment in
          their own source reads "NEUTRAL acknowledgment only — never correct/incorrect." So wiring
          these into a scored session needs an answer key held here, which does not exist yet.
        </p>
        {observed.result ? (
          <>
            <dl className="kv">
              <div><dt>Item</dt><dd>{observed.result.itemId ?? 'not reported'}</dd></div>
              <div><dt>Type</dt><dd>{observed.result.typeCode ?? 'not reported'}</dd></div>
              <div><dt>Domain</dt><dd>{observed.result.domain ?? 'not reported'}</dd></div>
              <div><dt>Correctness</dt><dd className="warn">not reported, by design</dd></div>
            </dl>
            {observed.result.metrics && (
              <table className="grid-table">
                <thead><tr><th>Metric</th><th>Value</th></tr></thead>
                <tbody>
                  {Object.entries(observed.result.metrics).map(([k, v]) => (
                    <tr key={k}><td className="mono small">{k}</td><td>{String(v)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        ) : (
          <p className="note">Answer the question above and its result will appear here.</p>
        )}
      </section>

      <section className="panel">
        <h2>Edit the palette globally</h2>
        <p className="note">
          Every property below is set on the embedded document, so a change re-skins the question
          immediately and reaches every item that declares that property. Coverage is uneven and the
          count says how many of the 52 use each one, so a theme changes most of the catalogue rather
          than all of it.
        </p>
        {coverage && (
          <p className="note strong">
            This item declares {coverage.applied.length} of the {coverage.applied.length + coverage.unused.length} themed
            properties. The other {coverage.unused.length} are set but unused here.
          </p>
        )}
        <table className="grid-table">
          <thead><tr><th>Property</th><th>Role</th><th>Used by</th><th>Value</th><th>In this item</th></tr></thead>
          <tbody>
            {THEMABLE_VARS.map((v) => {
              const value = theme.vars[v.name] ?? '';
              const used = coverage?.applied.includes(v.name);
              return (
                <tr key={v.name}>
                  <td className="mono small">{v.name}</td>
                  <td className="small">{v.role}</td>
                  <td>{v.usedBy}/52</td>
                  <td>
                    <span className="swatch-row">
                      <input
                        type="color"
                        value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'}
                        onChange={(e) => setOverrides((o) => ({ ...o, [v.name]: e.target.value }))}
                        aria-label={`${v.name} colour`}
                      />
                      <span className="mono small">{value}</span>
                    </span>
                  </td>
                  <td className={used ? '' : 'warn'}>{coverage ? (used ? 'yes' : 'no') : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="controls">
          <button onClick={() => setOverrides({})} disabled={Object.keys(overrides).length === 0}>
            Reset to preset
          </button>
          <button
            onClick={() => navigator.clipboard?.writeText(JSON.stringify({ id: `${themeId}-edited`, vars: theme.vars }, null, 2))}
          >
            Copy this palette as a preset
          </button>
          <span className="note">
            {Object.keys(overrides).length === 0 ? 'Showing the preset unmodified.' : `${Object.keys(overrides).length} property overridden.`}
          </span>
        </div>
      </section>
    </main>
  );
}
