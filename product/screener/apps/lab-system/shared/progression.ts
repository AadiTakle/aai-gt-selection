/**
 * Streaks, currency and unlocks, in localStorage.
 *
 * ONE RULE, ENFORCED BY THE SHAPE OF THIS FILE: nothing here can be told whether an answer was right,
 * because nothing that reads it is given that information. Rewards accrue for turning up and for
 * finishing rounds. A streak advances on a new calendar day, currency accrues per round completed, and
 * rarity arrives on the seventh consecutive day rather than the seventh correct answer.
 *
 * That is not a style preference. Performance-contingent rewards reliably undermine children's
 * intrinsic motivation, and a child optimising for a payout has stopped producing the ordinary
 * behaviour the whole design depends on. `useScreenerSession` withholds correctness for the same
 * reason, so the two halves agree.
 */

export interface Progress {
  /** Consecutive calendar days with at least one completed round. */
  readonly streak: number;
  readonly bestStreak: number;
  /** ISO date (YYYY-MM-DD) of the last completed round, or null for a first-time visitor. */
  readonly lastDay: string | null;
  readonly rounds: number;
  readonly items: number;
  readonly currency: number;
  /** Ids the player has unlocked, in the order they arrived. */
  readonly unlocked: readonly string[];
}

export const FRESH: Progress = {
  streak: 0,
  bestStreak: 0,
  lastDay: null,
  rounds: 0,
  items: 0,
  currency: 0,
  unlocked: [],
};

/** Currency per completed round, plus a little per item so a longer round is worth more. */
const PER_ROUND = 10;
const PER_ITEM = 2;

/** The day a streak becomes notable. Seven consecutive DAYS, not seven right answers. */
export const RARITY_STREAK = 7;

function today(now = new Date()): string {
  // Local date rather than UTC: a child's "day" is their day, and a UTC boundary mid-evening would
  // break a streak that felt unbroken.
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function keyFor(id: string): string {
  return `gt-lab-system:${id}`;
}

export function loadProgress(id: string): Progress {
  try {
    const raw = window.localStorage.getItem(keyFor(id));
    if (!raw) return FRESH;
    const parsed = JSON.parse(raw) as Partial<Progress>;
    // Merged over FRESH so a stored blob from an older shape cannot produce undefined fields, which is
    // how a "NaN" lands in a currency counter.
    return { ...FRESH, ...parsed, unlocked: parsed.unlocked ?? [] };
  } catch {
    return FRESH;
  }
}

export function saveProgress(id: string, progress: Progress): void {
  try {
    window.localStorage.setItem(keyFor(id), JSON.stringify(progress));
  } catch {
    // A full or blocked storage should not break the experience.
  }
}

export interface RoundOutcome {
  readonly progress: Progress;
  /** True when this round started a new day's streak, which is what a celebration should key off. */
  readonly streakAdvanced: boolean;
  /** True when the streak reached RARITY_STREAK on this round. */
  readonly rarityEarned: boolean;
  readonly currencyEarned: number;
}

/**
 * Record a completed round.
 *
 * `items` is how many questions the round actually served, which is the only thing about the session
 * that reaches this file. Note what is absent: how many were right.
 */
export function recordRound(id: string, items: number, now = new Date()): RoundOutcome {
  const before = loadProgress(id);
  const day = today(now);

  let streak = before.streak;
  let streakAdvanced = false;
  if (before.lastDay === null) {
    streak = 1;
    streakAdvanced = true;
  } else if (before.lastDay !== day) {
    // A gap of exactly one day continues the streak; anything larger restarts it.
    streak = daysBetween(before.lastDay, day) === 1 ? before.streak + 1 : 1;
    streakAdvanced = true;
  }

  const currencyEarned = PER_ROUND + PER_ITEM * Math.max(0, items);
  const progress: Progress = {
    streak,
    bestStreak: Math.max(before.bestStreak, streak),
    lastDay: day,
    rounds: before.rounds + 1,
    items: before.items + Math.max(0, items),
    currency: before.currency + currencyEarned,
    unlocked: before.unlocked,
  };

  saveProgress(id, progress);
  return {
    progress,
    streakAdvanced,
    rarityEarned: streakAdvanced && streak === RARITY_STREAK,
    currencyEarned,
  };
}

export function unlock(id: string, thing: string): Progress {
  const before = loadProgress(id);
  if (before.unlocked.includes(thing)) return before;
  const progress = { ...before, unlocked: [...before.unlocked, thing] };
  saveProgress(id, progress);
  return progress;
}

export function spend(id: string, amount: number): Progress | null {
  const before = loadProgress(id);
  if (before.currency < amount) return null;
  const progress = { ...before, currency: before.currency - amount };
  saveProgress(id, progress);
  return progress;
}

/** Wipe one experience's progress. Used by the in-app reset, and by the cold-start check. */
export function clearProgress(id: string): void {
  try {
    window.localStorage.removeItem(keyFor(id));
  } catch {
    // nothing to do
  }
}
