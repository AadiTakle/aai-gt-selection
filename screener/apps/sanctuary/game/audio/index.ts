/**
 * THE SOUND OF BRACKENHOLLOW, AS THE INTEGRATOR SEES IT.
 *
 * ══ THE OWNER'S REQUEST ═══════════════════════════════════════════════════════════════════════════
 *
 *   "add squish/squelch noises when you pickup/dropoff the slimes and vacuum sound whenever you suck up a
 *    slime, plop sound too probably, and probably very soft ambient music"
 *
 * All of it is here, plus the two optional extras (a coin chime and a hatch), and NONE OF IT IS A FILE.
 * Every sound is synthesised in the Web Audio API from oscillators, noise buffers this directory fills
 * itself, biquad filters and one hand-built convolution impulse. Nothing is fetched, nothing was added to
 * `package.json`, and there is no asset that can go missing.
 *
 * ══ WHAT TO MOUNT ════════════════════════════════════════════════════════════════════════════════
 *
 *     import { AudioProvider, HeadphonePrompt, MuteButton, useAudio } from './audio';
 *
 *     // Wrap the game once, outside the Canvas. Renders nothing and creates no AudioContext.
 *     <AudioProvider>
 *       <div className="bh-root">
 *         <Canvas>…</Canvas>
 *         <MuteButton />          // flat HUD, fixed top right, styles itself, needs no CSS from you
 *         <HeadphonePrompt />     // flat HUD, fixed top centre, same deal. Shows itself until the first
 *                                 // gesture, fades out, unmounts, and is never seen again.
 *       </div>
 *     </AudioProvider>
 *
 *     // Anywhere inside it, including inside the Canvas:
 *     const { squish, land, plop, suckStart, suckStop, coin, hatch } = useAudio();
 *
 * Every one of those is a module constant with a stable identity, so they are free to put in a dependency
 * array, and every one of them is a silent no-op before the first gesture, while muted, and after unmount.
 * None of them can throw. There is nothing to guard.
 *
 * ══ WHERE EACH ONE GOES IN `Game.tsx` ════════════════════════════════════════════════════════════
 *
 *   squish()     in `<Vacpack onCapture={…}>` — `takeSlime`. A slime has gone up the nozzle.
 *   land()       in `<Vacpack onRelease={…}>` — `putSlime`. Read `vacpack/Vacpack.tsx`: `onRelease` fires
 *                AT THE END OF THE BOUNCE, not at the launch, so this callback is the landing and `land()`
 *                is the sound for it.
 *   plop()       HAS NO CALLBACK, and this is the one thing this directory needs from a file it does not
 *                own. The vacpack does not report the moment of release. Two ways to get it, both outside
 *                the vacpack:
 *                  (a) RECOMMENDED — `const { held } = useVacpackTank();` and fire `plop()` in an effect
 *                      when `held.length` DROPS. The tank is shifted at the moment of launch (`tankShift`
 *                      in `Vacpack.tsx`), so a drop is exactly a release, and it cannot fire on a press
 *                      that did nothing because the tank was empty.
 *                  (b) Mirror the vacpack's own input: a window listener for `mousedown` button 2 and
 *                      `keydown` KeyQ, gated on the same `enabled` expression. Simpler, but it will fire on
 *                      a press with an empty tank, where the game deliberately makes no sound.
 *                Fire it on the same tick the tank drops, not when the slime lands: `plop` is the release
 *                and `land` is the arrival, and hearing them 700 ms apart is the point of having both.
 *   suckStart()  when the child begins drawing, suckStop() when they let go. The vacpack keeps this in a
 *                ref rather than in state, so the cheapest correct place is a window listener beside the
 *                one you already have: `mousedown` button 0 → suckStart, `mouseup` button 0 and `blur` →
 *                suckStop, all gated on `locked && !engaged && !shopOpen` exactly as `<Vacpack enabled>`
 *                is. suckStop MUST also be called when `enabled` goes false — a station engaging mid-draw
 *                otherwise leaves the loop running. It is idempotent, so calling it twice is free and
 *                calling it defensively is correct.
 *   coin()       beside `earn(…)` in `Beat`'s `onAnswered` and `onDone`. Optional.
 *   hatch()      in `grant`, when a round's egg opens. Optional.
 *
 * ══ THE PROMISES ═════════════════════════════════════════════════════════════════════════════════
 *
 *   NOTHING SOUNDS BEFORE A GESTURE. No AudioContext is even constructed until the first `pointerdown`,
 *   `touchstart` or `keydown` — captured at window level in the capture phase, so it exists before the
 *   React handler on that same press runs. Nothing is queued while it does not exist.
 *
 *   THE CHILD IS ASKED FOR HEADPHONES BEFORE ANYTHING HAPPENS. `HeadphonePrompt` is a large drawn headphone
 *   icon at the top centre, gently breathing, from load until the first gesture — legible to a child who
 *   cannot read a word, and gone the moment they press anything, leaving `MuteButton` as the only audio
 *   control on screen. It is absent entirely under `prefers-reduced-motion` and whenever the game starts
 *   muted, because inviting a child to put headphones on for silence is worse than saying nothing.
 *
 *   ONE PRESS TO SILENCE IT. `MuteButton` top right, and the `M` KEY from anywhere — which is not a
 *   nicety: the ranch runs under pointer lock, and while it is locked there is no cursor, so a click is
 *   impossible. The choice is remembered in `localStorage` under `gt-sanctuary:muted`.
 *
 *   IT STARTS MUTED FOR A CHILD WHO HAS ASKED FOR LESS. `prefers-reduced-motion` is about motion, but it
 *   is the only signal a browser gives about sensory sensitivity, and continuous sound is distressing for
 *   some of the same children. A stored choice always wins over it. See `mute.ts`.
 *
 *   NOTHING SUDDEN, NOTHING LOUD, NOTHING THAT READS AS AN ERROR. There is no failure sound in here — no
 *   buzzer, no descending "wrong" figure, nothing dissonant, no transient with an edge on it, and nothing
 *   above about −7 dBFS. Measured: `npm run sanctuary` and then
 *   `node apps/sanctuary/game/audio/verify.mjs`, which renders every graph offline in real Chrome and
 *   prints peak and RMS per sound plus a self-calibrating discontinuity test on the suction ramps.
 *
 *   IT CLEANS UP. `AudioProvider` unmounting stops every source, disconnects every node and closes the
 *   context. Reference-counted so React 19 StrictMode's remount does not close a context the second mount
 *   is about to want. A hidden tab suspends, so a laptop that has been put away goes quiet.
 *
 * ══ WHAT IS IN HERE ══════════════════════════════════════════════════════════════════════════════
 *
 *   variation.ts  the anti-repeat chooser and the seeded dice. The only unit-tested file.
 *   noise.ts      white, pink and brown noise, and the hand-built reverb impulse.
 *   bus.ts        the mix: tone, room, safety compressor, master. And `rampTo`, which is why nothing clicks.
 *   voices.ts     squish, land, plop, coin, hatch. A squelch is a resonant filter sweep over a noise burst.
 *   vacuum.ts     the suction loop. Nothing is ever started or stopped during play; only a gain moves.
 *   pad.ts        the ambience. A drone and randomly spaced swells, so there is no period to recognise.
 *   mute.ts       one boolean with subscribers, independent of the engine.
 *   engine.ts     the AudioContext, the gesture gate, the M key, and the lifecycle.
 *   useAudio.tsx  the four things `Game.tsx` touches, including both on-screen controls.
 *   measure.ts    TEMPORARY. Offline renders and their measurements.
 *   preview.*     TEMPORARY. A button per sound, at /game/audio/preview.html.
 *   verify.mjs    TEMPORARY. Drives the preview in headless Chrome and prints the table.
 */

export { AudioProvider, HeadphonePrompt, MuteButton, useAudio } from './useAudio';
export { LS_MUTED, muted, prefersReducedMotion, setMuted, toggleMuted, useMuted } from './mute';
export { audioGestured, subscribeGestured } from './engine';
export type { AudioApi } from './engine';
