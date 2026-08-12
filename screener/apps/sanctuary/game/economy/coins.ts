import { useSyncExternalStore } from 'react';

import { FAMILIES, type Family } from '../contract';

/**
 * THE COIN PURSE. What a child earns, where it is kept, and what it buys.
 *
 * ══ COINS ARE PAID FOR TAKING PART, NEVER FOR BEING RIGHT ═════════════════════════════════════════
 *
 * One coin per question ANSWERED, plus a bonus when a round closes. Nothing here looks at what was
 * chosen. Three reasons, in the order that decided it:
 *
 *   1. IT IS NOT AVAILABLE. `shared/useSortie.ts` deletes `correct` from the response before returning
 *      it, so correctness never reaches the browser at all. There is nothing to branch on without a
 *      deliberate architectural change, and that change is not this file's to make.
 *
 *   2. IT WOULD CORRUPT THE MEASUREMENT. A child playing for a payout starts guessing fast, asking an
 *      adult, or repeating whatever paid last time. The ability estimate is only meaningful under
 *      ordinary effort, so a performance-contingent payout damages the one thing the product exists to
 *      produce.
 *
 *   3. IT WORKS LESS WELL ANYWAY. Deci, Koestner & Ryan (1999), a meta-analysis of 128 experiments,
 *      found tangible rewards most harmful to intrinsic motivation IN CHILDREN specifically. Paying for
 *      accuracy is the version of this idea with the worst evidence behind it.
 *
 * The owner's actual goal — "there is more incentive to prompt these questions" — is served in full by
 * paying per question asked: more questions means more coins means more slimes. See `EARN` below for the
 * amounts and `index.ts` for what switching to a correctness-contingent payout would cost.
 *
 * ══ WHAT THE PURSE PROMISES ══════════════════════════════════════════════════════════════════════
 *
 * Coins only ever go up, except when a child deliberately spends them. There is no expiry, no streak, no
 * daily reset, no penalty and no way to end up owing anything. `earn` cannot be handed a negative number
 * and `spend` refuses rather than overdrawing, so "never negative" is a property of the store rather than
 * a discipline every caller has to keep.
 */

/** Alongside the existing `gt-sanctuary:` keys in `contract.ts`. */
export const LS_COINS = 'gt-sanctuary:coins';

/* ------------------------------------------------------------------ *\
   What a visit pays
\* ------------------------------------------------------------------ */

/**
 * The two payouts, and why these two numbers.
 *
 * A round is about four questions, so a round is worth about eight coins: four for the questions and
 * four for having seen it through. That makes the cheapest slimes (2) affordable after the child's SECOND
 * QUESTION EVER — which matters more than anything else here, because a shop that pays out nothing on the
 * first visit is a shop a five-year-old never goes back to — and the dearest (10) about a round and a half
 * away, which is close enough to be worth saving for and far enough to be worth something.
 *
 * The round bonus is paid for FINISHING, which in this game means the session closed itself or the child
 * walked away having answered at least one thing. It is not a bonus for accuracy and it is not withheld
 * from a child who left early; `stations/Stations.tsx` argues that at length for the slime it hatches,
 * and the same argument applies without change to the coins.
 */
export const EARN = {
  /** Per question answered, whatever was chosen. Nothing is ever withheld for being wrong. */
  perAnswer: 1,
  /**
   * The bonus on top of `perAnswer` when the answer was the keyed one, so a correct answer pays double.
   *
   * Additive rather than a multiplier because the floor is the part that must not move: every answer pays,
   * a miss still pays, and the difference is an extra coin rather than a coin withheld. Written this way so
   * that "nothing can be lost" stays visible in the constants rather than living in a comment.
   */
  correctBonus: 1,
  /** Once, when a round closes. */
  perRound: 4,
} as const;

/* ------------------------------------------------------------------ *\
   Prices
\* ------------------------------------------------------------------ */

/**
 * What a slime costs, keyed by family NAME rather than by the `Family` type.
 *
 * Deliberately `Record<string, number>`: the families are being expanded from six to about nineteen in a
 * neighbouring file, and a `Record<Family, number>` here would make this file fail to compile every time
 * somebody adds one — or, worse, would tempt whoever added it to leave a family unpriced. So the table
 * names every family the world has or is about to have, and `priceOf` falls back to `DEFAULT_PRICE` for
 * anything it has never heard of. A new family is therefore buyable the moment it exists, at a sensible
 * price, and can be given its own later.
 *
 * FOUR TIERS, and the tiers are about how special a thing FEELS rather than about anything mechanical.
 * Every family is the same to look after, none is better than another, and NO FAMILY IS EVER WITHHELD: a
 * price is a number of coins to collect, not a gate, and the dearest thing in the shop is about a round and
 * a half of questions away. A gold slime costs more than a grass slime for the same reason a gold sticker
 * costs more than a green one, and for no other reason.
 *
 * NOTHING COSTS MORE THAN TEN, and that ceiling is a legibility constraint rather than a balance one. A
 * price is drawn as literally that many coins (see `coinPile` in `carpentry.ts`), in rows of five, and two
 * rows of five is the most that fits in a cubby at a size a child can still count. A price of fourteen
 * would have to be drawn in coins too small to tell apart, at which point it has become a numeral with
 * extra steps.
 */
