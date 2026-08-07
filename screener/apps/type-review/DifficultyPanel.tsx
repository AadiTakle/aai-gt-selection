import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BANDS, type BankItem, type DiffRange, type ReviewType, type Store } from './types';
import { saveStore } from './store';

/**
 * The difficulty explorer, ported from the original harness.
 *
 * WHAT IT IS FOR. A type's bank spans difficulty 1 to 20, and a reviewer cannot judge whether that
 * spread is right by reading one item. This charts the whole spectrum, lets the reviewer scrub to any
 * rung, and serves the real item nearest that rung into whichever design is selected. It is read-only
 * over the banks: the slider chooses which existing item to look at and never rewrites item data.
 *
 * The one behaviour worth pointing out is "another at this level", which cycles among items within
 * 0.75 of the slider rather than re-serving the same one. Two items at the same difficulty can differ a
 * lot in how they read, and that button is how a reviewer finds out.
 */

const BINS = 20;

/**
 * 46 of the 66 banks record `provenance.levers`; the rest keep their difficulty knobs under
 * bank-specific keys, so fall back to the whole provenance minus the bookkeeping fields.
 */
const PROV_NOISE = new Set([
  'generator',
  'generatorRef',
  'seed',
  'contentHash',
  'promptHash',
  'validatorVerdicts',
  'validator',
  'lexiconHash',
]);

function median(ns: readonly number[]): number {
  const s = [...ns].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : ((s[m - 1]! + s[m]!) / 2);
}

function binOf(d: number): number {
  return Math.max(0, Math.min(BINS - 1, Math.floor(d) - 1));
}

function leverParts(item: BankItem): string {
  const p = item.provenance ?? {};
  const levers = p['levers'] as Record<string, unknown> | undefined;
  const src =
    levers && Object.keys(levers).length > 0
      ? levers
      : Object.fromEntries(Object.entries(p).filter(([k]) => !PROV_NOISE.has(k)));
  const parts = Object.entries(src).map(([k, v]) => {
    const val = Array.isArray(v) ? v.join('/') : v && typeof v === 'object' ? JSON.stringify(v) : String(v);
    return `${k}=${val.slice(0, 60)}`;
  });
  return parts.length > 0 ? parts.join(' · ') : 'not recorded in this bank';
}

const bankCache = new Map<string, BankItem[]>();

async function loadBank(id: string): Promise<BankItem[]> {
  const cached = bankCache.get(id);
  if (cached) return cached;
  const res = await fetch(`/banks/${encodeURIComponent(id)}.jsonl`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`banks/${id}.jsonl → HTTP ${String(res.status)}`);
  const items = (await res.text())
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as BankItem)
    .filter((i) => typeof i.difficulty === 'number')
    .sort((a, b) => a.difficulty - b.difficulty);
  bankCache.set(id, items);
  return items;
}

export interface DifficultyPanelProps {
  readonly type: ReviewType;
  readonly store: Store;
  readonly onStoreChange: () => void;
  /** Fired whenever a new item is chosen, including on first open. */
  readonly onServe: (item: BankItem, tutorial: boolean) => void;
  /** Whether the active design reports back that a child answered. */
  readonly answered: boolean;
}

