/**
 * `?perf=1`, and nothing else turns this on.
 *
 * The same reasoning as `reset.ts`: an adult can type a URL and a child cannot stumble onto one. A
 * frame-time panel over the ranch would be the single most confusing thing on the screen for a
 * five-year-old, so it is not a button, not a keyboard shortcut, and not on in development by
 * default.
 */
export function perfEnabled(search: string = typeof window === 'undefined' ? '' : window.location.search): boolean {
  return new URLSearchParams(search).has('perf');
}
