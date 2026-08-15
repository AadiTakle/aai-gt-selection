import { GENTLE_LEVEL, createBus, rampTo, type Bus } from './bus';
import { muted, subscribeMuted, toggleMuted } from './mute';
import { createPad, type Pad } from './pad';
import { createVacuum, type Vacuum } from './vacuum';
import { createVoices, type Voices } from './voices';

/**
 * THE LIVE ENGINE. Owns the one AudioContext, decides when it may exist, and is the only file here that
 * knows what time it is.
 *
 * ══ THE GESTURE GATE, WHICH IS THE WHOLE OF THE AUTOPLAY PROBLEM ══════════════════════════════════
 *
 * Every browser refuses to let a page make a sound until the user has done something. The failure modes
 * are both bad: construct an AudioContext too early and you get a suspended context, a console warning,
 * and — if a `start()` was called meanwhile — a burst of everything at once when it finally resumes.
 *
 * So NO AUDIOCONTEXT IS CONSTRUCTED UNTIL A GESTURE HAS HAPPENED. Before that, every method on the API is
 * a no-op: silent, allocation-free, and incapable of throwing. Nothing queues up. A `suckStart` that
 * arrives before the first click is simply lost, which is correct — the click that started the game IS
 * the gesture, and it is captured on `pointerdown` in the CAPTURE phase at window level, so the engine
 * exists before any React handler on that same press runs.
 *
 * The listeners stay installed for the life of the provider rather than being removed after the first
 * gesture, because a context can be suspended again later: by mute, by the tab being hidden, or by the
 * browser deciding to. Every subsequent gesture is another chance to resume, and the handler costs a
 * string comparison.
 *
 * IF THE PAGE STARTS MUTED — which is what `prefers-reduced-motion` does — no context is created at all,
 * ever, until somebody unmutes. That is the strongest form of "silent and harmless".
 *
 * ══ WHY THE API FUNCTIONS ARE MODULE CONSTANTS ════════════════════════════════════════════════════
 *
 * `useAudio()` hands these straight to callers, who will put them in effect dependency arrays. They are
 * defined once at module scope and close over a mutable `live`, so their identity never changes and they
 * cannot make a consumer's effect re-run. That is also what makes them safe to call before, during and
 * after the engine's existence.
 *
 * ══ WHY REFERENCE COUNTING ═══════════════════════════════════════════════════════════════════════
 *
 * React 19 StrictMode mounts, unmounts and remounts a provider. A naive `dispose` on unmount closes the
 * context on the first of those and the second mount is left with a closed one — silence, in development
 * only, which is the most expensive kind of bug to find. So `acquire`/`release` count, and the teardown
 * that a release schedules is cancelled if an acquire arrives in the same tick.
 */

interface Live {
  ctx: AudioContext;
  bus: Bus;
  voices: Voices;
  pad: Pad;
  /** Built on the first `suckStart` rather than up front: it is four filters and two noise buffers. */
  vacuum: Vacuum | null;
  padTimer: number | null;
  sucking: boolean;
}

let live: Live | null = null;
let refs = 0;
let teardownTimer: number | null = null;
let listening = false;
let unsubscribeMute: (() => void) | null = null;

/** How far ahead the pad scheduler fills, and how often it runs. Generous: the notes are 12 s long. */
const PAD_HORIZON = 10;
const PAD_TICK = 2500;

/** A hair in the future, so a one-shot is never scheduled at a time that has already gone past. */
function soon(ctx: AudioContext): number {
  return ctx.currentTime + 0.005;
}

function fadeIn(l: Live): void {
  rampTo(l.bus.master.gain, l.ctx.currentTime, GENTLE_LEVEL, 0.4);
}

function fadeOut(l: Live): void {
  rampTo(l.bus.master.gain, l.ctx.currentTime, 0, 0.18);
}

function startPadTimer(l: Live): void {
  if (l.padTimer !== null) return;
  l.pad.scheduleUntil(l.ctx.currentTime, PAD_HORIZON);
  l.padTimer = window.setInterval(() => {
    // A suspended context's clock is frozen. Scheduling against a frozen clock would pile every note that
    // "should" have played into the moment it resumes, which is a chord nobody asked for.
    if (!live || live.ctx.state !== 'running') return;
    live.pad.scheduleUntil(live.ctx.currentTime, PAD_HORIZON);
  }, PAD_TICK);
}

