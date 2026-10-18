import { test, expect } from '@playwright/test';
test('map, real/demo separation, filters, search, details and responsive navigation', async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Global overview' })).toBeVisible();
  await expect(page.locator('.maplibregl-canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Synthetic demo', exact: true }).click();
  await expect(page.locator('.demo-banner')).toContainText('SYNTHETIC DEMO');
  await expect(page.locator('.event-card').first()).toContainText('[SYNTHETIC]');
  await page.getByLabel('Category filter').selectOption('Space');
  await expect(page.locator('.event-card')).toHaveCount(1);
  await page.locator('.event-card').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Original source' })).toHaveAttribute(
    'href',
    /example.org/,
  );
  await page.getByRole('button', { name: 'Close event details' }).click();
  await page.goto('/search');
  await page.getByLabel('Search collected events').fill('orbital');
  await expect(page.locator('.event-card')).toHaveCount(1);
  await page.goto('/connections');
  await expect(page.getByRole('heading', { name: 'Connection graph' })).toBeVisible();
  await page.goto('/analytics');
  await expect(page.getByRole('heading', { name: 'Data analytics' })).toBeVisible();
  await expect(page.locator('.chart svg')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.locator('.sidebar.mobile-open')).toBeVisible();
  await page.getByRole('link', { name: 'Sources', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Source network' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
  const bad = await request.get('/api/events?bbox=0,-95,10,90');
  expect(bad.status()).toBe(400);
  expect((await request.get('/api/admin/users')).status()).toBe(401);
});
test('registration, login, watchlist ownership, saved events and administrator denial', async ({
  page,
  request,
}) => {
  const email = `qa-${Date.now()}@example.org`,
    password = 'Synthetic-test-passphrase-489!';
  await page.goto('/register');
  await page.getByLabel('Name', { exact: true }).fill('Synthetic QA account');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto('/watchlists');
  await page.getByLabel('Watchlist name').fill('Synthetic QA watchlist');
  await page.getByLabel('Keyword or phrase').fill('Alaska');
  await page.getByRole('button', { name: 'Create watchlist' }).click();
  await expect(
    page.getByRole('heading', { name: 'Synthetic QA watchlist', exact: true }),
  ).toBeVisible();
  await page.goto('/?mode=demo');
  await page.locator('.event-card').first().click();
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('saved');
  await page.getByRole('button', { name: 'Close event details' }).click();
  await page.goto('/saved');
  await expect(page.locator('.saved-card')).toHaveCount(1);
  await page.goto('/assistant');
  await page.getByLabel('Ask SIGNAL').fill('orbital');
  await page.getByRole('button', { name: 'Send question' }).click();
  await expect(page.locator('.answer').filter({ hasText: 'EVIDENCE RETRIEVAL' })).toBeVisible();
  await page.reload();
  await expect(page.locator('.answer').filter({ hasText: 'EVIDENCE RETRIEVAL' })).toContainText(
    'SYNTHETIC DEMO',
  );
  await page.goto('/admin/users');
  await expect(page.getByText('This action requires an administrator.')).toBeVisible();
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3000/');
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  const privateData = await request.get('/api/watchlists');
  expect(privateData.status()).toBe(401);
});
