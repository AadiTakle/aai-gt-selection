import { lazy, Suspense, useState } from 'react';

import { meta as stickerAlbum } from './experiences/StickerAlbum';
import type { ExperienceMeta } from './shared/types';

/**
 * The launcher. One vite app, one port, many experiences, so the whole set is demonstrable by clicking
 * through a single URL.
 *
 * Registration is deliberately explicit rather than a glob: an experience appears here only once it has
 * been played end to end, so a card in this grid is a promise that the thing behind it works.
 */

const StickerAlbum = lazy(() => import('./experiences/StickerAlbum'));

interface Entry {
  readonly meta: ExperienceMeta;
  readonly Component: React.LazyExoticComponent<React.ComponentType>;
}

const ENTRIES: Entry[] = [{ meta: stickerAlbum, Component: StickerAlbum }];

const BAND_LABEL: Record<string, string> = {
  'K-1': 'Kindergarten to Year 1',
  '2-3': 'Grades 2 to 3',
  '4-5': 'Grades 4 to 5',
  '6-8': 'Grades 6 to 8',
};

export default function Launcher() {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = ENTRIES.find((e) => e.meta.id === openId);

  if (open) {
    return (
      <div className="lab-shell">
        <header className="lab-bar">
          <button type="button" className="lab-back" onClick={() => setOpenId(null)}>
            ← All experiences
          </button>
          <span className="lab-bar-title">
            {open.meta.title} <span className="lab-band">{open.meta.band}</span>
          </span>
        </header>
        <Suspense fallback={<p className="lab-loading">Loading…</p>}>
          <open.Component />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="lab-home">
      <header>
        <p className="lab-kicker">Lab · systems and rewards</p>
        <h1>Reasoning, inside something worth playing</h1>
        <p className="lab-lede">
          Each of these runs the real adaptive engine on the real item banks. None of them calls itself a
          test, none shows a wrong answer as wrong, and none of them rewards being right: streaks and
          currency accrue for turning up.
        </p>
      </header>

      <div className="lab-grid">
        {ENTRIES.map(({ meta }) => (
          <button
            key={meta.id}
            type="button"
            className="lab-card"
            style={{ ['--card-accent' as string]: meta.accent }}
            onClick={() => setOpenId(meta.id)}
          >
            <span className="lab-card-world">{meta.world}</span>
            <strong>{meta.title}</strong>
            <span className="lab-card-band">{BAND_LABEL[meta.band] ?? meta.band}</span>
            <span className="lab-card-pull">{meta.pull}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