function stopPadTimer(l: Live): void {
  if (l.padTimer === null) return;
  window.clearInterval(l.padTimer);
  l.padTimer = null;
}

/**
 * Build the engine, if it is allowed to exist yet.
 *
 * Returns null when muted or when there is no Web Audio at all. Both are ordinary states, not errors: an
 * old browser without an AudioContext gets a completely silent game rather than a broken one.
 */
function ensureLive(): Live | null {
  if (live) return live;
  if (muted()) return null;
  const Ctor: typeof AudioContext | undefined =
    typeof window === 'undefined'
      ? undefined
      : window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  let ctx: AudioContext;
  try {
    // `interactive` is the default, and it is the right one: it asks for the shortest output latency the
    // device will give, which is what keeps a squelch feeling attached to the mouse press that caused it.
    ctx = new Ctor({ latencyHint: 'interactive' });
  } catch {
    // Out of audio contexts (Safari caps them), or audio disabled at the OS level. Stay silent.
    return null;
  }

  const bus = createBus(ctx);
  const built: Live = {
    ctx,
    bus,
    voices: createVoices(),
    pad: createPad(ctx, bus.pad),
    vacuum: null,
    padTimer: null,
    sucking: false,
  };
  live = built;

  void ctx.resume().catch(() => {
    // Refused because we are not in a gesture after all. The gesture listeners will try again; nothing is
    // audible in the meantime because the master gain is still zero.
  });
  fadeIn(built);
  built.pad.start(ctx.currentTime);
  startPadTimer(built);
  return built;
}

/**
 * The context the last teardown closed, kept for one reason only: so `verify.mjs` can prove that unmounting
 * really closed it rather than merely dropping the reference. A closed AudioContext holds nothing — its state
 * string is all that is left of it — so this is a few bytes, and "a leaked oscillator is a stuck tone" is not
 * a promise to make without a way to check it.
 */
let lastClosed: AudioContext | null = null;

function disposeLive(): void {
  const l = live;
  live = null;
  if (!l) return;
  lastClosed = l.ctx;
  stopPadTimer(l);
  l.vacuum?.dispose();
  l.pad.dispose();
  l.bus.dispose();
  void l.ctx.close().catch(() => {
    // Already closed, or closing twice. Nothing left to do either way.
  });
}

/* ------------------------------------------------------------------ *\
   Gestures, mute, and the tab going away
\* ------------------------------------------------------------------ */

/**
 * WHETHER THE FIRST GESTURE HAS HAPPENED, which is the one fact the pre-gesture headphone invitation in
 * `useAudio.tsx` needs and the one fact nothing else here was recording.
 *
 * It is deliberately NOT "an AudioContext exists". A machine with no Web Audio at all, or a Safari that has
 * run out of contexts, never gets a `live` — and a prompt keyed on `live` would then pulse at the child
 * forever, which is the exact failure the invitation must not have. So this is the honest question: has the
 * child touched the page yet? Once they have, the invitation's moment is over whatever the audio did.
 *
 * Sticky for the life of the page rather than reset by `disposeLive`. StrictMode's mount/unmount/remount all
 * happen before any gesture, so there is nothing to preserve there; and after a real gesture, a provider
 * remount must not bring the invitation back on top of a game already in progress.
 */
let gestured = false;
const gestureListeners = new Set<() => void>();

/** Has the page had its first `pointerdown`, `touchstart` or `keydown`? */
export function audioGestured(): boolean {
  return gestured;
}

export function subscribeGestured(l: () => void): () => void {
  gestureListeners.add(l);
  return () => {
    gestureListeners.delete(l);
  };
}

function markGestured(): void {
  if (gestured) return;
  gestured = true;
  // Synchronously, inside the gesture. The invitation is fading out in response to this press, and a frame
  // where the press has visibly done something is worth more than a frame saved.
  for (const l of gestureListeners) l();
}

function onGesture(): void {
  markGestured();
  const l = ensureLive();
  if (!l) return;
  if (l.ctx.state === 'suspended') {
    void l.ctx.resume().catch(() => {
      // Still not allowed. Try again on the next gesture.
    });
  }
}

