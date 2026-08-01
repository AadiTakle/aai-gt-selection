// The Stage 2 review window. This file owns RENDERING and nothing else.
//
// The block loop is `stage2-block-run.js`, which the headless probe also drives, so a number in a
// report and the same number on screen cannot disagree. That module in turn only calls the shipped
// modules, loaded as the same source files the app imports (compiled by build-stage2-review.mjs,
// one emitted file per source file, hashes recorded in manifest.json):
//
//   nextBlockTarget        apps/web/.../phase2.ts  ->  nextTargetTheta   exam-scoring
//   nextBlockItem          apps/web/.../phase2.ts  ->  selectNextNovelServedItem  exam-engine
//   novelBlockPool         apps/web/.../phase2.ts
//   toLearningTrials       apps/web/.../phase2.ts
//   summariseLearningBlock apps/web/.../phase2.ts  ->  estimateLearningCurve      exam-scoring
//   estimateLearningCurve  exam-scoring
//   hashUnit               exam-engine
//   saveLearningBlockHandoff / loadLearningBlockHandoff   apps/web/.../phase2.ts
//
// There is no second implementation of the selection rule or the ability fit in this window. The
// check is mechanical: neither this file nor the loop contains a logistic. Search both for
// `Math.exp`.
//
// The FIGURE ALGEBRA is likewise not restated — `stage2-inspectors/opchain.js` imports it from the
// generator that wrote the bank.
//
// THE RUNNING PANEL follows the same rule. `stage2-running-estimate.mjs` recomputes both candidate
// readouts after every trial; the acquisition-latency half of it is `blockLatencies`,
// `kaplanMeier` and the sequential log-odds criterion from `stage2-latency.mjs`, taken verbatim
// from the acquisition-latency workstream (PR #42, `docs/product/STAGE2_LATENCY_VS_SLOPE.md`)
// rather than rewritten, so a criterion this window draws and a criterion that report measured
// cannot come apart. This file draws the result and names no threshold of its own.

import {
  advance as advanceRun,
  beginTrial,
  createRun,
  guessingResponder,
  inductionResponder,
  manualResponder,
  playToEnd,
  submitAnswer,
  summariseRun,
} from './stage2-block-run.js';
import { STAGE_CSS, stageMarkup } from './stage2-child-stage.js';
import * as learnability from './stage2-learnability.mjs';
import { partialInductionResponder } from './stage2-latency-responders.js';
import {
  CONTAMINATION_FLOOR,
  PRIOR_INFORMATION_MULTIPLE,
  lambdaVerdict,
  latencyVerdict,
  priorLambdaSd,
  runningSeries,
} from './stage2-running-estimate.mjs';

// The child-facing CSS is injected from the module that owns the child-facing markup, so the screen
// the intuitiveness audit was run on and the screen in this window cannot drift apart. Both arms draw
// through it and nothing below branches on arm.
document.head.appendChild(
  Object.assign(document.createElement('style'), { textContent: STAGE_CSS }),
);

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */

const $ = (id) => document.getElementById(id);
const boot = $('boot');

