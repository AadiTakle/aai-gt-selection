/**
 * The log, read out loud — and completely silent when it cannot be.
 *
 * WHY. `VER-SEQUENCE-01` events are sentences, and a K-2 child cannot read them. `eventGlyph.ts` turns
 * each one into a picture so the item is answerable without reading; this file is the second channel,
 * for the child who wants to know what the picture MEANS and for the sentences a picture only
 * approximates. Hovering or tapping a slab says its sentence.
 *
 * EVERY BRANCH HERE IS A GUARD, and that is the point. `speechSynthesis` is missing in some
 * embeddings, throws on some Linux builds with no voices installed, is silently blocked until a user
 * gesture in others, and is entirely absent under a headless screenshot. All of that has to end in
 * "the game works, quietly". So the whole thing is wrapped, nothing is awaited, no state depends on
 * it, and no caller ever learns whether a word was spoken. A game that needs its voice is a game
 * that breaks on a school laptop with the audio driver disabled.
 *
 * RATE is well below default: a child following along needs the sentence slower than a screen reader
 * user does.
 */

/** The last thing said, so sweeping a mouse back and forth does not stutter one sentence twenty times. */
let lastText = '';
let lastAt = 0;

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

/**
 * Say one sentence, or do nothing at all.
 *
 * Repeats of the same sentence within a second are dropped; a DIFFERENT sentence interrupts, because
 * a child moving along a row of slabs wants the row read in the order their hand moves, not a queue
 * that finishes describing a slab they have already left.
 */
export function speak(text: string): void {
  const s = synth();
  if (!s) return;
  const now = Date.now();
  if (text === lastText && now - lastAt < 1000) return;
  lastText = text;
  lastAt = now;
  try {
    s.cancel();
    const u = new window.SpeechSynthesisUtterance(text);
    u.rate = 0.86;
    u.pitch = 1.06;
    u.volume = 1;
    s.speak(u);
  } catch {
    // Voices unavailable, blocked, or the platform lied about support. Stay silent.
  }
}

/** Stop mid-sentence. Called when an item is left, so the next one does not talk over itself. */
export function hushSpeech(): void {
  const s = synth();
  if (!s) return;
  lastText = '';
  try {
    s.cancel();
  } catch {
    /* nothing to stop */
  }
}
