import { categories, categoryColors, type EventRecord } from '../shared/index';
import { countries, countriesInBounds, countryName } from '../shared/countries';
import { filtersSchema } from '../validation/index';
type Scenario = {
  key: string;
  title: string;
  category: string;
  country: string;
  point?: [number, number];
};
const scenarios: Scenario[] = [
  {
    key: 'ch-politics',
    title: 'Schweiz: Modellregion erprobt digitale Bürgerbeteiligung',
    category: 'Politics',
    country: 'CH',
  },
  {
    key: 'de-economy',
    title: 'Deutschland: Planspiel untersucht Kreislaufwirtschaft',
    category: 'Economy',
    country: 'DE',
  },
  {
    key: 'ch-technology',
    title: 'Schweiz: Fiktives Labor testet offene Datenschnittstellen',
    category: 'Technology',
    country: 'CH',
  },
  {
    key: 'de-ai',
    title: 'Deutschland: Beispielprojekt evaluiert transparente KI-Systeme',
    category: 'Artificial Intelligence',
    country: 'DE',
  },
  {
    key: 'ch-economy',
    title: 'Schweiz: Musterbericht vergleicht regionale Innovationsförderung',
    category: 'Economy',
    country: 'CH',
  },
  {
    key: 'de-politics',
    title: 'Deutschland: Fiktiver Bürgerrat entwirft Mobilitätsvorschläge',
    category: 'Politics',
    country: 'DE',
  },
  {
    key: 'gb-security',
    title: 'Grossbritannien: Übung koordiniert die Reaktion auf einen Cybervorfall',
    category: 'Cybersecurity',
    country: 'GB',
  },
  {
    key: 'fr-science',
    title: 'Frankreich: Modelllabor untersucht neue Speicherwerkstoffe',
    category: 'Science',
    country: 'FR',
  },
  {
    key: 'it-culture',
    title: 'Italien: Virtuelle Ausstellung erschliesst ein fiktives Stadtarchiv',
    category: 'Culture',
    country: 'IT',
  },
  {
    key: 'ch-health',
    title: 'Schweiz: Simulation plant barrierefreie Gesundheitsangebote',
    category: 'Health',
    country: 'CH',
  },
  {
    key: 'de-energy',
    title: 'Deutschland: Übung prüft ein regionales Stromnetz',
    category: 'Energy',
    country: 'DE',
  },
  {
    key: 'us-space',
    title: 'USA: Synthetische Mission demonstriert eine Forschungsplattform',
    category: 'Space',
    country: 'US',
    point: [-80.65, 28.57],
  },
  {
    key: 'jp-quake',
    title: 'Japan: Trainingsszenario für eine Erdbebenreaktion',
    category: 'Natural Disasters',
    country: 'JP',
    point: [139.76, 35.68],
  },
  {
    key: 'nl-flood',
    title: 'Niederlande: Planspiel zur Küsten- und Hochwasservorsorge',
    category: 'Environment',
    country: 'NL',
    point: [4.9, 52.37],
  },
  {
    key: 'ke-health',
    title: 'Kenia: Fiktive Übung zur medizinischen Zusammenarbeit',
    category: 'Health',
    country: 'KE',
    point: [36.82, -1.29],
  },
  {
    key: 'ch-transport',
    title: 'Schweiz: Modellfahrplan verbindet eine autofreie Beispielregion',
    category: 'Transportation',
    country: 'CH',
  },
  {
    key: 'de-infrastructure',
    title: 'Deutschland: Musterprojekt untersucht resiliente Infrastruktur',
    category: 'Infrastructure',
    country: 'DE',
  },
  {
    key: 'br-forest',
    title: 'Brasilien: Synthetische Waldbeobachtung vergleicht Messverfahren',
    category: 'Environment',
    country: 'BR',
    point: [-62.22, -3.47],
  },
  {
    key: 'fr-finance',
    title: 'Frankreich: Fiktive Studie vergleicht nachhaltige Finanzierungsmodelle',
    category: 'Finance',
    country: 'FR',
  },
  {
    key: 'ch-sports',
    title: 'Schweiz: Simuliertes Sportfestival erprobt inklusive Angebote',
    category: 'Sports',
    country: 'CH',
  },
  {
    key: 'au-society',
    title: 'Australien: Planspiel zur gemeinschaftlichen Stadtentwicklung',
    category: 'Society',
    country: 'AU',
  },
  {
    key: 'ua-dialogue',
    title: 'Ukraine: Fiktives Szenario illustriert diplomatische Gesprächsformate',
    category: 'Geopolitics',
    country: 'UA',
  },
  {
    key: 'no-conflict',
    title: 'Norwegen: Trainingsübung modelliert Konfliktvermittlung',
    category: 'Conflicts',
    country: 'NO',
  },
  {
    key: 'sg-technology',
    title: 'Singapur: Fiktives Entwicklungsteam erprobt sichere Cloud-Dienste',
    category: 'Technology',
    country: 'SG',
    point: [103.82, 1.35],
  },
];
export function portfolioRecords(now = Date.now()): EventRecord[] {
  const base = Math.floor(now / 3600000) * 3600000;
  return scenarios.map((scenario, index) => {
    const occurredAt = new Date(base - index * 2 * 3600000).toISOString();
    const title = '[SYNTHETIC] ' + scenario.title;
    return {
      id: 'portfolio-' + scenario.key,
      title,
      summary:
        'Erfundenes Portfolio-Beispiel, keine echte Nachricht. Alle Aussagen, Abläufe und Zeitstempel dienen ausschliesslich der Demonstration. Kartenpunkte sind illustrative Übungsorte.',
      category: scenario.category,
      status: index % 4 === 0 ? 'developing' : 'reported',
      verificationStatus: 'synthetic_exercise',
      relevanceScore: 85 - index * 2,
      occurredAt,
      firstDetectedAt: new Date(Date.parse(occurredAt) - 6 * 3600000).toISOString(),
      lastUpdatedAt: new Date(Date.parse(occurredAt) + 30 * 60000).toISOString(),
      locationName: countryName(scenario.country),
      countryCode: scenario.country,
      countryCodes: [scenario.country],
      countryBasis: [{ code: scenario.country, basis: 'headline_mention', evidence: title }],
      timeBasis: scenario.point ? 'provider_event' : 'publication',
      latitude: scenario.point?.[1] ?? null,
      longitude: scenario.point?.[0] ?? null,
      precision: scenario.point ? 'illustrative_point' : 'country',
      sourceId: scenario.point ? 'demo-observatory' : 'demo-newsroom',
      sourceName: scenario.point ? 'SIGNAL · Synthetic observatory' : 'SIGNAL · Fictional newsroom',
      sourceUrl: '/about',
      sourceCount: 1,
      magnitude: null,
      synthetic: true,
      geometry: scenario.point ? { type: 'Point', coordinates: scenario.point } : undefined,
    };
  });
}
function snapshots(event: EventRecord) {
  return [
    {
      id: event.id + '-v1',
      recorded_at: event.firstDetectedAt,
      snapshot: {
        ...event,
        lastUpdatedAt: event.firstDetectedAt,
        status: 'reported',
        relevanceScore: Math.max(0, event.relevanceScore - 10),
      },
      content_hash: 'synthetic-initial',
    },
    {
      id: event.id + '-v2',
      recorded_at: event.lastUpdatedAt,
      snapshot: event,
      content_hash: 'synthetic-revision',
    },
  ];
}
export function portfolioFeed(params: URLSearchParams, now = Date.now()) {
  const f = filtersSchema.parse(Object.fromEntries(params));
  let items = portfolioRecords(now);
  if (f.asOf)
    items = items.flatMap((event) => {
      const versions = snapshots(event).filter(
        (version) => Date.parse(version.recorded_at) <= Date.parse(f.asOf!),
      );
      return versions.length ? [versions.at(-1)!.snapshot] : [];
    });
  const bounds = f.bbox?.split(',').map(Number),
    countryAreas = bounds ? countriesInBounds(bounds) : [];
  items = items.filter((event) => {
    if (f.country && !event.countryCodes?.includes(f.country.toUpperCase())) return false;
    if (f.category && !f.category.split(',').includes(event.category)) return false;
    if (f.source && f.source !== event.sourceId) return false;
    if (f.from && Date.parse(event.occurredAt) < Date.parse(f.from)) return false;
    if (f.to && Date.parse(event.occurredAt) > Date.parse(f.to)) return false;
    if (
      f.q &&
      !(event.title + ' ' + event.summary + ' ' + event.category + ' ' + event.locationName)
        .toLowerCase()
        .includes(f.q.toLowerCase())
    )
      return false;
    if (bounds) {
      const [west, south, east, north] = bounds;
      if (event.latitude !== null && event.longitude !== null) {
        if (
          event.latitude < south ||
          event.latitude > north ||
          (west <= east
            ? event.longitude < west || event.longitude > east
            : event.longitude < west && event.longitude > east)
        )
          return false;
      } else if (!event.countryCodes?.some((code) => countryAreas.includes(code))) return false;
    }
    return true;
  });
  items.sort((a, b) =>
    f.sort === 'relevance'
      ? b.relevanceScore - a.relevanceScore
      : f.sort === 'oldest'
        ? Date.parse(a.occurredAt) - Date.parse(b.occurredAt)
        : Date.parse(b.occurredAt) - Date.parse(a.occurredAt),
  );
  return {
    items: items.slice((f.page - 1) * f.pageSize, f.page * f.pageSize),
    total: items.length,
    page: f.page,
    pageSize: f.pageSize,
    mode: 'demo' as const,
    asOf: f.asOf ?? new Date(now).toISOString(),
    synthetic: true,
    portfolio: true,
  };
}
function sourceRows() {
  return ['demo-newsroom', 'demo-observatory'].map((id, index) => ({
    id,
    name: index ? 'SIGNAL · Synthetic observatory' : 'SIGNAL · Fictional newsroom',
    type: 'synthetic',
    endpoint: '/about',
    enabled: true,
    status: 'synthetic',
    last_success: null,
    last_attempt: null,
    error: null,
    poll_interval: 0,
    license:
      'Original fictional scenarios created for this portfolio. No real reporting, news feed, or live import.',
  }));
}
export function portfolioGet(path: string[], params: URLSearchParams) {
  const route = path.join('/'),
    now = Date.now();
  if (['events', 'search', 'map/events'].includes(route)) return portfolioFeed(params, now);
  if (route === 'categories')
    return categories.map((id) => ({ id, color: categoryColors[id] ?? '#818cf8', icon: 'Globe' }));
  if (route === 'sources') return sourceRows();
  if (route === 'countries')
    return countries.map((country) => ({
      ...country,
      count: portfolioRecords(now).filter((event) => event.countryCodes?.includes(country.code))
        .length,
    }));
  if (route === 'system/status')
    return {
      status: 'demo',
      portfolio: true,
      database: 'not-used',
      queue: 'not-used',
      ai: 'not-used',
      extensions: [],
      synthetic: true,
      time: new Date(now).toISOString(),
    };
  if (route.startsWith('events/')) {
    const event = portfolioRecords(now).find((event) => event.id === path[1]);
    if (!event) return null;
    const sources = [
      {
        id: 'article-' + event.id,
        title: event.title,
        canonical_url: '/about',
        published_at: event.occurredAt,
        fetched_at: event.firstDetectedAt,
        name: event.sourceName,
        license: 'Synthetic demonstration data. Not a real source or independent evidence.',
      },
    ];
    const versions = snapshots(event);
    if (path[2] === 'sources') return sources;
    if (path[2] === 'timeline') return versions;
    if (path[2] === 'relations') return [];
    if (path.length !== 2) return null;
    return {
      event,
      sources,
      versions,
      claims: [
        {
          id: 'claim-' + event.id,
          claim: event.title,
          verification_status: 'synthetic_exercise',
          canonical_url: '/about',
        },
      ],
      related: portfolioRecords(now)
        .filter((other) => other.id !== event.id && other.countryCode === event.countryCode)
        .slice(0, 3),
      relatedReason: 'Shared synthetic country context only; no actual connection or causality.',
      portfolio: true,
    };
  }
  if (route.startsWith('analytics/')) {
    const all = portfolioFeed(
      new URLSearchParams({ ...Object.fromEntries(params), pageSize: '500', page: '1' }),
      now,
    ).items;
    const counts = (field: 'category' | 'sourceName') =>
      [...new Set(all.map((event) => event[field]))].map((value) => ({
        [field === 'category' ? 'category' : 'name']: value,
        count: all.filter((event) => event[field] === value).length,
      }));
    if (path[1] === 'overview')
      return {
        total: all.length,
        today: all.filter(
          (event) => event.occurredAt.slice(0, 10) === new Date(now).toISOString().slice(0, 10),
        ).length,
        developing: all.filter((event) => event.status === 'developing').length,
        sources: new Set(all.map((event) => event.sourceId)).size,
        countries: new Set(all.flatMap((event) => event.countryCodes ?? [])).size,
        mapped: all.filter((event) => event.latitude !== null).length,
        latest: all[0]?.lastUpdatedAt ?? null,
        earliest: all.at(-1)?.occurredAt ?? null,
        mode: 'demo',
        asOf: new Date(now).toISOString(),
        basis:
          'Filtered synthetic portfolio scenarios only. Simulated timestamps use a relative demo clock.',
      };
    if (path[1] === 'activity') {
      const end = Math.floor(now / 3600000) * 3600000;
      return Array.from({ length: 48 }, (_, index) => {
        const at = end - (47 - index) * 3600000;
        return {
          hour: new Date(at).toISOString(),
          count: all.filter(
            (event) =>
              Date.parse(event.occurredAt) >= at && Date.parse(event.occurredAt) < at + 3600000,
          ).length,
        };
      });
    }
    if (path[1] !== 'trends') return null;
    return {
      daily: [...new Set(all.map((event) => event.occurredAt.slice(0, 10)))]
        .sort()
        .map((day) => ({
          day,
          count: all.filter((event) => event.occurredAt.startsWith(day)).length,
        })),
      categories: counts('category'),
      sources: counts('sourceName'),
    };
  }
  if (route === 'map/clusters')
    return {
      items: [],
      coverage: 'Portfolio uses client-side MapLibre clustering and national context areas.',
      portfolio: true,
    };
  return null;
}
