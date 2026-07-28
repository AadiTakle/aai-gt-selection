/**
 * Recovery for the "stale Server Action" case.
 *
 * Next.js gives every Server Action a content-hash id baked into both the client
 * bundle and the server. Those ids change with every build, so a browser tab
 * left open across a deploy calls an id the new server no longer has and Next
 * throws "Failed to find Server Action … was not found on the server."
 *
 * The only real cure is to fetch the new client bundle — i.e. reload. These
 * helpers detect that specific error and reload once, so an open tab recovers
 * silently after a deploy instead of dead-ending on the framework error.
 */

const STALE_SERVER_ACTION = /Failed to find Server Action|was not found on the server/i;

/** True when an error message is the stale-Server-Action signature. */
export function isStaleServerActionError(message: string | null | undefined): boolean {
  return typeof message === 'string' && STALE_SERVER_ACTION.test(message);
}

/**
 * Reload to pull the current bundle. Guarded so a genuinely persistent error
 * can't trap the tab in a reload loop: we reload at most once per 10s window.
 */
export function reloadForStaleServerAction(): void {
  try {
    const key = 'gt-stale-action-reload-at';
    const now = Date.now();
    const last = Number(window.sessionStorage.getItem(key) ?? '0');
    if (now - last < 10_000) return; // already reloaded very recently — don't loop
    window.sessionStorage.setItem(key, String(now));
  } catch {
    // sessionStorage can be unavailable (private mode / blocked) — still try one reload
  }
  window.location.reload();
}
