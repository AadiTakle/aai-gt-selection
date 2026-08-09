import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

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