/** Escape for interpolation into innerHTML. Bank content is authored, but the page prints ids. */
function esc(text) {
  return String(text).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

const fmt = (n, places = 2) =>
  n === null || n === undefined || !Number.isFinite(n) ? '—' : n.toFixed(places);

let engine;
let inspector;
let manifest;
let catalog;
let banks;

try {
  const [manifestRes, itemsRes, catalogRes] = await Promise.all([
    fetch('stage2-build/manifest.json'),
    fetch('stage2-build/items.json'),
    fetch('stage2-review-types.json'),
  ]);
  if (!manifestRes.ok || !itemsRes.ok) throw new Error('build output missing');
  manifest = await manifestRes.json();
  banks = await itemsRes.json();
  catalog = await catalogRes.json();

  const [phase2, scoring, rng] = await Promise.all([
    import('./stage2-build/engine/apps/web/src/lib/exam/phase2.js'),
    import('@gt-selection/exam-scoring'),
    import('./stage2-build/engine/packages/exam-engine/src/rng.js'),
  ]);
  engine = { ...phase2, ...scoring, hashUnit: rng.hashUnit };
} catch (err) {
  boot.innerHTML =
    `<b>The compiled real code is not here yet.</b><br />${esc(err.message ?? err)}<br /><br />` +
    'Build it, then serve this directory:<br />' +
    '<code>node research/exam-question-types/build-stage2-review.mjs</code><br />' +
    '<code>python3 research/exam-question-types/serve-review.py 4300</code>';
  throw err;
}

const AREAS = [
  ['fluid_reasoning', 'Fluid reasoning'],
  ['spatial', 'Spatial'],
  ['quantitative', 'Quantitative'],
  ['verbal', 'Verbal'],
];

const ARMS = {
  consistent: { label: 'CONSISTENT', long: 'one hidden system, held for the whole block' },
  perTrial: { label: 'SCRAMBLED', long: 'a fresh hidden system every trial — the control' },
};

const state = {
  typeCode: catalog.types.find((t) => t.status === 'built')?.typeCode ?? catalog.types[0].typeCode,
  arm: 'consistent',
  abilities: { fluid_reasoning: 13, spatial: 10, quantitative: 10, verbal: 10 },
  seed: 20260731,
  blockLength: engine.LEARNING_BLOCK_LENGTH,
  responder: 'you',
  peeking: false,
  run: null,
  /**
   * Which unscored demonstration is on screen, or `run.warmup.length` once they are done. The child
   * watches these before trial 1 and answers nothing; they are how the task is taught without a
   * written instruction, and they are not scored, so they never reach `lambda`.
   */
  demoAt: 0,
  /** Which beat of that demonstration: 0 poses the row with its hole open, 1 completes it. */
  demoBeat: 0,
  /** Completed runs, keyed by arm, so the two can be put side by side. */
  completed: { consistent: null, perTrial: null },
  /**
   * The running series of each completed arm, so the running panel can draw the control's band
   * behind the live one. Kept beside `completed` rather than inside it because the summary is a
   * scalar per run and this is a series per run.
   */
  completedSeries: { consistent: null, perTrial: null },
  /**
   * Where the contamination floor is drawn. Editable because it is a MEASUREMENT with its own
   * error, not a constant, and how sensitive "cleared at trial N" is to moving it is part of the
   * answer rather than a detail.
   */
  floor: { ...CONTAMINATION_FLOOR },
};

/** The inspector for the currently selected type, or null for a designed-only type. */
async function loadInspector(typeCode) {
  const entry = catalog.types.find((t) => t.typeCode === typeCode);
  if (!entry?.inspector) return null;
  return import(`./stage2-inspectors/${entry.inspector}.js`);
}

inspector = await loadInspector(state.typeCode);

const typeEntry = () => catalog.types.find((t) => t.typeCode === state.typeCode);
const armBank = () => banks[state.typeCode]?.[state.arm] ?? null;

boot.hidden = true;
$('layout').hidden = false;

/* ------------------------------------------------------------------ *
 * Provenance chip: which build of the real code is loaded
 * ------------------------------------------------------------------ */

function renderProvenance() {
  const chip = $('provChip');
  const built = new Date(manifest.builtAt);
  // The only staleness this page can detect by itself is a manifest that disagrees with the data
  // beside it. Source-hash freshness is `--check`'s job, which is why the chip says to run it.
  const declared = manifest.types.find((t) => t.typeCode === state.typeCode);
  const loaded = Object.keys(banks[state.typeCode] ?? {}).length;
  const mismatch = declared ? declared.arms.length !== loaded : true;
  chip.classList.toggle('stale', mismatch);
  chip.textContent = mismatch
    ? 'real-code build: MANIFEST DISAGREES WITH items.json — rebuild'
    : `real code · built ${built.toLocaleTimeString()} · ${manifest.sourceCount} sources`;
  chip.title =
    `Entry modules loaded by this page:\n  ${Object.values(manifest.entries).join('\n  ')}\n\n` +
    'manifest.json holds the sha256 of every source file that went into this build. To prove the ' +
    'window is not running stale code, run:\n  node research/exam-question-types/' +
    'build-stage2-review.mjs --check';
}

/* ------------------------------------------------------------------ *
 * Left column — the Stage 1 result, set by hand
 * ------------------------------------------------------------------ */

function renderSliders() {
  $('abilityIntro').innerHTML =
    'Stage 1 is not run here. Set where it would have LEFT the child, per reasoning area, and the ' +
    `block is administered from that. Only <b>${esc(AREAS[0][1].toLowerCase())}</b> drives ` +
    'anything: <code>LEARNING_BLOCK_AREA</code> pins the block to one area for every child, ' +
    'because a rate measured in whichever area a child happened to be strongest in is not ' +
    'comparable to anyone else\u2019s. The other three are here so that constraint is visible ' +
    'rather than hidden.';

  $('sliders').innerHTML = AREAS.map(([area, label]) => {
    const drives = area === engine.LEARNING_BLOCK_AREA;
    return (
      `<div class="slider${drives ? '' : ' inert'}">` +
      `<div class="lab"><b>${esc(label)}</b>` +
      (drives
        ? '<span class="drives">drives the block</span>'
        : '<span class="note">not served</span>') +
      `<span class="val" data-val="${area}">${state.abilities[area].toFixed(1)}</span></div>` +
      `<input type="range" min="1" max="20" step="0.5" value="${state.abilities[area]}" ` +
      `data-area="${area}" ${state.run ? 'disabled' : ''} /></div>`
    );
  }).join('');

  for (const input of $('sliders').querySelectorAll('input[type=range]')) {
    input.addEventListener('input', () => {
      const area = input.dataset.area;
      state.abilities[area] = Number(input.value);
      $('sliders').querySelector(`[data-val="${area}"]`).textContent =
        state.abilities[area].toFixed(1);
      renderHandoff();
    });
  }
}

function renderBlockCfg() {
  const disabled = state.run ? 'disabled' : '';
  $('blockCfg').innerHTML =
    '<div class="cfgrow"><label>Block length</label>' +
    `<input type="number" id="cfgLen" min="4" max="120" value="${state.blockLength}" ${disabled} />` +
    `<span class="real">real: ${engine.LEARNING_BLOCK_LENGTH}</span></div>` +
    '<div class="cfgrow"><label>Selection seed</label>' +
    `<input type="number" id="cfgSeed" value="${state.seed}" ${disabled} />` +
    '<span class="real">tie-break</span></div>' +
    '<div class="cfgrow"><label>Target offset</label>' +
    `<input type="number" value="${engine.LEARNING_BLOCK_TARGET_OFFSET}" disabled />` +
    '<span class="real">fixed in phase2</span></div>' +
    (state.blockLength < engine.LEARNING_BLOCK_LENGTH
      ? '<div class="warnbox">Below the 30-trial floor, <code>summariseLearningBlock</code> ' +
        'refuses to fit at all and returns <i>indeterminate</i> with no rate. That is the shipped ' +
        'behaviour, not a limitation of this window.</div>'
      : '');

  $('cfgLen').addEventListener('change', (e) => {
    state.blockLength = Math.max(4, Math.min(120, Number(e.target.value) || 30));
    renderBlockCfg();
    renderHandoff();
  });
  $('cfgSeed').addEventListener('change', (e) => {
    state.seed = Number(e.target.value) || 0;
    renderHandoff();
  });
}

/** The handoff object Phase 1 would have written, round-tripped through the app's own storage. */
function currentHandoff() {
  return {
    sessionId: `review-${state.arm}`,
    examSessionId: null,
    gradeBand: '4-5',
    standing: state.abilities[engine.LEARNING_BLOCK_AREA],
    // Phase 1 never serves FLU-OPCHAIN-01 — it is not wired into the live bank — so nothing is
    // burned. A real handoff carries every item Phase 1 served, and `novelBlockPool` drops them.
    seenItemIds: [],
    finishedAt: new Date().toISOString(),
    blockLength: state.blockLength,
  };
}

function renderHandoff() {
  const handoff = currentHandoff();
  engine.saveLearningBlockHandoff(handoff);
  const readBack = engine.loadLearningBlockHandoff();
  $('handoffState').textContent = readBack ? 'saved & read back' : 'not saved';
  $('handoffNote').innerHTML =
    'Written with <code>saveLearningBlockHandoff</code> and read back with ' +
    '<code>loadLearningBlockHandoff</code> — the app\u2019s own functions, against the same ' +
    'localStorage key the product uses. This is what makes a later sitting possible, and it is ' +
    'why the block needs no live engine session.';
  $('handoffJson').textContent = JSON.stringify(readBack, null, 2);
}

/* ------------------------------------------------------------------ *
 * Who is answering
 * ------------------------------------------------------------------ */

const RESPONDERS = {
  you: {
    name: 'You, clicking',
    note:
      'You see what the machine produced after every answer, which is the only reason the mapping ' +
      'is learnable at all. Play the same block in both arms before reading the comparison.',
  },
  induces: {
    name: 'A model learner that induces the system',
    note:
      'Starts knowing the six operators exist but not which badge is which, eliminates candidates ' +
      'from every reveal it sees, and answers from what survives. It is a model of a LEARNER, not ' +
      'of the fit and not of the selection rule. In the scrambled arm its knowledge is contradicted ' +
      'by construction, so its resets are the control working.',
  },
  // The two responders above are the ENDPOINTS, and a running-uncertainty panel read on endpoints
  // alone is misleading: the exhaustive inducer pins the system almost immediately and then has
  // nothing left to climb, and the guesser never moves. The interesting question — does the band
  // contract far enough to say anything about a child who is neither — needs the middle. These two
  // are the same induction model with an ENCODING FIDELITY: the probability that a reveal is
  // banked at all. A lower fidelity arrives at each primitive later without being worse at
  // reasoning from what it has, which is the construct the block claims to measure and is
  // deliberately not the same thing as a lower accuracy.
  induces25: {
    name: 'A learner that banks one reveal in four',
    fidelity: 0.25,
    note:
      'Encoding fidelity \u03c6 = 0.25: it sees every reveal and could deduce the same things, but ' +
      'folds only a quarter of them into memory. Measured over 84 blocks in ' +
      '<code>STAGE2_LATENCY_VS_SLOPE.md</code> \u00a71 it lands at 0.71 accuracy and pins 4.7 of ' +
      'the 6 primitives \u2014 a middling learner rather than an endpoint.',
  },
  induces10: {
    name: 'A learner that banks one reveal in ten',
    fidelity: 0.1,
    note:
      'Encoding fidelity \u03c6 = 0.10. It reasons perfectly from what it has banked and banks ' +
      'almost nothing, so it reaches 0.50 accuracy and pins 2.5 of 6. If a 30-trial block cannot ' +
      'tell this responder apart from the guesser, it cannot rank children either.',
  },
  guesses: {
    name: 'A responder that only guesses',
    note:
      'Picks uniformly at random from the five options and learns nothing, ever. This is the ' +
      'contamination floor from E-200 made visible: a closed-loop block feeds its own fit back ' +
      'into what it serves, so a pure guesser can still produce a climb. Whatever \u03bb this ' +
      'responder gets is the number a real child has to beat before the climb means anything.',
  },
};

function renderResponder() {
  $('responderPick').innerHTML = Object.entries(RESPONDERS)
    .map(
      ([id, r]) =>
        `<div class="cfgrow"><label><input type="radio" name="responder" value="${id}" ` +
        `${state.responder === id ? 'checked' : ''} ${state.run ? 'disabled' : ''} /> ` +
        `${esc(r.name)}</label></div>`,
    )
    .join('');
  $('responderNote').innerHTML = `<p class="note">${RESPONDERS[state.responder].note}</p>`;
  for (const input of $('responderPick').querySelectorAll('input')) {
    input.addEventListener('change', () => {
      state.responder = input.value;
      renderResponder();
      renderControls();
    });
  }
}

/* ------------------------------------------------------------------ *
 * Running the block — all of it delegated to `stage2-block-run.js`
 * ------------------------------------------------------------------ */

function makeResponder() {
  if (state.responder === 'guesses') return guessingResponder();
  if (!inspector) return manualResponder();
  if (state.responder === 'induces') return inductionResponder(inspector);
  const fidelity = RESPONDERS[state.responder]?.fidelity;
  if (fidelity !== undefined) {
    // `hashUnit` and the block seed rather than `Math.random`, so a (seed, standing, arm, fidelity)
    // run replays bit-for-bit and the two arms can be compared at all.
    return partialInductionResponder(inspector, {
      hashUnit: engine.hashUnit,
      seed: state.seed,
      salt: state.arm,
      fidelity,
    });
  }
  return manualResponder();
}

function startRun() {
  const bank = armBank();
  if (!bank) return;
  const handoff = currentHandoff();
  state.run = createRun({
    engine,
    bank,
    arm: state.arm,
    standing: handoff.standing,
    seed: state.seed,
    length: state.blockLength,
    seenItemIds: handoff.seenItemIds,
    responder: makeResponder(),
    learnability,
  });
  state.demoAt = 0;
  state.demoBeat = 0;
  beginTrial(state.run);
  renderAll();
}

const metaFor = (itemId) => armBank()?.reviewerOnly?.[itemId] ?? null;

function answer(key) {
  const run = state.run;
  if (!run?.current || run.pending) return;
  submitAnswer(run, key);
  renderAll();
}

/** Keep a finished run's summary AND its running series, so the other arm can be drawn behind. */
function keepCompleted(run) {
  state.completed[run.arm] = summariseRun(run);
  state.completedSeries[run.arm] = runningFor(run);
}

function advance() {
  if (!state.run) return;
  advanceRun(state.run);
  if (state.run.finished) keepCompleted(state.run);
  renderAll();
}

function autoRun() {
  if (!state.run) startRun();
  const run = state.run;
  if (run.responder.id === 'you') return;
  playToEnd(run);
  keepCompleted(run);
  renderAll();
}

function resetRun() {
  state.run = null;
  renderAll();
}

/* ------------------------------------------------------------------ *
 * The trial on screen
 * ------------------------------------------------------------------ */

function renderStage() {
  const head = $('stageHead');
  const body = $('stageBody');
  const run = state.run;
  const entry = typeEntry();

  if (entry.status !== 'built' || !inspector) {
    head.innerHTML = `<span class="pill">${esc(entry.typeCode)}</span><b>designed, not built</b>`;
    body.innerHTML =
      '<div class="body"><div class="warnbox">No bank exists for this type, so there is nothing ' +
      'to administer. Its design is in <b>The rest of the Stage 2 set</b> below, and in ' +
      `<code>${esc(catalog.designDoc)} ${esc(entry.designSection)}</code>.</div></div>`;
    return;
  }

  if (!run) {
    head.innerHTML =
      `<span class="pill">${esc(state.typeCode)}</span>` +
      `<span class="pill" style="background:${state.arm === 'consistent' ? '#dbeafe' : '#ffedd5'}">` +
      `<b>${ARMS[state.arm].label}</b> — ${esc(ARMS[state.arm].long)}</span>` +
      '<span class="spacer"></span><span>not started</span>';
    body.innerHTML =
      '<div class="body"><p class="note">Set the fluid-reasoning level on the left, choose an arm ' +
      'at the top, then <b>Start the block</b>. The whole point of the window is to run the same ' +
      'settings in both arms, so note what you used.</p></div>';
    return;
  }

  if (!run.canRun) {
    head.innerHTML = '<b>the pool cannot support this block</b>';
    body.innerHTML =
      `<div class="body"><div class="badbox"><code>blockCanRun</code> is false: ${run.pool.length} ` +
      `unseen items in ${esc(engine.LEARNING_BLOCK_AREA)} against a block of ${run.length}.</div></div>`;
    return;
  }

  if (run.current === null) {
    head.innerHTML =
      `<span class="pill">${esc(state.typeCode)}</span><b>block finished</b>` +
      `<span class="pill">${run.served.length} of ${run.length} trials</span>` +
      (run.exhausted ? '<span class="pill" style="background:#fee2e2">pool exhausted</span>' : '');
    body.innerHTML =
      '<div class="body"><p class="note">Read the estimate on the right. Then switch arm at the ' +
      'top and run the identical settings again — the comparison panel fills in once both arms ' +
      'have a run at the same standing, seed, responder and length.</p></div>';
    return;
  }

  // The unscored demonstrations, before trial 1. They are how the task becomes legible without a
  // written instruction, and they are the only screens on which nothing is asked of the child.
  if (state.demoAt < run.warmup.length) {
    head.innerHTML =
      `<span class="pill">demonstration <b>${state.demoAt + 1}</b>/${run.warmup.length}` +
      `<span class="sep"></span>beat ${state.demoBeat + 1}/2 — ${state.demoBeat === 0 ? 'posed' : 'completed'}</span>` +
      '<span class="pill">unscored — never enters \u03bb</span>' +
      '<span class="spacer"></span>' +
      `<span class="pill">warm-up has pinned <b>${run.tracker?.warmupDetermined ?? 0}</b>/6 badges</span>`;
    body.innerHTML = stageMarkup({ inspector, view: demoView(run) });
    wireStage(body, run);
    return;
  }

  const { item, target } = run.current;
  const gap = item.difficulty - target;
  const learn = run.pending ? run.pending.row?.learn ?? run.current.learn : run.current.learn;
  head.innerHTML =
    `<span class="pill">trial <b>${run.served.length + 1}</b>/${run.length}</span>` +
    `<span class="pill">asked for <b>${fmt(target)}</b></span>` +
    `<span class="pill">served <b>${fmt(item.difficulty)}</b></span>` +
    `<span class="pill${Math.abs(gap) > 1 ? ' ' : ''}">gap <b>${gap >= 0 ? '+' : ''}${fmt(gap)}</b></span>` +
    `<span class="pill">${esc(inspector.describeItem(item.content ? metaFor(item.itemId) : null))}</span>` +
    // Computed before the child answers: what the reveals they had already seen made available.
    (learn
      ? `<span class="pill${learn.derivable ? '' : ' warn'}">` +
        `${learn.derivable ? 'answerable from prior reveals' : `not yet determinable — ${learn.viableFromKnowledge} options still possible`}` +
        '</span>' +
        `<span class="pill">knowable <b>${learn.knowableBadges}</b>/6</span>`
      : '') +
    (run.pending?.row?.learn?.inference
      ? `<span class="pill ${INFERENCE[run.pending.row.learn.inference].cls}">` +
        `chose: <b>${INFERENCE[run.pending.row.learn.inference].label}</b>` +
        (run.pending.row.learn.ruledOutBy
          ? ` by ${esc(run.pending.row.learn.ruledOutBy)}`
          : '') +
        '</span>'
      : '') +
    '<span class="spacer"></span>' +
    `<span class="pill">${run.current.projecting ? 'projected from the fit' : 'standing + offset (too few trials to project)'}</span>`;

  body.innerHTML = stageMarkup({ inspector, view: askView(run, item) });
  wireStage(body, run);
}

/**
 * How a choice is labelled for the REVIEWER. Never shown to the child: `ruled out` is an evaluative
 * judgement, and putting an evaluation on the child's screen changes what the block measures (§1.5).
 */
const INFERENCE = {
  determined: { label: 'the determined answer', cls: '', short: 'det' },
  consistent: { label: 'still possible', cls: '', short: 'poss' },
  ruledOut: { label: 'already ruled out', cls: 'warn', short: 'out' },
};

/* ------------------------------------------------------------------ *
 * The child's screen
 *
 * All of it is `stage2-child-stage.js`. What lives here is only which VIEW
 * to show and what to do when it is clicked, because those are properties of
 * this window's run state rather than of the screen.
 * ------------------------------------------------------------------ */

/**
 * Reveals already shown, oldest first: the demonstrations watched so far, then every answered trial.
 *
 * Only what the child was shown. Removing memory-for-reveals from the measurement leaves the
 * induction in it — the point is to measure working out the system, not recall of five figures.
 */
function stageHistory(run) {
  return [
    ...run.warmup.slice(0, state.demoAt).map((reveal) => ({
      input: reveal.item.content.input,
      chain: reveal.item.content.chain,
      output: reveal.revealedFigure,
    })),
    ...run.rows.map((row) => row.revealed),
  ].filter((entry) => entry && entry.output);
}

const askView = (run, item) =>
  run.pending
    ? {
        kind: 'answer',
        item,
        output: run.pending.correctFigure,
        chosenKey: run.pending.key,
        history: stageHistory(run),
      }
    : { kind: 'ask', item, history: stageHistory(run) };

/**
 * A worked demonstration, in two beats: the row posed as a trial is posed, then the row completed.
 * Unscored, and there is nothing to choose in either beat.
 */
const demoView = (run) => ({
  kind: state.demoBeat === 0 ? 'pose' : 'show',
  item: run.warmup[state.demoAt].item,
  output: run.warmup[state.demoAt].revealedFigure,
  history: stageHistory(run),
});

function wireStage(body, run) {
  const next = body.querySelector('#kidNext');
  if (next) {
    next.addEventListener('click', () => {
      if (state.demoAt >= run.warmup.length) advance();
      else if (state.demoBeat === 0) state.demoBeat = 1;
      else {
        state.demoAt += 1;
        state.demoBeat = 0;
      }
      renderAll();
    });
    return;
  }
  for (const button of body.querySelectorAll('.card')) {
    button.addEventListener('click', () => answer(button.dataset.key));
  }
}

/* ------------------------------------------------------------------ *
 * Chart: what was asked for, what the bank had, where the fit went
 * ------------------------------------------------------------------ */

function renderChart() {
  const svg = $('chart');
  const rows = state.run?.rows ?? [];
  const W = 700;
  const H = 210;
  const pad = { l: 30, r: 10, t: 10, b: 20 };
  const n = Math.max(state.run?.length ?? state.blockLength, 1);
  const x = (i) => pad.l + ((W - pad.l - pad.r) * i) / Math.max(n - 1, 1);
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - (v - 1) / 19);

  const grid = [1, 5, 10, 15, 20]
    .map(
      (v) =>
        `<line x1="${pad.l}" y1="${y(v)}" x2="${W - pad.r}" y2="${y(v)}" stroke="#eef1f4" />` +
        `<text x="${pad.l - 5}" y="${y(v) + 3}" font-size="9" fill="#5a6b7b" text-anchor="end">${v}</text>`,
    )
    .join('');

  const line = (points, colour, dash) =>
    points.length < 2
      ? ''
      : `<polyline fill="none" stroke="${colour}" stroke-width="2" ${dash ? `stroke-dasharray="${dash}"` : ''} ` +
        `points="${points.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')}" />`;

  const targets = rows.map((r, i) => ({ i, v: r.target }));
  const servedPts = rows.map((r, i) => ({ i, v: r.served }));
  const thetas = rows.map((r, i) => ({ i, v: r.fit.theta0 + r.fit.lambda * i }));

  const dots = rows
    .map(
      (r, i) =>
        `<circle cx="${x(i)}" cy="${y(r.served)}" r="3.4" fill="${r.correct ? '#1f8a4c' : '#b91c1c'}" />`,
    )
    .join('');

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML =
    grid +
    (state.run
      ? `<line x1="${pad.l}" y1="${y(state.run.standing)}" x2="${W - pad.r}" y2="${y(state.run.standing)}" ` +
        'stroke="#94a3b8" stroke-dasharray="2 3" />'
      : '') +
    line(targets, '#0f2742', '5 3') +
    line(servedPts, state.arm === 'consistent' ? '#1d4ed8' : '#c2410c') +
    line(thetas, '#f2b705') +
    dots;

  $('chartLegend').innerHTML =
    '<span><i style="border-color:#0f2742;border-top-style:dashed"></i>target asked for ' +
    '(<code>nextBlockTarget</code>)</span>' +
    `<span><i style="border-color:${state.arm === 'consistent' ? '#1d4ed8' : '#c2410c'}"></i>` +
    'difficulty served (<code>nextBlockItem</code>)</span>' +
    '<span><i style="border-color:#f2b705"></i>fitted \u03b8(t)</span>' +
    '<span><i style="border-color:#94a3b8;border-top-style:dashed"></i>standing set by hand</span>' +
    '<span>green dot correct, red dot not</span>';
}

