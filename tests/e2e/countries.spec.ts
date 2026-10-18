import 'dotenv/config';
import { test, expect } from './database-fixture';
import { randomUUID } from 'node:crypto';
import { query } from '../../packages/database/index';
import { persistItem } from '../../packages/ingestion/index';
const suffix = randomUUID(),
  keys = ['country-ch-' + suffix, 'country-de-' + suffix];
test('country and topic filters drive feed, map, analytics and shared URLs; footer credit remains visible on mobile', async ({
  page,
  request,
}) => {
  for (const [index, code, category] of [
    [0, 'CH', 'Economy'],
    [1, 'DE', 'Politics'],
  ] as const) {
    await persistItem(
      'demo',
      {
        externalId: keys[index],
        title: `[SYNTHETIC] ${code === 'CH' ? 'Schweiz Wirtschaft' : 'Deutschland Politik'} ${suffix}`,
        summary: 'Explicitly synthetic country filter test.',
        category,
        status: 'reported',
        occurredAt: new Date().toISOString(),
        sourceUrl: 'https://example.org/synthetic-country-' + index,
        locationName: code,
        latitude: null,
        longitude: null,
        precision: 'country',
        countryCodes: [code],
        countryBasis: [
          { code, basis: 'source_section', evidence: 'Synthetic domestic feed fixture' },
        ],
        timeBasis: 'publication',
        magnitude: null,
        relevanceScore: 1,
        raw: { synthetic: true },
      },
      true,
    );
  }
  try {
    await page.goto('/?mode=demo&country=CH');
    await expect(page.getByLabel('Country filter')).toHaveValue('CH');
    await page.getByLabel('Category filter').selectOption('Economy');
    await expect(page.locator('.event-card')).toHaveCount(1);
    await expect(page.locator('.event-card')).toContainText('Schweiz Wirtschaft');
    await expect(page.locator('.map-count')).toContainText('Schweiz');
    await expect(page.locator('.map-canvas')).toHaveAttribute('data-map-ready', 'true');
    await expect(page.locator('.developer-credit')).toHaveText('Programmiert von Linhard Zejneli');
    const stats = await (
      await request.get('/api/analytics/overview?mode=demo&country=CH&category=Economy')
    ).json();
    expect(stats.total).toBe(1);
    await page.getByLabel('Category filter').selectOption('Politics');
    await page.getByLabel('Country filter').selectOption('DE');
    await expect(page.locator('.event-card')).toHaveCount(1);
    await expect(page.locator('.event-card')).toContainText('Deutschland Politik');
    const outside = await (
      await request.get('/api/map/events?mode=demo&country=CH&bbox=-160,-30,-150,-20')
    ).json();
    expect(outside.items).toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/live?mode=demo&country=CH');
    await expect(page.getByLabel('Country filter')).toHaveValue('CH');
    await expect(page.locator('.event-card')).toHaveCount(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(page.locator('.developer-credit')).toBeVisible();
  } finally {
    for (const key of keys) {
      await query('DELETE FROM events WHERE id=$1 AND synthetic=true', ['demo-' + key]);
      await query('DELETE FROM articles WHERE id=$1', ['article-demo-' + key]);
      await query("DELETE FROM raw_items WHERE source_id='demo' AND external_id=$1", [key]);
    }
  }
});
