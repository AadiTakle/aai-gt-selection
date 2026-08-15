/**
 * THE TOUR, AS A STATE MACHINE THAT CANNOT TRAP AND CANNOT REPEAT.
 *
 * ══ WHY THIS IS A PURE MODULE ═════════════════════════════════════════════════════════════════════
 *
 * The two promises the tutorial has to keep are properties of a state machine rather than of a
 * component, so the machine is separated from everything that draws it and both promises are asserted
 * in `tutorial.test.ts` against this file alone:
 *
 *   IT CANNOT TRAP. Drive it with every signal false for as long as you like and it still reaches a
 *   settled state, because every step carries a finite `skipMs` and nothing anywhere waits on a
 *   condition without one. There has already been one trap bug in this game — a station that held the
 *   keeper docked with nothing on screen to press — and the failure mode for a five-year-old stuck
 *   behind an objective they cannot complete is that they leave and do not come back.
 *
 *   IT CANNOT REPEAT. `begin(now, true)` returns a machine that is settled before it has said a word,
 *   and `advance` is a fixed point on a settled machine. The caller persists the flag; this file makes
 *   the persisted flag mean something.
 *
 * ══ WHAT A STEP IS ════════════════════════════════════════════════════════════════════════════════
 *
 * A line Nan says, a drawn glyph beside her that shows the hand what to do, and a mark in the WORLD that
 * shows where to go. Those three are not alternatives. A five-year-old cannot read, so the sentence is
 * for whoever is sitting with them; the child is carried by the voice, by the glyph and by the light on
 * the ground. Anything that exists only as the sentence has not been said.
 *
 * ══ SIGNALS ARE LATCHED BY THE CALLER, AND THAT IS LOAD-BEARING ═══════════════════════════════════
 *
 * `Signals` are "has this ever happened", never "is this happening now". A child who wanders into the
 * shop and buys a slime before being asked to must not then be asked to: reaching the step with the
 * signal already true satisfies it on entry, and `advance` collapses a whole run of already-true steps
 * in one call. That is the difference between a tour and a checklist.
 */

/** The steps, in order, plus the two ways out. */
export type StepId =
  | 'greet'
  | 'look'
  | 'walk'
  | 'shop'
  | 'buy'
  | 'vac'
  | 'pen'
  | 'board'
  /** The board was taken. The tour is over and the paddock is open. */
  | 'done'
  /** The tour ran out, or was skipped. Nan goes quiet; the world is untouched and the board still stands. */
  | 'idle';

/** What is drawn beside Nan to show the hand what to do. Pictures, never words. */
export type Glyph = 'none' | 'look' | 'walk' | 'press' | 'suck' | 'plop';

/** Where the light on the ground goes. Resolved to a world point by the caller, which knows the ranch. */
export type Mark = 'none' | 'ahead' | 'shop' | 'slime' | 'pen' | 'board';

export interface Step {
  readonly id: StepId;
  /** What Nan says on arriving at this step. Spoken aloud; the text beside her is for the adult. */
  readonly line: string;
  /** Said again, shorter, if the child has stalled. Empty means she says nothing a second time. */
  readonly nudge: string;
  readonly glyph: Glyph;
  readonly mark: Mark;
  /** How long before the nudge. */
  readonly nudgeMs: number;
  /** How long before the step gives up and moves on. ALWAYS FINITE — see the header. */
  readonly skipMs: number;
}

/**
 * Nan Bramble, who is selling the ranch.
 *
 * Every line is short enough to be held in a five-year-old's head, is a warm old woman handing something
 * over rather than an instructor giving a task, and NONE of them mentions being right, being quick, being
 * clever, or how anything went. She has nothing to react to: correctness is deleted before it reaches
 * this layer, and she would not be the sort to mention it if it were not.
 *
 * THE GIFT OF COINS IN `shop` IS NOT FLAVOUR. The purse starts at zero and the cheapest slime is two
 * coins, so without it the buying step is an instruction a new child physically cannot carry out — the
 * exact shape of trap this file exists to prevent. Five coins buys any of the everyday families and most
 * of the treats, and leaves the dearest still worth saving for.
 */
