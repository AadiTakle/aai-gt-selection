/*
 * GT adaptive-exam demo embedding shim (AX-01, D-016).
 * A tiny contract library any question-type demo includes to speak the host
 * postMessage protocol. Catalog demos call GTExam.onInit/telemetry/respond
 * instead of re-implementing the message plumbing. No dependencies.
 */
/* global window, parent, performance */
(function () {
  var HOST = 'gt-exam-host';
  var DEMO = 'gt-exam-demo';
  var itemShownAt = null;
  var firstActionAt = null;
  var currentItem = null;
  var currentSession = null;
  var initCallback = null;

  function post(message) {
    message.source = DEMO;
    parent.postMessage(message, '*');
  }

  window.addEventListener('message', function (event) {
    var message = event.data;
    if (!message || message.source !== HOST) return;
    if (message.type === 'init') {
      currentItem = message.item;
      currentSession = message.sessionId;
      itemShownAt = performance.now();
      firstActionAt = null;
      if (initCallback) initCallback(message.item);
    }
  });

  function telemetry(kind, payload) {
    post({
      type: 'telemetry',
      event: {
        kind: kind,
        itemId: currentItem ? currentItem.itemId : null,
        tOffsetMs: itemShownAt != null ? Math.round(performance.now() - itemShownAt) : 0,
        payload: payload || {},
      },
    });
  }

  window.GTExam = {
    ready: function () {
      post({ type: 'ready' });
    },
    onInit: function (callback) {
      initCallback = callback;
      if (currentItem) callback(currentItem);
    },
    item: function () {
      return currentItem;
    },
    sessionId: function () {
      return currentSession;
    },
    /** Reset timing when the scored phase begins (after any warm-up). */
    startScored: function () {
      itemShownAt = performance.now();
      firstActionAt = null;
    },
    markFirstAction: function () {
      if (firstActionAt === null) {
        firstActionAt = performance.now();
        telemetry('first_action', {});
      }
    },
    telemetry: telemetry,
    warmupDone: function () {
      post({ type: 'warmup_done', itemId: currentItem ? currentItem.itemId : undefined });
    },
    respond: function (options) {
      var now = performance.now();
      var rt = itemShownAt != null ? Math.round(now - itemShownAt) : 0;
      var firstAction = firstActionAt != null ? Math.round(firstActionAt - itemShownAt) : null;
      var measurements = options.measurements || {};
      measurements['M-ACC'] = options.correct ? 1 : 0;
      measurements['M-RT'] = rt;
      if (firstAction != null) measurements['M-RTFIRST'] = firstAction;
      measurements['M-REV'] = options.revisions || 0;
      var engaged = options.engaged !== undefined ? options.engaged : rt >= 700;
      post({
        type: 'response',
        response: {
          itemId: currentItem ? currentItem.itemId : options.itemId,
          correct: !!options.correct,
          score: options.score != null ? options.score : options.correct ? 1 : 0,
          rtMs: rt,
          firstActionMs: firstAction,
          revisions: options.revisions || 0,
          engaged: engaged,
          measurements: measurements,
          syntheticOnly: true,
        },
      });
    },
  };
})();
