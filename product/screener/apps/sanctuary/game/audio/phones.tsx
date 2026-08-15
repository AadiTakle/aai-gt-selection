/**
 * TEMPORARY. The headphone invitation, in the HUD it will actually live in.
 *
 * `Game.tsx` belongs to the integrator and this track may not edit it, so there was no way to LOOK at
 * `HeadphonePrompt` beside the controls it has to coexist with. This stands the flat layer up on its own: the
 * sky, `.bh-enter`, a purse in the top left, `MuteButton` in the top right, and the invitation in the middle
 * — all of them the real classes from `game.css` and `economy.css`, and both audio controls the real shipped
 * components. What this page shows is what mounting `<HeadphonePrompt />` in `.bh-hud` will show.
 *
 * The purse is markup rather than `<Purse />`: the point is the RECTANGLE it occupies, and reaching into
 * `economy/` for a live coin store to prove a collision that is about geometry would be the wrong dependency.
 *
 * Delete with `phones.html` once the prompt is mounted for real.
 *
 *     http://127.0.0.1:5230/game/audio/phones.html          the invitation, before any gesture
 *     http://127.0.0.1:5230/game/audio/phones.html?quiet=1  prefers-reduced-motion — nothing should appear
 */
import { StrictMode, type JSX } from 'react';
import { createRoot } from 'react-dom/client';

import { AudioProvider, HeadphonePrompt, MuteButton } from './index';
import '../game.css';
import '../economy/economy.css';

function Stage(): JSX.Element {
  return (
    <div className="bh-root">
      {/* Standing in for the Canvas: the sky and the grass, at the colours `Game.tsx` renders them. */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, background: 'linear-gradient(#bfe4f2 0 58%, #8cc07a 58% 100%)' }}
      />

      {/* The real entry button, which is also the gesture: clicking it is what a child does first. */}
      <button type="button" className="bh-enter">
        Click to look around · WASD to walk · Space to hop
      </button>

      <div className="bh-hud">
        <div className="ec-purse" aria-live="off">
          <span className="ec-coin" aria-hidden="true" />
          <p className="ec-purse-count">0</p>
        </div>
        <MuteButton />
        <HeadphonePrompt />
        <p className="bh-cares">0 looked after</p>
      </div>
    </div>
  );
}

const host = document.getElementById('root')!;
const store = window as unknown as { __phonesRoot?: ReturnType<typeof createRoot> };
store.__phonesRoot ??= createRoot(host);
store.__phonesRoot.render(
  <StrictMode>
    <AudioProvider>
      <Stage />
    </AudioProvider>
  </StrictMode>,
);