/* ------------------------------------------------------------------ *
 * The running panel: what would be reported if the block stopped here
 *
 * All arithmetic is `stage2-running-estimate.mjs`, which drives the same
 * `estimateLearningCurve` the block steers on and the same `blockLatencies`
 * criterion PR #42 measured with. This section draws; it does not decide.
 * ------------------------------------------------------------------ */

const ARM_COLOUR = { consistent: '#2563eb', perTrial: '#c2410c' };

/**
 * The width of `estimateLearningCurve`'s own λ prior, asked of the estimator rather than copied
 * from it. Two uses: the bar an interval has to beat before it is drawn, and the scale of a panel
 * in which nothing was drawable.
 */
const priorSd = priorLambdaSd(engine);

/**
 * Why each trial was, or was not, drawn. A running readout has to say what it is refusing and why,
 * or a gap in the line reads as a rendering fault rather than as the finding it is.
 */
const RUN_STATE = {
  ok: { fill: null, short: 'reportable', label: 'an interval the block earned' },
  tooFew: {
    fill: '#e2e8f0',
    short: 'too few trials',
    label: `below MIN_TRIALS_FOR_PROJECTION (${engine.MIN_TRIALS_FOR_PROJECTION}) — the engine's own floor`,
  },
  priorBound: {
    fill: '#fde68a',
    short: 'too little evidence',
    label:
      `the block has not yet added ${PRIOR_INFORMATION_MULTIPLE}\u00d7 the prior's information ` +
      `about \u03bb (posterior SE still above ` +
      `${(priorSd / Math.sqrt(PRIOR_INFORMATION_MULTIPLE)).toFixed(3)}), so the interval would be ` +
      'the prior redrawn rather than anything the block earned',
  },
  notConverged: {
    fill: '#fecaca',
    short: 'fit did not settle',
    label: 'summariseLearningBlock returns no \u03bb at all in this state, so neither does this',
  },
  noOnset: {
    fill: '#cbd5e1',
    short: 'no latency exists',
    label: 'nothing was ever deducible, so there is no onset to measure a latency from',
  },
};

/**
 * The series for a run, cached against it.
 *
 * A WeakMap rather than a field on the run: `stage2-block-run.js` is shared with the headless
 * probe and its row shape is read by three callers, so a renderer's cache has no business inside
 * it. Recomputing 30 prefixes costs about 10ms, so this is thrift rather than necessity.
 */
const RUNNING_CACHE = new WeakMap();
function runningFor(run) {
  if (!run || run.rows.length === 0) return null;
  const cached = RUNNING_CACHE.get(run);
  if (cached?.at === run.rows.length) return cached.series;
  const series = runningSeries({ engine, run });
  RUNNING_CACHE.set(run, { at: run.rows.length, series });
  return series;
}

const RUN_CHART = {
  w: 720,
  h: 234,
  l: 52,
  r: 14,
  t: 12,
  /** Everything below the plot: two state-ribbon rows, the trial axis and its labels. */
  b: 64,
  /** Clear of the plot floor, so the bottom gridline label does not sit inside the ribbon. */
  ribbonTop: 178,
  ribbon: 13,
  ribbon2: 8,
  axisY: 204,
};

