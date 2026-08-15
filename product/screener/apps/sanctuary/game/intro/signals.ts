/**
 * The one thing the flat layer asks the world to do.
 *
 * `IntroPortrait` is outside the `<Canvas>` and `IntroGuide` is inside it, and the skip control lives on
 * the outside while the machine lives on the inside. Rather than widen `store.ts` — which is a VIEW, and
 * should only ever be written by the thing that owns the state — the request travels as a counter that
 * the guide reads on its next tick. A counter rather than a boolean so a second press is not swallowed,
 * and so nothing has to be cleared by the reader.
 */

let asked = 0;

/** The adult pressed "Skip the tour". */
export function requestSkip(): void {
  asked += 1;
}

/** How many times skipping has been asked for. The guide compares it with what it last saw. */
export function skipRequests(): number {
  return asked;
}

/** Only for the tests. */
export function resetSkipRequests(): void {
  asked = 0;
}
