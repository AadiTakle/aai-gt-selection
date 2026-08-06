import { lazy, Suspense, useState, type ComponentType, type LazyExoticComponent } from 'react';

import { meta as blueprintBuild } from './experiences/BlueprintBuild';
import { meta as coinMarket } from './experiences/CoinMarket';
import { meta as speedrunLadder } from './experiences/SpeedrunLadder';
import { meta as stickerAlbum } from './experiences/StickerAlbum';
import { meta as streakKeeper } from './experiences/StreakKeeper';
import { meta as towerLine } from './experiences/TowerLine';
import { AGE_BANDS, type AgeBand, type ExperienceMeta } from './shared/types';

/**
 * The launcher. One vite app, one port, six experiences, so the whole set is demonstrable by clicking
 * through a single URL.
 *
 * Registration is deliberately explicit rather than a glob. An experience appears here only once it has
 * been played end to end, so a card in this grid is a promise that the thing behind it works, and an
 * unfinished experience is removed from the grid rather than left as a dead card.
 */

const StickerAlbum = lazy(() => import('./experiences/StickerAlbum'));
const StreakKeeper = lazy(() => import('./experiences/StreakKeeper'));
const BlueprintBuild = lazy(() => import('./experiences/BlueprintBuild'));
const TowerLine = lazy(() => import('./experiences/TowerLine'));
const CoinMarket = lazy(() => import('./experiences/CoinMarket'));
const SpeedrunLadder = lazy(() => import('./experiences/SpeedrunLadder'));

interface Entry {
  readonly meta: ExperienceMeta;
  readonly Component: LazyExoticComponent<ComponentType>;
}

/** Ordered youngest first, which is also the order they are worth demoing in. */
const ENTRIES: readonly Entry[] = [
  { meta: stickerAlbum, Component: StickerAlbum },
  { meta: streakKeeper, Component: StreakKeeper },
  { meta: blueprintBuild, Component: BlueprintBuild },
  { meta: towerLine, Component: TowerLine },
  { meta: coinMarket, Component: CoinMarket },
  { meta: speedrunLadder, Component: SpeedrunLadder },
];

const BAND_LABEL: Record<AgeBand, string> = {
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
          <span className="lab-bar-world">{open.meta.world}</span>
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
          Six experiences, all running the real adaptive engine on the real item banks. None calls itself
          a test, none shows a wrong answer as wrong, and none rewards being right: streaks and currency
          accrue for turning up, which is the only thing the interface is ever told about a session.
        </p>
      </header>

      {/* Band coverage is the hard requirement for the set, so it is stated rather than implied. */}
      <div className="lab-bands">
        {AGE_BANDS.map((band) => {
          const n = ENTRIES.filter((e) => e.meta.band === band).length;
          return (
            <span key={band} className={n > 0 ? 'lab-bandchip on' : 'lab-bandchip'}>
              {band} <strong>{n}</strong>
            </span>
          );
        })}
      </div>

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
            <span className="lab-card-band">{BAND_LABEL[meta.band]}</span>
            <span className="lab-card-pull">{meta.pull}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