/** Shared frame: horizontal grid with its labels, plus the trial axis under the state ribbons. */
function chartFrame({ n, ticks, yOf, format }) {
  const { w, h, l, r, axisY } = RUN_CHART;
  const grid = ticks
    .map(
      (v) =>
        `<line x1="${l}" y1="${yOf(v)}" x2="${w - r}" y2="${yOf(v)}" stroke="#eef1f4" />` +
        `<text x="${l - 6}" y="${yOf(v) + 3}" font-size="9" fill="#5a6b7b" text-anchor="end">` +
        `${format(v)}</text>`,
    )
    .join('');
  const axis =
    `<line x1="${l}" y1="${axisY}" x2="${w - r}" y2="${axisY}" stroke="#dfe3e8" />` +
    [1, Math.round(n / 4), Math.round(n / 2), Math.round((3 * n) / 4), n]
      .filter((v, i, all) => v >= 1 && all.indexOf(v) === i)
      .map((v) => {
        const x = l + ((w - l - r) * (v - 1)) / Math.max(n - 1, 1);
        return (
          `<text x="${x}" y="${axisY + 12}" font-size="9" fill="#5a6b7b" ` +
          `text-anchor="middle">${v}</text>`
        );
      })
      .join('') +
    `<text x="${w - r}" y="${h - 4}" font-size="9" fill="#5a6b7b" text-anchor="end">trial</text>`;
  return grid + axis;
}

/**
 * One trial-wide cell per trial, coloured by why that trial was or was not reportable.
 *
 * The other arm gets its own thinner row underneath. Without it the comparison is one-sided: the
 * band drawn dashed behind shows where the control HAD an interval, and says nothing about the
 * trials on which it had none — which for the scrambled arm is most of them, and is the point.
 */
function stateRibbon(series, stateOf, arm, n, row = 0) {
  const { w, l, r, ribbonTop, ribbon, ribbon2 } = RUN_CHART;
  const cell = (w - l - r) / Math.max(n, 1);
  const y = row === 0 ? ribbonTop : ribbonTop + ribbon + 1.5;
  const height = row === 0 ? ribbon : ribbon2;
  return series
    .map((point, index) => {
      const key = stateOf(point);
      const fill = RUN_STATE[key]?.fill ?? ARM_COLOUR[arm];
      return (
        `<rect x="${l + cell * index}" y="${y}" width="${Math.max(cell - 0.6, 0.6)}" ` +
        `height="${height}" fill="${fill}" opacity="${key === 'ok' ? 0.75 : 1}" />`
      );
    })
    .join('');
}

/**
 * A band and its centre line, broken wherever the state refused to report.
 *
 * Broken rather than interpolated on purpose: joining trial 19 to trial 23 across four trials the
 * measure declined to report would draw a line through evidence that does not exist.
 */
function bandPath(series, xOf, yOf, pick, colour, { dashed = false, fillOpacity = 0.16 } = {}) {
  const runs = [];
  let current = [];
  series.forEach((point, index) => {
    const value = pick(point);
    if (value === null) {
      if (current.length > 0) runs.push(current);
      current = [];
      return;
    }
    current.push({ x: xOf(index), ...value });
  });
  if (current.length > 0) runs.push(current);

  return runs
    .map((segment) => {
      const top = segment.map((p) => `${p.x},${yOf(p.hi)}`).join(' ');
      const bottom = segment
        .slice()
        .reverse()
        .map((p) => `${p.x},${yOf(p.lo)}`)
        .join(' ');
      const centre = segment.map((p) => `${p.x},${yOf(p.mid)}`).join(' ');
      const area =
        segment.length === 1
          ? `<line x1="${segment[0].x}" y1="${yOf(segment[0].lo)}" x2="${segment[0].x}" ` +
            `y2="${yOf(segment[0].hi)}" stroke="${colour}" stroke-width="2" opacity="0.5" />`
          : `<polygon points="${top} ${bottom}" fill="${colour}" opacity="${fillOpacity}" />`;
      const line =
        segment.length === 1
          ? `<circle cx="${segment[0].x}" cy="${yOf(segment[0].mid)}" r="2.6" fill="${colour}" />`
          : `<polyline points="${centre}" fill="none" stroke="${colour}" stroke-width="2" ` +
            `${dashed ? 'stroke-dasharray="5 3"' : ''} />`;
      return area + line;
    })
    .join('');
}

/** The dashed rule and label marking the first trial a predicate held. */
function crossingMark(trial, xOf, label, colour) {
  if (trial === null) return '';
  const { t, axisY, w } = RUN_CHART;
  const x = xOf(trial - 1);
  const anchor = x > w * 0.66 ? 'end' : 'start';
  const dx = anchor === 'end' ? -5 : 5;
  return (
    `<line x1="${x}" y1="${t}" x2="${x}" y2="${axisY}" stroke="${colour}" ` +
    'stroke-width="1.5" stroke-dasharray="4 3" />' +
    `<text x="${x + dx}" y="${t + 10}" font-size="9.5" fill="${colour}" font-weight="700" ` +
    `text-anchor="${anchor}">${esc(label)}</text>`
  );
}

/**
 * A message inside the plot area, for a panel with nothing to draw.
 *
 * Placed at two-thirds down rather than centred: on the λ panel the middle of the plot is where
 * zero and the contamination floor sit, and a sentence written across them is unreadable exactly
 * where the reference lines matter most.
 */
function emptyPlot(message) {
  const { w, h, l, r, t, b } = RUN_CHART;
  const cx = (l + w - r) / 2;
  const cy = t + (h - b - t) * 0.72;
  // A halo, because the other arm's band may be drawn underneath and the sentence has to stay
  // readable over it without hiding it.
  const width = message.length * 5.7 + 16;
  return (
    `<rect x="${cx - width / 2}" y="${cy - 12}" width="${width}" height="18" rx="4" fill="#ffffff" ` +
    'opacity="0.86" />' +
    `<text x="${cx}" y="${cy}" font-size="11.5" fill="#5a6b7b" ` +
    `text-anchor="middle">${esc(message)}</text>`
  );
}

function niceTicks(lo, hi, count = 5) {
  const step = (hi - lo) / (count - 1);
  return Array.from({ length: count }, (_, i) => lo + step * i);
}

/* ---- panel 1: λ against the contamination floor ---- */

function renderRunningLambda(series, other, otherArm, n) {
  const { w, h, l, r, t, b } = RUN_CHART;
  const floor = state.floor;
  const xOf = (index) => l + ((w - l - r) * index) / Math.max(n - 1, 1);

  // Scaled to whatever was actually drawn, and when nothing was, to the PRIOR's own 95% interval.
  // A run in which no trial is reportable would otherwise collapse the axis onto the floor band
  // and magnify a 0.008-wide sliver into the whole panel, which reads as though the floor were the
  // subject rather than the thing an absent interval failed to clear.
  const spread = [floor.low, floor.high, 0];
  for (const point of [...series, ...(other ?? [])]) {
    if (point.lambda.state === 'ok') spread.push(point.lambda.lo, point.lambda.hi);
  }
  if (spread.length === 3) spread.push(-1.96 * priorSd, 1.96 * priorSd);
  const rawLo = Math.min(...spread);
  const rawHi = Math.max(...spread);
  const pad = Math.max((rawHi - rawLo) * 0.12, 0.02);
  const lo = rawLo - pad;
  const hi = rawHi + pad;
  const yOf = (v) => t + (h - t - b) * (1 - (v - lo) / (hi - lo));
  const pick = (point) =>
    point.lambda.state === 'ok'
      ? { lo: point.lambda.lo, hi: point.lambda.hi, mid: point.lambda.lambda }
      : null;

  const verdict = lambdaVerdict(series, floor);
  const anyDrawn = series.some((point) => point.lambda.state === 'ok');
  const colour = ARM_COLOUR[state.arm];

  // The floor is a sliver next to a 30-trial interval — 0.008 wide against roughly 0.5 — and that
  // proportion is itself the finding, so the band is NOT exaggerated to make it legible. What is
  // done instead: a solid rule on its upper edge, which is the edge an interval has to clear, and
  // the label left-anchored above it where no series is ever drawn this early in a block.
  const floorBand =
    `<rect x="${l}" y="${yOf(floor.high)}" width="${w - l - r}" ` +
    `height="${Math.max(2, yOf(floor.low) - yOf(floor.high))}" fill="#b45309" opacity="0.3" />` +
    `<line x1="${l}" y1="${yOf(floor.high)}" x2="${w - r}" y2="${yOf(floor.high)}" ` +
    'stroke="#b45309" stroke-width="1.5" />' +
    `<text x="${l + 3}" y="${yOf(floor.high) - 5}" font-size="9.5" fill="#b45309" ` +
    `font-weight="700">contamination floor ${fmt(floor.low, 3)}\u2013${fmt(floor.high, 3)} ` +
    '\u2014 an interval touching this is not distinguishable from no learning</text>';

  $('runLambda').innerHTML =
    '<div class="runhead"><b>\u03bb \u2014 the fitted learning rate</b>' +
    '<span class="unit">scale points per trial, unanchored: what <code>summariseLearningBlock</code> ' +
    'would return</span></div>' +
    `<div class="chartwrap"><svg class="running" viewBox="0 0 ${w} ${h}">` +
    chartFrame({ n, ticks: niceTicks(lo, hi), yOf, format: (v) => v.toFixed(3) }) +
    `<line x1="${l}" y1="${yOf(0)}" x2="${w - r}" y2="${yOf(0)}" stroke="#94a3b8" ` +
    'stroke-dasharray="2 3" />' +
    floorBand +
    (other
      ? bandPath(other, xOf, yOf, pick, ARM_COLOUR[otherArm], { dashed: true, fillOpacity: 0.1 })
      : '') +
    bandPath(series, xOf, yOf, pick, colour) +
    stateRibbon(series, (point) => point.lambda.state, state.arm, n) +
    (other ? stateRibbon(other, (point) => point.lambda.state, otherArm, n, 1) : '') +
    crossingMark(
      verdict.trial,
      xOf,
      `first clears the floor \u00b7 trial ${verdict.trial}`,
      '#1f8a4c',
    ) +
    (anyDrawn ? '' : emptyPlot('No trial in this run produced a reportable \u03bb interval.')) +
    '</svg></div>' +
    `<div class="callout ${verdict.trial === null ? 'never' : 'cleared'}">` +
    lambdaSentence(verdict, series, n) +
    '</div>';
}

