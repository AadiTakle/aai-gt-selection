// RENDER THE CHILD'S SCREEN TO PNG, for the intuitiveness audit.
//
// WHY THIS EXISTS. Whether a screen explains itself is not a question its designer can answer: once
// you know what the badges do, every cue looks obvious, and that intuition is worthless. The only
// usable evidence is what someone with no explanation reports seeing. So this writes the real
// stimuli out as images, which are then shown to evaluators who have no access to the design, the
// brief, or this file.
//
// IT IS THE INSTRUMENT, NOT A MOCK-UP. The markup and CSS come from `stage2-child-stage.js`, the same
// module the review window draws, and the items come from the same bank the block administers,
// chosen by the same warm-up rule. A prettier stand-in would make the audit unfalsifiable.
//
// The sequence rendered is the one a child meets: the three worked demonstrations in order, then the
// first scored trial, then a mid-block trial with its history, then a completed trial showing what
// the feedback looks like. Deliberately including the demonstrations, because the claim under test is
// that the task is legible WITHOUT instruction, and the demonstrations are how that is supposed to
// happen. Also rendered: the same screens with the demonstrations withheld, which is the control for
// the audit — if evaluators read the task equally well from a cold trial, the warm-up is not what is
// doing the work.
//
// Usage: node stage2-render-samples.mjs [outDir]

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chooseWarmup } from './stage2-block-run.js';
import { SIZES, STAGE_CSS, stageMarkup } from './stage2-child-stage.js';
import * as inspector from './stage2-inspectors/opchain.js';

const HERE = dirname(fileURLToPath(import.meta.url));

// `research/` is not a workspace package, so a bare specifier will not resolve from here. Anchored on
// `apps/web`, which already declares the browser driver for its own end-to-end suite, rather than
// adding a second copy of Chromium to the tree for a research instrument.
const { chromium } = createRequire(join(HERE, '..', '..', 'apps', 'web', 'package.json'))(
  '@playwright/test',
);
const OUT = resolve(process.argv[2] ?? join(HERE, 'samples', 'stage2-intuitiveness'));

const bank = readFileSync(join(HERE, 'banks', 'FLU-OPCHAIN-01.jsonl'), 'utf8')
  .trim()
  .split('\n')
  .map((line) => JSON.parse(line));

const served = bank.map((item) => ({
  itemId: item.itemId,
  typeCode: 'FLU-OPCHAIN-01',
  domain: 'fluid_reasoning',
  difficulty: item.difficulty,
  content: item.content,
}));
const reviewerOnly = Object.fromEntries(
  bank.map((item) => [
    item.itemId,
    { correctKey: item.answer.correctKey, operatorChain: item.answer.operatorChain },
  ]),
);
const full = new Map(bank.map((item) => [item.itemId, item]));
const outputOf = (item) =>
  full.get(item.itemId).content.options.find((o) => o.key === reviewerOnly[item.itemId].correctKey)
    .figure;
const keyOf = (item) => reviewerOnly[item.itemId].correctKey;

/* The child's actual path: warm-up by the block's own rule, then trials by ascending difficulty. */
const warmup = chooseWarmup({ served, reviewerOnly }, served);
const warmupIds = new Set(warmup.map((i) => i.itemId));
const pool = served
  .filter((i) => !warmupIds.has(i.itemId))
  .sort((a, b) => a.difficulty - b.difficulty || (a.itemId < b.itemId ? -1 : 1));

/**
 * Ten trials a child near the middle of the range would actually be served: the closest item to a
 * difficulty that climbs from 2 to 11, which is roughly what the targeting rule walks for a standing
 * of 8 over a block. Chosen by difficulty rather than by pool index so trial 10 is a hard, deep-chain
 * item — an audit run on ten easy items would test nothing about the top of the block.
 */
const nearest = (want, used) =>
  pool
    .filter((item) => !used.has(item.itemId))
    .reduce((best, item) =>
      Math.abs(item.difficulty - want) < Math.abs(best.difficulty - want) ? item : best,
    );
