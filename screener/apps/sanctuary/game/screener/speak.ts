/**
 * The log, told out loud — and completely silent when it cannot be.
 *
 * WHY. `VER-SEQUENCE-01` events are sentences, and a K-2 child cannot read them. `eventMeaning.ts`
 * turns each one into a picture so the item is answerable without reading; this file is the second
 * channel, and since the owner's note it is the PRIMARY one: the station says the whole thing out loud,
 * once, start to finish, and the child picks the row of pictures that puts it in order. It used to say
 * one sentence at a time as a hand swept across the slabs, which made a story into twelve disconnected
 * words and made hearing it at all a matter of aiming.
 *
 * WHAT `storyLines` MAY AND MAY NOT SAY, which is the whole reason it lives in a function of its own
 * rather than as a template inside the component. THE `events` ARRAY IS NOT IN STORY ORDER. Every one of
 * the 100 items in the bank has a `correctKey` pointing at an option whose `order` is NOT `[0, 1, 2 ...]`
 * — verified over the whole bank, 100 out of 100 — so `events` is a bag of story parts that has already
 * been shuffled by whatever built the bank, and the TRUE order lives only in the answer, which is not
 * served to the client and which nothing in this directory is allowed to know.
 *
 * That has a hard consequence for the wording. A narration that runs the parts together as prose ("I get
 * dressed. I wake up. I go to school.") is telling the child a story that did not happen in that order,
 * and a child who dutifully picks the row that matches what they heard picks the SHUFFLE — which the
 * server then marks against the real order. It would look like a child who cannot sequence a story, on
 * every verbal item, for every child, with nothing anywhere reporting a fault. So the narration says
 * out loud that the parts are mixed up, then says them, then says the item's own authored prompt. It
 * delivers what was asked for — one press, the whole thing spoken, no hovering — without claiming an
 * order it does not have.
 *
 * EVERY BRANCH HERE IS A GUARD, and that is the point. `speechSynthesis` is missing in some embeddings,
 * throws on some Linux builds with no voices installed, is silently blocked until a user gesture in
 * others, accepts an utterance and then never speaks it in others still, and is entirely absent under a
 * headless screenshot. All of that has to end in "the game works, quietly". So the whole thing is
 * wrapped, nothing is awaited, and the ONE thing a caller learns is the difference between "talking" and
 * "this machine has no voice" — which the log needs, because a station that cannot speak has to hand the
 * child a different way in rather than glow at them about a story they will never hear.
 *
 * RATE is well below default: a child following along needs it slower than a screen reader user does.
 */

/** Slower than a screen reader, higher than a newsreader. Chosen by listening, not by taste. */
const RATE = 0.84;
const PITCH = 1.05;

/** Between sentences. Long enough to hear a full stop; short enough that nobody thinks it has finished. */
const GAP_MS = 480;

/**
 * How long the first sentence gets to actually BEGIN before this platform is declared voiceless.
 *
 * This is the only reliable capability test there is. `window.speechSynthesis` existing proves nothing —
 * a Linux box with no voice packages, a locked-down school image and a headless Chrome all present the
 * full API and then say nothing at all, firing neither `start` nor `error`. So support is decided by
 * whether a voice was HEARD to start, not by whether the object exists.
 */
const FIRST_WORD_MS = 2400;

/** The last thing said, so sweeping a mouse back and forth does not stutter one sentence twenty times. */
let lastText = '';
let lastAt = 0;

/**
 * Which telling is current. Bumped by everything that starts or stops speech, and checked by every
 * callback and every timer, so a narration that has been cancelled cannot advance itself one sentence
 * later from inside a queued utterance's `onend`.
 */
let gen = 0;

/** Timers belonging to the current telling, so leaving an item does not leave one armed for ten seconds. */
const pending = new Set<ReturnType<typeof setTimeout>>();

function clearPending(): void {
  for (const t of pending) clearTimeout(t);
  pending.clear();
}

function synth(): SpeechSynthesis | null {
  try {
    if (typeof window === 'undefined') return null;
    const s = window.speechSynthesis;
    if (!s || typeof window.SpeechSynthesisUtterance !== 'function') return null;
    return s;
  } catch {
    return null;
  }
}

/** Whether there is an API to try at all. NOT whether it will make a sound — see `FIRST_WORD_MS`. */
export function canSpeak(): boolean {
  return synth() !== null;
}

/* ============================================================================
   what gets said
   ========================================================================== */

/**
 * The opening, and the load-bearing sentence in this file.
 *
 * "All mixed up" is not decoration. It is the difference between a narration that tells the child the
 * answer's shape and one that tells them the truth: these are the parts, they are out of order, that is
 * the puzzle. Read the note at the top of the file before changing a word of it.
 */
const OPENING = 'Listen. Here are the parts of a story, all mixed up.';

/** Used only if an item arrives with no authored prompt. The bank's own wording, so it cannot drift. */
const CLOSING = 'Put the story parts in the order they happen.';

/**
 * Everything the log says, in the order it says it: the opening, every happening, then the ask.
 *
 * Pure and free of `window`, so `coverage.ts` and any other node-side check can print exactly what a
 * child would hear for a real item without booting a browser.
 */
