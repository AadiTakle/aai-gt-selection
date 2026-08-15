import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
await p.goto('http://localhost:4100/dev/family-preview/exam?debug=1', { waitUntil: 'networkidle' });
await p.getByRole('button', { name: /Start the assessment/i }).click();
await p.waitForSelector('iframe', { timeout: 30000 });
const rows = [];
for (let i = 0; i < 16; i++) {
  try { await p.getByRole('button', { name: /^Emulate/ }).first().click({ timeout: 8000 }); }
  catch { break; }
  await p.waitForTimeout(420);
  const tbody = p.locator('aside[aria-label="Debug: ability convergence"] tbody tr');
  const n = await tbody.count();
  if (n) rows[i] = await tbody.last().innerText().catch(() => '');
}
const dock = p.locator('aside[aria-label="Debug: ability convergence"]');
console.log('DOCK:', (await dock.count()) > 0, '| BURST TAGS:', await dock.locator('[class*="burstTag"]').count());
console.log('\n#  type / aimed / served / ok / step / move / newaim / range / rev / burst');
rows.forEach((r, i) => console.log(String(i + 1).padStart(2), (r || '').replace(/\n/g, ' ')));
console.log('\nPAGE ERRORS:', errs.length ? errs : 'none');
await p.screenshot({ path: 'debug-panel-preview.png' });
await b.close();
