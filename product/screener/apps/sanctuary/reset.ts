/**
 * Start Bramblebrook over: `http://127.0.0.1:5230/?reset=1`
 *
 * ══ WHY THIS EXISTS ═══════════════════════════════════════════════════════════════════════════════
 *
 * Everything a returning child keeps — their ranch, their coins, whether Nan has already shown them
 * round, whether the challenge board is done — lives in `localStorage`, and by design there is no way
 * to lose it. That is right for a child and useless for anyone who needs to see the opening again.
 *
 * There is no reset button in the game and there should not be one: the single most destructive thing
 * a five-year-old could press is a button that deletes their ranch, and it would sit on the same
 * screen as everything else they are allowed to touch. So the reset is a URL, which an adult can type
 * and a child cannot stumble onto.
 *
 * ══ WHAT IT CLEARS, AND THE ONE THAT MATTERS MOST ═════════════════════════════════════════════════
 *
 * Every `gt-sanctuary:` key. Enumerated from the three files that own them rather than guessed:
 *
 *   contract.ts       `world`     the ranch: which slimes, where, at what stage
 *                     `keeperId`  who the server thinks this is
 *   economy/coins.ts  `coins`     the purse
 *   intro/keeper.ts   `intro`     how far through Nan's tour
 *                     `board`     whether the challenge board has been answered
 *   audio/mute.ts     `muted`     the mute toggle
 *
 * **`keeperId` is the one that does the real work.** The per-battery ability estimate is NOT held in
 * the browser — it lives server-side in `data/sanctuary/keepers.jsonl`, keyed by that id, along with
 * every item the child has already been served. Dropping the id means the next `/sanctuary/chunk`
 * mints a new keeper, so difficulty starts from the prior again and no item is excluded as
 * already-seen. Clearing the browser alone would have given a fresh-looking ranch steered by a
 * stranger's posterior, which is the confusing half-reset this avoids.
 *
 * The old server-side record is deliberately left on disk rather than deleted. It is measurement
 * data, it is append-only by design, and an adult pressing reset is not consenting to erase it.
 *
 * ══ WHY THE PARAMETER IS STRIPPED ═════════════════════════════════════════════════════════════════
 *
 * `history.replaceState` removes `?reset=1` before the app mounts. Without that, a refresh — or a
 * child pressing F5, or the browser restoring the tab — silently wipes the ranch again, and the
 * second time nobody would connect it to a URL typed twenty minutes earlier. Once, then gone.
 */

/**
 * ══ WHY THIS MODULE HAS A SIDE EFFECT, AND WHY IT MUST BE IMPORTED FIRST ══════════════════════════
 *
 * The reset runs at the bottom of this file, on import, rather than being called from `main.tsx`'s
 * body — and that is not a style choice, it is the bug this file already shipped once.
 *
 * `economy/coins.ts` has `let coins = read();` at module scope, and the world store and the intro's
 * keeper do the same. Module bodies run at IMPORT time, and every ES import in a file is evaluated
 * before a single line of that file's own body. So `main.tsx` calling `resetIfAsked()` in its body
 * ran AFTER `coins.ts` had already read the purse: storage was cleared, a new keeper was minted, the
 * ranch was gone — and the coin counter still said 37. Verified in a browser, which is the only place
 * it shows: the unit tests passed the whole time, because they call the function directly.
 *
 * So: `import './reset';` must be the FIRST import in `main.tsx`, above anything that reaches game
 * code. Import order is load order, and that is the whole mechanism.
 */

const PREFIX = 'gt-sanctuary:';

/** Cleared and returned so a caller can log or assert on it. Empty when the flag is absent. */
export function resetIfAsked(search = window.location.search): string[] {
  if (!new URLSearchParams(search).has('reset')) return [];

  const cleared: string[] = [];
  try {
    /* Collected first, then removed: removing while iterating `localStorage.key(i)` re-indexes the
       store underneath the loop and silently skips every other key. */
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k);
    }
    for (const k of keys) {
      localStorage.removeItem(k);
      cleared.push(k);
    }
  } catch {
    /* Private browsing refuses localStorage. Nothing was stored, so nothing needs clearing, and a
       thrown error here would stop the game booting at all. */
  }

  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('reset');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  } catch {
    /* Not fatal: the worst case is that a refresh resets again. */
  }

  return cleared;
}

/* Runs on import. See the note above: this must happen before any module that reads `localStorage`
   at its own top level, which is most of the game's stores. */
if (typeof window !== 'undefined') {
  const cleared = resetIfAsked();
  if (cleared.length) console.info(`Bramblebrook reset: cleared ${cleared.length} keys`, cleared);
}
