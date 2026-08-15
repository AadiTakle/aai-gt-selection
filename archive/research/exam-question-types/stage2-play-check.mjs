// PLAY THE REVIEW WINDOW AND SAY WHAT A CHILD SEES.
//
// A screenshot proves the page renders; it does not prove the page is the instrument. This drives the
// real window in a browser — the same compiled modules, the same block loop, the same bank — clicks
// through it as a child would, and reports for each trial what was on screen next to what the
// learnability trace said was knowable at that moment. The two have to agree, and a claim about
// trials 1, 2 and 10 is only worth making if it came from actually playing them.
//
// It also asserts the two things the child's screen must NOT have: any verdict wording, and any
// right/wrong colouring. Those are cheap to reintroduce by accident and expensive to notice.
//
// Usage: node stage2-play-check.mjs [url] [outDir]

import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(join(HERE, '..', '..', 'apps', 'web', 'package.json'))(
  '@playwright/test',
);

const URL = process.argv[2] ?? 'http://127.0.0.1:4300/stage2-review.html';
const OUT = resolve(process.argv[3] ?? join(HERE, 'samples', 'stage2-played'));
const WATCH = [1, 2, 10];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
const problems = [];
tab.on('pageerror', (err) => problems.push(`page error: ${err.message}`));

tab.on('console', (message) => {
  if (message.type() === 'error') problems.push(`console error: ${message.text()}`);
});

await tab.goto(URL, { waitUntil: 'networkidle' });
await tab.waitForSelector('#startBtn', { timeout: 15000 });
await tab.locator('#startBtn').click();
await tab.waitForSelector('.kid', { timeout: 15000 });

/**
 * Everything the child's half of the page says, so a verdict cannot hide in it.
 *
 * The chevrons are stripped: they are the order cue drawn as a glyph, not language, and there is no
 * font-independent way to draw them that this check would not have to special-case anyway. Everything
 * else must come back empty — that is the whole claim being tested.
 */
const childText = async () =>
  (await tab.locator('#stageBody').innerText()).replace(/[\u203a\u2039>\s]/g, '');
const headText = () => tab.locator('#stageHead').innerText();

/* ---- the demonstrations, two beats each ---- *
 * Beat 1 poses the row exactly as a trial is posed — an open hole and a visible but inert tray — and
 * beat 2 completes it. Both beats must be unpressable: options that are shown but cannot be chosen
 * are a worked example, whereas a pressable option on an unscored screen would teach that choices do
 * not matter. So the check here is not "no options" but "no BUTTONS", and the tray must be present. */
let beats = 0;
while ((await headText()).toLowerCase().includes('demonstration')) {
  await tab.locator('#playWrap').screenshot({ path: join(OUT, `demo-${beats + 1}.png`) });
  const shown = await tab.locator('.kid .tray.shown .card').count();
  const pressable = await tab.locator('.kid button.card').count();
  const open = await tab.locator('.kid .row.live .cell.hole').count();
  const marked = await tab.locator('.kid .tray .card.mine').count();
  const posed = (await headText()).includes('beat 1');
  console.log(
    `demonstration beat ${beats + 1}: ${(await headText()).replace(/\n/g, ' | ')}\n` +
      `  options shown: ${shown} (inert, part of the picture)  pressable: ${pressable} (must be 0)\n` +
      `  hole ${open ? 'open' : 'filled'}${posed ? ' — as a trial is posed' : ''}` +
      `  matching card marked: ${marked}\n` +
      `  child-visible text: ${JSON.stringify(await childText())}`,
  );
  if (pressable !== 0) problems.push(`demonstration beat ${beats + 1} offered a pressable option`);
  if (shown === 0) problems.push(`demonstration beat ${beats + 1} showed no option tray`);
  // The task is carried by the hole and the tray appearing together, so beat 1 must open the hole and
  // beat 2 must close it and mark the card it matched.
  if (posed && open !== 1) problems.push(`demonstration beat ${beats + 1} posed no hole`);
  if (!posed && (open !== 0 || marked !== 1)) {
    problems.push(`demonstration beat ${beats + 1} did not complete and mark its match`);
  }
  await tab.locator('#kidNext').click();
  beats += 1;
  if (beats > 12) break;
}
console.log(`\n${beats} unscored demonstration beats shown before trial 1.\n`);

