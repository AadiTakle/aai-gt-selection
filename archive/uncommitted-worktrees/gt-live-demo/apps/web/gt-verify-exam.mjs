import { chromium } from '@playwright/test';

const BASE = process.env.BASE ?? 'http://127.0.0.1:4100';
const PATH = process.env.EXAM_PATH ?? '/dev/family-preview/exam?telemetry=1';

const browser = await chromium.launch();
const page = await browser.newPage();

const consoleErrors = [];
const failedRequests = [];
const apiCalls = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300));
});
page.on('requestfailed', (r) =>
  failedRequests.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText}`),
);
page.on('response', (r) => {
  const u = new URL(r.url());
  if (u.pathname.startsWith('/api/')) apiCalls.push(`${r.status()} ${u.pathname}${u.search.slice(0, 60)}`);
});

console.log(`=== GET ${BASE}${PATH} ===`);
const resp = await page.goto(BASE + PATH, { waitUntil: 'domcontentloaded', timeout: 120000 });
console.log('HTTP status:', resp.status());

await page.waitForLoadState('networkidle', { timeout: 120000 }).catch(() => {});
console.log('\n--- landing text ---');
console.log((await page.locator('body').innerText()).slice(0, 700));

// Click whatever starts the exam.
const buttons = await page.locator('button, a[href]').all();
const labels = [];
for (const b of buttons) {
  const t = (await b.innerText().catch(() => '')).trim();
  if (t) labels.push(t);
}
console.log('\n--- clickable labels ---');
console.log(labels.join(' | '));

const starter = page
  .locator('button', { hasText: /begin|start|let'?s go|ready/i })
  .first();
if (await starter.count()) {
  const label = (await starter.innerText()).trim();
  console.log(`\n>>> clicking start control: "${label}"`);
  await starter.click();
}

// Wait for a real question: the runner renders each item in an iframe of the demo HTML.
console.log('\n--- waiting for question iframe ---');
let frameUrl = null;
try {
  await page.waitForSelector('iframe', { timeout: 90000 });
  await page.waitForFunction(
    () => {
      const f = document.querySelector('iframe');
      return f && f.getAttribute('src') && f.getAttribute('src').includes('/exam-demos/');
    },
    { timeout: 90000 },
  );
  frameUrl = await page.locator('iframe').first().getAttribute('src');
} catch (e) {
  console.log('!! no question iframe appeared:', e.message.slice(0, 200));
}
console.log('QUESTION IFRAME SRC:', frameUrl);

await page.waitForTimeout(4000);

console.log('\n--- runner chrome (question number / type / domain) ---');
console.log((await page.locator('body').innerText()).slice(0, 900));

// Did the item actually paint inside the iframe?
if (frameUrl) {
  const fr = page.frames().find((f) => f.url().includes('/exam-demos/'));
  if (fr) {
    const inner = await fr.locator('body').innerText().catch(() => '');
    console.log('\n--- RENDERED QUESTION CONTENT (inside iframe) ---');
    console.log(inner.slice(0, 700) || '(no text)');
    const shapes = await fr.locator('svg, canvas, button, [role="button"]').count();
    console.log(`\ninteractive/graphical elements in question: ${shapes}`);
  }
}

// Emulate button = telemetry debug mode working.
const emulate = page.locator('button', { hasText: /Emulate/i }).first();
const hasEmulate = (await emulate.count()) > 0;
console.log('\nEMULATE BUTTON PRESENT (telemetry=1):', hasEmulate);
if (hasEmulate) console.log('emulate label:', (await emulate.innerText()).trim());

// Advance several items to prove the pool is not a one-item fluke.
if (hasEmulate) {
  console.log('\n--- advancing with Emulate ---');
  for (let i = 0; i < 6; i++) {
    const btn = page.locator('button', { hasText: /Emulate/i }).first();
    if (!(await btn.count())) {
      console.log(`  step ${i + 1}: emulate gone (exam likely finished//phase change)`);
      break;
    }
    await btn.click();
    await page.waitForTimeout(2500);
    const kicker = await page
      .locator('p')
      .filter({ hasText: /Question|New puzzle/i })
      .first()
      .innerText()
      .catch(() => '(none)');
    const title = await page.locator('iframe').first().getAttribute('src').catch(() => '?');
    console.log(`  step ${i + 1}: ${kicker.replace(/\n/g, ' ')}  [${title}]`);
  }
}

await page.screenshot({ path: '/tmp/gt-exam-question.png', fullPage: false });
console.log('\nscreenshot: /tmp/gt-exam-question.png');

console.log('\n--- /api calls made by the runner ---');
console.log([...new Set(apiCalls)].slice(0, 15).join('\n') || '(none)');
console.log('\n--- console errors ---');
console.log(consoleErrors.slice(0, 8).join('\n') || '(none)');
console.log('\n--- failed requests ---');
console.log(failedRequests.slice(0, 8).join('\n') || '(none)');

await browser.close();
