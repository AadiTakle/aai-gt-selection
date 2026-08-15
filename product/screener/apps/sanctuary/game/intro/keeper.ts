import { LS_KEEPER } from '../contract';

/**
 * WHO THIS IS, AND WHAT THEY HAVE ALREADY BEEN THROUGH.
 *
 * Two flags and one id, all under the keeper id that `Game.tsx` already mints. Nothing else about a child
 * is stored anywhere in this directory: no name, no age, no email, no date of birth. See the note on the
 * completion callback in `index.ts` for the one thing that is deliberately NOT here.
 *
 * EVERY READ AND EVERY WRITE IS WRAPPED. Private browsing refuses `localStorage` outright, and a school
 * image can disable it per-site. The correct behaviour there is a tutorial that runs and a game that
 * plays, forgetting between visits — never an exception on the way to the first frame.
 */

/**
 * The keeper id, read or minted, EXACTLY as `Beat` in `Game.tsx` does it.
 *
 * Deliberately the same key and the same `k-xxxxxxxx` shape rather than a second identifier of this
 * directory's own, because the whole point of the challenge board is that its baseline lands in the same
 * ledger as the stations'. A second id would give the server two children where there is one, and the
 * failure would be silent — two half-length estimates instead of one.
 *
 * Whichever of the two runs first wins, and they cannot disagree, because both write only if absent.
 */
export function keeperId(): string {
  try {
    const had = localStorage.getItem(LS_KEEPER);
    if (had) return had;
    const made = `k-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(LS_KEEPER, made);
    return made;
  } catch {
    /* No store. A per-session keeper still plays; it just does not remember. */
    return 'anon';
  }
}

/** The tutorial has been seen. Set the moment the machine settles, not only when it is completed. */
const LS_INTRO = 'gt-sanctuary:intro';
/** The challenge board has been taken. Set once, and it is what keeps the baseline from double-counting. */
const LS_BOARD = 'gt-sanctuary:board';

function flag(prefix: string): { read: () => boolean; write: () => void } {
  return {
    read: () => {
      try {
        return localStorage.getItem(`${prefix}:${keeperId()}`) === 'done';
      } catch {
        return false;
      }
    },
    write: () => {
      try {
        localStorage.setItem(`${prefix}:${keeperId()}`, 'done');
      } catch {
        /* Swallowed on purpose. A tutorial that cannot record itself is better than one that throws
           on the way past; the cost is that it runs again next visit on a machine with no store. */
      }
    },
  };
}

const intro = flag(LS_INTRO);
const board = flag(LS_BOARD);

/** Has this keeper already been shown the tour? */
export const introSeen = intro.read;
/** Remember that they have. Called when the machine settles, however it settled. */
export const markIntroSeen = intro.write;

/** Has this keeper already taken the challenge board? */
export const boardTaken = board.read;
/** Remember that they have, so the paddock stays open and the board is never served twice. */
export const markBoardTaken = board.write;
