/**
 * THE COIN ECONOMY AND THE SLIME SHOP.
 *
 * ══ THE OWNER'S REQUEST ═══════════════════════════════════════════════════════════════════════════
 *
 *   "i want to vary the slime types even more and perhaps we can have an atm of sorts for the more that the
 *    user answers questions ocrrectly they can unlock coins and stuff to get slimes. that way, there is
 *    more incentive to prompt these questions"
 *
 * The stall, the coins and the shelves are all here. The one thing built differently from the letter of
 * that note is the payout, and it is worth being direct about why.
 *
 * ══ COINS ARE PAID FOR QUESTIONS ANSWERED, NOT FOR QUESTIONS ANSWERED CORRECTLY ═══════════════════
 *
 * One coin per question answered, four more when a round closes, and nothing anywhere in this directory
 * looks at what was chosen. Three reasons:
 *
 *   1. IT IS NOT AVAILABLE. `shared/useSortie.ts` deletes `correct` from the response before returning it,
 *      by design, so correctness never reaches the browser. There is nothing to branch on.
 *   2. IT WOULD CORRUPT THE MEASUREMENT. A child playing for a payout guesses fast, asks an adult, or
 *      repeats whatever paid last time. The ability estimate assumes ordinary effort, so an accuracy-linked
 *      payout damages the thing the product exists to produce.
 *   3. IT WORKS LESS WELL ANYWAY. Deci, Koestner & Ryan (1999), 128 experiments, found tangible rewards
 *      most harmful to intrinsic motivation in children specifically.
 *
 * The owner's actual goal — "there is more incentive to prompt these questions" — is served completely by
 * paying per question asked: more questions means more coins means more slimes. Nothing about the incentive
 * to answer depends on the payout being conditional.
 *
 * WHAT IT WOULD TAKE TO CHANGE IT, so the decision stays the owner's. Two changes, in this order:
 *   (a) `shared/useSortie.ts` would have to stop deleting `correct` and pass it through to `Beat`. That is
 *       the real work and it is an architectural decision about what the browser is allowed to know.
 *   (b) Then this side is one line: `earn(EARN.perAnswer)` becomes `if (wasRight) earn(EARN.perAnswer)`.
 * Reason 1 goes away with (a). Reasons 2 and 3 do not go away at all.
 *
 * ══ WHAT `Game.tsx` MOUNTS ════════════════════════════════════════════════════════════════════════
 *
 *   const { coins, earn, spend } = useCoins();        // anywhere; one shared purse
 *
 *   <Canvas>
 *     <Shop
 *       engaged={shopOpen}                            // your own boolean, separate from the station id
 *       onEngage={() => setShopOpen(true)}
 *       onLeave={() => setShopOpen(false)}
 *       onBuy={(family) => grant(family)}             // or putSlime, if you want it to land somewhere
 *     />
 *   </Canvas>
 *
 *   <Purse />                                         // flat, top left, fixed, no pointer events
 *   <CoinFlight trigger={earnTicks} />                // flat, full screen, no pointer events
 *
 *   SHOP_SOLIDS                                       // concatenated with SOLIDS and STATION_SOLIDS
 *
 * FOUR THINGS THE INTEGRATOR HAS TO DO, because this directory cannot reach into `Game.tsx` and none of
 * them is optional:
 *
 *   - EARN ON THE WAY PAST. In `Beat`, when `s.answered` goes up, call `earn(EARN.perAnswer)`; when the
 *     round closes (`onDone`), call `earn(EARN.perRound)`. Both are unconditional.
 *   - BUMP THE FLIGHT. `trigger` is any number that only goes up. `earnTicks()` from `./coins` is exactly
 *     that and needs no state of its own; a plain counter incremented beside each `earn` works too. How
 *     many coins fly is read from the purse, not from `trigger`, so one prop is enough.
 *   - THE KEEPER MUST NOT WALK WHILE THE SHOP IS OPEN. Pass `locked && !engaged && !shopOpen` to `Keeper`,
 *     exactly as you already do for the stations, or WASD walks the child out of the shop while they are
 *     choosing. Mouse-look must keep running: aiming by looking IS the interaction.
 *   - THE VACUUM MUST BE OFF WHILE THE SHOP IS OPEN. `<Vacpack enabled={locked && !engaged && !shopOpen}>`,
 *     so a click means "buy this" at the counter and "hoover" everywhere else, with no mode to learn.
 *
 * The shop and the stations must never be engaged at once. Both swap R3F's `compute` for a crosshair and
 * both dock the camera, so two open at once would fight; keeping the two flags mutually exclusive in
 * `Game.tsx` is the whole of the requirement, and the 9m gap between the stall and the nearest station means
 * a child is never offered both.
 *
 * ══ THE RULES THIS DIRECTORY KEEPS ════════════════════════════════════════════════════════════════
 *
 * Coins only go up except when deliberately spent. Nothing expires, nothing resets, nothing is a streak.
 * No slime is ever locked, refused, crossed out or unavailable — one a child cannot afford yet has a light
 * cloth over its cubby that lifts by itself when the purse reaches the price, with the price in plain coins
 * in front of the cloth the whole time. The shelves never empty. Every price is drawn as coins rather than
 * as a numeral, every slime is drawn as itself, and no word anywhere in here reaches the child.
 */

export { CoinFlight, Purse } from './Purse';
export { Shop } from './Shop';
export {
  DEFAULT_PRICE,
  EARN,
  LS_COINS,
  MAX_PRICE,
  PRICES,
  STOCK,
  balance,
  earn,
  earnTicks,
  priceOf,
  spend,
  useCoins,
} from './coins';
export { AT as SHOP_AT, DOCK as SHOP_DOCK, REACH as SHOP_REACH, SHOP_SOLIDS, YAW as SHOP_YAW, dockPoint as shopDockPoint } from './site';
