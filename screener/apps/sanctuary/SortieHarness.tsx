import { useMemo, useState } from 'react';

import { ItemStage } from './shared/ItemStage';
import { useSortie } from './shared/useSortie';
import { DOMAINS, type Domain } from './shared/types';
import { typesFor, verbFor } from './shared/batteries';

/**
 * M0's verifiable artefact: run one sortie per battery and watch it mark.
 *
 * This is a harness, not the game. It exists so the two things that can be silently wrong are visible
 * before a world is built on them:
 *
 *   unscorable  must stay 0. Anything else means a response shape the server could not read, which is
 *               how a whole family of item types disappears without an error.
 *   typeCode    must only ever be one of this battery's own types, which is the proof that restricting
 *               the pool by `types` really does produce a per-battery measurement.
 *
 * It shows `stopReason` too, which will read `item-cap` every time and is correct: with the threshold
 * tracking the estimate, pAbove sits near 0.5 and the confidence bars never fire.
 */
export function SortieHarness() {
  const [domain, setDomain] = useState<Domain>('fluid');
  const [threshold, setThreshold] = useState(0);
  const types = useMemo(() => typesFor(domain), [domain]);

  const s = useSortie({ domain, types, threshold, precisionIndex: 1 });
  const verb = s.serve ? verbFor(s.serve.typeCode) : undefined;
  const offPool = s.serve ? !types.includes(s.serve.typeCode) : false;

  return (
    <main className="harness">
      <header>
        <p className="kicker">Brackenhollow · M0 harness</p>
        <h1>One sortie, one battery</h1>
      </header>

      <div className="controls">
        <label>
          Battery
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value as Domain)}
            disabled={s.phase === 'asking' || s.phase === 'settling'}
          >
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                {d} ({typesFor(d).length} types)
              </option>
            ))}
          </select>
        </label>
        <label>
          Threshold {threshold.toFixed(1)} logits
          <input
            type="range"
            min={-3}
            max={3}
            step={0.5}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            disabled={s.phase === 'asking' || s.phase === 'settling'}
          />
        </label>
        <button type="button" onClick={() => void s.open()}>
          {s.phase === 'idle' || s.phase === 'closed' || s.phase === 'error' ? 'Open a sortie' : 'Running'}
        </button>
      </div>

      {s.error ? <p className="error">{s.error}</p> : null}

      {s.state ? (
        <dl className="readout">
          <div><dt>answered</dt><dd>{s.answered}</dd></div>
          <div><dt>served</dt><dd>{s.state.itemsServed}</dd></div>
          <div className={s.state.unscorable > 0 ? 'bad' : 'good'}>
            <dt>unscorable</dt><dd>{s.state.unscorable}</dd>
          </div>
          <div><dt>stopReason</dt><dd>{s.state.stopReason ?? '—'}</dd></div>
          <div><dt>perDomain</dt><dd>{JSON.stringify(s.state.perDomain)}</dd></div>
        </dl>
      ) : null}

      {s.serve ? (
        <section className="item">
          <p className="meta">
            <strong>{verb?.title ?? s.serve.typeCode}</strong> · {s.serve.typeCode} ·{' '}
            {s.serve.domain} · difficulty {s.serve.difficulty.toFixed(2)} · info{' '}
            {s.serve.informationAtThreshold.toFixed(3)}
            {offPool ? <span className="bad"> OFF-POOL TYPE</span> : null}
          </p>
          <ItemStage
            serve={s.serve}
            band="K-1"
            answered={s.phase !== 'asking'}
            onAnswer={(ref) => void s.answer(ref)}
          />
        </section>
      ) : null}

      {s.phase === 'closed' ? (
        <p className="closed">
          Sortie closed. Session <code>{s.sessionId}</code>. The per-battery posterior is rebuilt from
          the ledger at M2; nothing is estimated here.
        </p>
      ) : null}
    </main>
  );
}
