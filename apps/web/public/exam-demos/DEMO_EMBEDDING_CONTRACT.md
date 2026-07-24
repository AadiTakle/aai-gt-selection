# Demo Embedding Contract (`/exam`)

How a question-type demo plugs into the adaptive screening surface (AX-01, D-016).
The host (`apps/web/src/app/(embed)/exam/exam-runner.tsx`) loads each demo in an
`<iframe>` and talks to it over `window.postMessage`. Reference implementation:
[`embed-shim.js`](./embed-shim.js) + [`generic.html`](./generic.html).

A demo is **one self-contained page** served from `apps/web/public/exam-demos/<file>`
(HTML+CSS+JS, no build step, no external network). The host reloads the iframe for
every item, so each demo instance renders exactly one item.

## Lifecycle

```
iframe load
  demo → host : { type: 'ready' }                 // listener attached
  host → demo : { type: 'init', sessionId, item } // render this item
  demo shows a wordless warm-up (≈10s, unscored)
  demo → host : { type: 'warmup_done', itemId }
  demo → host : { type: 'telemetry', event }      // 0..N, throughout the scored item
  demo → host : { type: 'response', response }     // exactly once, ends the item
host submits, then reloads the iframe with the next item (or shows results)
```

The host also posts `init` on iframe `onLoad` as a fallback, and de-dupes by
`item.itemId`, so a demo that misses the `ready→init` handshake still receives its item.

## Messages: host → demo

Every message includes `source: 'gt-exam-host'`.

| type | payload | meaning |
|---|---|---|
| `init` | `{ sessionId: uuid, item: ServedItem }` | render this item; reset your timers |
| `start` | `{ itemId: uuid }` | (optional) begin the scored phase after warm-up |

`ServedItem` (no IRT parameters or answer key are ever sent to the browser):

```ts
{ itemId: string, typeCode: string, domain: 'fluid_reasoning'|'verbal'|'quantitative'|'spatial',
  difficultyLevel: number /* 1..20 */, demoPath: string, params: Record<string, unknown> }
```

Scale your difficulty from `item.difficultyLevel`; read any item-specific config
(seed, variant, options) from `item.params`.

## Messages: demo → host

Every message must include `source: 'gt-exam-demo'`.

| type | payload | when |
|---|---|---|
| `ready` | `{}` | once, after your message listener is attached |
| `warmup_done` | `{ itemId }` | once, when the unscored warm-up ends |
| `telemetry` | `{ event: TelemetryEvent }` | any time during the scored item |
| `response` | `{ response: ItemResponse }` | exactly once; ends the item |

`TelemetryEvent`:

```ts
{ kind: string /* e.g. 'item_shown'|'first_action'|'action'|'hint'|'revision' */,
  itemId: string | null, tOffsetMs: number /* ms since scored item shown */,
  payload: Record<string, unknown> }
```

`ItemResponse` — the demo computes correctness locally (the host stores it and
updates ability; it never sees your key):

```ts
{ itemId: string,
  correct: boolean,
  score: number,            // [0,1]; 1 for a correct dichotomous item
  rtMs: number,             // ms from scored-item shown to submit
  firstActionMs: number|null,
  revisions: number,        // answer changes before submit
  engaged: boolean,         // false = rapid-guess/off-task (speed signals discounted)
  measurements: Record<string, number>, // keys match /^M-[A-Z]+$/
  syntheticOnly: true }
```

Standard `measurements` keys (add more as numbers where meaningful):
`M-ACC` accuracy · `M-RT` total RT · `M-RTFIRST` first-action latency · `M-REV`
revisions. Optional examples: `M-PATH`, `M-HINT`, `M-EXPLORE`, `M-DIFFREACH`.

## Origin & security

- Demos are **same-origin** (served under `/exam-demos/` by the web app).
- Host ignores any message whose `source !== 'gt-exam-demo'` and whose
  `event.source` is not this demo's iframe; demos must ignore any message whose
  `source !== 'gt-exam-host'`.
- **Born-synthetic**: no external network, no persistence, no PII. The demo receives
  only an item + a session id for correlation — never IRT parameters, the answer key,
  or participant identity.
- Exactly one `response` per item. Do not post after `response`.

## Easiest path — use `embed-shim.js`

Include the shim and skip all message plumbing:

```html
<script src="embed-shim.js"></script>
<script>
  GTExam.onInit(function (item) {
    // render warm-up for item.domain / item.difficultyLevel, then:
    GTExam.warmupDone();
    GTExam.startScored();                     // resets rt / first-action timers
    GTExam.telemetry('item_shown', { difficulty: item.difficultyLevel });
    // on the learner's first interaction: GTExam.markFirstAction();
    // on each change:                     GTExam.telemetry('action', { ... });
    // on submit:                          GTExam.respond({ correct: true, revisions: 0 });
  });
  GTExam.ready();
</script>
```

`GTExam.respond({ correct, revisions, score?, engaged?, measurements? })` auto-fills
`rtMs`, `firstActionMs`, `M-ACC/M-RT/M-RTFIRST/M-REV`, and infers `engaged`
(rapid-guess if RT < 700ms) unless you override it. `GTExam.sessionId()` and
`GTExam.item()` are available if needed.

## Conformance checklist

- [ ] Single self-contained page under `apps/web/public/exam-demos/`; no external network.
- [ ] Posts `ready`; renders on `init`; reads `difficultyLevel` + `params`.
- [ ] Wordless self-teaching warm-up, then `warmup_done`; scored timing starts after.
- [ ] Streams `telemetry` (at least `item_shown` + `first_action`).
- [ ] Posts exactly one `response` with real `correct`, `rtMs`, `firstActionMs`,
      `revisions`, `engaged`, and `M-*` measurements; `syntheticOnly: true`.
- [ ] Fully automated scoring (no human-in-the-loop); unambiguous single correct answer.
- [ ] Ignores non-`gt-exam-host` messages; never leaks/needs the answer key or PII.
