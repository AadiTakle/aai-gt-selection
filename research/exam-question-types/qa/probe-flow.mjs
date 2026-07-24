/**
 * Flow-reachability probe. Aggressively drives each demo (clicks every answer-ish
 * element + submit/advance controls + presses hotkeys, in a spaced loop) and
 * reports the furthest phase reached, read from the event-log text markers the
 * house pattern emits: "warm-up" -> "SCORED" -> "DONE".
 *
 * A healthy demo reaches SCORED (and usually DONE). A demo that renders + auto-
 * plays but can NEVER leave warm-up (e.g. the pick is locked and submit depends
 * on that pick) is STUCK == a hard breakage, even though it throws no errors.
 *
 * Usage: node probe-flow.mjs [id ...]   (no args = all demos)
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const DEMOS = path.resolve(HERE, '..', 'demos');
let ids = process.argv.slice(2).map((s) => s.replace(/\.html$/, ''));
if (!ids.length)
  ids = fs
    .readdirSync(DEMOS)
    .filter((f) => f.endsWith('.html') && f !== 'index.html')
    .map((f) => f.replace(/\.html$/, ''))
    .sort();

const POKE = () => {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return (
      r.width > 1 &&
      r.height > 1 &&
      s.visibility !== 'hidden' &&
      s.display !== 'none' &&
      s.pointerEvents !== 'none' &&
      parseFloat(s.opacity) > 0.05 &&
      !el.disabled
    );
  };
  const ans = [
    ...document.querySelectorAll(
      '.opt,.choice,.option,.tile,.gc.edit,.cell,.chip,.card,.pick,.candidate,.pair,.tok,.word,.node,' +
        '.curtile,.letterbtn,.nopt,.qcard,.qcard,.sent,.slot,[data-i],[data-idx],[data-opt],[data-val],[data-c]',
    ),
  ]
    .filter(vis)
    .slice(0, 5);
  ans.forEach((el) => {
    try {
      el.click();
    } catch {
      /* ignore */
    }
  });
  [
    '#go', '#submit', '#check', '#done', '#next', '#play', '#run', '#add', '#speak', '#foldBtn', '#rotbtn',
    '#enter', '#advance', '#guessIN', '#guessOUT', '#seenbtn', '#newbtn', '#lock',
  ].forEach((s) => {
    const el = document.querySelector(s);
    if (el && vis(el)) {
      try {
        el.click();
      } catch {
        /* ignore */
      }
    }
  });
  const q = (x) => document.querySelector(x);
  const logtext = (q('#log')?.innerText || '').toLowerCase();
  const cue = (q('#phasecue')?.textContent || '').trim();
  return {
    cue,
    // \bscored\b matches "SCORED" but NOT "unscored" (no word boundary inside the word)
    scored: /\bscored\b/.test(logtext) || cue === '🎯' || cue === '🏆',
    done: /\bdone\b|finished/.test(logtext) || cue === '🏆',
    logN: document.querySelectorAll('#log > div').length,
  };
};

const KEYS = ['1', '2', '3', '4', 'f', 'j', 'Enter', ' ', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft'];

const browser = await chromium.launch({ headless: true });
const out = [];
for (const id of ids) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 880 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e.message || e)));
  try {
    await page.goto(url.pathToFileURL(path.join(DEMOS, `${id}.html`)).href, { waitUntil: 'load', timeout: 20000 });
  } catch {
    /* record below */
  }
  const c0 = await page.evaluate(() => (document.querySelector('#phasecue')?.textContent || '').trim()).catch(() => '');
  await page
    .waitForFunction(
      ({ x }) => {
        const cue = (document.querySelector('#phasecue')?.textContent || '').trim();
        return (x && cue && cue !== x) || !!document.querySelector('#go.ready, button.ready');
      },
      { x: c0 },
      { timeout: 12000, polling: 300 },
    )
    .catch(() => {});

  const cues = new Set();
  let scored = false;
  let done = false;
  for (let i = 0; i < 15 && !done; i++) {
    let r = {};
    try {
      r = await page.evaluate(POKE);
    } catch {
      /* ignore */
    }
    if (r.cue) cues.add(r.cue);
    scored = scored || r.scored;
    done = done || r.done;
    for (const k of KEYS) {
      try {
        await page.keyboard.press(k);
      } catch {
        /* ignore */
      }
    }
    await page.waitForTimeout(1350);
  }
  // final read
  let fin = {};
  try {
    fin = await page.evaluate(POKE);
  } catch {
    /* ignore */
  }
  scored = scored || fin.scored;
  done = done || fin.done;
  if (fin.cue) cues.add(fin.cue);

  out.push({ id, reachedScored: scored, reachedDone: done, cues: [...cues], errs });
  console.log(
    `${scored ? 'OK  ' : 'STUCK'}  ${id.padEnd(17)} scored=${scored} done=${done}  cues=[${[...cues].join(' ')}]${errs.length ? '  ERR:' + errs[0] : ''}`,
  );
  await page.close();
}
await browser.close();

const stuck = out.filter((o) => !o.reachedScored);
console.log(`\n${out.length} probed · reached-scored ${out.length - stuck.length} · STUCK ${stuck.length}`);
if (stuck.length) console.log('STUCK:', stuck.map((s) => s.id).join(', '));
fs.writeFileSync(path.join(HERE, 'flow.json'), JSON.stringify(out, null, 2));
