import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { SortieHarness } from './SortieHarness';
import './styles.css';

/**
 * M0 mounts the harness rather than the game.
 *
 * The order is deliberate: the sortie loop, the marking of both key families and the per-battery pool
 * restriction are the parts that can be wrong in ways a game shell would hide. The hollow arrives at
 * M5, on top of a loop already proven.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SortieHarness />
  </StrictMode>,
);
