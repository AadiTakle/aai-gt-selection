import { expect, test } from '@playwright/test';

/**
 * End-to-end Ascend demo flow (D-016, R11): intro -> $15 payment (skipped) ->
 * real adaptive battery served by the CAT engine + wired question-type demos ->
 * results with a 0-100 Ascend Score. Drives each embedded item through its
 * same-origin `__gtAnswer` test hook. Requires local Supabase + `pnpm db:users`.
 * If the synthetic proctor session can't be established, the battery surfaces a
 * clear error and the test fails loudly (never false-green).
 */
test.describe('Ascend adaptive assessment — full demo flow', () => {
  test('payment -> skip -> adaptive battery -> results score', async ({ page }) => {
    test.setTimeout(360_000);
    await page.context().clearCookies();

    await page.goto('/ascend');

    // R10 claim boundary is always present.
    await expect(page.getByText(/not a validated determination/i).first()).toBeVisible();

    // Intro -> payment.
    await page.getByRole('button', { name: /start the ascend assessment/i }).click();
    await expect(page.getByRole('heading', { name: /pay the ascend fee/i })).toBeVisible();

    // Skip payment (demo) -> battery.
    await page.getByRole('button', { name: /skip \(demo\)/i }).click();

    const scoreLabel = page.getByText('Ascend Score', { exact: true });
    const errorHeading = page.getByRole('heading', { name: /synthetic snag/i });

    // Drive each embedded item via its same-origin __gtAnswer hook until the
    // session completes (results) or the flow errors.
    const deadline = Date.now() + 320_000;
    let done = false;
    while (Date.now() < deadline) {
      if (await scoreLabel.isVisible().catch(() => false)) {
        done = true;
        break;
      }
      if (await errorHeading.isVisible().catch(() => false)) {
        const message = await page.locator('p').filter({ hasText: /proctor|session|snag|failed/i }).first().textContent();
        throw new Error(`Ascend flow errored: ${message ?? 'unknown error'}`);
      }
      // Drive the current item from inside its own (same-origin) demo frame.
      const frame = page.frames().find((f) => f.url().includes('/exam-demos/'));
      if (frame) {
        await frame
          .evaluate(() => {
            const w = window as unknown as { __gtAnswer?: (c: boolean) => boolean };
            if (typeof w.__gtAnswer === 'function') w.__gtAnswer(true);
          })
          .catch(() => {
            /* frame mid-reload between items */
          });
      }
      await page.waitForTimeout(300);
    }

    expect(done, 'reached the Ascend results screen').toBe(true);

    // Results: a 0-100 score, a recommendation, per-domain breakdown, telemetry.
    const score = Number(await page.locator('[class*="scoreValue"]').first().textContent());
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);

    await expect(page.getByText('Per-domain breakdown')).toBeVisible();
    await expect(page.getByText('Collected telemetry')).toBeVisible();
    await expect(
      page.getByText(/Prototype — synthetic, not a validated determination/i),
    ).toBeVisible();

    // Applicant-safe labels only: the recommendation is one of the relabeled set.
    const recPill = page.locator('[class*="recPill"]').first();
    await expect(recPill).toHaveText(/Recommended|Review|Retry/);

    // Compliance: never surface an admission "admit/admitted" label to the family.
    await expect(recPill).not.toHaveText(/admit/i);
  });
});
