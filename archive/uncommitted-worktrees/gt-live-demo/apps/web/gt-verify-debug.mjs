import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
await p.goto('http://localhost:4100/dev/family-preview/exam?debug=1', { waitUntil: 'networkidle' });
await p.getByRole('button', { name: /Start the assessment/i }).click();
await p.waitForSelector('iframe', { timeout: 20000 });

const shots = [];
for (let i = 0; i < 14; i++) {
  const emulate = p.getByRole('button', { name: /^Emulate/ });
  try { await emulate.first().click({ timeout: 6000 }); } catch { break; }
  await p.waitForTimeout(450);
  const dock = p.locator('aside[aria-label="Debug: ability convergence"]');
  if (await dock.count()) {
    const big = (await dock.locator('div').first().innerText().catch(() => '')) || '';
    const head = await dock.innerText().catch(() => '');
    const firstLines = head.split('\n').slice(0, 6).join(' | ');
    shots.push(`after ${i + 1}: ${firstLines}`);
  }
}
const dock = p.locator('aside[aria-label="Debug: ability convergence"]');
console.log('DOCK PRESENT:', await dock.count() > 0);
console.log('BARS (one per answered item):', await dock.locator('[class*="narrowBar"]').count());
console.log('AREA ROWS:', await dock.locator('[class*="axis"]').count());
console.log('LOG ROWS:', await dock.locator('tbody tr').count());
console.log('BURST TAGS VISIBLE:', await dock.locator('[class*="burstTag"]').count());
console.log('\n--- headline over time ---');
for (const s of shots) console.log(s);
console.log('\nPAGE ERRORS:', errs.length ? errs : 'none');
await p.screenshot({ path: '/tmp/gt-debug-panel.png', fullPage: false });
await b.close();
