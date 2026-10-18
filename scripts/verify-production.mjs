import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const base = process.env.VERIFY_URL ?? 'http://127.0.0.1:3001';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  await page.goto(base);
  await page.getByRole('heading', { name: 'Global overview' }).waitFor();
  await page.locator('.event-card').first().waitFor();
  await page.locator('.maplibregl-canvas').waitFor();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.locator('.event-card').first().waitFor();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.locator('.map-canvas[data-map-ready="true"]').waitFor();
  await page.waitForFunction(
    () => Number(document.querySelector('.map-canvas')?.dataset.renderedSignals) > 0,
  );
  await page.screenshot({
    path: 'docs/SIGNAL-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  const stats = await (await context.request.get(base + '/api/analytics/overview')).json();
  const health = await (await context.request.get(base + '/api/system/status')).json();
  assert.equal(health.status, 'ok');
  await page.getByLabel('Country filter').selectOption('CH');
  await page.getByLabel('Category filter').selectOption('Politics');
  await page.locator('.event-card').first().waitFor();
  await page.waitForFunction(() => {
    const tags = [...document.querySelectorAll('.event-card .country-tag')];
    return tags.length > 0 && tags.every((tag) => tag.textContent.includes('Schweiz'));
  });
  await page.locator('.map-canvas[data-map-ready="true"]').waitFor();
  await page.screenshot({
    path: 'docs/SIGNAL-Schweiz.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByLabel('Country filter').selectOption('DE');
  await page.locator('.event-card').first().waitFor();
  await page.waitForFunction(() => {
    const tags = [...document.querySelectorAll('.event-card .country-tag')];
    return tags.length > 0 && tags.every((tag) => tag.textContent.includes('Deutschland'));
  });
  await page.locator('.map-canvas[data-map-ready="true"]').waitFor();
  await page.screenshot({
    path: 'docs/SIGNAL-Deutschland.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByLabel('Category filter').selectOption('');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open navigation' }).waitFor();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({ path: 'docs/SIGNAL-mobile.png', fullPage: true, animations: 'disabled' });
  await context.setOffline(true);
  await page.goto(base + '/settings');
  await page.getByRole('heading', { name: 'Connection unavailable' }).waitFor();
  const cachePaths = await page.evaluate(async () => {
    const paths = [];
    for (const name of await caches.keys())
      for (const request of await (await caches.open(name)).keys())
        paths.push(new URL(request.url).pathname);
    return paths;
  });
  assert(
    cachePaths.every((path) =>
      ['/offline.html', '/icon.svg', '/manifest.webmanifest', '/countries.geojson'].includes(path),
    ),
  );
  assert.equal(
    await page.evaluate(() =>
      fetch('/api/system/status')
        .then(() => true)
        .catch(() => false),
    ),
    false,
  );
  assert.deepEqual(errors, []);
  const report = {
    measuredAt: new Date().toISOString(),
    base,
    productionHttp: true,
    serviceWorkerControlled: true,
    offlineNavigationFallback: true,
    noPrivateOrApiCache: true,
    mobileNoHorizontalOverflow: true,
    pageErrors: errors,
    cachedPaths: cachePaths,
    health,
    liveOverview: stats,
  };
  await writeFile('docs/production-smoke.json', JSON.stringify(report, null, 2) + '\n');
  console.log(
    'Production HTTP, map/feed render, service worker, mobile width and private/API cache exclusions passed.',
  );
} finally {
  await browser.close();
}
