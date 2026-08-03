/**
 * Legacy demo → postMessage bridge (temporary integration shim).
 *
 * The current 8 demos (public/exam-demos/*.html) still self-render and expose
 * their results only through the DOM (`#phasecue[data-phase="done"]`, metric
 * rows in `#mlist`, an event log in `#log`). The runner, however, speaks ONLY
 * the postMessage protocol (see messaging.ts) — it never touches the demo DOM.
 *
 * To keep the app running end-to-end while the demos are refactored into pure
 * renderers by the bank workstreams, the host injects this bridge into each
 * same-origin demo iframe. The bridge runs INSIDE the iframe, watches the demo
 * DOM, and emits the protocol messages a refactored demo will emit natively:
 *   demo → host: {type:'ready'}, {type:'telemetry', event}, {type:'result', result}
 *   host → demo: {type:'init', item}, {type:'start'}  (advisory for legacy demos)
 *
 * When a demo emits these messages itself, injection becomes a no-op to keep and
 * this file can be deleted. This isolates all remaining DOM knowledge here — the
 * DOM scraping that used to live in the runner (harvest.ts) is gone.
 */

/**
 * The bridge body, serialized so it can execute in the iframe's realm. Kept in
 * plain ES5-ish JS (no imports) because it is injected as script text.
 */
export const LEGACY_DEMO_BRIDGE_SOURCE = String.raw`(function () {
  'use strict';
  var HOST = 'gt-exam-host';
  var DEMO = 'gt-exam-demo';
  if (window.__gtExamBridgeInstalled) return;
  // A real (already-postMessage-speaking) demo announces itself; stand down.
  if (window.__gtExamNativeProtocol) return;
  window.__gtExamBridgeInstalled = true;

  var item = null;
  var resulted = false;
  var itemStart = Date.now();

  function post(msg) {
    msg.source = DEMO;
    try {
      window.parent.postMessage(msg, window.location.origin);
    } catch (e) {
      /* parent gone */
    }
  }

  function parseNum(s) {
    var m = String(s).match(/-?\d+(?:\.\d+)?/);
    return m ? Number(m[0]) : null;
  }
  function accFrom(s) {
    var f = String(s).match(/(\d+)\s*\/\s*(\d+)/);
    if (f) {
      var d = Number(f[2]);
      return d > 0 ? Number(f[1]) / d : null;
    }
    var p = String(s).match(/(\d+(?:\.\d+)?)\s*%/);
    return p ? Number(p[1]) / 100 : null;
  }
  function diffFrom(s) {
    var l = String(s).match(/L\s*(\d+)/i);
    if (l) return Number(l[1]);
    return parseNum(s);
  }
  function errTypeCode(s) {
    var t = String(s).toLowerCase();
    if (t.indexOf('none') >= 0) return 0;
    if (t.indexOf('near') >= 0) return 1;
    if (t.indexOf('random') >= 0) return 2;
    return -1;
  }

  function readMetrics() {
    var out = {};
    var rows = document.querySelectorAll('#mlist .mrow');
    for (var i = 0; i < rows.length; i++) {
      var idEl = rows[i].querySelector('.mid');
      var valEl = rows[i].querySelector('.mval');
      if (!idEl || !valEl) continue;
      var id = (idEl.textContent || '').trim();
      var val = (valEl.textContent || '').trim();
      if (!id || !val || val === '\u2014') continue;
      if (id === 'M-ACC') {
        var a = accFrom(val);
        if (a != null) out[id] = a;
      } else if (id === 'M-DIFFREACH') {
        var d = diffFrom(val);
        if (d != null) out[id] = d;
      } else if (id === 'M-ERRTYPE') {
        var e = errTypeCode(val);
        if (e >= 0) out[id] = e;
      } else {
        var n = parseNum(val);
        if (n != null) out[id] = n;
      }
    }
    return out;
  }

  function isDone() {
    var cue = document.querySelector('#phasecue');
    return !!cue && cue.getAttribute('data-phase') === 'done';
  }

  function emitResult() {
    if (resulted) return;
    resulted = true;
    var metrics = readMetrics();
    post({
      type: 'result',
      result: {
        itemId: item && item.itemId ? item.itemId : undefined,
        typeCode: item && item.typeCode ? item.typeCode : undefined,
        domain: item && item.domain ? item.domain : undefined,
        response: { legacyAggregate: true },
        metrics: metrics,
        telemetry: [],
      },
    });
  }

  // Mirror each new event-log line as a telemetry event.
  var logEl = document.querySelector('#log');
  if (logEl) {
    try {
      var logObs = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var added = muts[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            var node = added[j];
            if (node.nodeType === 1) {
              post({
                type: 'telemetry',
                event: {
                  t: Date.now() - itemStart,
                  kind: 'log',
                  message: (node.textContent || '').trim().slice(0, 240),
                },
              });
            }
          }
        }
      });
      logObs.observe(logEl, { childList: true });
    } catch (e) {
      /* no MutationObserver */
    }
  }

  // Detect the demo reaching its scored-complete phase.
  var cueEl = document.querySelector('#phasecue');
  if (cueEl) {
    try {
      var cueObs = new MutationObserver(function () {
        if (isDone()) emitResult();
      });
      cueObs.observe(cueEl, { attributes: true, attributeFilter: ['data-phase'] });
    } catch (e) {
      /* no MutationObserver */
    }
  }
  var poll = setInterval(function () {
    if (isDone()) {
      emitResult();
      clearInterval(poll);
    }
  }, 500);

  window.addEventListener('message', function (e) {
    if (e.origin !== window.location.origin) return;
    var d = e.data;
    if (!d || d.source !== HOST) return;
    if (d.type === 'init') {
      item = d.item;
    } else if (d.type === 'start') {
      itemStart = Date.now();
    }
  });

  post({ type: 'ready' });
  if (isDone()) emitResult();
})();`;

/**
 * Inject the legacy bridge into a same-origin demo iframe. Returns false if the
 * iframe document is not reachable (cross-origin / not loaded) — the caller then
 * relies on the per-item safety timeout.
 */
export function injectLegacyBridge(iframe: HTMLIFrameElement): boolean {
  try {
    const doc = iframe.contentDocument;
    if (!doc) return false;
    const script = doc.createElement('script');
    script.setAttribute('data-gt-exam-bridge', 'legacy');
    script.textContent = LEGACY_DEMO_BRIDGE_SOURCE;
    (doc.body ?? doc.documentElement).appendChild(script);
    return true;
  } catch {
    return false;
  }
}
