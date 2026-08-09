import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * FIRST, ABOVE EVERYTHING. `?reset=1` starts Bramblebrook over — see `reset.ts`.
 *
 * The position of this line is the feature. `economy/coins.ts` has `let coins = read();` at module
 * scope and the other stores do the same, so they load their values at IMPORT time — and every import
 * in a file runs before that file's own body. Calling the reset from the body below cleared storage
 * AFTER the purse had already been read, so the ranch reset and the coin counter still said 37.
 */
import './reset';

import { Game } from './game/Game';
import { AudioProvider } from './game/audio';
import './game/game.css';

/**
 * Bramblebrook.
 *
 * `SortieHarness.tsx` still exists and is what to mount when checking the measurement rather than the
 * game: it shows served type, unscorable count and stop reason, all of which the game deliberately
 * hides from the child.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AudioProvider>
      <Game />
    </AudioProvider>
  </StrictMode>,
);