export const STEPS: readonly Step[] = [
  {
    id: 'greet',
    line: "Hello, you. I'm Nan Bramble, and this is my ranch. I'm getting too old for it, so I'm hoping you'll take it on.",
    nudge: '',
    glyph: 'none',
    mark: 'none',
    nudgeMs: 0,
    skipMs: 11000,
  },
  {
    id: 'look',
    line: 'Have a good look round first. Move your mouse and turn your head.',
    nudge: 'Go on, move the mouse.',
    glyph: 'look',
    mark: 'none',
    nudgeMs: 9000,
    skipMs: 26000,
  },
  {
    id: 'walk',
    line: 'Now then. W to walk, and A and D to go side to side. Off you go.',
    nudge: 'Press W, and off you go.',
    glyph: 'walk',
    mark: 'ahead',
    nudgeMs: 9000,
    skipMs: 30000,
  },
  {
    id: 'shop',
    line: "Follow the worn track down to the stall. That's where the slimes are sold. Here — five coins from the till, to start you off.",
    nudge: 'The stall is down the track. Keep going.',
    glyph: 'walk',
    mark: 'shop',
    nudgeMs: 16000,
    skipMs: 80000,
  },
  {
    id: 'buy',
    line: 'Stand at the counter and press E. Then look at a slime you like, and click it. Your coins will do the rest.',
    nudge: 'Press E at the counter, then click a slime.',
    glyph: 'press',
    mark: 'shop',
    nudgeMs: 15000,
    skipMs: 70000,
  },
  {
    id: 'vac',
    line: 'Now the vacpack on your back. Look at your slime and hold the left button to draw it in.',
    nudge: 'Hold the left button to suck it up.',
    glyph: 'suck',
    mark: 'slime',
    nudgeMs: 12000,
    skipMs: 55000,
  },
  {
    id: 'pen',
    line: 'Carry it to a pen and pop it down — the right button, or the Q key. They like it in there.',
    nudge: 'Right button, or Q, to put it down.',
    glyph: 'plop',
    mark: 'pen',
    nudgeMs: 15000,
    skipMs: 70000,
  },
  {
    id: 'board',
    line: "One last thing. The back paddock is boarded up, and the puzzle board holds it shut. Walk up and press E, and it's yours.",
    nudge: 'The puzzle board is this way. Press E at it.',
    glyph: 'press',
    mark: 'board',
    nudgeMs: 20000,
    skipMs: 120000,
  },
];

/** Said when the board is finished, whatever happened at it. Nothing here is about how it went. */
export const CLOSING =
  "There. Hear that? The boards are coming off. The paddock is yours, and so is the ranch. Look after them for me.";

/**
 * Said when the board could not ask a single question — a dead API, or a bank with nothing left in it.
 *
 * IT IS NOT AN ERROR MESSAGE AND IT DOES NOT BLAME THE CHILD. From where they are standing they walked up
 * and pressed E and did exactly what they were asked, so the one thing that must not happen is silence and
 * an empty board. She takes it on herself, says it will keep, and sends them off to play — which is true:
 * nothing is recorded, nothing is spent, and the board is put back exactly as it was. See `Outcome` in
 * `run.ts`, which explains why a run with no answers in it may not open the paddock.
 */
export const BOARD_QUIET =
  "Oh, bother — the old board's gone quiet on me. Never you mind, it'll keep. Go and play, and we'll try it again in a bit.";

/** What the caller has seen the child do. Latched: once true, true forever. See the header. */
export interface Signals {
  /** Turned their head far enough to have looked around, under pointer lock. */
  readonly looked: boolean;
  /** Walked a real distance from where they arrived. */
  readonly walked: boolean;
  /** Reached the stall. */
  readonly atShop: boolean;
  /** Spent coins, which in this game only the stall can do. */
  readonly bought: boolean;
  /** Has had a slime in the vacpack tank at some point. */
  readonly carrying: boolean;
  /** Has put a slime down inside a pen. */
  readonly penned: boolean;
  /** Has finished the challenge board. */
  readonly boardDone: boolean;
}

export const NO_SIGNALS: Signals = {
  looked: false,
  walked: false,
  atShop: false,
  bought: false,
  carrying: false,
  penned: false,
  boardDone: false,
};

export interface Tutorial {
  readonly step: StepId;
  /** Position in `STEPS`, or `STEPS.length` once terminal. NEVER DECREASES — asserted in the tests. */
  readonly index: number;
  /** When this step was entered, in the caller's clock. */
  readonly at: number;
  /** Whether the short line has already been said for this step. */
  readonly nudged: boolean;
  /**
   * Bumped every time something new should be SAID. The renderer speaks on a change of this number
   * rather than on a change of `line`, so a nudge that repeats the same words still gets spoken.
   */
  readonly say: number;
  /** The words that go with the current `say`. Empty while terminal. */
  readonly line: string;
  readonly glyph: Glyph;
  readonly mark: Mark;
  /** No further steps will run. The caller persists on this, and the flag is what stops a second run. */
  readonly settled: boolean;
}

