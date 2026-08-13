import { createContext, useContext, useEffect, useState, useSyncExternalStore, type JSX, type ReactNode } from 'react';

import { acquireAudio, audioApi, audioGestured, releaseAudio, subscribeGestured, type AudioApi } from './engine';
import { muted, prefersReducedMotion, toggleMuted, useMuted } from './mute';

/**
 * THE FOUR THINGS `Game.tsx` TOUCHES. Everything else in this directory is reachable only through here.
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

/* ------------------------------------------------------------------ *\
   The headphone invitation
\* ------------------------------------------------------------------ */

/** Whether the first gesture has happened, as a hook. Flips exactly once, then never again. */
function useGestured(): boolean {
  return useSyncExternalStore(subscribeGestured, audioGestured, audioGestured);
}

/** How long the invitation takes to get out of the way once the child has pressed something. */
const FADE_MS = 460;

/**
 * The keyframes, and the only reason this file emits a `<style>` element.
 *
 * `game.css` belongs to the integrator and this directory may not edit it, so — exactly as `MuteButton`
 * argues for its inline styles — the invitation has to arrive complete. Inline styles cannot express
 * `@keyframes`, and the alternative, driving a pulse from `requestAnimationFrame`, would spend a React
 * render every frame on a decoration that sits over a 3D scene. One scoped rule block is the cheaper trade.
 *
 * The names are prefixed like the rest of the app's classes so they cannot collide with the integrator's.
 * The reduced-motion block is belt and braces: the component already refuses to render at all in that case,
 * and would still be still if it somehow did.
 */
const PROMPT_CSS = `
@keyframes bh-phones-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.075); }
}
@keyframes bh-phones-halo {
  0% { transform: scale(0.79); opacity: 0.62; }
  75%, 100% { transform: scale(1.34); opacity: 0; }
}
@keyframes bh-phones-arrive {
  from { transform: scale(0.62); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .bh-phones-disc, .bh-phones-halo { animation: none !important; }
}
`;

/**
 * PUT YOUR HEADPHONES ON — said to a child who cannot read, before anything has happened.
 *
 * ══ THE OWNER'S REQUEST ═══════════════════════════════════════════════════════════════════════════
 *
 *   "make sure it's obvious somewhere for a child to put on headphones or head audio or something. i see
 *    that you have a little speaker thing playing at the top but before anything even happens, it should
 *    have like a volume or headphone icon flashing at the top or something."
 *
 * Mount it beside `MuteButton` in the flat HUD. It renders a 132 px headphone disc at the top centre, warm,
 * gently breathing, with one soft halo travelling out of it — and then it leaves.
 *
 * ══ WHY THE ICON HAS TO CARRY IT ══════════════════════════════════════════════════════════════════
 *
 * The audience is five. The drawn headphones ARE the message: a headband arc over two filled ear cups, at
 * 78 px, which is a shape a child recognises from the family television long before they can read the word.
 * The line of text underneath is for the adult in the room and is deliberately secondary — smaller, quieter,
 * and removable without the invitation losing its meaning. Nothing here depends on a font's glyph coverage
 * or on an emoji, both of which vary by machine and neither of which a school image can be trusted to have.
 *
 * UNMISSABLE WITHOUT BEING ALARMING is the whole brief, and it is a matter of which channel does the work.
 * Size, contrast against the sky, and a slow 2.4 s breath do the noticing. What it never does is startle:
 * no red, nothing that flashes (the breath never leaves 1 → 1.075, and its opacity never drops below 0.9),
 * no sound of its own — a chime to ask for headphones would be the joke that writes itself — and no
 * hard-edged transition anywhere. It uses the ranch's own amber and the same 0-offset drop shadow as every
 * other flat-layer control, so it reads as part of the place rather than as a browser warning.
 *
 * ══ IT NEVER BLOCKS THE GAME ══════════════════════════════════════════════════════════════════════
 *
 * `pointerEvents: 'none'` throughout, and there is nothing to dismiss. It is an invitation, not a modal:
 * the press that starts the game is also the press that ends it, so a child who ignores it entirely loses
 * nothing and a child who has already got headphones on is not asked to acknowledge anything. Top centre is
 * free before the first gesture — the purse owns the top left, `MuteButton` the top right, `.bh-enter` the
 * bottom — and it sits at z-index 8 beside the mute control, over the flying coins.
 *
 * ══ THE TWO THINGS THAT MATTER MOST ═══════════════════════════════════════════════════════════════
 *
 *   IT IS ABSENT UNDER `prefers-reduced-motion`. That path starts MUTED on purpose (see `mute.ts`), so the
 *   invitation would be asking a child to fetch headphones in order to hear nothing at all — worse than
 *   saying nothing, and it would be a pulsing thing on the screen of the one child who has asked for no
 *   pulsing things. It is also absent whenever the game starts muted for any other reason, which is the same
 *   argument without the media query. Both are read ONCE, at mount, so the invitation cannot pop into
 *   existence later because an adult happened to unmute.
 *
 *   IT DOES NOT PULSE FOREVER. On the first gesture it fades out over `FADE_MS`, shrinking slightly as it
 *   goes, and then unmounts for good — the engine's `gestured` flag is sticky, so nothing brings it back.
 *   From that moment `MuteButton` is the only audio affordance on screen, which is the point: two of them is
 *   a decision to make rather than a control to press. Note the flag is "a gesture happened", NOT "an
 *   AudioContext exists", so a machine with no Web Audio still sees the invitation go away.
 */
