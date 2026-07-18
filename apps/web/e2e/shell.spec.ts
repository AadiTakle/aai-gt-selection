import { expect, test } from '@playwright/test';

test('renders the linked synthetic application shell', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByText('Synthetic prototype — not a real admissions decision'),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'GT Admissions architecture shell' }),
  ).toBeVisible();
});

test('reports the local Supabase boundary as ready', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({
    databaseApi: 'ready',
    status: 'ready',
    syntheticOnly: true,
  });
});

test('keeps role surfaces behind the server-side session boundary', async ({ page }) => {
  await page.goto('/family');
  await expect(page).toHaveURL(/\?auth=required$/);
});