const trials = [];
const used = new Set();
for (let i = 0; i < 10; i += 1) {
  const item = nearest(2 + i, used);
  used.add(item.itemId);
  trials.push(item);
}

const entryOf = (item) => ({
  input: item.content.input,
  chain: item.content.chain,
  output: outputOf(item),
});

const history = [];
const screens = [];

warmup.forEach((item, i) => {
  // Both beats, because the pose is the screen that carries the task and the audit must see it.
  screens.push({
    name: `01-demo-${i + 1}a-posed`,
    caption: `Worked demonstration ${i + 1} of ${warmup.length}, beat 1: posed (depth ${item.content.chain.length}).`,
    view: { kind: 'pose', item, output: outputOf(item), history: history.slice() },
  });
  screens.push({
    name: `01-demo-${i + 1}b-shown`,
    caption: `Worked demonstration ${i + 1} of ${warmup.length}, beat 2: completed.`,
    view: { kind: 'show', item, output: outputOf(item), history: history.slice() },
  });
  history.push(entryOf(item));
});

screens.push({
  name: '02-trial-01-ask',
  caption: 'First scored trial, unanswered.',
  view: { kind: 'ask', item: trials[0], history: history.slice() },
});
screens.push({
  name: '03-trial-01-answered',
  caption: 'The same trial after a choice: the row completes. This is the only feedback there is.',
  view: {
    kind: 'answer',
    item: trials[0],
    output: outputOf(trials[0]),
    chosenKey: trials[0].content.options[1].key,
    history: history.slice(),
  },
});

// Walk forward so the mid-block screens carry a real history rather than a staged one.
trials.slice(0, 9).forEach((item) => history.push(entryOf(item)));

screens.push({
  name: '04-trial-10-ask',
  caption: `Trial 10, unanswered (difficulty ${trials[9].difficulty}, depth ${trials[9].content.chain.length}).`,
  view: { kind: 'ask', item: trials[9], history: history.slice() },
});
screens.push({
  name: '05-trial-10-answered',
  caption: 'Trial 10 after a choice.',
  view: {
    kind: 'answer',
    item: trials[9],
    output: outputOf(trials[9]),
    chosenKey: keyOf(trials[9]),
    history: history.slice(),
  },
});

/* The control for the audit: the same trial with no demonstrations and no history behind it. */
screens.push({
  name: '06-cold-open-no-demos',
  caption: 'A first trial with no demonstrations and no history — the audit control.',
  view: { kind: 'ask', item: trials[0], history: [] },
});

const page = (view) => `<!doctype html><html><head><meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #eef1f4;
    font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    display: flex;
    justify-content: center;
    padding: 22px;
  }
  .frame { width: 860px; background: #fff; border-radius: 12px; border: 1px solid #d7dee7; }
  ${STAGE_CSS}
</style></head><body><div class="frame">${stageMarkup({ inspector, view })}</div></body></html>`;

const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: 920, height: 860 }, deviceScaleFactor: 2 });

mkdirSync(OUT, { recursive: true });
for (const screen of screens) {
  await tab.setContent(page(screen.view));
  await tab.locator('.frame').screenshot({ path: join(OUT, `${screen.name}.png`) });
}
writeFileSync(
  join(OUT, 'MANIFEST.json'),
  `${JSON.stringify(
    {
      note:
        'Rendered from stage2-child-stage.js and banks/FLU-OPCHAIN-01.jsonl. Captions are for the ' +
        'reviewer reading this manifest; they are NOT shown to evaluators and NOT on the screens.',
      figureSizes: SIZES,
      screens: screens.map((s) => ({ file: `${s.name}.png`, caption: s.caption })),
    },
    null,
    2,
  )}\n`,
);
console.log(`${screens.length} screens in ${OUT}`);

await browser.close();
console.log(
  `\ntrial difficulties: ${trials.map((t) => `${t.difficulty}(d${t.content.chain.length})`).join(' ')}`,
);