/**
 * ══ WHY THERE IS A `during` PROP ═══════════════════════════════════════════════════════════════════
 *
 * The gesture gate above is the ORIGINAL behaviour and it was wrong for this game, for two reasons the
 * owner found by playing it: it sat at the top of the screen and never left ("perpetually stuck"), and
 * it asked for headphones during parts of the game that make no speech at all.
 *
 * Only ONE thing here speaks: the verbal story. Everything else is squelches and a soft pad, which a
 * child can happily play without. So the invitation belongs to the verbal round and nowhere else — an
 * always-on plea is noise, and noise is what gets ignored precisely when it matters.
 *
 * Pass `during` and the gesture gate is bypassed entirely: visible exactly while the flag is true,
 * fading on the way out. Which also means it can be shown MORE than once — a child meets the story
 * again on a later visit and may well have taken the headphones off since. The gesture flag could never
 * express that, because it is sticky by design.
 *
 * Omit `during` and the original first-gesture behaviour is unchanged, so `verify.mjs`'s checks and any
 * other mount still hold.
 */
export function HeadphonePrompt({ during }: { during?: boolean } = {}): JSX.Element | null {
  const gestured = useGestured();
  const gated = during === undefined;

  /** True when the thing should be on its way out: the gesture, or the flag going false. */
  const leaving = gated ? gestured : !during;

  /**
   * Read at mount and never again, on purpose — see the note above. `useState`'s initialiser rather than a
   * `useMemo` because this must be a fact about this mount, not a value that a dependency could refresh.
   */
  const [suppressed] = useState(() => prefersReducedMotion() || muted());

  /**
   * Kept mounted for the length of the fade, then gone.
   *
   * Only the gesture-gated path unmounts for good. On the `during` path this must stay reversible, or the
   * first verbal round would be the only one that ever showed it.
   */
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!gated || !gestured) return;
    const t = window.setTimeout(() => setGone(true), FADE_MS + 60);
    return () => window.clearTimeout(t);
  }, [gated, gestured]);

  /**
   * On the `during` path: present from the moment the flag goes true, and torn down `FADE_MS` after it goes
   * false so the fade-out is seen rather than cut. Not rendered at all before the first verbal round —
   * rendering it invisibly would park an aria-labelled status node in the accessibility tree all session,
   * which a screen reader would announce as present while a sighted child sees nothing.
   */
  const [present, setPresent] = useState(false);
  useEffect(() => {
    if (gated) return;
    if (during) {
      setPresent(true);
      return;
    }
    if (!present) return;
    const t = window.setTimeout(() => setPresent(false), FADE_MS + 60);
    return () => window.clearTimeout(t);
  }, [gated, during, present]);

  if (suppressed || gone) return null;
  if (!gated && !present) return null;

  return (
    <>
      <style>{PROMPT_CSS}</style>
      <div
        role="status"
        aria-label="Put your headphones on"
        style={{
          position: 'fixed',
          top: '1.1rem',
          // Centred on the screen rather than inside `.bh-hud`, which is a bottom-edge flex row.
          left: '50%',
          zIndex: 8,
          display: 'grid',
          justifyItems: 'center',
          // No gap: the disc's box is deliberately roomier than the disc (see below), which is where the
          // clearance under it comes from. A `gap` on top of that reads as a gap twice as big as it is.
          gap: 0,
          // The fade-out. Transform and opacity only, so it costs no layout on the way out.
          transform: `translateX(-50%) scale(${leaving ? 0.88 : 1})`,
          opacity: leaving ? 0 : 1,
          transition: `opacity ${FADE_MS}ms ease-out, transform ${FADE_MS}ms ease-out`,
          // An invitation, never a gate. Every press goes through to the game underneath.
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {/* 168 for a 132 disc, and the 36 px of slack is doing two jobs a screenshot found: the breath
            scales the disc to 142, and the halo has to start OUTSIDE the disc's edge to read as a ring
            rather than as a rim on it. Without the slack both of them overran the label underneath. */}
        <div style={{ position: 'relative', width: 168, height: 168, display: 'grid', placeItems: 'center' }}>
          {/* The halo, behind the disc: one soft ring leaving every 2.4 s. Reads as "listen" rather than
              as "warning" because it travels outward and dies, instead of blinking on and off. */}
          <span
            className="bh-phones-halo"
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 999,
              border: '7px solid #ffd76b',
              // Paused rather than removed while leaving, so the ring does not restart mid-fade.
              animation: 'bh-phones-halo 2400ms ease-out infinite',
              animationPlayState: gestured ? 'paused' : 'running',
              opacity: gestured ? 0 : undefined,
            }}
          />
          <div
            className="bh-phones-disc"
            style={{
              width: 132,
              height: 132,
              borderRadius: 999,
              display: 'grid',
              placeItems: 'center',
              background: '#ffd76b',
              // The same 0-offset drop shadow the rest of the flat layer uses.
              boxShadow: '0 7px 0 #e0ac3a',
              color: '#4a3218',
              // Arrives once, then breathes. The delay hands over exactly as the arrival finishes.
              animation: gestured
                ? 'none'
                : 'bh-phones-arrive 520ms cubic-bezier(0.2, 1.2, 0.4, 1) both, bh-phones-breathe 2400ms ease-in-out 520ms infinite',
            }}
          >
            {/* Headphones, drawn: a headband over two fat ear cups. No glyph, no emoji, no font.
                The cups are deliberately CHUNKY — a first pass drew them as thin tabs and at a child's
                glance the whole thing read as an arch rather than as something you wear. */}
            <svg width="78" height="78" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
              <path
                d="M8.8 30v-6a15.2 15.2 0 0 1 30.4 0v6"
                fill="none"
                stroke="currentColor"
                strokeWidth="4.8"
                strokeLinecap="round"
              />
              <rect x="4.4" y="27.6" width="8.8" height="15.2" rx="4.4" fill="currentColor" />
              <rect x="34.8" y="27.6" width="8.8" height="15.2" rx="4.4" fill="currentColor" />
            </svg>
          </div>
        </div>
        {/* Secondary by design: the icon has already said it. */}
        <p
          style={{
            margin: 0,
            padding: '0.4rem 0.9rem',
            borderRadius: 999,
            background: 'rgb(255 255 255 / 0.86)',
            color: '#5a4326',
            fontWeight: 800,
            fontSize: '0.95rem',
            whiteSpace: 'nowrap',
          }}
        >
          Headphones on, please
        </p>
      </div>
    </>
  );
}
