import { useCallback, useEffect, useRef, useState } from 'react';

import { QBANK_HOST, isQbankMessage, themeById } from '@gt/qbank';

import { useQuestionSession } from '../shared/headless/useQuestionSession';
import type { AgeBand, ExperienceMeta } from '../shared/types';
import './DefaultUi.css';
import { SHOWCASE_TYPE_CODES } from '../shared/showcase';

/**
 * The DEFAULT question UI: the archive's own renderers, which is what "default" means.
 *
 * WHY THIS IS NOT A GENERIC RENDERER, having tried that and been wrong.
 *
 * The first attempt reduced every item to shape-plus-colour-plus-count and drew it with one component.
 * It was strictly worse than the thing it replaced, and looking at the two side by side showed why. A
 * `FLU-DEDUCE-01` clue is `{dim: 'fill', value: 'outline', label: 'not filled in'}`, and the archive
 * renderer draws it AS A PICTURE: an outlined shape with a line through it. The generic version printed
 * the label. A candidate carries seven attributes and the archive shows all seven, with corner markers
 * for dots, position and rotation; the generic version showed three and captioned the rest, so four
 * suspects that are obviously different became four near-identical triangles.
 *
 * These 52 renderers are the reference presentation for the reference vocabulary. The abstraction in
 * `../shared/uispec/` exists so a CUSTOM theme can substitute its own vocabulary; it was never meant to
 * replace the default, and using it as one throws away every per-type design decision in the catalogue.
 *
 * So: default surface renders through the catalogue. Themed surfaces render through the spec. The
 * session, the engine and the marking are identical either way.
 */

export const meta: ExperienceMeta = {
  id: 'default-ui',
  title: 'Default UI',
  world: 'Archive original',
  band: '4-5',
  pull: 'The catalogue’s own presentation, on the live engine',
  accent: '#004f71',
};

const BANDS: readonly AgeBand[] = ['K-1', '2-3', '4-5', '6-8'];

export default function DefaultUi() {
  const [band, setBand] = useState<AgeBand>('4-5');
  const [frameReady, setFrameReady] = useState(false);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const shownAt = useRef(Date.now());

  const session = useQuestionSession({
    ageBand: band,
    precisionIndex: band === 'K-1' ? 0 : band === '2-3' ? 1 : 2,
    // Only the five families worth presenting. See shared/showcase.ts for what is held back and why.
    types: SHOWCASE_TYPE_CODES,
  });

  // The renderer reports the child's response; the answer is still marked on the server, so this is a
  // presentation channel and not a scoring one.
  const answered = useRef<(response: unknown) => void>(() => undefined);
  answered.current = (response: unknown) => {
    const question = session.question;
    if (!question) return;
    // The catalogue reports whichever key the child picked; find the matching choice so the same
    // `answer(choice)` path is used as every themed surface.
    const raw = response as { selectedKey?: string; selectedIndex?: number } | undefined;
    const key = raw?.selectedKey ?? (raw?.selectedIndex === undefined ? undefined : String(raw.selectedIndex));
    const choice = question.choices.find((c) => c.key === key) ?? question.choices[0];
    if (choice) void session.answer(choice);
  };

  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      if (!isQbankMessage(ev.data)) return;
      if (ev.data.type === 'ready') {
        setFrameReady(true);
        return;
      }
      if (ev.data.type !== 'result') return;
      answered.current((ev.data as { result?: { response?: unknown } }).result?.response);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const question = session.question;

  // Hand the item over once the renderer says it is ready, then tint it with the catalogue palette.
  useEffect(() => {
    if (!frameReady || !question) return;
    const win = frameRef.current?.contentWindow;
    if (!win) return;
    const served = {
      itemId: question.itemId,
      typeCode: question.typeCode,
      domain: question.domain,
      difficulty: question.difficulty,
      ageBands: [band],
      content: question.raw,
      syntheticOnly: true,
      validated: false,
    };
    win.postMessage({ source: QBANK_HOST, type: 'init', item: served }, '*');
    win.postMessage({ source: QBANK_HOST, type: 'start', tutorial: false }, '*');
    shownAt.current = Date.now();
    const doc = frameRef.current?.contentDocument;
    if (doc) {
      for (const [name, value] of Object.entries(themeById('catalogue').vars)) {
        doc.documentElement.style.setProperty(name, value);
      }
    }
  }, [frameReady, question, band]);

  useEffect(() => {
    setFrameReady(false);
  }, [question?.itemId]);

  const start = useCallback(() => {
    setFrameReady(false);
    void session.start();
  }, [session]);

  return (
    <div className="du">
      <div className="du-inner">
        <header className="du-head">
          <div>
            <h2>Default UI</h2>
            <p>
              The catalogue’s own presentation, running on the live adaptive engine. Every item, every
              option and every mark comes from the library. A themed surface substitutes its own
              vocabulary through <code>shared/uispec</code> and changes nothing else.
            </p>
          </div>
          <div className="du-controls">
            <label>
              Grade band
              <select
                value={band}
                onChange={(e) => setBand(e.target.value as AgeBand)}
                disabled={session.phase === 'asking'}
              >
                {BANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="du-primary" onClick={start}>
              {session.phase === 'asking' ? 'Restart' : 'Start a session'}
            </button>
          </div>
        </header>

        {session.error ? <p className="du-error">{session.error}</p> : null}
        {session.phase === 'starting' ? <p className="du-note">Loading the bank…</p> : null}

        {session.phase === 'asking' && question ? (
          <div className="du-stagecard">
            <div className="du-meta">
              <span className="du-tag">{question.typeCode}</span>
              <span>{question.domain}</span>
              <span>difficulty {question.difficulty.toFixed(1)}</span>
              <span>question {session.asked + 1}</span>
              <span>{frameReady ? 'renderer ready' : 'loading renderer'}</span>
            </div>
            <iframe
              ref={frameRef}
              key={question.itemId}
              src={`/qbank/items/${question.typeCode}.html`}
              title={question.typeCode}
              className="du-frame"
            />
          </div>
        ) : null}

        {session.phase === 'finished' && session.result ? (
          <section className="du-result">
            <h3>Session complete</h3>
            <p>
              {session.result.asked} answered, {session.result.correct} correct, engine stopped on{' '}
              {session.result.stopReason ?? 'unknown'}.
            </p>
            <p className="du-note">
              Ability estimate {session.result.estimate.toFixed(2)}, interval{' '}
              {session.result.interval[0].toFixed(2)} to {session.result.interval[1].toFixed(2)}. Items
              this surface declined: {session.declined}.
            </p>
            <button type="button" className="du-primary" onClick={start}>
              Run another
            </button>
          </section>
        ) : null}
      </div>
    </div>
  );
}