/** The one sentence the λ panel exists to produce, in words rather than left to be inferred. */
function lambdaSentence(verdict, series, n) {
  const done = series.length >= n;
  const reasons = new Map();
  for (const point of series) {
    if (point.lambda.state === 'ok') continue;
    reasons.set(point.lambda.state, (reasons.get(point.lambda.state) ?? 0) + 1);
  }
  const refusedText =
    reasons.size === 0
      ? ''
      : ' Not drawn on ' +
        [...reasons]
          .map(([key, count]) => `${count} trial${count === 1 ? '' : 's'} (${RUN_STATE[key].short})`)
          .join(' and ') +
        '.';

  if (verdict.trial === null) {
    return (
      `<b>The interval never cleared the contamination floor in ${series.length} ` +
      `trial${series.length === 1 ? '' : 's'}${done ? '' : ' so far'}.</b> On this run \u03bb is ` +
      '<b>not distinguishable from what a child who learns nothing fits</b>, which is the honest ' +
      'reading and not a failure of the window.' +
      refusedText +
      (verdict.below === null
        ? ''
        : ` The interval sat entirely BELOW the floor from trial ${verdict.below}, which is a ` +
          'fitted decline rather than silence.')
    );
  }
  return (
    `<b>The interval first cleared the floor at trial ${verdict.trial}</b>` +
    (verdict.held
      ? ' and stayed clear for the rest of the block.'
      : ` and did not stay clear \u2014 it held on ${verdict.sinceCount} of the ` +
        `${series.length - verdict.trial + 1} trials from there, so the crossing is not a point ` +
        'at which the measure became reportable.') +
    ` At the last trial the interval is ${fmt(verdict.endLo, 4)} \u2026 ${fmt(verdict.endHi, 4)}.` +
    refusedText +
    ' Clearing the floor means the climb is larger than the loop\u2019s own artefact. It does ' +
    '<b>not</b> name a rate, a band or a rank.'
  );
}

/* ---- panel 2: acquisition latency, with its censoring ---- */

function renderRunningLatency(series, other, otherArm, n, horizon) {
  const { w, h, l, r, t, b } = RUN_CHART;
  const xOf = (index) => l + ((w - l - r) * index) / Math.max(n - 1, 1);
  const yOf = (v) => t + (h - t - b) * (1 - v / horizon);
  const pick = (point) =>
    point.latency.state === 'ok'
      ? { lo: point.latency.lo, hi: point.latency.hi, mid: point.latency.rmst }
      : null;

  const verdict = latencyVerdict(series);
  const last = series[series.length - 1];
  const voided = series.every((point) => point.latency.state === 'noOnset');
  const colour = ARM_COLOUR[state.arm];

  const ceiling =
    `<line x1="${l}" y1="${yOf(horizon)}" x2="${w - r}" y2="${yOf(horizon)}" stroke="#b45309" ` +
    'stroke-width="1.5" />' +
    `<text x="${w - r - 3}" y="${yOf(horizon) + 11}" font-size="9" fill="#b45309" ` +
    'text-anchor="end" font-weight="700">no primitive ever demonstrated</text>';

  $('runLatency').innerHTML =
    '<div class="runhead"><b>Acquisition latency \u2014 the censored survival readout</b>' +
    '<span class="unit">restricted mean survival time in trials, lower is faster; the criterion ' +
    'and the onset normalisation are PR #42\u2019s</span></div>' +
    `<div class="chartwrap"><svg class="running" viewBox="0 0 ${w} ${h}">` +
    chartFrame({
      n,
      ticks: niceTicks(0, horizon, 4),
      yOf,
      format: (v) => v.toFixed(0),
    }) +
    ceiling +
    (other
      ? bandPath(other, xOf, yOf, pick, ARM_COLOUR[otherArm], { dashed: true, fillOpacity: 0.1 })
      : '') +
    bandPath(series, xOf, yOf, pick, colour) +
    stateRibbon(series, (point) => point.latency.state, state.arm, n) +
    (other ? stateRibbon(other, (point) => point.latency.state, otherArm, n, 1) : '') +
    crossingMark(
      verdict.trial,
      xOf,
      `first leaves the ceiling \u00b7 trial ${verdict.trial}`,
      '#1f8a4c',
    ) +
    (series.some((point) => point.latency.state === 'ok')
      ? ''
      : emptyPlot(
          voided
            ? 'No latency exists in this arm \u2014 nothing was ever deducible.'
            : 'Fewer than two primitives reached criterion, so no interval is drawn.',
        )) +
    '</svg></div>' +
    `<div class="callout ${voided ? 'void' : verdict.trial === null ? 'never' : 'cleared'}">` +
    latencySentence(verdict, horizon, last.trial) +
    '</div>' +
    '<div class="body" style="padding-top:0">' +
    censoringStrip(last, horizon) +
    '</div>';
}

function latencySentence(verdict, horizon, at) {
  if (verdict.endState === 'noOnset') {
    return (
      '<b>The normalised latency does not exist in this arm.</b> The scrambled control redraws the ' +
      'badge-to-operator mapping every trial, so no reveal constrains any later one and no ' +
      'primitive is ever uniquely deducible \u2014 there is no onset to measure a latency from. ' +
      'This is an <b>immunity, not a pass</b>: the control cannot supply the measure with an ' +
      'input, so it cannot test it. <code>STAGE2_LATENCY_VS_SLOPE.md</code> \u00a76 measured 0 ' +
      'onsets across 588 scrambled blocks, and shows that the un-normalised version of the same ' +
      'criterion \u2014 the one an implementation without the identifiability oracle is forced ' +
      'to use \u2014 fires 400 times on this arm.'
    );
  }
  const counts = verdict.endCounts ?? { event: 0, censored: 0, untested: 0, notDeducible: 0 };
  const tally =
    ` At trial ${at}, ${counts.event} of the six primitives had reached criterion, ` +
    `${counts.censored} were still open (right-censored), ${counts.untested} were deducible but ` +
    `had no informative item served on them afterwards, and ${counts.notDeducible} were never ` +
    'deducible at all.';

  if (verdict.trial === null) {
    return (
      '<b>The interval never left the "acquired nothing" ceiling' +
      // Both refusals are monotone in the prefix — a primitive that reaches criterion stays
      // reached, and one that becomes deducible stays deducible — so "at the last trial" and "at
      // any trial" are the same statement here, and the stronger one is the true one.
      `${verdict.endState === 'ok' ? '' : ', and no interval could be drawn at any trial'}.</b> ` +
      'A restricted mean at the horizon is what a responder that demonstrates no primitive scores ' +
      `(${horizon} of ${horizon}; a guesser measured 29.9 over 84 blocks), so this run did not ` +
      'distinguish itself from one.' +
      tally
    );
  }
  return (
    `<b>The interval first left the ceiling at trial ${verdict.trial}</b>` +
    (verdict.held ? ' and stayed off it.' : ', though it returned to it later in the block.') +
    ` At the last trial the restricted mean is ${fmt(verdict.endRmst, 2)} trials, interval ` +
    `${fmt(verdict.endLo, 2)} \u2026 ${fmt(verdict.endHi, 2)}.` +
    tally +
    ' ' +
    ' Two-thirds of a measured latency is the criterion\u2019s own detection lag rather than the ' +
    'learner (\u00a75.4), so the width here is mostly instrument.'
  );
}

/**
 * One track per primitive: hatched before it became deducible, then solid to criterion or open to
 * the block end.
 *
 * This is the requirement that the censoring be SHOWN. Plotting only the primitives that resolved
 * would report the fast half of the vocabulary and call it the child, and at the standings Stage 2
 * is aimed at nearly half the vocabulary is never pinned at all.
 */
function censoringStrip(point, horizon) {
  if (!point) return '';
  const pctOf = (v) => `${(100 * Math.min(1, Math.max(0, v / horizon))).toFixed(1)}%`;
  const rows = point.latency.perBadge
    .map((badge) => {
      if (!badge.deducible) {
        return (
          `<div class="nm">${esc(badge.badge)}</div>` +
          '<div class="track"><div class="pre" style="right:0"></div></div>' +
          '<div class="st nd">never deducible</div>'
        );
      }
      const start = badge.onset;
      const end = badge.event ? badge.criterionTrial : point.trial;
      // `untested` is censored with ZERO exposure — the selection rule served nothing that could
      // discriminate this primitive after it became deducible. Drawn hollow rather than solid,
      // because a filled bar the same length as a tested one would say the block looked and found
      // nothing when it never looked.
      const cls = badge.event ? 'ev' : badge.untested ? 'unt' : 'cen';
      return (
        `<div class="nm">${esc(badge.badge)}</div>` +
        '<div class="track">' +
        `<div class="pre" style="width:${pctOf(start)}"></div>` +
        `<div class="cap" style="left:${pctOf(start)}"></div>` +
        `<div class="run ${cls}" style="left:${pctOf(start)};width:${pctOf(Math.max(0, end - start))}"></div>` +
        (badge.event ? '' : `<div class="arrow" style="left:calc(${pctOf(end)} + 2px)">\u2192</div>`) +
        '</div>' +
        `<div class="st ${badge.event ? 'ev' : ''}">` +
        (badge.event
          ? `L = ${badge.latency} (d=${start}, k=${badge.criterionTrial})`
          : `censored &gt; ${point.trial - start}, ${badge.opportunities} opp`) +
        '</div>'
      );
    })
    .join('');

  return (
    '<p class="note" style="margin:2px 0 4px"><b>Per-primitive state at trial ' +
    `${point.trial}.</b> Hatched is before the primitive became deducible from the reveals shown ` +
    '(the oracle\u2019s <code>d</code>, not a guess); the bar runs from there to criterion in ' +
    'green, or on with an arrow when the estimate was taken first. An arrow is a right-censored ' +
    'observation and enters the survival estimate as "longer than this", never as a latency. ' +
    '<b>A hollow bar is censored with zero exposure</b> \u2014 <code>opp</code> counts the ' +
    'informative opportunities the selection rule actually served on that primitive, and at ' +
    'zero the block never looked.</p>' +
    `<div class="swim">${rows}</div>`
  );
}

/* ---- the panel as a whole ---- */

