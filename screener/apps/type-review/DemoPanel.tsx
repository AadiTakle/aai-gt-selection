import { useEffect, useMemo, useRef, useState } from 'react';

import { DESIGNS, ThemedQuestion, designById, useKit, type Design } from '@gt/question-ui';
import type { BankItem, ReviewType } from './types';


/**
 * The demo panel, and the one thing this app adds to the original harness.
 *
 * The original had a single iframe here. This keeps that iframe as the default and puts a design
 * selector next to it, so the same served item can be redrawn by a themed renderer without touching
 * anything else on the page — same type, same bank, same difficulty, same reviewer notes. The chrome
 * stays one row, as it was, rather than growing a second one just because a control was added.
 *
 * THE IFRAME PROTOCOL is the archive demos' documented host contract and is reproduced exactly:
 *   host -> demo : {source:'gt-exam-host', type:'init',  item: ServedItem}
 *                  {source:'gt-exam-host', type:'start', tutorial?: boolean}
 *   demo -> host : {source:'gt-exam-demo', type:'ready' | 'result', ...}
 * The answer key, scoring and provenance are stripped before injection, exactly as the demos' own
 * `toServed()` does, so a renderer never receives the key it would be marked against.
 */

const HOST_SRC = 'gt-exam-host';
const DEMO_SRC = 'gt-exam-demo';

/** Strip everything a renderer must never see. */
function toServed(item: BankItem): Record<string, unknown> {
  const { answer, scoring, provenance, ...served } = item;
  void answer;
  void scoring;
  void provenance;
  return served;
}

export interface DemoPanelProps {
  readonly type: ReviewType;
  readonly item: BankItem | undefined;
  readonly tutorial: boolean;
  readonly design: string;
  readonly onDesignChange: (id: string) => void;
  readonly onAnswered: () => void;
}

export function DemoPanel({ type, item, tutorial, design, onDesignChange, onAnswered }: DemoPanelProps) {
  const chosen: Design = designById(design);
  const [nonce, setNonce] = useState(0);
  const isArchive = chosen.kind === 'archive';

  return (
    <div className="demoWrap">
      <div className="bar">
        <span>Live demo</span>
        <span className="spacer" />
        <span className="designpick">
          <label htmlFor="designSel">UI design</label>
          <select id="designSel" value={chosen.id} onChange={(e) => onDesignChange(e.target.value)}>
            {DESIGNS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </span>
        <button onClick={() => setNonce((n) => n + 1)}>reload</button>
        {isArchive && type.demo ? (
          <a href={`/qbank/items/${type.type_id}.html`} target="_blank" rel="noreferrer">
            open in new tab ↗
          </a>
        ) : null}
      </div>

      {isArchive ? (
        <ArchiveFrame type={type} item={item} tutorial={tutorial} nonce={nonce} onAnswered={onAnswered} />
      ) : (
        <KitFrame kitId={chosen.kit ?? ''} item={item} nonce={nonce} onAnswered={onAnswered} />
      )}

      <div className="designnote">
        <b>{chosen.label}.</b> {chosen.note}
      </div>
    </div>
  );
}

/** The archive's own prebuilt renderer for this type, driven over the host protocol. */
function ArchiveFrame({
  type,
  item,
  tutorial,
  nonce,
  onAnswered,
}: {
  type: ReviewType;
  item: BankItem | undefined;
  tutorial: boolean;
  nonce: number;
  onAnswered: () => void;
}) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  const src = type.demo ? `/qbank/items/${type.type_id}.html` : null;

  useEffect(() => {
    setReady(false);
  }, [src, nonce]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { source?: string; type?: string } | null;
      if (!d || d.source !== DEMO_SRC) return;
      if (!frame.current || e.source !== frame.current.contentWindow) return; // ignore stale iframes
      if (d.type === 'ready') setReady(true);
      else if (d.type === 'result') onAnswered();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onAnswered]);

  // Push once the frame has handshaked. A renderer that has not booted drops the message silently, so
  // the 'ready' gate is what makes the first serve reliable rather than a race.
  useEffect(() => {
    const win = frame.current?.contentWindow;
    if (!ready || !win || !item) return;
    win.postMessage({ source: HOST_SRC, type: 'init', item: toServed(item) }, '*');
    win.postMessage({ source: HOST_SRC, type: 'start', tutorial }, '*');
  }, [ready, item, tutorial]);

  if (!src) {
    return (
      <div className="nodemo">
        No demo file found for <code>{type.type_id}</code>. Switch the UI design above to draw this type from a kit
        instead.
      </div>
    );
  }

  return <iframe key={`${src}#${String(nonce)}`} ref={frame} src={src} title={`${type.name} demo`} />;
}

/** The generic renderer, dressed from a kit. */
function KitFrame({
  kitId,
  item,
  nonce,
  onAnswered,
}: {
  kitId: string;
  item: BankItem | undefined;
  nonce: number;
  onAnswered: () => void;
}) {
  const { kit, sprite, error } = useKit(kitId);
  // Reload nudges the seed, which reshuffles which entries the resolver picks for the same item.
  const seed = useMemo(
    () => (item ? item.itemId.length + Math.floor(item.difficulty * 10) + nonce * 101 : 1 + nonce),
    [item, nonce],
  );

  if (error) {
    return (
      <div className="themefail">
        <b>Could not load the {kitId} kit.</b>
        <br />
        {error}
      </div>
    );
  }
  if (!kit) return <div className="themehost">Loading {kitId} kit…</div>;
  if (!item) return <div className="themehost">No item served yet — pick a difficulty below.</div>;
  return (
    <div className="themehost">
      <ThemedQuestion item={item} kit={kit} sprite={sprite} seed={seed} onAnswer={() => onAnswered()} />
    </div>
  );
}