function stepAt(index: number): Step | undefined {
  return STEPS[index];
}

/** Whether the child has already done what this step is about to ask for. */
function satisfied(id: StepId, s: Signals): boolean {
  switch (id) {
    case 'greet':
      return false;
    case 'look':
      return s.looked;
    case 'walk':
      return s.walked;
    case 'shop':
      return s.atShop;
    // Getting a slime any other way counts. The point of the step is that they have one, not that they
    // bought it — and a child who found one in a pen and hoovered it has understood more, not less.
    case 'buy':
      return s.bought || s.carrying;
    case 'vac':
      return s.carrying;
    case 'pen':
      return s.penned;
    case 'board':
      return s.boardDone;
    default:
      return true;
  }
}

function enter(index: number, now: number, say: number, boardDone: boolean): Tutorial {
  const step = stepAt(index);
  if (!step) {
    // Ran off the end. Which terminal depends on whether the board was actually taken, because that is
    // the difference between "the tour finished" and "the tour gave up", and Nan has a line for one of
    // them and nothing to say about the other.
    return {
      step: boardDone ? 'done' : 'idle',
      index: STEPS.length,
      at: now,
      nudged: true,
      say: boardDone ? say + 1 : say,
      line: boardDone ? CLOSING : '',
      glyph: 'none',
      mark: 'none',
      settled: true,
    };
  }
  return {
    step: step.id,
    index,
    at: now,
    nudged: false,
    say: say + 1,
    line: step.line,
    glyph: step.glyph,
    mark: step.mark,
    settled: false,
  };
}

/**
 * A fresh tour, or none at all.
 *
 * `alreadySeen` is the persisted flag. When it is set this returns a settled machine that has said
 * nothing and marks nothing, which is the whole of "it must not run twice".
 */
export function begin(now: number, alreadySeen: boolean): Tutorial {
  if (alreadySeen) {
    return {
      step: 'idle',
      index: STEPS.length,
      at: now,
      nudged: true,
      say: 0,
      line: '',
      glyph: 'none',
      mark: 'none',
      settled: true,
    };
  }
  return enter(0, now, 0, false);
}

/**
 * One tick.
 *
 * Returns the SAME OBJECT when nothing changed, so a React caller can hold it in state and set it
 * unconditionally without re-rendering every frame.
 */
export function advance(t: Tutorial, s: Signals, now: number): Tutorial {
  if (t.settled) return t;

  // The board is the end of the tour from wherever the child happens to be. If they walked off and did
  // it early, everything between here and there has been overtaken by events.
  if (s.boardDone && t.step !== 'board') {
    return enter(STEPS.length, now, t.say, true);
  }

  let next = t;
  // Bounded by the step count plus one: every iteration moves `index` up by exactly one.
  for (let guard = 0; guard <= STEPS.length; guard += 1) {
    const step = stepAt(next.index);
    if (!step) return next.settled ? next : enter(STEPS.length, now, next.say, s.boardDone);

    const done = satisfied(step.id, s);
    const expired = now - next.at >= step.skipMs;
    if (!done && !expired) break;

    next = enter(next.index + 1, now, next.say, s.boardDone);
    if (next.settled) return next;
  }

  // Still on the same step. The only thing left that can change is the nudge.
  if (next === t && !t.nudged) {
    const step = stepAt(t.index);
    if (step && step.nudgeMs > 0 && step.nudge && now - t.at >= step.nudgeMs) {
      return { ...t, nudged: true, say: t.say + 1, line: step.nudge };
    }
  }
  return next;
}

/**
 * Stop the tour where it stands.
 *
 * The adult's escape hatch, and it is deliberately a hard stop rather than a fast-forward: nothing is
 * completed on the child's behalf, no signal is faked, and the challenge board is left exactly where it
 * is so it can still be walked up to. Settled, so the caller persists and it does not come back.
 */
export function skip(t: Tutorial, now: number): Tutorial {
  if (t.settled) return t;
  return {
    step: 'idle',
    index: STEPS.length,
    at: now,
    nudged: true,
    say: t.say,
    line: '',
    glyph: 'none',
    mark: 'none',
    settled: true,
  };
}

/** The longest a tour can possibly last with a child who does nothing at all. For the tests, and honesty. */
export const WORST_CASE_MS = STEPS.reduce((n, s) => n + s.skipMs, 0);