export function storyLines(content: Record<string, unknown>): string[] {
  const raw = Array.isArray(content.events) ? (content.events as Record<string, unknown>[]) : [];
  const parts = raw
    .map((e) => (typeof e?.text === 'string' ? e.text.trim() : ''))
    .filter((t) => t.length > 0);
  if (parts.length === 0) return [];
  const authored = typeof content.prompt === 'string' ? content.prompt.trim() : '';
  return [OPENING, ...parts, authored.length > 0 ? authored : CLOSING];
}

/* ============================================================================
   saying it
   ========================================================================== */

export type NarrationState =
  /** A voice is working through the lines right now. */
  | 'speaking'
  /** It finished, or nothing has been asked for yet. */
  | 'idle'
  /** This machine has no voice. The caller must offer another way in. */
  | 'unavailable';

/** A rough upper bound on one sentence, for the stall watchdog. Deliberately far too generous. */
function estimateMs(text: string): number {
  return 1200 + text.length * 130;
}

/**
 * Say all of it, one sentence at a time with a breath between, reporting only whether a voice exists.
 *
 * Sentence by sentence rather than as one long utterance because `speechSynthesis` has no pause control
 * and jams sentences together at this rate; and because a per-sentence `onend` is the only hook there is
 * for putting a gap in. Calling this again cancels whatever is being said and starts over from the top,
 * which is what a child who has lost the thread means when they press the horn a second time.
 */
export function narrate(lines: readonly string[], onState?: (state: NarrationState) => void): void {
  const said = lines.map((l) => l.trim()).filter((l) => l.length > 0);
  const s = synth();

  gen += 1;
  const mine = gen;
  clearPending();
  lastText = '';

  if (!s || said.length === 0) {
    onState?.('unavailable');
    return;
  }

  /** Whether any voice was ever heard to start. Decides "finished quietly" from "never had a voice". */
  let heard = false;

  const later = (ms: number, then: () => void): ReturnType<typeof setTimeout> => {
    const t = setTimeout(() => {
      pending.delete(t);
      if (gen !== mine) return;
      then();
    }, ms);
    pending.add(t);
    return t;
  };

  const finish = (state: NarrationState): void => {
    if (gen !== mine) return;
    clearPending();
    onState?.(state);
  };

  const step = (i: number): void => {
    if (gen !== mine) return;
    const text = said[i];
    if (text === undefined) {
      finish('idle');
      return;
    }

    let u: SpeechSynthesisUtterance;
    try {
      u = new window.SpeechSynthesisUtterance(text);
    } catch {
      finish(heard ? 'idle' : 'unavailable');
      return;
    }
    u.rate = RATE;
    u.pitch = PITCH;
    u.volume = 1;

    /** Each sentence advances the telling exactly once, whichever of the three routes gets there. */
    let moved = false;
    const onward = (): void => {
      if (moved || gen !== mine) return;
      moved = true;
      later(GAP_MS, () => step(i + 1));
    };

    u.onstart = () => {
      heard = true;
    };
    u.onend = onward;
    u.onerror = () => {
      // `interrupted` fires on every cancel, including the one two lines below — but a cancel has
      // always bumped `gen`, so those land on a telling that is no longer current and stop there.
      if (heard) onward();
      else finish('unavailable');
    };

    /**
     * The watchdog, and the reason the horn can never glow forever. Some platforms report support,
     * accept an utterance, and then fire nothing at all — no `start`, no `end`, no `error`. Without
     * this the log would sit lit while a child waited for a voice that was never coming.
     */
    later(heard ? estimateMs(text) : FIRST_WORD_MS, () => {
      if (heard) onward();
      else finish('unavailable');
    });

    try {
      s.speak(u);
    } catch {
      finish(heard ? 'idle' : 'unavailable');
    }
  };

  try {
    s.cancel();
  } catch {
    /* nothing was queued */
  }
  onState?.('speaking');
  step(0);
}

/**
 * Say one sentence, or do nothing at all.
 *
 * Kept for the voiceless fallback's sake and for the machine whose voices load late: if a story could
 * not be told, inspecting one happening at a time is still offered, and if a voice turns up in the
 * meantime that inspection starts working with no state to change. Repeats within a second are dropped;
 * a different sentence interrupts.
 */
export function speak(text: string): void {
  const s = synth();
  if (!s) return;
  const now = Date.now();
  if (text === lastText && now - lastAt < 1000) return;
  lastText = text;
  lastAt = now;
  // Anything queued by a narration is abandoned rather than talked over, and its timers stop with it.
  gen += 1;
  clearPending();
  try {
    s.cancel();
    const u = new window.SpeechSynthesisUtterance(text);
    u.rate = RATE;
    u.pitch = PITCH;
    u.volume = 1;
    s.speak(u);
  } catch {
    // Voices unavailable, blocked, or the platform lied about support. Stay silent.
  }
}

/** Stop mid-sentence. Called when an item is left, so the next one does not talk over itself. */
export function hushSpeech(): void {
  gen += 1;
  clearPending();
  lastText = '';
  const s = synth();
  if (!s) return;
  try {
    s.cancel();
  } catch {
    /* nothing to stop */
  }
}
