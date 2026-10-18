import { describe, it, expect } from 'vitest';
import { portfolioFeed, portfolioRecords, portfolioGet } from '../packages/portfolio/index';
const now = Date.parse('2026-10-18T15:30:00.000Z');
describe('database-free public portfolio', () => {
  it('only exposes clearly labeled fictional records even when live mode is requested', () => {
    const feed = portfolioFeed(new URLSearchParams({ mode: 'live' }), now);
    expect(feed.mode).toBe('demo');
    expect(feed.total).toBe(24);
    expect(
      feed.items.every((event) => event.synthetic && event.title.startsWith('[SYNTHETIC]')),
    ).toBe(true);
    expect(new Set(feed.items.map((event) => event.category)).size).toBeGreaterThan(15);
    expect(feed.items.every((event) => event.sourceUrl === '/about')).toBe(true);
  });
  it('combines CH/DE country context, topics, text search and pagination', () => {
    const swiss = portfolioFeed(new URLSearchParams({ country: 'CH', category: 'Politics' }), now);
    expect(swiss.total).toBe(1);
    expect(swiss.items[0].id).toBe('portfolio-ch-politics');
    const german = portfolioFeed(new URLSearchParams({ country: 'DE', q: 'KI' }), now);
    expect(german.total).toBe(1);
    expect(german.items[0].category).toBe('Artificial Intelligence');
    const paged = portfolioFeed(new URLSearchParams({ pageSize: '2', page: '2' }), now);
    expect(paged.items.length).toBe(2);
    expect(paged.total).toBe(24);
  });
  it('keeps future synthetic revisions out of historical replay', () => {
    const event = portfolioRecords(now)[0];
    const instant = new Date(Date.parse(event.firstDetectedAt) + 1000).toISOString();
    const result = portfolioFeed(new URLSearchParams({ asOf: instant }), now).items.find(
      (row) => row.id === event.id,
    )!;
    expect(result.status).toBe('reported');
    expect(result.relevanceScore).toBe(event.relevanceScore - 10);
    expect(portfolioFeed(new URLSearchParams({ asOf: '2020-01-01T00:00:00Z' }), now).items).toEqual(
      [],
    );
  });
  it('does not place national reports in an unrelated map viewport', () => {
    expect(
      portfolioFeed(new URLSearchParams({ country: 'CH', bbox: '-160,-30,-150,-20' }), now).items,
    ).toEqual([]);
    expect(
      portfolioFeed(new URLSearchParams({ country: 'CH', bbox: '5,45,11,49' }), now).items.length,
    ).toBeGreaterThan(0);
  });
  it('supplies source/evidence contracts without private endpoints or credentials', () => {
    const detail = portfolioGet(['events', 'portfolio-ch-politics'], new URLSearchParams()) as any;
    expect(detail.sources.length).toBe(1);
    expect(detail.versions.length).toBe(2);
    expect(detail.event.synthetic).toBe(true);
    expect(portfolioGet(['admin', 'users'], new URLSearchParams())).toBeNull();
    expect(portfolioGet(['watchlists'], new URLSearchParams())).toBeNull();
    expect(portfolioGet(['system', 'status'], new URLSearchParams())).toMatchObject({
      portfolio: true,
      database: 'not-used',
      queue: 'not-used',
    });
  });
});
