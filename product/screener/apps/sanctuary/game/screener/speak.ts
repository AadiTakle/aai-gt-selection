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
 * rather than as a template inside the component.
 *
 * THE `events` ARRAY IS NOT IN STORY ORDER. Every one of the 100 items in the bank has a `correctKey`
 * pointing at an option whose `order` is NOT `[0, 1, 2 ...]` — verified over the whole bank, 100 out of
 * 100 — so `events` is a bag of story parts that has already been shuffled by whatever built the bank, and
 * the TRUE order lives only in the answer, which is not served to the client and which nothing in this
 * directory is allowed to know.
 *
 * TWO WAYS TO GET THIS WRONG, AND THE NARRATION MUST AVOID BOTH.
 *
 *   Claiming an order it does not have. A narration that runs the parts together as prose ("I get dressed.
 *   I wake up. I go to school.") tells the child a story that did not happen in that order, and a child who
 *   dutifully picks the row matching what they heard picks the SHUFFLE — which the server then marks against
 *   the real order. It would look like a child who cannot sequence a story, on every verbal item, for every
 *   child, with nothing anywhere reporting a fault.
 *
 *   Claiming the opposite. This file used to open with "Here are the parts of a story, all mixed up", which
 *   is true of the array and useless to a five-year-old: it invites a child to hold a sequence in their head
 *   and tells them in the same breath that the sequence is wrong. The owner's note is about exactly this —
 *   "the story should NEVER be mixed up, it should actually follow in chronological order, otherwise we're
 *   confusing the users for no reason". Narrating the true order is not available, because the true order IS
 *   the answer and reading it out turns a reasoning item into listening-and-matching. So the confusion is
 *   removed the only way left: THE NARRATION MAKES NO CLAIM ABOUT ORDER AT ALL, in either direction.
 *
 * WHICH MEANS THE ABSENCE HAS TO BE STRUCTURAL AS WELL AS LEXICAL. It is not enough to delete the words
 * "mixed up"; anything that makes the parts read as a RUN is the same claim by another route. So there is
 * no counting them off, no ordinals, no "and then", nothing that chains one part into the next with a rising
 * intonation, and — the part that is not wording at all — a real, EQUAL silence after every line, long
 * enough that each part lands as its own item rather than as a clause in a list. Every part is also given
 * terminal punctuation so the voice falls at the end of it instead of leading into the next one. Nothing is
 * distinguished by timing either: an extra beat anywhere would mark one part as special.
 *
 * What the child is left with is WHAT the parts are, which is exactly what a listening channel can honestly
 * give them, and the order is left to be worked out from the pictures — which is the actual task.
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

/** Between sentences generally. Long enough to hear a full stop; short enough that nobody thinks it has
 *  finished. Used for a plain string line and for the last line, which has nothing after it. */
const GAP_MS = 480;

/**
 * THE SILENCE THAT DOES THE WORK, and the reason `storyLines` returns a gap per line rather than text.
 *
 * Twice the ordinary sentence gap, applied identically after the opening and after EVERY story part. At this
 * rate that is unmistakably a stop rather than a breath, so the parts arrive as separate things that happened
 * instead of as a sequence being recited — which is the whole point, because the sequence being recited would
 * be the shuffle. Equal everywhere on purpose: a longer pause anywhere would single a part out.
 */
const PART_GAP_MS = 900;

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
 * Every word of it is chosen for what it does NOT say. "Here is what happened today" names the parts as a
 * set of things that happened — which is true, and is all that is true — and says nothing whatsoever about
 * their order, in either direction. It does not call them mixed up, which would tell a child the thing they
 * are about to hear is wrong; and it does not call them a story, in order, or anything else that would
 * promise a sequence the array does not carry. Read the note at the top of the file before changing a word.
 */
const OPENING = 'Listen. Here is what happened today.';

/** Used only if an item arrives with no authored prompt. The bank's own wording, so it cannot drift. */
const CLOSING = 'Put the story parts in the order they happen.';

/** One thing to say, and the silence to leave after saying it. */
export interface StoryLine {
  readonly text: string;
  /** How long to stay quiet before the next line. */
  readonly gapMs: number;
}

/**
 * A part ends with a full stop even if the bank's sentence did not.
 *
 * Not tidiness. `speechSynthesis` takes its intonation from punctuation, and a part without a terminal mark
 * is read with the rising, unfinished contour that leads into whatever comes next — which is precisely the
 * chaining this narration must not do. A falling contour per part is the audible version of "these are
 * separate things". The text itself is never otherwise altered; item wording is the bank's, not ours.
 */
function settled(text: string): string {
  return /[.!?…]$/.test(text) ? text : `${text}.`;
}

/**
 * Everything the log says, and the silence between: the opening, every happening, then the ask.
 *
 * NOTHING HERE IS SORTED, REORDERED OR NUMBERED. The parts come out in whatever order `content.events`
 * arrived in, because any rearrangement would be this file inventing a chronology, and no part is labelled,
 * counted or introduced. The gaps carry the separation instead — see `PART_GAP_MS`.
 *
 * Pure and free of `window`, so `coverage.ts` and any other node-side check can print exactly what a
 * child would hear for a real item without booting a browser.
 */
export function storyLines(content: Record<string, unknown>): StoryLine[] {
  const raw = Array.isArray(content.events) ? (content.events as Record<string, unknown>[]) : [];
  const parts = raw
    .map((e) => (typeof e?.text === 'string' ? e.text.trim() : ''))
    .filter((t) => t.length > 0);
  if (parts.length === 0) return [];
  const authored = typeof content.prompt === 'string' ? content.prompt.trim() : '';
  return [
    { text: OPENING, gapMs: PART_GAP_MS },
    ...parts.map((text) => ({ text: settled(text), gapMs: PART_GAP_MS })),
    // The ask, which is the item's own authored wording and the one line allowed to mention order at all.
    // Its gap is never spent: nothing follows it.
    { text: authored.length > 0 ? authored : CLOSING, gapMs: GAP_MS },
  ];
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

/** Text with no gap of its own gets the ordinary sentence gap. Trimmed and dropped if it is empty. */
function asLine(l: string | StoryLine): StoryLine | null {
  const text = (typeof l === 'string' ? l : l.text).trim();
  if (text.length === 0) return null;
  const gapMs = typeof l === 'string' ? GAP_MS : Math.max(0, l.gapMs);
  return { text, gapMs };
}

/**
 * Say all of it, one line at a time with the line's own silence after it, reporting only whether a voice
 * exists.
 *
 * Line by line rather than as one long utterance because `speechSynthesis` has no pause control and jams
 * sentences together at this rate; and because a per-utterance `onend` is the only hook there is for putting
 * a gap in. THE GAP IS THE FEATURE for `VER-SEQUENCE-01` — read this file's header — so each line carries
 * its own, and a plain string still works and still gets `GAP_MS`. Calling this again cancels whatever is
 * being said and starts over from the top, which is what a child who has lost the thread means when they
 * press the horn a second time.
 */
export function narrate(
  lines: readonly (string | StoryLine)[],
  onState?: (state: NarrationState) => void,
): void {
  const said = lines.map(asLine).filter((l): l is StoryLine => l !== null);
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
    const line = said[i];
    if (line === undefined) {
      finish('idle');
      return;
    }
    const { text, gapMs } = line;

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
      later(gapMs, () => step(i + 1));
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
