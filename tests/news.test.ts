import { describe, it, expect } from 'vitest';
import { parseNewsFeed, classifyNews } from '../packages/ingestion/news';
import { headlineCountries, countriesInBounds } from '../packages/shared/countries';
import { fetchBounded } from '../packages/ingestion/connectors';
const feed = {
  url: 'https://www.srf.ch/news/bnf/rss/1890',
  category: 'Society',
  country: 'CH',
  language: 'de',
};
const rss = (title: string, extra = '') =>
  `<rss><channel><item><title>${title}</title><link>https://example.org/synthetic?utm_source=qa</link><pubDate>Sun, 18 Oct 2026 12:00:00 +0200</pubDate>${extra}</item></channel></rss>`;
describe('headline-only news connectors', () => {
  it('keeps title, original URL, publication time and evidenced country scope without storing article text', () => {
    const result = parseNewsFeed(
      rss(
        'Schweiz: Regierung debattiert',
        '<content:encoded>SYNTHETIC FULL ARTICLE MUST NOT BE STORED</content:encoded>',
      ),
      feed,
    );
    expect(result.rejected).toBe(0);
    const item = result.items[0];
    expect(item.category).toBe('Politics');
    expect(item.countryCodes).toEqual(['CH']);
    expect(item.countryBasis[0].basis).toBe('source_section');
    expect(item.latitude).toBeNull();
    expect(item.longitude).toBeNull();
    expect(item.precision).toBe('country');
    expect(item.timeBasis).toBe('publication');
    expect(item.occurredAt).toBe('2026-10-18T10:00:00.000Z');
    expect(item.sourceUrl).toBe('https://example.org/synthetic');
    expect(JSON.stringify(item)).not.toContain('FULL ARTICLE');
  });
  it('parses Atom attributes, preserves Unicode and uses stable canonical article identities', () => {
    const atom =
      '<feed xmlns="http://www.w3.org/2005/Atom"><entry><title type="html">Schweiz &amp; Deutschland: Software</title><link rel="alternate" href="https://example.org/synthetic"/><published>2026-10-18T12:00:00+02:00</published><content>PRIVATE FULL TEXT</content></entry></feed>';
    const a = parseNewsFeed(atom, { ...feed, country: undefined, category: 'Technology' }).items[0];
    expect(a.title).toContain('Schweiz & Deutschland');
    expect(a.countryCodes).toEqual(expect.arrayContaining(['CH', 'DE']));
    expect(a.externalId).toBe(parseNewsFeed(rss('Synthetic title'), feed).items[0].externalId);
    expect(JSON.stringify(a)).not.toContain('PRIVATE FULL TEXT');
  });
  it('does not infer countries from ordinary word fragments or publisher nationality', () => {
    expect(headlineCountries('Kinder lesen weniger Romane')).toEqual([]);
    expect(headlineCountries('New software release')).toEqual([]);
    expect(
      headlineCountries('Schweiz und Deutschland beraten mit den USA').map((ref) => ref.code),
    ).toEqual(expect.arrayContaining(['CH', 'DE', 'US']));
  });
  it('rejects external XML entities, unsafe links and missing dates', () => {
    expect(() =>
      parseNewsFeed(
        '<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///private">]>' + rss('Synthetic'),
        feed,
      ),
    ).toThrow('XML entities');
    expect(
      parseNewsFeed(
        rss('Synthetic').replace(
          'https://example.org/synthetic?utm_source=qa',
          'javascript:alert(1)',
        ),
        feed,
      ).rejected,
    ).toBe(1);
    expect(
      parseNewsFeed(rss('Synthetic').replace(/<pubDate>.*?<\/pubDate>/, ''), feed).rejected,
    ).toBe(1);
  });
  it('refines technology and business sections without inventing factual summaries', () => {
    expect(
      classifyNews('Ransomware trifft Unternehmen', 'https://example.org/a', 'Technology'),
    ).toBe('Cybersecurity');
    expect(classifyNews('Neue KI-Modelle', 'https://example.org/a', 'Technology')).toBe(
      'Artificial Intelligence',
    );
    expect(classifyNews('Neue Konjunkturprognose', 'https://example.org/a', 'Economy')).toBe(
      'Economy',
    );
  });
  it('bounds national map context and keeps the SSRF allowlist closed', async () => {
    expect(countriesInBounds([6, 45, 11, 48])).toContain('CH');
    expect(countriesInBounds([-160, -30, -150, -20])).not.toContain('CH');
    await expect(fetchBounded('http://127.0.0.1/private')).rejects.toThrow('allowlisted');
  });
});