/**
 * The keyboard mute, and it is not a convenience.
 *
 * The ranch runs under POINTER LOCK. While it is locked there is no cursor, so `MuteButton` — or any other
 * button — literally cannot be clicked: an adult would have to press Escape first and then find the
 * button, which is two steps and a menu by any honest reading. M is the one press the brief asks for, and
 * it works locked or unlocked.
 *
 * Guarded so it cannot fire inside a text field or steal a browser shortcut. Nothing else in the game
 * binds M — checked against `Game.tsx` (WASD, Space, Escape), `vacpack` (Q), `Stations` and `Shop`.
 */
function onKey(e: KeyboardEvent): void {
  onGesture();
  if (e.code !== 'KeyM' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  const el = document.activeElement;
  const tag = el?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as HTMLElement | null)?.isContentEditable) return;
  // Synchronously, inside the keypress. `setMuted` notifies its listeners synchronously for exactly this
  // reason — see the note there — so the resume that follows happens inside the gesture that asked for it.
  toggleMuted();
}

function onMuteChanged(): void {
  if (muted()) {
    const l = live;
    if (!l) return;
    // A vacuum left running through a mute would come back at full level the moment the sound is turned
    // on again, whether or not the child is still holding the button.
    if (l.sucking) {
      l.sucking = false;
      l.vacuum?.stop(l.ctx.currentTime);
    }
    stopPadTimer(l);
    l.pad.stop(l.ctx.currentTime);
    fadeOut(l);
    // Suspended after the fade so a muted game costs no battery, and kept rather than closed so unmuting
    // is instant. `setTimeout` rather than the audio clock because this is a lifecycle action, not a sound.
    window.setTimeout(() => {
      if (live && muted() && live.ctx.state === 'running') {
        void live.ctx.suspend().catch(() => {
          // Nothing to do; it will be suspended on the next attempt or never, and silence is already set.
        });
      }
    }, 260);
    return;
  }
  // Unmuting. This always happens inside a click or a keypress, so a resume here is permitted.
  const l = ensureLive();
  if (!l) return;
  void l.ctx.resume().catch(() => {
    // See `onGesture`.
  });
  fadeIn(l);
  l.pad.start(l.ctx.currentTime);
  startPadTimer(l);
}

/**
 * A hidden tab must not keep vacuuming. Browsers do not reliably suspend audio for a backgrounded tab, and
 * a suction loop coming out of a laptop that a parent thinks they have put away is the kind of thing that
 * gets a game closed for good.
 */
function onVisibility(): void {
  const l = live;
  if (!l) return;
  if (document.visibilityState === 'hidden') {
    if (l.sucking) {
      l.sucking = false;
      l.vacuum?.stop(l.ctx.currentTime);
    }
    stopPadTimer(l);
    fadeOut(l);
    window.setTimeout(() => {
      if (live && document.visibilityState === 'hidden' && live.ctx.state === 'running') {
        void live.ctx.suspend().catch(() => {});
      }
    }, 260);
  } else if (!muted()) {
    void l.ctx.resume().catch(() => {});
    fadeIn(l);
    startPadTimer(l);
  }
}

function listen(): void {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  // Capture phase, so the context exists before any React handler on the same press can ask for a sound.
  window.addEventListener('pointerdown', onGesture, true);
  window.addEventListener('touchstart', onGesture, true);
  window.addEventListener('keydown', onKey, true);
  document.addEventListener('visibilitychange', onVisibility);
  unsubscribeMute = subscribeMuted(onMuteChanged);
}

function unlisten(): void {
  if (!listening) return;
  listening = false;
  window.removeEventListener('pointerdown', onGesture, true);
  window.removeEventListener('touchstart', onGesture, true);
  window.removeEventListener('keydown', onKey, true);
  document.removeEventListener('visibilitychange', onVisibility);
  unsubscribeMute?.();
  unsubscribeMute = null;
}

/* ------------------------------------------------------------------ *\
   The public surface
\* ------------------------------------------------------------------ */

/**
 * Exactly the shape `Game.tsx` was promised. `coin` and `hatch` are optional in the type and always
 * present in fact, so a caller may feature-test them and will always find them.
 */
