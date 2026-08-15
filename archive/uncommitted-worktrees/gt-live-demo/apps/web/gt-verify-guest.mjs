import { chromium } from '@playwright/test';

const BASE = process.env.BASE ?? 'http://127.0.0.1:4100';
const browser = await chromium.launch();
const page = await browser.newPage();

const errs = [];
page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));

console.log(`=== 1. GET ${BASE}/login ===`);
let r = await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 120000 });
console.log('HTTP', r.status());
await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});

const guest = page.locator('button', { hasText: /continue as guest/i }).first();
console.log('"Continue as guest" button present:', (await guest.count()) > 0);

console.log('\n=== 2. click Continue as guest ===');
await guest.click();
await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 90000 }).catch(() => {});
await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
console.log('landed on:', page.url());
const bodyText = await page.locator('body').innerText();
console.log('--- page text ---');
console.log(bodyText.slice(0, 500));

console.log('\n=== 3. GET /family/exam?telemetry=1 as the signed-in guest ===');
r = await page.goto(`${BASE}/family/exam?telemetry=1`, {
  waitUntil: 'domcontentloaded',
  timeout: 120000,
});
console.log('HTTP', r.status(), '| final URL:', page.url());
const gated = page.url().includes('/login');
console.log('redirected back to login?', gated ? 'YES (auth failed)' : 'NO (auth held)');

await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {});
const starter = page.locator('button', { hasText: /begin|start|let'?s go|ready/i }).first();
if (await starter.count()) {
  console.log('clicking:', (await starter.innerText()).trim());
  await starter.click();
}

let src = null;
try {
  await page.waitForFunction(
    () => {
      const f = document.querySelector('iframe');
      return f?.getAttribute('src')?.includes('/exam-demos/');
    },
    { timeout: 90000 },
  );
  src = await page.locator('iframe').first().getAttribute('src');
} catch (e) {
  console.log('!! no question rendered:', e.message.slice(0, 150));
}
await page.waitForTimeout(3500);
console.log('\nQUESTION IFRAME SRC:', src);
console.log('--- authenticated exam chrome ---');
console.log((await page.locator('body').innerText()).slice(0, 400));

const emulate = page.locator('button', { hasText: /Emulate/i }).first();
console.log('\nEmulate button present:', (await emulate.count()) > 0);

// Prove the whole exam can be completed: emulate until the runner stops offering items.
console.log('\n=== 4. run the exam to completion via Emulate ===');
let steps = 0;
for (let i = 0; i < 260; i++) {
  const btn = page.locator('button', { hasText: /Emulate/i }).first();
  if (!(await btn.count())) break;
  await btn.click().catch(() => {});
  await page.waitForTimeout(160);
  steps++;
}
console.log(`emulated ${steps} items`);
await page.waitForTimeout(6000);
const finalText = await page.locator('body').innerText();
console.log('--- final screen ---');
console.log(finalText.slice(0, 1100));
console.log('\nfinal URL:', page.url());

await page.screenshot({ path: '/tmp/gt-exam-complete.png', fullPage: false });
console.log('\nconsole errors:', errs.slice(0, 5).join(' || ') || '(none)');
await browser.close();
