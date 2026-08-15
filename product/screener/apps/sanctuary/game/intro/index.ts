/**
 * THE GUIDED OPENING, AS THE INTEGRATOR SEES IT.
 *
 * Three things: an NPC who explains the ranch while the child keeps playing, a tour of objectives in the
 * world, and a challenge board across the back paddock's gate that screens every child who arrives.
 *
 * ══ WHAT TO MOUNT IN `Game.tsx` ═══════════════════════════════════════════════════════════════════
 *
 *     import { INTRO_SOLIDS, IntroGuide, IntroPortrait, useBoardEngaged } from './intro';
 *
 *     export function Game() {
 *       …
 *       const boardEngaged = useBoardEngaged();          // 1. one boolean, alongside `engaged`/`shopOpen`
 *
 *       return (
 *         <div className="bh-root">
 *           <Canvas …>
 *             …
 *             <IntroGuide                                 // 2. inside the Canvas, anywhere
 *               busy={!!engaged || shopOpen}
 *               onEarn={() => setFlight((f) => f + 1)}
 *               onComplete={() => setRanchSolids(          // 5. see below — one line, and it matters
 *                 [...SOLIDS, ...STATION_SOLIDS, ...SHOP_SOLIDS, ...INTRO_SOLIDS],
 *                 { worldRadius: BOUND, from: [0, 8] },
 *               )}
 *             />
 *             <Keeper locked={locked && !engaged && !shopOpen && !boardEngaged} />   // 3.
 *           </Canvas>
 *           …
 *           <IntroPortrait />                             // 4. flat, outside the Canvas
 *         </div>
 *       );
 *     }
 *
 * FOUR THINGS THIS DIRECTORY CANNOT DO FOR ITSELF, and none of them is optional:
 *
 *   THE KEEPER MUST NOT WALK WHILE THE BOARD IS ENGAGED. `locked && !engaged && !shopOpen && !boardEngaged`
 *   on `<Keeper>`, exactly as the shop and the stations already require. Mouse-look must keep running:
 *   aiming by looking IS the interaction.
 *
 *   THE VACUUM MUST BE OFF WHILE THE BOARD IS ENGAGED. Add `&& !boardEngaged` to `<Vacpack enabled>` and
 *   to the `canVac` expression that drives the suction sound, so a click means "choose this" at the board
 *   and "hoover" everywhere else.
 *
 *   THE COLLIDERS. `INTRO_SOLIDS` concatenated into the sweep in `Keeper`, beside `SOLIDS`,
 *   `STATION_SOLIDS` and `SHOP_SOLIDS`. Without it the paddock fence is a painting and the barricade
 *   across the gate is not there at all.
 *
 *   `busy`. `!!engaged || shopOpen`. It stops the board offering itself while a station has the child,
 *   and — the part that matters more — it stops Nan speaking over the verbal station. `screener/speak.ts`
 *   is one queue with one generation counter, so her nudge would CANCEL the day-log's story and leave a
 *   child looking at pictures nobody ever narrated.
 *
 *   THE SLIME REGISTRY HAS TO BE TOLD THE GATE OPENED, and this is the fifth thing, found by measuring
 *   rather than by reading. `Game.tsx` calls `setRanchSolids([...SOLIDS, …, ...INTRO_SOLIDS], …)` ONCE at
 *   module scope, and the spread takes a SNAPSHOT — of a world in which the barricade across the gateway is
 *   still standing. The keeper is unaffected, because its own sweep re-spreads the live array every frame,
 *   but `slimes/ground.ts` keeps the stale copy for the life of the page. Measured against the running game:
 *   with the paddock open, `__ranch.findable(10.5, 18.5, 0.6)` is still `false`, and a slime plopped at the
 *   paddock's centre is relocated to (13.4, 21.8) — OUTSIDE the fence. So the reward for the whole screening
 *   would be a pen a child can walk into and cannot put anything in, and the slime they carried in would
 *   teleport out of it as they let go.
 *
 *   Re-running the identical call fixes it — `INTRO_SOLIDS` is live, so the second spread simply does not
 *   contain the barricade — and `onComplete` is the moment to do it. Measured the same way: `findable`
 *   becomes `true` and a slime put at the centre stays there (`moved: false`).
 *
 * `onEarn` is optional and costs one line: the board pays a coin per question answered whether or not it
 * is passed, but without it the purse ticks up with no coins flying, which is the feedback everywhere
 * else in the game.
 *
 * ══ WHAT IS DELIBERATELY NOT HERE ═════════════════════════════════════════════════════════════════
 *
 * The email capture and the deed step, and no leaderboard. `onComplete` is the seam they would hang on
 * and it stops there. Collecting an email address from a child under 13 is a COPPA question rather than
 * an engineering one; it needs the owner's decision. Nothing in this directory records anything about a
 * child except the keeper id `Game.tsx` already mints and two done/not-done flags under it.
 *
 * ══ THE RULES THIS DIRECTORY KEEPS ════════════════════════════════════════════════════════════════
 *
 *   E IS THE ONLY INTERACTION KEY. Space jumps, and only jumps. Escape is a way out and is never on the
 *   path to anything.
 *
 *   THE DIALOGUE NEVER PAUSES, NEVER CAPTURES AND NEVER BLOCKS. The whole flat layer is
 *   `pointer-events: none` except one skip button that only exists while the pointer is free.
 *
 *   NOTHING IS EVER SAID ABOUT BEING RIGHT. Coins are paid per question ANSWERED, the gate opens for
 *   having worked through the board rather than for having done well at it, and Nan's closing line is
 *   the same line whatever happened. Correctness is deleted before it reaches this layer, so there is
 *   nothing here to react to even if any of it wanted to.
 *
 *   IT CANNOT TRAP. Every step has a finite timeout, every objective is satisfiable more than one way,
 *   and the board can be left with E at any moment with every answer already given kept. Every LEG of the
 *   board has a finite timeout too, which it did not used to — see `run.ts`. A leg that cannot put anything
 *   on the board gives up on itself, because "there is nothing here to press" is the one state a child
 *   cannot get out of by doing the thing they were asked to do.
 *
 *   FINISHING IT ALWAYS OPENS THE PADDOCK. Not as a promise but as a structure: the completion and the
 *   splice are the same transition, in `run.ts`, and `run.test.ts` fails if a run can report itself
 *   finished with the barricade still standing. The owner's report — "i finished the series of questions
 *   and nothing unlocked" — is that test failing.
 *
 *   IT CANNOT RUN TWICE. Persisted under the keeper id from `contract.ts`, the moment the tour settles.
 */

export { IntroGuide } from './IntroGuide';
export { IntroPortrait } from './IntroPortrait';
export { useBoardEngaged } from './store';
export { INTRO_SOLIDS, BOARD_AT, BOARD_ITEMS, LEGS, PADDOCK, dockPoint as boardDockPoint } from './site';
export { STEPS, WORST_CASE_MS, type StepId, type Tutorial } from './tutorial';