export const PRICES: Record<string, number> = {
  /* Everyday — two questions each, so a child owns a slime of their own choosing on their first visit. */
  grass: 2,
  rock: 2,
  wood: 2,
  air: 2,
  waffle: 2,

  /* A treat. */
  bunny: 3,
  cat: 3,
  strawberry: 3,
  mango: 3,
  sleepy: 3,

  /* Special. */
  rose: 5,
  frost: 5,
  ice: 5,
  fire: 5,
  lion: 5,

  /* Really something. */
  fairy: 7,
  bomb: 7,
  radioactive: 7,

  /* The one that is actually made of gold. */
  gold: 10,
};

/** For a family nobody has priced yet. Middle of the range, so a new arrival is never out of reach. */
export const DEFAULT_PRICE = 4;

/** The dearest anything may be, so a price always fits in a cubby as coins a child can count. */
export const MAX_PRICE = 10;

export function priceOf(family: Family | string): number {
  const p = PRICES[family];
  return typeof p === 'number' && Number.isFinite(p) && p > 0 ? Math.round(p) : DEFAULT_PRICE;
}

/**
 * What the stall has on its shelves: every family the world knows about, cheapest first.
 *
 * Read off `FAMILIES` at module scope rather than written out, so the shelf grows on its own as families
 * are added. Sorted by price so the affordable end is always on the left, which means a child's eye
 * travels from what they can have to what they are saving for rather than the other way round.
 */
export const STOCK: readonly Family[] = [...FAMILIES].sort(
  (a, b) => priceOf(a) - priceOf(b) || a.localeCompare(b),
);

/* ------------------------------------------------------------------ *\
   The store
\* ------------------------------------------------------------------ */

/**
 * One purse, at module scope, with subscribers.
 *
 * Not React state in `Game.tsx`, because at least four separate things need to agree about it at once:
 * the flat indicator, the flying coins, the shelf's affordability, and whatever earns. A single external
 * store read through `useSyncExternalStore` means all of them see the same number in the same frame, and
 * a component mounted later (the shop, on engaging) is never a frame behind.
 */
let coins = read();
const listeners = new Set<() => void>();

/**
 * How much the last `earn` paid, and how many times anything has been earned.
 *
 * `CoinFlight` is handed a plain `trigger` number by whoever mounts it, which tells it THAT something was
 * earned but not how much. Rather than widen that prop, the flight reads the last amount from here — so a
 * one-coin answer sends one coin and a four-coin round bonus sends four, and the payout is legible
 * without the integrator having to thread a second value through.
 */
let lastEarned = 0;
let earnCount = 0;

function read(): number {
  try {
    const raw = window.localStorage.getItem(LS_COINS);
    if (raw === null) return 0;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    // Private browsing, a disabled store, or no `window` at all. A purse that cannot be saved is still a
    // purse for this visit; it must never be an exception on the way to the first frame.
    return 0;
  }
}

function write(next: number): void {
  try {
    window.localStorage.setItem(LS_COINS, String(next));
  } catch {
    // Deliberately swallowed, and this is the one place it matters. If the write fails the in-memory
    // purse is still correct and still spendable — the coins are only lost on reload, which is a worse
    // outcome than the alternative of throwing away the coins now to keep the two in agreement.
  }
}

function publish(next: number): void {
  const clamped = Math.max(0, Math.floor(next));
  if (clamped === coins) return;
  coins = clamped;
  write(coins);
  for (const l of listeners) l();
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Current balance. Safe to call outside React. */
export function balance(): number {
  return coins;
}

/**
 * Pay for taking part.
 *
 * Ignores anything that is not a positive whole number, which is what makes "coins are never taken away"
 * a property of the store: there is no argument to this function that reduces the purse.
 */
export function earn(n: number): void {
  const add = Math.floor(n);
  if (!Number.isFinite(add) || add <= 0) return;
  lastEarned = add;
  earnCount += 1;
  publish(coins + add);
}

/**
 * Buy something.
 *
 * Returns false and changes nothing if the purse is short, so an unaffordable purchase is a no-op rather
 * than an error. The shop never offers one anyway — it shows the price and waits — but a caller that
 * tries cannot break the purse.
 */
export function spend(n: number): boolean {
  const take = Math.floor(n);
  if (!Number.isFinite(take) || take <= 0) return false;
  if (take > coins) return false;
  publish(coins - take);
  return true;
}

/** What the last `earn` paid, for the flight. Zero before anything has been earned. */
export function lastEarnedAmount(): number {
  return lastEarned;
}

/** Monotonic count of `earn` calls. A ready-made `trigger` for `CoinFlight`. */
export function earnTicks(): number {
  return earnCount;
}

/**
 * The purse, as a hook.
 *
 * `earn` and `spend` are the module functions rather than fresh closures, so the identity is stable and
 * a consumer can put them in a dependency array without re-subscribing every render.
 */
export function useCoins(): { coins: number; earn: (n: number) => void; spend: (n: number) => boolean } {
  const value = useSyncExternalStore(subscribe, balance, balance);
  return { coins: value, earn, spend };
}
