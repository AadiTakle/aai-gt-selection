import { expect, test } from '@playwright/test';

test('renders the linked synthetic application shell', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'GT Admissions architecture shell' }),
  ).toBeVisible();
  await expect(page.getByText(/verify the application boundary/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /Family portal/i })).toBeVisible();
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
  await expect(page).toHaveURL(/\/login\?redirect=/);
});
