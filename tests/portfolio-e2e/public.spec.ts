import { test, expect } from '@playwright/test';
test('public portfolio runs without storage, external imports or account creation', async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?country=CH');
  await expect(page.locator('.demo-banner')).toContainText('SYNTHETIC DEMO');
  await expect(page.getByLabel('Country filter')).toHaveValue('CH');
  await expect(page.locator('.event-card').first()).toContainText('[SYNTHETIC]');
  await expect(page.getByRole('button', { name: 'Real data', exact: true })).toHaveCount(0);
  await page.getByLabel('Category filter').selectOption('Politics');
  await expect(page.locator('.event-card')).toHaveCount(1);
  await page.locator('.event-card').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save event', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Synthetic dataset', exact: true })).toHaveAttribute(
    'href',
    '/about',
  );
  await page.getByRole('button', { name: 'Close event details' }).click();
  await page.goto('/analytics?country=DE');
  await expect(page.locator('.chart svg')).toBeVisible();
  await page.goto('/connections');
  await expect(page.locator('.graph')).toBeVisible();
  await page.goto('/timeline');
  await page.getByRole('button', { name: 'Restart replay' }).click();
  await expect(page.getByLabel('Replay time')).toHaveValue('0');
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'This edition is read-only' })).toBeVisible();
  const status = await (await request.get('/api/system/status')).json();
  expect(status).toMatchObject({ portfolio: true, database: 'not-used', queue: 'not-used' });
  expect(await (await request.get('/api/auth/get-session')).json()).toBeNull();
  expect(
    (
      await request.post('/api/auth/sign-up/email', {
        data: {
          name: 'Do not create',
          email: 'nobody@example.org',
          password: 'No-real-account-123!',
        },
      })
    ).status(),
  ).toBe(501);
  expect(
    (await request.post('/api/watchlists', { data: { name: 'Not persisted' } })).status(),
  ).toBe(501);
  const feed = await (await request.get('/api/events?mode=live')).json();
  expect(feed.mode).toBe('demo');
  expect(feed.items.every((event: any) => event.synthetic)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?country=DE');
  await expect(page.locator('.event-card').first()).toContainText('[SYNTHETIC]');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('.developer-credit')).toHaveText('Programmiert von Linhard Zejneli');
  expect(errors).toEqual([]);
});
