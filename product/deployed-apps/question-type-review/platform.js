/**
 * The review UI's connection to the deployed question platform.
 *
 * ══ WHY THIS EXISTS ═══════════════════════════════════════════════════════════════════════════════
 *
 * The page used to read two files that sat next to it on disk: `review-data.json` for the list of
 * types, and `banks/<TYPE>.jsonl` for the items. Both go stale the moment the library moves, and they
 * had already drifted — four types with real banks (FLU-OPCHAIN-01, QUANT-GLYPHNUM-01, SPA-XFORM-01,
 * VER-MORPHO-01) existed in the library and were INVISIBLE here, because nothing had added them to the
 * static list. A reviewer cannot notice a type the page does not draw.
 *
 * So the list of types and everything measurable about them now comes from the platform, live. What
 * stays local is the part the platform does not have and should not: the design prose in
 * `review-data.json` (interaction, self-teach, engagement hook, construct-irrelevant risks), which is
 * a spec rather than a measurement.
 *
 * ══ WHY THE ANSWER KEY IS NOT HERE ════════════════════════════════════════════════════════════════
 *
 * The old path fetched whole bank records — answer keys included — and deleted the key in JavaScript
 * before handing the item to the demo. That is a key that reached the browser. The platform strips it
 * server-side and cannot return it, so the reviewer-only key panel is gone with it. That is a loss for
 * the reviewer and the right trade: the same page is now safe to host somewhere other than localhost.
 *
 * ══ WHY SERVING GOES THROUGH A SESSION ════════════════════════════════════════════════════════════
 *
 * There is deliberately no "give me item N of type T" route — `/v1/catalog/types/{code}` returns the
 * difficulty DISTRIBUTION and no items, because an app has no business enumerating a bank. The only
 * way to see a real item is to ask for one the way a child's app does: open a session restricted to
 * the one type and take what the engine serves. Two consequences the UI has to be honest about:
 * difficulty is chosen by the engine rather than by the slider, and the age band is the real control,
 * because `ageBand` is a session field the platform honours.
 */

const PlatformClient = (() => {
  let config = null;

  async function load() {
    if (config !== null) return config;
    const res = await fetch('platform-config.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`platform-config.json → HTTP ${res.status}`);
    config = await res.json();
    if (!config.apiBaseUrl || !config.appKey) {
      throw new Error('platform-config.json needs both apiBaseUrl and appKey');
    }
    return config;
  }

  async function call(path, init) {
    const c = await load();
    const res = await fetch(`${c.apiBaseUrl}${path}`, {
      ...init,
      headers: { 'x-api-key': c.appKey, 'content-type': 'application/json', ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${path} → HTTP ${res.status} ${detail.slice(0, 200)}`);
    }
    return res.json();
  }

  return {
    load,
    /** Every type this app is allowed to see, with the platform's own counts and UI requirement. */
    async types() {
      const body = await call('/v1/catalog/types');
      return body.types ?? [];
    },
    /** One type, including `difficulties`: the sorted spectrum the histogram is drawn from. */
    async type(typeCode) {
      return call(`/v1/catalog/types/${encodeURIComponent(typeCode)}`);
    },
    /** This app's own registration: which types it is approved for, and the snapshot it is pinned to. */
    async app() {
      return call('/v1/catalog/app');
    },
    /**
     * A session that can only ever serve the one type, which is what makes it a preview rather than a
     * screening. `ageBand` is passed through because the platform honours it and a reviewer's real
     * question is usually "what does a fourth grader get".
     */
    async openSession(typeCode, ageBand) {
      return call('/api/bank/sessions', {
        method: 'POST',
        body: JSON.stringify({ types: [typeCode], ...(ageBand ? { ageBand } : {}) }),
      });
    },
    async next(sessionId) {
      return call(`/api/bank/sessions/${encodeURIComponent(sessionId)}/next`);
    },
    /**
     * Answering is what lets a reviewer pull a SECOND item: the engine will not move on until the one
     * it served has been resolved. The response value is deliberately nonsense — the point is to
     * advance the session, not to measure anybody.
     */
    async answer(sessionId, response) {
      return call(`/api/bank/sessions/${encodeURIComponent(sessionId)}/answer`, {
        method: 'POST',
        body: JSON.stringify({ response, latencyMs: 0 }),
      });
    },
  };
})();