function renderRunning() {
  const run = state.run;
  const intro = $('runIntro');
  const footer = $('runFooter');
  const series = runningFor(run);

  if (!series) {
    $('runLambda').innerHTML = '';
    $('runLatency').innerHTML = '';
    footer.innerHTML = '';
    intro.innerHTML =
      '<p class="note">Start a block. After every trial this recomputes what would be reported ' +
      'if the block stopped there \u2014 both candidate readouts, each with its interval \u2014 ' +
      'so the question "does the measure ever become reportable inside a block, and after how ' +
      'many trials" is answered by watching rather than argued.</p>';
    return;
  }

  const otherArm = state.arm === 'consistent' ? 'perTrial' : 'consistent';
  const other = state.completedSeries[otherArm];
  const n = run.length;
  const horizon = run.length;

  intro.innerHTML =
    '<p class="note">Both panels answer the same question at every trial: <b>if the block stopped ' +
    'here, what would be reported and how wide is it?</b> The \u03bb series is the unanchored fit ' +
    '<code>summariseLearningBlock</code> would return, which is <i>not</i> the anchored fit in the ' +
    'trace table below \u2014 that one steers the next item. The latency series is ' +
    '<code>blockLatencies</code> from the acquisition-latency workstream, imported rather than ' +
    'rewritten, summarised by Kaplan\u2013Meier over the six primitives.' +
    (other
      ? ` The <b style="color:${ARM_COLOUR[otherArm]}">${esc(ARMS[otherArm].label.toLowerCase())}</b> ` +
        'arm\u2019s completed run is drawn dashed behind this one.'
      : ' Finish a run in the other arm and it will be drawn dashed behind this one.') +
    '</p>';

  renderRunningLambda(series, other, otherArm, n);
  renderRunningLatency(series, other, otherArm, n, horizon);

  const ribbonLegend =
    '<span style="width:100%;color:var(--navy-2)"><b>The ribbon under each axis</b> is one cell ' +
    'per trial: the thick row is the arm on screen' +
    (other ? ', the thin row beneath it the other arm\u2019s completed run' : '') +
    '. A cell says why that trial was, or was not, drawn.</span>' +
    ['ok', 'tooFew', 'priorBound', 'notConverged', 'noOnset']
      .map(
        (key) =>
          `<span><i class="blk" style="background:${RUN_STATE[key].fill ?? ARM_COLOUR[state.arm]}"></i>` +
          `<b>${esc(RUN_STATE[key].short)}</b> — ${esc(RUN_STATE[key].label)}</span>`,
      )
      .join('');

  footer.innerHTML =
    `<div class="floorrow"><b>Contamination floor</b> <input type="number" id="floorLo" step="0.001" ` +
    `value="${state.floor.low}" aria-label="floor lower edge" /> to <input type="number" ` +
    `id="floorHi" step="0.001" value="${state.floor.high}" aria-label="floor upper edge" /> ` +
    '<button id="floorMeasured" type="button">measured on this bank (0.0096)</button>' +
    '<button id="floorMatrix" type="button">FLU-MATRIX-01 (0.0183)</button></div>' +
    '<p class="note" style="margin-top:0">The floor is editable because it is a measurement with ' +
    'its own error rather than a constant, and how far "cleared at trial N" moves when the line ' +
    'moves is part of the answer. <code>STAGE2_BANK_RECOVERY_MEASUREMENT.md</code> \u00a73 runs 400 ' +
    'children at \u03bb_true = 0 through the corrected estimator and this exact adaptive loop: ' +
    '<b>FLU-OPCHAIN-01 fits \u03bb\u0304 = 0.0096 \u00b1 0.0033 in both arms</b>, against 0.0098 on ' +
    'an idealised grid and 0.0183 on FLU-MATRIX-01. E-200 records the mechanism \u2014 the fit ' +
    'chooses the next difficulty and then reads its own walk.</p>' +
    `<div class="legend" style="padding-left:0">${ribbonLegend}</div>` +
    '<div class="warnbox"><b>No band and no rank is named here, and none can be.</b> These are ' +
    'intervals and their relation to a reference line. Banding \u03bb needs a distribution of ' +
    'learning rates from real children; Gate B has not run and there is none, so ' +
    '<code>summariseLearningBlock</code> returns <i>indeterminate</i> whatever these panels show. ' +
    'Nor does clearing the floor make a 30-trial block a reportable absolute rate: E-095 puts ' +
    'recovery of an injected climb at r = 0.45 at this length. And both readouts here come from a ' +
    'synthetic responder against a born-synthetic, ungated bank \u2014 nothing on this screen is ' +
    'evidence that a child learns anything.</div>';

  const setFloor = (low, high) => {
    state.floor = { low, high };
    renderRunning();
  };
  $('floorLo').addEventListener('change', (e) =>
    setFloor(Number(e.target.value) || 0, state.floor.high),
  );
  $('floorHi').addEventListener('change', (e) =>
    setFloor(state.floor.low, Number(e.target.value) || 0),
  );
  $('floorMeasured').addEventListener('click', () => setFloor(0.0096, 0.0129));
  $('floorMatrix').addEventListener('click', () => setFloor(0.0183, 0.0218));
}

/* ------------------------------------------------------------------ *
 * Trial-by-trial table
 * ------------------------------------------------------------------ */

function arrow(now, before, places = 3) {
  if (before === null || before === undefined) return `<td>${fmt(now, places)}</td>`;
  const delta = now - before;
  const cls = delta > 0.0005 ? 'up' : delta < -0.0005 ? 'dn' : '';
  return `<td class="${cls}">${fmt(now, places)}</td>`;
}

function renderTrace() {
  const rows = state.run?.rows ?? [];
  $('traceCount').textContent = state.run
    ? `${rows.length} of ${state.run.length}${state.run.exhausted ? ' — pool exhausted' : ''}`
    : '';
  $('traceTable').innerHTML =
    // `knew`, `poss` and `chose` are the learnability trace. `knew` is how much of the vocabulary a
    // perfect reasoner had pinned going in; `poss` how many options the reveals still allowed, so 1
    // means the answer was determinable and a miss on it is a real miss. `chose` scores the answer
    // against that set, which is a different question from `ok`.
    '<thead><tr><th>#</th><th>asked</th><th>served</th><th>gap</th><th class="l">item</th>' +
    '<th class="l">levers</th><th>ans</th><th>ok</th><th>knew</th><th>poss</th>' +
    '<th class="l">chose</th><th>\u03b8\u03050</th><th>\u03bb\u0302</th>' +
    '<th>\u03bb\u0302 SE</th><th class="l">learner</th></tr></thead><tbody>' +
    rows
      .map((r) => {
        const gap = r.served - r.target;
        const learn = r.learn;
        const verdict = learn?.inference ? INFERENCE[learn.inference] : null;
        return (
          `<tr class="${r.correct ? 'hit' : 'miss'}"><td>${r.index}</td>` +
          `<td>${fmt(r.target)}</td><td>${fmt(r.served)}</td>` +
          `<td class="${Math.abs(gap) > 1 ? 'zero' : ''}">${gap >= 0 ? '+' : ''}${fmt(gap)}</td>` +
          `<td class="l">${esc(r.itemId.slice(0, 8))}</td>` +
          `<td class="l">${esc(inspector ? inspector.describeItem(r.meta) : '—')}</td>` +
          `<td>${esc(r.answered)}</td><td>${r.correct ? '\u2713' : '\u00b7'}</td>` +
          `<td>${learn ? `${learn.knowableBadges}/6` : '—'}</td>` +
          `<td class="${learn?.derivable ? '' : 'zero'}">${learn ? learn.viableFromKnowledge : '—'}</td>` +
          `<td class="l${verdict?.cls === 'warn' ? ' zero' : ''}">` +
          `${verdict ? esc(verdict.short + (learn.ruledOutBy ? `/${learn.ruledOutBy}` : '')) : '—'}</td>` +
          arrow(r.fit.theta0, r.before?.theta0, 2) +
          arrow(r.fit.lambda, r.before?.lambda, 3) +
          arrow(r.fit.lambdaSe, r.before?.lambdaSe, 3) +
          `<td class="l">${r.reset ? '<b class="zero">reset</b>' : r.pinned === null ? '' : `${r.pinned} pinned`}</td></tr>`
        );
      })
      .join('') +
    '</tbody>';
}

/* ------------------------------------------------------------------ *
 * The readout — and its refusal to name a rate
 * ------------------------------------------------------------------ */

/** λ and its 95% interval on a zero-centred axis. Spanning zero is the state that must be visible. */
function intervalHtml(lambda, se, colour) {
  if (lambda === null || se === null) return '';
  const half = 1.96 * se;
  const span = Math.max(0.08, (Math.abs(lambda) + half) * 1.15);
  const pos = (v) => `${((v + span) / (2 * span)) * 100}%`;
  const spansZero = lambda - half <= 0 && lambda + half >= 0;
  return (
    '<div class="interval">' +
    '<div class="axis"></div>' +
    `<div class="bar" style="left:${pos(lambda - half)};width:${((2 * half) / (2 * span)) * 100}%;` +
    `background:${colour}"></div>` +
    `<div class="zeroline" style="left:${pos(0)}"></div>` +
    `<div class="pt" style="left:${pos(lambda)}"></div>` +
    `<div class="tick" style="left:${pos(lambda - half)}">${fmt(lambda - half, 3)}</div>` +
    `<div class="tick" style="left:${pos(lambda + half)}">${fmt(lambda + half, 3)}</div>` +
    '</div>' +
    `<p class="note"><b>${spansZero ? 'The interval covers zero' : 'The interval excludes zero'}</b> — ` +
    (spansZero
      ? 'this block is <b>not distinguishable from no learning</b>.'
      : 'a climb of this sign is what the block saw. That is not yet a learning rate: see below.') +
    '</p>'
  );
}

function renderReadout() {
  const run = state.run;
  const body = $('readoutBody');
  if (!run || run.rows.length === 0) {
    body.innerHTML =
      '<p class="note">Nothing fitted yet. The fit needs ' +
      `${engine.MIN_TRIALS_FOR_PROJECTION} trials before it carries information, and ` +
      `<code>summariseLearningBlock</code> refuses to report at all below ${engine.LEARNING_BLOCK_LENGTH}.</p>`;
    return;
  }

  const last = run.rows[run.rows.length - 1];
  const readout = run.readout ?? null;
  const colour = run.arm === 'consistent' ? 'var(--consistent)' : 'var(--control)';

  body.innerHTML =
    `<div class="band">${esc((readout?.band ?? 'not finished').toUpperCase())}</div>` +
    `<p class="note">${esc(readout?.reason ?? 'The block is still running; nothing is reported until it finishes.')}</p>` +
    '<hr style="border:0;border-top:1px solid var(--line);margin:10px 0" />' +
    '<p class="note"><b>Running fit</b>, anchored on the standing level, which is the same fit ' +
    '<code>nextBlockTarget</code> uses to aim the next trial:</p>' +
    `<pre class="json">theta0   ${fmt(last.fit.theta0, 3)}  \u00b1 ${fmt(last.fit.theta0Se, 3)}
lambda   ${fmt(last.fit.lambda, 4)}  \u00b1 ${fmt(last.fit.lambdaSe, 4)}   scale points / trial
converged ${last.fit.converged}   iterations ${last.fit.iterations}</pre>` +
    intervalHtml(last.fit.lambda, last.fit.lambdaSe, colour) +
    (readout
      ? '<p class="note"><b>Final fit</b> from <code>summariseLearningBlock</code> — unanchored, ' +
        'which is what the app reports:</p>' +
        `<pre class="json">lambda   ${fmt(readout.lambda, 4)}  \u00b1 ${fmt(readout.lambdaSe, 4)}
trials   ${readout.trialCount}   band ${readout.band}</pre>`
      : '') +
    '<div class="warnbox"><b>No rate is shown, and none can be.</b> Banding \u03bb needs a ' +
    'reference distribution of learning rates from real children; Gate B has not run, so there is ' +
    'none, and <code>summariseLearningBlock</code> returns <i>indeterminate</i> by design. Even ' +
    'the point estimate above is diagnostic only: at 30 trials a closed-loop block fits a climb of ' +
    'roughly 0.01\u20130.02 for a child who learned nothing at all (E-200), because the fit chooses ' +
    'the next difficulty and then reads its own walk. Anything smaller than that floor is noise ' +
    'regardless of what the interval says.</div>';
}

