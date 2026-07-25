/**
 * Targeted interactivity + solvability check for GB-WORDLADDER-01, whose mechanic
 * (select a tile, then click a letter that forms a real word) my generic flow-poker
 * cannot solve by chance. Proves (a) the warm-up now accepts input (was dead before
 * the locked=false fix) and (b) a correct solver reaches the goal → #go arms → scored.
 */
import { chromium } from 'playwright';
import path from 'node:path';
import url from 'node:url';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const DEMOS = path.resolve(HERE, '..', 'demos');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 880 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e.message || e)));
await page.goto(url.pathToFileURL(path.join(DEMOS, 'GB-WORDLADDER-01.html')).href, { waitUntil: 'load' });
await page.waitForFunction(() => (document.querySelector('#phasecue')?.textContent || '').trim() === '⭐', null, { timeout: 12000 }).catch(() => {});

// 1) interactivity: select a tile, confirm it highlights (was impossible when locked)
const selWorks = await page.evaluate(() => {
  const t = document.querySelectorAll('#current .curtile');
  if (t.length < 2) return false;
  t[1].click();
  return document.querySelector('#current .curtile.sel') !== null;
});

// 2) solver: BFS over single-letter changes using the on-page validity (click tile+letter,
//    accept only moves that add a rung). Greedy toward goal; bounded attempts.
const logBefore = await page.evaluate(() => document.querySelectorAll('#log > div').length);
const solved = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rungCount = () => document.querySelectorAll('#ladder .rung').length;
  const goalReached = () => document.querySelector('#go')?.classList.contains('ready');
  let guard = 0;
  while (!goalReached() && guard++ < 60) {
    const tiles = [...document.querySelectorAll('#current .curtile')];
    const letters = [...document.querySelectorAll('#alphabet .letterbtn')];
    if (!tiles.length || !letters.length) break;
    const before = rungCount();
    let moved = false;
    for (let p = 0; p < tiles.length && !moved; p++) {
      for (let L = 0; L < letters.length && !moved; L++) {
        tiles[p].click(); // select position p
        letters[L].click(); // try this letter
        await sleep(4);
        if (rungCount() > before || goalReached()) moved = true;
      }
    }
    if (!moved) break; // no valid single-letter move from current word
  }
  return goalReached();
});
const logAfter = await page.evaluate(() => document.querySelectorAll('#log > div').length);
const rungStats = await page.evaluate(() => {
  const logs = [...document.querySelectorAll('#log > div')].map((d) => d.textContent);
  return {
    validRungs: logs.filter((t) => /rung:/i.test(t)).length,
    maxLadder: document.querySelectorAll('#ladder .rung').length,
  };
});

let reachedScored = false;
if (solved) {
  await page.evaluate(() => document.querySelector('#go')?.click());
  await page.waitForTimeout(1600);
  reachedScored = await page.evaluate(() => {
    const cue = (document.querySelector('#phasecue')?.textContent || '').trim();
    return cue === '🎯' || /\bscored\b/i.test((document.querySelector('#log')?.innerText || ''));
  });
}

console.log('GB-WORDLADDER-01 verification:');
console.log('  tile-select highlights (warm-up interactive):', selWorks);
  console.log('  log grew during letter clicks:', logAfter > logBefore, `(${logBefore} -> ${logAfter})`);
console.log('  valid rungs added (real words formed):', rungStats.validRungs, '· max ladder height:', rungStats.maxLadder);
console.log('  solver reached goal (#go armed):', solved);
console.log('  advanced to SCORED after submit:', reachedScored);
console.log('  pageerrors:', errs.length ? errs.join(' | ') : 'none');
await browser.close();