/* ---- the scored trials ---- */
for (let trial = 1; trial <= 10; trial += 1) {
  const head = await headText();
  const rows = await tab.locator('.kid .row').count();
  const cards = await tab.locator('.kid .card').count();
  const text = await childText();

  if (WATCH.includes(trial)) {
    await tab.locator('#playWrap').screenshot({ path: join(OUT, `trial-${trial}-ask.png`) });
    console.log(`--- TRIAL ${trial}, before answering -------------------------------`);
    console.log(`  reviewer strip: ${head.replace(/\n/g, ' | ')}`);
    console.log(`  on the child's screen: ${rows} rows (${rows - 1} finished + 1 with a gap), ${cards} cards to choose from`);
    console.log(`  all child-visible text: ${JSON.stringify(text)}`);
  }
  if (text !== '') {
    problems.push(`trial ${trial} showed text to the child: ${JSON.stringify(text)}`);
  }
  if (cards === 0) problems.push(`trial ${trial} offered nothing to choose`);

  // Answer with the third card every time: a fixed position, so the walk is not steered by knowing
  // the key and the classes on show are whatever the evidence happened to allow.
  await tab.locator('.kid .card').nth(2).click();
  const after = await headText();
  const afterText = await childText();

  if (WATCH.includes(trial)) {
    await tab.locator('#playWrap').screenshot({ path: join(OUT, `trial-${trial}-answered.png`) });
    console.log(`  AFTER answering: ${after.replace(/\n/g, ' | ')}`);
    console.log(`  child-visible text after the reveal: ${JSON.stringify(afterText)}`);
    console.log(
      `  outlined card (the record of the choice): ${await tab.locator('.kid .card.mine').count()}`,
    );
  }

  for (const banned of ['correct', 'incorrect', 'wrong', 'not this one', 'well done', 'nice', 'score', 'streak']) {
    if (afterText.toLowerCase().includes(banned)) {
      problems.push(`trial ${trial} showed the child a verdict word: "${banned}"`);
    }
  }
  // No right/wrong colouring: every card outline on the child's screen must be a neutral ink.
  const colours = await tab.evaluate(() =>
    [...document.querySelectorAll('.kid .card')].map(
      (el) => getComputedStyle(el).borderTopColor,
    ),
  );
  for (const colour of colours) {
    const [r, g, b] = colour.match(/\d+/g).map(Number);
    if (g > r + 25 || r > g + 40) problems.push(`trial ${trial} card outline is evaluative: ${colour}`);
  }

  await tab.locator('#kidNext').click();
}

/* ---- the trace, which is the reviewer's half ---- */
const trace = await tab.evaluate(() =>
  [...document.querySelectorAll('#traceTable tbody tr')].slice(0, 10).map((tr) =>
    [...tr.querySelectorAll('td')].map((td) => td.innerText.trim()),
  ),
);
const header = await tab.evaluate(() =>
  [...document.querySelectorAll('#traceTable thead th')].map((th) => th.innerText.trim()),
);
console.log(`\n--- the learnability trace as the window shows it ---`);
console.log(header.join(' | '));
for (const row of trace) console.log(row.join(' | '));

await tab.locator('#playWrap').screenshot({ path: join(OUT, 'reviewer-panel.png') });
await tab.screenshot({ path: join(OUT, 'whole-window.png'), fullPage: false });
await browser.close();

console.log(`\nscreens in ${OUT}`);
if (problems.length > 0) {
  console.error(`\n${problems.length} PROBLEM(S):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('\nno verdict wording, no evaluative colouring, demonstrations ask nothing. OK.');