/* ------------------------------------------------------------------ *
 * Consistent against its control
 * ------------------------------------------------------------------ */

function renderComparison() {
  const sa = state.completed.consistent;
  const sb = state.completed.perTrial;
  const body = $('cmpBody');

  if (!sa || !sb) {
    const have = [sa && 'consistent', sb && 'scrambled'].filter(Boolean);
    body.innerHTML =
      '<p class="note">Run the block in <b>both</b> arms with the same standing, seed, responder ' +
      'and length. ' +
      (have.length === 0
        ? 'Neither arm has a completed run yet.'
        : `Have: ${have.join(' and ')}. Switch arm at the top and run it again.`) +
      '</p>';
    return;
  }

  const mismatched =
    sa.standing !== sb.standing ||
    sa.seed !== sb.seed ||
    sa.responder !== sb.responder ||
    sa.length !== sb.length;

  const row = (label, va, vb, places = 2, pct = false) =>
    `<tr><td>${label}</td><td class="num armA">${pct ? `${(va * 100).toFixed(0)}%` : fmt(va, places)}</td>` +
    `<td class="num armB">${pct ? `${(vb * 100).toFixed(0)}%` : fmt(vb, places)}</td></tr>`;

  let verdict;
  if (sa.excludesZero && sb.excludesZero) {
    verdict =
      '<b>A climb appears in BOTH arms.</b> The scrambled arm has nothing learnable in it by ' +
      'construction, so a climb there is not induction — it is the closed loop: the fit reads ' +
      'chance successes as ability, aims higher, and then reads its own walk. On this evidence ' +
      'the consistent arm\u2019s climb is not attributable to the hidden system, and the ' +
      'difference between the two arms, not either one alone, is the only quantity worth reading.';
  } else if (sa.excludesZero && !sb.excludesZero) {
    verdict =
      '<b>A climb in the consistent arm and not in its control.</b> This is the pattern the design ' +
      'is trying to produce. It is a single simulated run against a synthetic bank, so it is ' +
      'evidence the machinery can produce the contrast, not evidence that children learn here.';
  } else if (!sa.excludesZero && sb.excludesZero) {
    verdict =
      '<b>A climb in the CONTROL and not in the live arm.</b> Nothing about the hidden system can ' +
      'explain that, so it is the loop or the draw. Re-run with another seed before reading ' +
      'anything into either arm.';
  } else {
    verdict =
      '<b>No climb distinguishable from zero in either arm.</b> At 30 trials that is the expected ' +
      'outcome for most responders, and it is why the readout refuses to name a rate.';
  }

  body.innerHTML =
    (mismatched
      ? '<div class="badbox">These two runs used different settings, so the comparison is not ' +
        'like-for-like. Re-run both with the same standing, seed, responder and length.</div>'
      : '') +
    '<table class="cmp"><tr><th></th><th class="armA">CONSISTENT</th><th class="armB">SCRAMBLED</th></tr>' +
    row('trials', sa.trials, sb.trials, 0) +
    row('accuracy', sa.accuracy, sb.accuracy, 0, true) +
    row('first third', sa.firstThird, sb.firstThird, 0, true) +
    row('last third', sa.lastThird, sb.lastThird, 0, true) +
    row('mean difficulty served', sa.meanServed, sb.meanServed) +
    row('last difficulty served', sa.lastServed, sb.lastServed) +
    row('\u03bb\u0302', sa.lambda, sb.lambda, 4) +
    `<tr><td>95% interval</td><td class="num armA">${fmt(sa.lo, 3)} \u2026 ${fmt(sa.hi, 3)}</td>` +
    `<td class="num armB">${fmt(sb.lo, 3)} \u2026 ${fmt(sb.hi, 3)}</td></tr>` +
    `<tr><td>excludes zero</td><td class="num armA">${sa.excludesZero ? 'yes' : 'no'}</td>` +
    `<td class="num armB">${sb.excludesZero ? 'yes' : 'no'}</td></tr>` +
    `<tr><td>fit converged</td><td class="num armA">${sa.converged ? 'yes' : 'NO'}</td>` +
    `<td class="num armB">${sb.converged ? 'yes' : 'NO'}</td></tr>` +
    (sa.resets === null
      ? ''
      : `<tr><td>learner contradicted</td><td class="num armA">${sa.resets}\u00d7</td>` +
        `<td class="num armB">${sb.resets}\u00d7</td></tr>` +
        `<tr><td>badges pinned at the end</td><td class="num armA">${sa.pinned}/6</td>` +
        `<td class="num armB">${sb.pinned}/6</td></tr>`) +
    '</table>' +
    `<div class="verdict">${verdict}</div>` +
    `<p class="note">\u0394\u03bb\u0302 = ${fmt(sa.lambda - sb.lambda, 4)} scale points per trial. ` +
    'That difference is the quantity the two-arm design exists to produce; neither arm on its own ' +
    'licenses a claim.' +
    (sa.converged && sb.converged
      ? ''
      : ' <b>One of these fits did not converge</b>, so <code>summariseLearningBlock</code> ' +
        'reports no rate for it at all — the \u03bb\u0302 in that column is the raw fit, shown ' +
        'only so the two arms remain comparable.') +
    '</p>';
}

/* ------------------------------------------------------------------ *
 * Philosophy
 * ------------------------------------------------------------------ */

function renderPhilosophy() {
  const entry = typeEntry();
  $('philBody').innerHTML =
    `<p class="lead">Stage 1 asks where a child is standing. Stage 2 asks something else entirely: ` +
    'put them in front of a system nobody has ever taught them, and see how fast they pick it up. ' +
    'Everything below follows from that one difference.</p>' +
    '<h3>What the hidden system is</h3>' +
    `<p>${esc(entry.hiddenSystem)}</p>` +
    '<p>The child is never told any of it. What they get is a figure, a row of badges, five ' +
    'candidate outputs, and — after they commit — the output the machine actually made. That ' +
    'reveal is the entire teaching signal. Induction from feedback is the thing being measured, so ' +
    'withholding the feedback would leave nothing to measure.</p>' +
    '<h3>Why a graded ladder rather than one rule to discover</h3>' +
    '<p>A single hidden rule gives one bit: they got it or they did not. You cannot fit a curve to ' +
    'one bit, and a child who works it out on trial 3 and a child who works it out on trial 25 ' +
    'both just "got it". Compositional depth turns the same hidden system into a ladder that can ' +
    'be climbed continuously — knowing one badge is worth something, chaining two in the right ' +
    'order is worth more, holding an imagined intermediate figure through four steps is worth more ' +
    'again. That is what makes a rate estimable at all.</p>' +
    `<div class="ladder">${entry.ladder
      .map((rung) => {
        const [head, ...rest] = rung.split('—');
        return `<div class="rung"><b>${esc(head.trim())}</b>${esc(rest.join('—').trim())}</div>`;
      })
      .join('')}</div>` +
    '<p>The levers that set a rung are ' +
    `${entry.levers.map((l) => `<i>${esc(l.split(',')[0])}</i>`).join(', ')}. The difficulty ` +
    'number attached to each item is computed from those levers. It is a <b>design rung, not a ' +
    'calibrated IRT parameter</b> — no child has ever answered one of these items.</p>' +
    '<h3>Why items never repeat</h3>' +
    '<p>Every figure in the block is new. A repeated item measures memory of that item, and it ' +
    'produces a jump in the climb with nothing to do with learning — which is why ' +
    '<code>novelBlockPool</code> excludes anything Phase 1 served and the selection rule will not ' +
    'serve the same item twice. The consequence is the useful part: because nothing recurs, the ' +
    'only thing that can carry from trial 4 to trial 24 is the <b>system</b>. Any improvement has ' +
    'to be transfer.</p>' +
    '<h3>What the scrambled control proves</h3>' +
    '<div class="armcols">' +
    '<div class="armcol a"><h4>CONSISTENT</h4>One badge-to-operator mapping, drawn once and held ' +
    'for the whole block. Everything learned on trial 3 is still true on trial 28. This is the ' +
    'arm the product would run.</div>' +
    '<div class="armcol b"><h4>SCRAMBLED — control</h4>A fresh mapping every single trial. Same ' +
    'figures, same badges, same difficulty distribution, same feedback — and <b>nothing learnable ' +
    'by construction</b>. It is not a harder condition; it is the same condition with the ' +
    'learnable part removed.</div></div>' +
    '<p>A climb in the consistent arm on its own proves very little. Practice at reading the ' +
    'figures, at the answer format, at sitting still, and the closed loop itself all produce a ' +
    'climb. The control has every one of those and none of the system, so <b>the difference ' +
    'between the arms</b> is the part that could only have come from inducing the system. If both ' +
    'arms climb the same amount, the design has not shown what it set out to show — and that is a ' +
    'real result about the design, not a broken window.</p>' +
    '<h3>What the readout can and cannot claim today</h3>' +
    '<p><b>Can:</b> that the block administers, that targeting follows the fit, that a fitted ' +
    '\u03bb and its uncertainty come out, and that the two arms can be compared like-for-like.</p>' +
    '<p><b>Cannot:</b> name a learning rate. Banding \u03bb needs a distribution of rates from ' +
    'real children and there is not one — Gate B needs roughly 128 of them and has not run. Nor ' +
    'is a 30-trial block long enough on its own: recovery of an injected climb runs about r = 0.45 ' +
    'at 30 trials, and the closed loop fits \u03bb \u2248 0.01\u20130.02 for a responder who ' +
    'learned nothing at all. And even a clean two-arm difference would be evidence of ' +
    '<i>induction under these items</i> — not of learning potential, not of giftedness, and not ' +
    'of anything a program would later cause.</p>' +
    `<p class="note">${esc(entry.notes)}</p>`;
}

