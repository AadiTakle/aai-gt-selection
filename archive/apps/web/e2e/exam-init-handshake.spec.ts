import { expect, test } from '@playwright/test';

const WAITING = /Waiting for an item from the host/i;

/** Long enough for a demo to boot, announce itself and render the served item. */
const SETTLE_MS = 2_200;

/** How many items to walk. Enough to hit the late-installing demos more than once. */
const ITEMS = 10;

/**
 * The runner must not race a demo's `message` listener.
 *
 * A demo announces itself with `{type:'ready'}` once its listener is installed.
 * The iframe `load` event fires earlier — the document is parsed but the body
 * script has not run — so an `init` sent on `load` alone is dropped by any demo
 * that installs its listener late. That demo then sits on "Waiting for an item
 * from the host" until the four-minute item timeout, and the child cannot answer.
 *
 * This was not hypothetical: before the fix, 6 of 14 items in a real battery were
 * unanswerable, varying run to run because it is a timing race. Driving each demo
 * directly is NOT sufficient evidence — all 63 render fine that way, because the
 * demos were never the problem — so this has to run against the live runner.
 */
test('no served item waits for an init the host already sent', async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto('/dev/family-preview/exam');
  await page.getByRole('button', { name: /4th – 5th/ }).click();
  await page.getByRole('button', { name: /Start the assessment/ }).click();

  // The battery must actually start, or everything below would pass vacuously.
  await page.waitForSelector('iframe', { timeout: 30_000 });

  const stuck: string[] = [];
  let observed = 0;

  for (let i = 0; i < ITEMS; i += 1) {
    await page.waitForTimeout(SETTLE_MS);

    const demo = page.frames().find((f) => f !== page.mainFrame());
    if (!demo) break;

    const waiting = await demo
      .evaluate((re) => new RegExp(re, 'i').test(document.body.innerText), WAITING.source)
      .catch(() => true);

    observed += 1;
    if (waiting) stuck.push(demo.url().split('/').pop() ?? 'unknown');

    const skip = page.getByRole('button', { name: /Skip this one/ });
    if ((await skip.count()) === 0) break;
    await skip.click();
  }

  expect(observed, 'no items were observed, so this assertion proves nothing').toBeGreaterThan(5);
  expect(stuck, `stuck waiting for an init the host had already sent: ${stuck.join(', ')}`).toEqual(
    [],
  );
});
