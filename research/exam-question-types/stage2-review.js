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
  /** Completed runs, keyed by arm, so the two can be put side by side. */
  completed: { consistent: null, perTrial: null },
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
  if (state.responder === 'induces' && inspector) return inductionResponder(inspector);
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
  });
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

function advance() {
  if (!state.run) return;
  advanceRun(state.run);
  if (state.run.finished) state.completed[state.run.arm] = summariseRun(state.run);
  renderAll();
}

function autoRun() {
  if (!state.run) startRun();
  const run = state.run;
  if (run.responder.id === 'you') return;
  playToEnd(run);
  state.completed[run.arm] = summariseRun(run);
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

  const { item, target } = run.current;
  const gap = item.difficulty - target;
  head.innerHTML =
    `<span class="pill">trial <b>${run.served.length + 1}</b>/${run.length}</span>` +
    `<span class="pill">asked for <b>${fmt(target)}</b></span>` +
    `<span class="pill">served <b>${fmt(item.difficulty)}</b></span>` +
    `<span class="pill${Math.abs(gap) > 1 ? ' ' : ''}">gap <b>${gap >= 0 ? '+' : ''}${fmt(gap)}</b></span>` +
    `<span class="pill">${esc(inspector.describeItem(item.content ? metaFor(item.itemId) : null))}</span>` +
    '<span class="spacer"></span>' +
    `<span class="pill">${run.current.projecting ? 'projected from the fit' : 'standing + offset (too few trials to project)'}</span>`;

  const chain = item.content.chain
    .map((badge) => `<div class="badge step">${inspector.badgeSvg(badge)}</div>`)
    .join('<span class="arrow">›</span>');

  const options = item.content.options
    .map((option) => {
      const chosen = run.pending?.key === option.key;
      const right = run.pending && option.key === run.pending.meta.correctKey;
      const cls = [
        'opt',
        run.pending ? 'locked' : '',
        chosen ? 'chosen' : '',
        run.pending ? (right ? 'right' : chosen ? 'wrong' : '') : '',
      ]
        .filter(Boolean)
        .join(' ');
      return (
        `<button class="${cls}" data-key="${option.key}" type="button">` +
        `${inspector.figureSvg(option.figure, 74)}<span class="k">${option.key}</span></button>`
      );
    })
    .join('');

  body.innerHTML =
    `<div class="machine"><div class="figbox"><span class="cap">in</span>` +
    `${inspector.figureSvg(item.content.input, 92)}</div>` +
    `<div class="chainrow">${chain}</div>` +
    `<div class="figbox"><span class="cap">out</span>` +
    '<div class="badge" style="width:92px;height:92px;font-size:34px;color:#5a6b7b">?</div></div></div>' +
    `<p class="note" style="text-align:center;margin:0 12px">${esc(inspector.prompt)}</p>` +
    `<div class="options">${options}</div>` +
    (run.pending
      ? '<div class="reveal">' +
        `<div class="figbox"><span class="cap">it made</span>` +
        `${inspector.figureSvg(run.pending.correctFigure, 74)}</div>` +
        `<div class="msg"><b style="color:${run.pending.correct ? 'var(--ok)' : 'var(--bad)'}">` +
        `${run.pending.correct ? 'Correct.' : `Not this one — ${esc(run.pending.meta.correctKey)}.`}</b> ` +
        `${esc(run.pending.meta.strategyTrace?.[run.pending.key]?.kind?.replace(/_/g, ' ') ?? '')}` +
        '<br />Seeing the output is the feedback. Without it there is nothing to induce from.</div>' +
        '<span class="spacer" style="flex:1"></span>' +
        '<button class="primary" id="nextBtn" style="width:auto" type="button">Next trial</button>' +
        '</div>'
      : '');

  if (run.pending) {
    $('nextBtn').addEventListener('click', advance);
  } else {
    for (const button of body.querySelectorAll('.opt')) {
      button.addEventListener('click', () => answer(button.dataset.key));
    }
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
    '<thead><tr><th>#</th><th>asked</th><th>served</th><th>gap</th><th class="l">item</th>' +
    '<th class="l">levers</th><th>ans</th><th>ok</th><th>\u03b8\u03050</th><th>\u03bb\u0302</th>' +
    '<th>\u03bb\u0302 SE</th><th class="l">learner</th></tr></thead><tbody>' +
    rows
      .map((r) => {
        const gap = r.served - r.target;
        return (
          `<tr class="${r.correct ? 'hit' : 'miss'}"><td>${r.index}</td>` +
          `<td>${fmt(r.target)}</td><td>${fmt(r.served)}</td>` +
          `<td class="${Math.abs(gap) > 1 ? 'zero' : ''}">${gap >= 0 ? '+' : ''}${fmt(gap)}</td>` +
          `<td class="l">${esc(r.itemId.slice(0, 8))}</td>` +
          `<td class="l">${esc(inspector ? inspector.describeItem(r.meta) : '—')}</td>` +
          `<td>${esc(r.answered)}</td><td>${r.correct ? '\u2713' : '\u00b7'}</td>` +
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

function renderAll() {
  renderProvenance();
  renderSliders();
  renderBlockCfg();
  renderHandoff();
  renderResponder();
  renderControls();
  renderStage();
  renderChart();
  renderTrace();
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

for (const card of document.querySelectorAll('section.card > h2.click')) {
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
