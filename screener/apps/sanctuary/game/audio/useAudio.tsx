import { createContext, useContext, useEffect, type JSX, type ReactNode } from 'react';

import { acquireAudio, audioApi, releaseAudio, type AudioApi } from './engine';
import { toggleMuted, useMuted } from './mute';

/**
 * THE THREE THINGS `Game.tsx` TOUCHES. Everything else in this directory is reachable only through here.
 *
 * The context exists so that a provider is meaningful rather than decorative, but `useAudio` FALLS BACK TO
 * THE REAL API when there is no provider above it instead of throwing. That is a deliberate choice for a
 * children's product: a missing provider should cost the game its sound effects, not its render. The same
 * decision is what lets any preview harness in this repo call `useAudio()` without ceremony.
 */

const AudioContextValue = createContext<AudioApi | null>(null);

/**
 * Mounts the gesture gate. Renders nothing of its own and creates no AudioContext — see `engine.ts` for
 * why the context cannot exist until the child clicks — so it is safe to wrap the whole app in it.
 */
export function AudioProvider({ children }: { children: ReactNode }): JSX.Element {
  useEffect(() => {
    acquireAudio();
    return () => releaseAudio();
  }, []);
  return <AudioContextValue.Provider value={audioApi}>{children}</AudioContextValue.Provider>;
}

/**
 * The five sounds, plus two optional ones.
 *
 * Every function is a module constant with a permanently stable identity, so putting any of them in a
 * dependency array is free, and calling any of them before the first gesture, while muted, or after
 * unmount is a silent no-op rather than an error.
 */
export function useAudio(): AudioApi {
  return useContext(AudioContextValue) ?? audioApi;
}

/* ------------------------------------------------------------------ *\
   The mute control
\* ------------------------------------------------------------------ */

/**
 * THE ONE PRESS THAT SILENCES EVERYTHING. Flat HUD, top right, outside the Canvas.
 *
 * ══ WHY IT IS STYLED INLINE ═══════════════════════════════════════════════════════════════════════
 *
 * `game.css` belongs to the integrator and this directory may not edit it. Inline style objects mean the
 * button arrives complete — correct on first paint, with no class that could be missing and no import
 * order to get right. It is one element; a stylesheet would be the wrong trade.
 *
 * Top right because the purse already owns the top left (`economy.css`, z-index 6), the item card owns the
 * top centre (`.bh-beat-slim`), and `.bh-hud` owns the bottom. z-index 8 puts it over the flying coins (7)
 * so it is never occluded by a reward animation.
 *
 * ══ WHAT MAKES IT USABLE BY AN ADULT IN A HURRY ═══════════════════════════════════════════════════
 *
 *   · 56 px, well past the 44 px touch minimum, and reachable in one press with no menu.
 *   · A DRAWN ICON, not a glyph or an emoji: a speaker with two arcs when on, a speaker with a cross when
 *     off. Both states are legible at a glance and neither depends on a font.
 *   · Colour is not the only difference between the states — the arcs are replaced by a cross — so it
 *     reads correctly to a colour-blind adult and in a screenshot.
 *   · `aria-pressed` and a real label, so it announces as a toggle rather than as a mystery.
 *   · It stops its own `pointerdown` from propagating. The vacpack listens for `mousedown` on the WINDOW,
 *     and while it is disabled whenever the pointer is unlocked (which is the only time this button can be
 *     clicked at all), depending on that coincidence would be fragile.
 *   · AND THE KEY. Under pointer lock there is no cursor and therefore no way to click anything, so `M`
 *     toggles mute from anywhere. That handler lives in `engine.ts` with the other input.
 */
export function MuteButton(): JSX.Element {
  const off = useMuted();

  return (
    <button
      type="button"
      aria-pressed={off}
      aria-label={off ? 'Turn sound on' : 'Turn sound off'}
      title={off ? 'Turn sound on (M)' : 'Turn sound off (M)'}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => toggleMuted()}
      style={{
        position: 'fixed',
        top: '1.1rem',
        right: '1.1rem',
        zIndex: 8,
        width: 56,
        height: 56,
        display: 'grid',
        placeItems: 'center',
        padding: 0,
        border: 0,
        borderRadius: 999,
        background: off ? '#efe2cc' : '#ffd76b',
        // The same 0-offset drop shadow the rest of the flat layer uses, so it belongs to the ranch.
        boxShadow: off ? '0 5px 0 #cbb694' : '0 5px 0 #e0ac3a',
        color: '#4a3218',
        cursor: 'pointer',
        // A child will press this by accident; a text selection highlight on a HUD button looks broken.
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        {/* The cone, drawn as one closed path so it has no seam at the throat. */}
        <path
          d="M4 9.5h3.2L12 5.4v13.2L7.2 14.5H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z"
          fill="currentColor"
        />
        {off ? (
          <g stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" fill="none">
            <path d="M16 9.5l5 5" />
            <path d="M21 9.5l-5 5" />
          </g>
        ) : (
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none">
            <path d="M15.6 9a4.4 4.4 0 0 1 0 6" />
            <path d="M18.4 6.6a8 8 0 0 1 0 10.8" />
          </g>
        )}
      </svg>
    </button>
  );
}
