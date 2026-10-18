export type FeedDefinition = {
  url: string;
  category: string;
  country?: string;
  language: string;
};
export type SourceDefinition = {
  id: string;
  name: string;
  type: string;
  endpoint: string;
  license: string;
  feeds?: FeedDefinition[];
};
const tag = 'https://www.tagesschau.de';
const srf = 'https://www.srf.ch';
export const sourceDefinitions: SourceDefinition[] = [
  {
    id: 'usgs',
    name: 'USGS Earthquake Hazards',
    type: 'geojson',
    endpoint: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson',
    license: 'USGS public-domain metadata; attribution retained',
  },
  {
    id: 'eonet',
    name: 'NASA EONET',
    type: 'json',
    endpoint: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=all&days=30&limit=500',
    license: 'NASA EONET metadata; linked third-party content retains original rights',
  },
  {
    id: 'nasa-rss',
    name: 'NASA News',
    type: 'rss',
    endpoint: 'https://www.nasa.gov/feed/',
    license: 'NASA feed metadata only; no full article storage',
    feeds: [{ url: 'https://www.nasa.gov/feed/', category: 'Space', language: 'en' }],
  },
  {
    id: 'srf',
    name: 'SRF Nachrichten',
    type: 'rss',
    endpoint: srf + '/really-simple-syndication-rss-feeds-von-srf',
    license:
      'SRF RSS headlines and original links for this local personal reader. Publisher rights retained; public/commercial redistribution requires permission.',
    feeds: [
      { url: srf + '/news/bnf/rss/1890', category: 'Society', country: 'CH', language: 'de' },
      { url: srf + '/news/bnf/rss/1922', category: 'Geopolitics', language: 'de' },
      { url: srf + '/news/bnf/rss/1926', category: 'Economy', language: 'de' },
      { url: srf + '/sport/bnf/rss/718', category: 'Sports', language: 'de' },
      { url: srf + '/kultur/bnf/rss/454', category: 'Culture', language: 'de' },
      { url: srf + '/bnf/rss/630', category: 'Science', language: 'de' },
    ],
  },
  {
    id: 'tagesschau',
    name: 'tagesschau',
    type: 'rss',
    endpoint: tag + '/infoservices/rssfeeds',
    license:
      'ARD/tagesschau RSS for private non-commercial reading. Publication/commercial use requires publisher authorization. Headlines/links only.',
    feeds: [
      { url: tag + '/inland/index~rss2.xml', category: 'Politics', country: 'DE', language: 'de' },
      { url: tag + '/ausland/index~rss2.xml', category: 'Geopolitics', language: 'de' },
      { url: tag + '/wirtschaft/index~rss2.xml', category: 'Economy', language: 'de' },
      {
        url: tag + '/wirtschaft/technologie/index~rss2.xml',
        category: 'Technology',
        language: 'de',
      },
      { url: tag + '/wissen/index~rss2.xml', category: 'Science', language: 'de' },
      { url: tag + '/wissen/gesundheit/index~rss2.xml', category: 'Health', language: 'de' },
      { url: tag + '/wissen/klima/index~rss2.xml', category: 'Environment', language: 'de' },
    ],
  },
  {
    id: 'heise',
    name: 'heise online',
    type: 'atom',
    endpoint: 'https://www.heise.de/rss/heise-atom.xml',
    license:
      'heise online Atom headlines and original links for local personal reading. Publisher rights retained; no full articles or images stored.',
    feeds: [
      { url: 'https://www.heise.de/rss/heise-atom.xml', category: 'Technology', language: 'de' },
    ],
  },
];
export const connectorEndpoints = Object.fromEntries(
  sourceDefinitions.map((source) => [source.id, source.feeds?.[0]?.url ?? source.endpoint]),
);
export const allowedFeedUrls = new Set(
  sourceDefinitions.flatMap((source) => source.feeds?.map((feed) => feed.url) ?? [source.endpoint]),
);