/* ------------------------------------------------------------------ *
 * The rest of the set, designed but not built
 * ------------------------------------------------------------------ */

function renderSet() {
  $('setBody').innerHTML =
    '<p class="note">All four Stage 2 types, in build order. Three are <b>designed and not ' +
    'built</b>: the design exists in ' +
    `<code>${esc(catalog.designDoc)}</code> and no bank does. They are shown rather than omitted ` +
    'because the shape of the set is part of what is under review — one built type is not a Stage ' +
    '2 battery.</p>' +
    catalog.types
      .map((t) => {
        const built = t.status === 'built' && banks[t.typeCode];
        const armCounts = built
          ? Object.entries(banks[t.typeCode])
              .map(([arm, bank]) => `${arm} ${bank.served.length}`)
              .join(', ')
          : '—';
        return (
          `<div class="typecard"><div class="hd"><b>${esc(t.typeCode)}</b>` +
          `<span class="nm">${esc(t.name)} · ${esc(t.area.replace('_', ' '))} · build order ${t.buildOrder}</span>` +
          `<span class="status ${built ? 'built' : 'designed'}">${built ? 'built' : 'designed, not built'}</span></div>` +
          '<dl>' +
          `<dt>hidden system</dt><dd>${esc(t.hiddenSystem)}</dd>` +
          `<dt>what it induces</dt><dd><ul>${t.induces.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></dd>` +
          `<dt>ladder</dt><dd><ul>${t.ladder.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></dd>` +
          `<dt>levers</dt><dd><ul>${t.levers.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></dd>` +
          `<dt>banks</dt><dd>${esc(armCounts)}</dd>` +
          `<dt>design</dt><dd><code>${esc(t.designSection)}</code></dd>` +
          `<dt>note</dt><dd>${esc(t.notes)}</dd>` +
          '</dl></div>'
        );
      })
      .join('');
}

/* ------------------------------------------------------------------ *
 * Peek
 * ------------------------------------------------------------------ */

function renderPeek() {
  const run = state.run;
  const body = $('peekBody');
  if (!state.peeking) {
    body.innerHTML = '';
    return;
  }
  if (!run?.current) {
    body.innerHTML = '<p class="note">No item on screen.</p>';
    return;
  }
  const { item } = run.current;
  const meta = metaFor(item.itemId);
  const mapping = meta.system?.mapping ?? {};
  body.innerHTML =
    '<p class="note">The mapping in force <b>for this trial</b>' +
    (state.arm === 'perTrial'
      ? ' — and only for this trial; the next one gets a different one.'
      : ' — and for every trial in this block.') +
    '</p>' +
    `<pre class="json">${esc(
      Object.entries(mapping)
        .map(([badge, op]) => `${badge.padEnd(9)} ${op}`)
        .join('\n'),
    )}</pre>` +
    '<p class="note">Step by step, for this item:</p>' +
    `<pre class="json">${esc(
      inspector
        .steps(item, meta)
        .map((s, i) => `${i + 1}. ${s.badge} = ${s.operator}  ->  ${s.change}`)
        .join('\n'),
    )}\ncorrect: ${esc(meta.correctKey)}</pre>`;
}

/* ------------------------------------------------------------------ *
 * Wiring
 * ------------------------------------------------------------------ */

function renderControls() {
  const entry = typeEntry();
  const playable = entry.status === 'built' && Boolean(inspector);
  const running = Boolean(state.run) && state.run.finished !== true;
  $('startBtn').disabled = !playable || running;
  $('startBtn').textContent = running
    ? 'Block running'
    : state.run
      ? 'Run this arm again'
      : 'Start the block';
  $('autoBtn').disabled = !playable || state.responder === 'you' || state.run?.finished === true;
  $('autoBtn').title =
    state.responder === 'you' ? 'Pick a model responder to auto-run.' : 'Play the whole block.';
  $('resetBtn').disabled = !state.run;

  for (const button of $('armSwitch').querySelectorAll('button')) {
    button.classList.toggle('on', button.dataset.arm === state.arm);
  }
}

/* ------------------------------------------------------------------ *
 * When each thing became learnable, and how the choices scored against it
 * ------------------------------------------------------------------ */

function renderLearnability() {
  const body = $('learnBody');
  const run = state.run;
  const summary = run?.tracker?.summary();
  if (!summary) {
    body.innerHTML =
      '<p class="note">Start a block. This panel is the oracle\u2019s view: an ideal reasoner with ' +
      'perfect memory, given exactly the reveals the child was given, propagating over all 720 ' +
      'badge-to-operator bijections. It is an upper bound on what was <b>available to be known</b>, ' +
      'never a prediction about a child.</p>';
    return;
  }

  const inference = summary.inference;
  const first = Object.entries(summary.firstDetermined).sort((a, b) => a[1] - b[1]);
  const pctOf = (x) => (x === null ? '—' : `${Math.round(100 * x)}%`);
  const lift =
    inference.ruledOutRate === null
      ? null
      : inference.ruledOutRate - inference.ruledOutChance;

  body.innerHTML =
    '<div class="kv">' +
    `<div><b>${summary.warmupDetermined}</b>/6 pinned by the warm-up</div>` +
    `<div><b>${pctOf(summary.derivableShare)}</b> of trials answerable from prior reveals</div>` +
    `<div>whole system pinned by trial <b>${summary.fullyKnowableAt ?? 'never'}</b></div>` +
    `<div><b>${summary.unanswerablePrefix}</b> leading trials nobody could answer</div>` +
    '</div>' +
    // The avoidable defect. Anything but zero means the sequence spent a trial that could neither be
    // answered nor learned from, which the warm-up exists to prevent.
    (summary.multiIntroductionTrials > 0
      ? `<div class="warnbox">${summary.multiIntroductionTrials} trial(s) introduced two badges at ` +
        'once. One reveal cannot attribute a change between two badges never seen, so those trials ' +
        'were unanswerable <b>and</b> uninformative \u2014 a sequencing defect, not a slow learner.</div>'
      : '<p class="note">No trial introduced two unseen badges at once, so every unanswerable trial ' +
        'here was unanswerable for a reason the construct requires rather than one the sequence ' +
        'chose.</p>') +
    '<p class="note"><b>Became determined:</b> ' +
    (first.length === 0
      ? 'nothing yet'
      : first.map(([badge, trial]) => `${esc(badge)} at ${trial}`).join(', ')) +
    '. A badge can be pinned without ever appearing in a chain: fix five and the bijection fixes the ' +
    'sixth.</p>' +
    '<h4 style="margin:14px 0 4px;font-size:13px">How the choices scored against the evidence</h4>' +
    '<p class="note">A different question from accuracy. On a trial nobody could answer, being right ' +
    'is luck — but choosing an option the reveals had <b>already eliminated</b> is not luck, it is ' +
    'information held and not used.</p>' +
    '<div class="kv">' +
    `<div>took the determined answer: <b>${inference.determined}</b></div>` +
    `<div>chose a still-possible option: <b>${inference.consistent}</b></div>` +
    `<div>chose an already-ruled-out option: <b>${inference.ruledOut}</b> ` +
    `(${inference.ruledOutByReveals} by reveals, ${inference.ruledOutByContent} by content)</div>` +
    `<div>ruled-out rate <b>${pctOf(inference.ruledOutRate)}</b> against <b>${pctOf(inference.ruledOutChance)}</b> ` +
    `for uniform guessing on the same items \u2014 lift <b>${lift === null ? '—' : `${lift >= 0 ? '+' : ''}${lift.toFixed(3)}`}</b></div>` +
    '</div>' +
    '<p class="note">The chance column is not decoration: how many options an item excludes is a ' +
    'property of the item, so a bare ruled-out rate would rank banks rather than children. Negative ' +
    'lift is the part that is about the child. None of this is shown to the child \u2014 "ruled out" ' +
    'is an evaluative judgement, and evaluation on their screen would change what is measured.</p>';
}

function renderAll() {
  renderProvenance();
  renderSliders();
  renderBlockCfg();
  renderHandoff();
  renderResponder();
  renderControls();
  renderStage();
  renderChart();
  renderRunning();
  renderTrace();
  renderLearnability();
  renderReadout();
  renderComparison();
  renderPeek();
}

$('typeSel').innerHTML = catalog.types
  .map(
    (t) =>
      `<option value="${t.typeCode}">${esc(t.typeCode)} — ${esc(t.name)}` +
      `${t.status === 'built' ? '' : ' (designed only)'}</option>`,
  )
  .join('');
$('typeSel').value = state.typeCode;
$('typeSel').addEventListener('change', async () => {
  state.typeCode = $('typeSel').value;
  state.run = null;
  state.completed = { consistent: null, perTrial: null };
  state.completedSeries = { consistent: null, perTrial: null };
  inspector = await loadInspector(state.typeCode);
  renderPhilosophy();
  renderAll();
});

for (const button of $('armSwitch').querySelectorAll('button')) {
  button.addEventListener('click', () => {
    if (state.arm === button.dataset.arm) return;
    state.arm = button.dataset.arm;
    // A run belongs to its arm. Switching mid-block would splice two different systems into one
    // trace, which is exactly the confound the two arms exist to keep apart.
    state.run = null;
    renderAll();
  });
}

$('startBtn').addEventListener('click', startRun);
$('autoBtn').addEventListener('click', autoRun);
$('resetBtn').addEventListener('click', resetRun);
$('peekBtn').addEventListener('click', () => {
  state.peeking = !state.peeking;
  $('peekBtn').textContent = state.peeking ? 'Hide the mapping' : 'Reveal the mapping for this item';
  renderPeek();
});
$('provChip').addEventListener('click', () => {
  $('handoffCard').classList.remove('collapsed');
  $('handoffJson').textContent = JSON.stringify(manifest, null, 2);
});

// `h3`, which is what the markup uses. This selector said `h2` and matched nothing, so every
// collapsible card in the window was stuck in whichever state it was authored in.
for (const card of document.querySelectorAll('section.card > h3.click')) {
  card.addEventListener('click', () => {
    const section = card.parentElement;
    section.classList.toggle('collapsed');
    const tw = card.querySelector('.tw');
    if (tw && (tw.textContent === 'show' || tw.textContent === 'hide')) {
      tw.textContent = section.classList.contains('collapsed') ? 'show' : 'hide';
    }
  });
}

renderPhilosophy();
renderSet();
renderAll();