export interface AudioApi {
  /** A slime drawn into the pack. */
  squish: () => void;
  /** A slime landing at the end of its arc. */
  land: () => void;
  /** The release itself. */
  plop: () => void;
  suckStart: () => void;
  suckStop: () => void;
  coin?: () => void;
  hatch?: () => void;
  /** The answer was the keyed one. */
  right?: () => void;
  /** It was not, and this is an acknowledgement rather than a buzzer. See `voices.ts`. */
  wrong?: () => void;
}

/**
 * The engine, but only if it is allowed to make a sound right now.
 *
 * The `muted()` half is not redundant with the master gain being at zero. A muted engine is KEPT rather than
 * closed, so that unmuting is instant — which means it is still there to be scheduled into, and without this
 * guard a muted session would build a squelch graph on every capture and run a full vacuum through a silent
 * master. Inaudible, but it is real work on a child's laptop in return for nothing, and it means the state
 * the engine reports while muted no longer matches what a listener would hear. Muted means nothing happens.
 */
function active(): Live | null {
  const l = live;
  if (!l || muted()) return null;
  return l;
}

export const audioApi: AudioApi = {
  squish() {
    const l = active();
    if (!l) return;
    l.voices.squish(l.ctx, l.bus.voices, soon(l.ctx));
  },
  land() {
    const l = active();
    if (!l) return;
    l.voices.land(l.ctx, l.bus.voices, soon(l.ctx));
  },
  plop() {
    const l = active();
    if (!l) return;
    l.voices.plop(l.ctx, l.bus.voices, soon(l.ctx));
  },
  suckStart() {
    const l = active();
    if (!l || l.sucking) return;
    l.sucking = true;
    const vacuum = l.vacuum ?? (l.vacuum = createVacuum(l.ctx, l.bus.voices));
    vacuum.start(soon(l.ctx));
  },
  suckStop() {
    // NOT `active()`. A stop must go through even while muted, because the mute may have arrived in the
    // middle of a draw: `onMuteChanged` has already stopped the loop, and this is what clears the flag so
    // that unmuting does not find the engine still believing it is drawing.
    const l = live;
    if (!l || !l.sucking) return;
    l.sucking = false;
    l.vacuum?.stop(soon(l.ctx));
  },
  coin() {
    const l = active();
    if (!l) return;
    l.voices.coin(l.ctx, l.bus.voices, soon(l.ctx));
  },
  hatch() {
    const l = active();
    if (!l) return;
    l.voices.hatch(l.ctx, l.bus.voices, soon(l.ctx));
  },
  right() {
    const l = active();
    if (!l) return;
    l.voices.right(l.ctx, l.bus.voices, soon(l.ctx));
  },
  wrong() {
    const l = active();
    if (!l) return;
    l.voices.wrong(l.ctx, l.bus.voices, soon(l.ctx));
  },
};

/** Mount: install the gesture gate. Cheap, and does not create an AudioContext. */
export function acquireAudio(): void {
  refs += 1;
  if (teardownTimer !== null) {
    window.clearTimeout(teardownTimer);
    teardownTimer = null;
  }
  listen();
}

/**
 * Unmount. The teardown is deferred by a tick so that StrictMode's mount/unmount/remount does not close a
 * context the remount is about to want.
 */
export function releaseAudio(): void {
  refs = Math.max(0, refs - 1);
  if (refs > 0) return;
  if (teardownTimer !== null) window.clearTimeout(teardownTimer);
  teardownTimer = window.setTimeout(() => {
    teardownTimer = null;
    if (refs > 0) return;
    unlisten();
    disposeLive();
  }, 0);
}

/** For the preview harness's read-out and `verify.mjs`'s live checks. Not used by the game. */
export function audioState(): {
  context: string;
  sucking: boolean;
  hasVacuum: boolean;
  padRunning: boolean;
  refs: number;
  /** The state of the context the last teardown disposed of. Should be "closed". */
  disposed: string | null;
} {
  return {
    context: live ? live.ctx.state : 'none',
    sucking: live?.sucking ?? false,
    hasVacuum: !!live?.vacuum,
    padRunning: live?.padTimer !== null && live?.padTimer !== undefined,
    refs,
    disposed: lastClosed ? lastClosed.state : null,
  };
}
