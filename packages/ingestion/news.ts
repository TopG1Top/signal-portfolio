import { createHash } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import { normalizedSchema, type NormalizedItem } from '../validation/index';
import { headlineCountries } from '../shared/countries';
import { canonicalUrl } from '../intelligence/index';
import type { FeedDefinition } from './sources';
const text = (value: unknown): string => {
  const raw =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)['#text']
      : value;
  return String(raw ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    })
    .trim();
};
export function classifyNews(title: string, url: string, fallback: string) {
  const value = (title + ' ' + new URL(url).pathname).toLowerCase();
  // A publisher's dedicated section takes precedence; headline rules refine broad feeds.
  if (
    /cyber|ransomware|datenleck|sicherheitsluck|sicherheitslück|schadsoftware|phishing|hackerangriff|security/.test(
      value,
    )
  )
    return 'Cybersecurity';
  if (
    /künstliche intelligenz|kunstliche intelligenz|artificial intelligence|\bki\b|\bllm\b|chatgpt|openai/.test(
      value,
    )
  )
    return 'Artificial Intelligence';
  if (['Sports', 'Culture', 'Space', 'Health', 'Environment', 'Technology'].includes(fallback))
    return fallback;
  if (/krieg|ukraine|waffenstillstand|luftangriff|militär|militar|\bwar\b|gaza|raketen/.test(value))
    return 'Conflicts';
  if (/gesundheit|medizin|impf|krankenhaus|pandemie|\bkrebs\b/.test(value)) return 'Health';
  if (/klima|umwelt|biodivers|co2|erderwarm|erderwärm/.test(value)) return 'Environment';
  if (
    /software|computer|internet|smartphone|digital|microsoft|apple|google|chip|technologie/.test(
      value,
    )
  )
    return 'Technology';
  if (/börs|bors|aktien|banken|zinsen|bitcoin|finanzen/.test(value)) return 'Finance';
  if (
    /wirtschaft|konjunktur|inflation|handel|zoll|zölle|unternehmen|arbeitslos|lohn|\bbip\b|industrie/.test(
      value,
    )
  )
    return 'Economy';
  if (/energie|strom|gaspreis|atomkraft/.test(value)) return 'Energy';
  if (
    /wahl|parlament|regierung|bundesrat|bundestag|abstimmung|präsident|prasident|politik|minister|partei|kanzler/.test(
      value,
    )
  )
    return 'Politics';
  if (/bahn|flughafen|verkehr|autobahn/.test(value)) return 'Transportation';
  if (/gesellschaft/.test(value)) return 'Society';
  return fallback;
}
export function parseNewsFeed(
  xml: string,
  feed: FeedDefinition,
): { items: NormalizedItem[]; rejected: number } {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('XML entities are prohibited');
  const parsed = new XMLParser({
    ignoreAttributes: false,
    processEntities: false,
    parseTagValue: false,
  }).parse(xml);
  const entries = parsed?.rss?.channel?.item ?? parsed?.feed?.entry;
  if (entries === undefined) throw new Error('Expected RSS or Atom entries');
  const items: NormalizedItem[] = [];
  let rejected = 0;
  for (const entry of (Array.isArray(entries) ? entries : [entries]).slice(0, 200)) {
    try {
      const links = Array.isArray(entry.link) ? entry.link : [entry.link];
      const link = links.find(
        (link: any) =>
          typeof link === 'string' || !link?.['@_rel'] || link['@_rel'] === 'alternate',
      );
      const sourceUrl = canonicalUrl(text(typeof link === 'object' ? link['@_href'] : link));
      const title = text(entry.title).slice(0, 600);
      const published = text(entry.pubDate ?? entry.published ?? entry.updated);
      if (!published) throw new Error('Feed item has no publication timestamp');
      const refs = headlineCountries(title, feed.country);
      const locationName = refs.length
        ? refs.map((ref) => ref.code).join(', ')
        : 'Country not specified in headline';
      const category = classifyNews(title, sourceUrl, feed.category);
      items.push(
        normalizedSchema.parse({
          externalId:
            feed.url === 'https://www.nasa.gov/feed/'
              ? text(entry.guid ?? entry.id) || sourceUrl
              : createHash('sha256').update(sourceUrl).digest('hex'),
          title,
          summary:
            'RSS/Atom headline metadata. Open the original source for the full report. Category and country tags are derived from the publisher section or explicit headline terms; no exact location is asserted.',
          category,
          status: 'reported',
          occurredAt: new Date(published).toISOString(),
          sourceUrl,
          locationName,
          latitude: null,
          longitude: null,
          precision: refs.length ? 'country' : 'unknown',
          magnitude: null,
          relevanceScore: 50,
          language: feed.language,
          timeBasis: 'publication',
          countryCodes: refs.map((ref) => ref.code),
          countryBasis: refs,
          raw: {
            title,
            link: sourceUrl,
            published,
            feedUrl: feed.url,
            category,
            countryBasis: refs,
          },
        }),
      );
    } catch {
      rejected++;
    }
  }
  return { items, rejected };
}