export function DifficultyPanel({ type, store, onStoreChange, onServe, answered }: DifficultyPanelProps) {
  const id = type.type_id;
  const [items, setItems] = useState<BankItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bandFilter, setBandFilter] = useState('');
  const [tutorial, setTutorial] = useState(false);
  const [slider, setSlider] = useState(10);
  const [poolIdx, setPoolIdx] = useState(-1);
  const [note, setNote] = useState('');
  const noteTimer = useRef<number | undefined>(undefined);

  // Load the bank whenever the selected type changes, and drop anything from the previous type so a
  // slow fetch cannot land after the reviewer has moved on.
  useEffect(() => {
    let live = true;
    setItems(null);
    setError(null);
    setBandFilter('');
    setPoolIdx(-1);
    loadBank(id)
      .then((loaded) => {
        if (!live) return;
        setItems(loaded);
        setSlider(Number(median(loaded.map((i) => i.difficulty)).toFixed(1)));
      })
      .catch((e: unknown) => {
        if (live) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      live = false;
    };
  }, [id]);

  const pool = useMemo(
    () => (items ? (bandFilter ? items.filter((i) => (i.ageBands ?? []).includes(bandFilter)) : items.slice()) : []),
    [items, bandFilter],
  );

  const nearestIdx = useCallback(
    (v: number): number => {
      let best = -1;
      let bd = Infinity;
      pool.forEach((it, i) => {
        const dd = Math.abs(it.difficulty - v);
        if (dd < bd) {
          bd = dd;
          best = i;
        }
      });
      return best;
    },
    [pool],
  );

  const serve = useCallback(
    (idx: number, syncSlider: boolean) => {
      if (idx < 0 || idx >= pool.length) return;
      setPoolIdx(idx);
      const item = pool[idx]!;
      if (syncSlider) setSlider(item.difficulty);
      onServe(item, tutorial);
    },
    [pool, tutorial, onServe],
  );

  // Open at the median rung once the pool exists, and re-serve when the band filter changes the pool.
  const openedFor = useRef<string>('');
  useEffect(() => {
    if (pool.length === 0) return;
    const key = `${id}|${bandFilter}`;
    if (openedFor.current === key) return;
    openedFor.current = key;
    const idx = nearestIdx(slider);
    if (idx >= 0) {
      setPoolIdx(idx);
      onServe(pool[idx]!, tutorial);
    }
    // `slider` and `tutorial` are read as current values on purpose; this must not re-fire when they move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, id, bandFilter, nearestIdx]);

  const flashNote = useCallback(() => {
    setNote('saved');
    window.clearTimeout(noteTimer.current);
    noteTimer.current = window.setTimeout(() => setNote(''), 900);
  }, []);

  const range: DiffRange = store[id]?.diffRange ?? { min: null, max: null };

  const saveRange = useCallback(
    (nextMin: number | null, nextMax: number | null) => {
      let mn = nextMin;
      let mx = nextMax;
      if (mn != null && mx != null && mn > mx) [mn, mx] = [mx, mn]; // keep it a range
      const c = store[id] ?? (store[id] = {});
      if (mn == null && mx == null) delete c.diffRange;
      else c.diffRange = { min: mn, max: mx };
      saveStore(store);
      onStoreChange();
      flashNote();
    },
    [id, store, onStoreChange, flashNote],
  );

  if (error) {
    return (
      <div className="diffwrap">
        <div className="bar">
          <span>
            <b>Difficulty spectrum &amp; served level</b>
          </span>
          <span className="spacer" />
        </div>
        <div className="diffbody">
          <div className="served" style={{ border: 0, margin: 0, padding: 0 }}>
            No bank loaded for <code>{id}</code> — the demo keeps cycling its own samples.
            <br />
            This type is in the catalogue but has no <code>banks/{id}.jsonl</code> on disk.
            <br />
            <small>{error}</small>
          </div>
        </div>
      </div>
    );
  }

  if (!items) {
    return (
      <div className="diffwrap">
        <div className="bar">
          <span>
            <b>Difficulty spectrum &amp; served level</b>
          </span>
          <span className="spacer" />
        </div>
        <div className="diffbody">
          <div className="served" style={{ border: 0, margin: 0, padding: 0 }}>
            Loading bank…
          </div>
        </div>
      </div>
    );
  }

  const ds = items.map((i) => i.difficulty);
  const counts = Array(BINS).fill(0) as number[];
  for (const i of items) counts[binOf(i.difficulty)]! += 1;
  const peak = Math.max(...counts, 1);
  const presentBands = BANDS.filter((b) => items.some((i) => (i.ageBands ?? []).includes(b)));
  const served = poolIdx >= 0 ? pool[poolIdx] : undefined;
  const hitBin = served ? binOf(served.difficulty) : -1;

  return (
    <div className="diffwrap">
      <div className="bar">
        <span>
          <b>Difficulty spectrum &amp; served level</b>
        </span>
        <span className="spacer" />
        <span id="diffCount">
          {items.length} items · min {Math.min(...ds).toFixed(1)} · median {median(ds).toFixed(1)} · max{' '}
          {Math.max(...ds).toFixed(1)}
        </span>
      </div>
      <div className="diffbody">
        <div className="spec" id="spec">
          {counts.map((n, i) => (
            <div
              key={i}
              className={`bin ${n ? '' : 'empty'} ${i === hitBin ? 'hit' : ''}`}
              data-bin={i}
              style={{ height: n ? `${String(Math.max(6, Math.round((n / peak) * 100)))}%` : '2%' }}
              title={`difficulty ${String(i + 1)}–${String(i + 2 === 21 ? 20 : i + 2)}: ${String(n)} item${n === 1 ? '' : 's'}${n ? ' — click to serve' : ''}`}
              onClick={() => {
                if (!n) return;
                const v = i + 1.5;
                setSlider(v);
                serve(nearestIdx(v), false);
              }}
            />
          ))}
        </div>
        <div className="axis">
          <span>1 · easiest</span>
          <span>5</span>
          <span>10</span>
          <span>15</span>
          <span>20 · hardest</span>
        </div>
        <div id="bandRows">
          {presentBands.map((b) => {
            const sub = items.filter((i) => (i.ageBands ?? []).includes(b)).map((i) => i.difficulty);
            const lo = Math.min(...sub);
            const hi = Math.max(...sub);
            const L = ((lo - 1) / 19) * 100;
            const W = Math.max(1.5, ((hi - lo) / 19) * 100);
            return (
              <div className="band" key={b}>
                <span className="lbl">{b}</span>
                <span className="track">
                  <span className="fill" style={{ left: `${L.toFixed(1)}%`, width: `${W.toFixed(1)}%` }} />
                </span>
                <span className="n">
                  {lo.toFixed(1)}–{hi.toFixed(1)} · {sub.length}
                </span>
              </div>
            );
          })}
        </div>

        <div className="slrow">
          <button id="dPrev" title="previous item by difficulty" onClick={() => serve(Math.max(0, poolIdx - 1), true)}>
            ◀
          </button>
          <input
            type="range"
            id="slider"
            min="1"
            max="20"
            step="0.1"
            value={slider}
            onChange={(e) => {
              const v = Number(e.target.value);
              setSlider(v);
              serve(nearestIdx(v), false);
            }}
          />
          <button
            id="dNext"
            title="next item by difficulty"
            onClick={() => serve(Math.min(pool.length - 1, poolIdx + 1), true)}
          >
            ▶
          </button>
          <span className="val" id="sliderVal">
            {slider.toFixed(1)} / 20
          </span>
        </div>

        <div className="btns">
          <button className="primary" id="dServe" onClick={() => serve(nearestIdx(slider), false)}>
            Serve at this level
          </button>
          <button
            id="dAnother"
            onClick={() => {
              // Cycle among items close to the slider, so the reviewer sees variety at one rung.
              const near = pool
                .map((it, i) => ({ i, dd: Math.abs(it.difficulty - slider) }))
                .filter((x) => x.dd <= 0.75)
                .map((x) => x.i);
              if (near.length < 2) {
                serve(nearestIdx(slider), false);
                return;
              }
              const at = near.indexOf(poolIdx);
              serve(near[(at + 1 + near.length) % near.length]!, false);
            }}
          >
            another at this level
          </button>
          <label className="chk">
            <input type="checkbox" id="dTutorial" checked={tutorial} onChange={(e) => setTutorial(e.target.checked)} />{' '}
            include warm-up / ghost-hand
          </label>
          <span className="spacer" style={{ flex: 1 }} />
          <span>band:</span>
          <button className={`chip ${bandFilter === '' ? 'on' : ''}`} onClick={() => setBandFilter('')}>
            all
          </button>
          {presentBands.map((b) => (
            <button key={b} className={`chip ${bandFilter === b ? 'on' : ''}`} onClick={() => setBandFilter(b)}>
              {b}
            </button>
          ))}
        </div>

        <div className="served" id="servedInfo">
          {served ? (
            <>
              <div>
                <b>Serving</b> item {poolIdx + 1} of {pool.length}
                {bandFilter ? ` in band ${bandFilter}` : ''} · difficulty <b>{served.difficulty.toFixed(2)}</b>/20 ·
                bands {(served.ageBands ?? []).join(', ') || '—'} · <code>{String(served.itemId).slice(0, 8)}</code>
                {answered ? (
                  <>
                    {' · '}
                    <span className="stat">answered</span> — press ▶ or “another at this level” for the next item
                  </>
                ) : null}
              </div>
              <div>difficulty levers that generated it: {leverParts(served)}</div>
              {served.answer ? (
                <details>
                  <summary>answer key &amp; distractor rationales (reviewer-only — local synthetic bank)</summary>
                  <pre>{JSON.stringify(served.answer, null, 2)}</pre>
                </details>
              ) : null}
            </>
          ) : (
            <div>No item served yet.</div>
          )}
        </div>

        <div className="rangeset">
          <span>
            <b>Your verdict —</b> intended difficulty range:
          </span>
          <input
            type="number"
            id="rMin"
            min="1"
            max="20"
            step="0.5"
            placeholder="min"
            value={range.min ?? ''}
            onChange={(e) => saveRange(e.target.value === '' ? null : Number(e.target.value), range.max)}
          />
          <span>–</span>
          <input
            type="number"
            id="rMax"
            min="1"
            max="20"
            step="0.5"
            placeholder="max"
            value={range.max ?? ''}
            onChange={(e) => saveRange(range.min, e.target.value === '' ? null : Number(e.target.value))}
          />
          <button onClick={() => saveRange(Number(slider.toFixed(1)), range.max)}>◀ set min from slider</button>
          <button onClick={() => saveRange(range.min, Number(slider.toFixed(1)))}>set max from slider ▶</button>
          <button onClick={() => saveRange(null, null)}>clear</button>
          <span id="rNote" className="savenote">
            {note}
          </span>
        </div>
      </div>
    </div>
  );
}
