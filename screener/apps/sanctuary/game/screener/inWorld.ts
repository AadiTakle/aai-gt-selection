import type { ComponentType } from 'react';

import { PodWall } from './PodWall';
import { TideLine } from './TideLine';
import { DayLog } from './DayLog';
import { StoneBed } from './StoneBed';
import { Sprouter } from './Sprouter';
import { Weave } from './Weave';
import { BalanceBough } from './BalanceBough';
import { SortingGate } from './SortingGate';
import { KinshipStone } from './KinshipStone';

/**
 * THE ONE REGISTRY OF ITEM TYPES THAT HAVE AN IN-WORLD PRESENTATION.
 *
 * ══ WHY THIS FILE EXISTS ══════════════════════════════════════════════════════════════════════════
 *
 * There used to be two of these tables — `IN_WORLD` in `Game.tsx` and `PRESENTATION` in
 * `stations/Stations.tsx` — and the duplication was deliberate, to avoid a runtime import cycle, since
 * `Game.tsx` imports `Stations.tsx`. The reasoning was sound and the outcome was a silent bug that
 * reached the owner: "the tide line and coaxing a coat are no longer working in the sense that no
 * questions pop up anymore".
 *
 * The two tables answer questions that MUST agree, and nothing made them:
 *
 *   - `Game.tsx` uses its table to decide whether to suppress the flat row of numbered buttons, on the
 *     grounds that the world is already drawing the question.
 *   - `Stations.tsx` uses its table to decide what to actually draw on the panel.
 *
 * Register a type in the first and not the second and you get the worst of both: the fallback is
 * suppressed because the world is supposedly drawing it, and the world draws its idle emblem because it
 * has never heard of the type. A blank panel, no error, nothing in the console. That is exactly what
 * happened when four new presentations were registered in one table only, and the stations that had
 * gained new question styles were precisely the two that broke.
 *
 * So the cycle is broken by moving the table OUT of both files rather than by copying it into both. Both
 * import from here, neither imports the other, and there is nothing left to keep in agreement.
 *
 * ══ ADDING A PRESENTATION ═════════════════════════════════════════════════════════════════════════
 *
 * Add one line here. That is the whole job: `stations/sites.ts` derives each station's type set from the
 * drawn set, so a registered type becomes reachable at its battery's station with no other change.
 *
 * A type ABSENT from this table falls through to the station's idle emblem rather than to a row of
 * numbered buttons. That is the correct failure — the owner's report that the tide-line was "just
 * pressing random numbers for no reason" was the numbered-button fallback, and it should not be
 * reachable again.
 *
 * Note that being in this table is not sufficient for an item to be SERVED: `VER-SORTBOT-01` additionally
 * has a pool gate in `server-plugin.ts` that removes the items whose pictures cannot carry the question.
 *
 * `VER-RELPAIR-01` has a gate of the same shape in `kinshipGate.ts` and it refuses NOTHING, which is a
 * claim rather than an oversight: that type is answered by listening, and speech has no vocabulary gap.
 * Its second predicate, `kinshipStoneDraws`, decides only whether pictures accompany the voice, and must
 * never be wired into the pool — it is false for all 100 items and would delete the bank.
 */
export const IN_WORLD: Record<
  string,
  ComponentType<{
    content: Record<string, unknown>;
    /**
     * `flags` lets a presentation declare that the question was never really asked — see `KinshipStone`'s
     * `no-audio`. The platform marks such a response unscorable rather than wrong.
     */
    onPick: (handed: string, flags?: readonly string[]) => void;
    disabled?: boolean;
    /**
     * Whether this app may set words as words, from its registered reading band.
     *
     * Optional because only `SortingGate` has a word to set; every other presentation here draws shapes whose
     * meaning does not depend on reading, and passing it to them would imply a choice they do not have.
     */
    showWords?: boolean;
  }>
> = {
  'FLU-MATRIX-01': PodWall,
  'QUANT-SERIES-01': TideLine,
  'VER-SEQUENCE-01': DayLog,
  'SPA-XFORM-01': StoneBed,
  'QUANT-FUNC-01': Sprouter,
  'FLU-CARPET-01': Weave,
  'QUANT-BALANCE-01': BalanceBough,
  'VER-SORTBOT-01': SortingGate,
  'VER-RELPAIR-01': KinshipStone,
};
