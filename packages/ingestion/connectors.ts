import { z } from 'zod';
import { normalizedSchema, type NormalizedItem } from '../validation/index';
import { allowedFeedUrls, sourceDefinitions, connectorEndpoints } from './sources';
import { parseNewsFeed } from './news';
export { connectorEndpoints } from './sources';
const safeUrl = z
  .string()
  .url()
  .refine((s) => /^https?:\/\//.test(s));
const usgsFeature = z.object({
  id: z.string(),
  properties: z.object({
    title: z.string(),
    place: z.string().nullable(),
    mag: z.number().nullable(),
    time: z.number(),
    updated: z.number(),
    url: safeUrl,
    status: z.string().optional(),
  }),
  geometry: z.object({
    type: z.literal('Point'),
    coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90), z.number()]),
  }),
});
const eonetEvent = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  link: safeUrl,
  closed: z.string().nullable(),
  categories: z.array(z.object({ id: z.string(), title: z.string() })),
  sources: z.array(z.object({ id: z.string(), url: safeUrl })),
  geometry: z
    .array(
      z.object({
        date: z.string(),
        type: z.enum(['Point', 'Polygon']),
        coordinates: z.unknown(),
        magnitudeValue: z.number().nullable().optional(),
      }),
    )
    .min(1),
});
export function normalizeUSGS(value: unknown): NormalizedItem {
  const x = usgsFeature.parse(value);
  const [longitude, latitude] = x.geometry.coordinates;
  return normalizedSchema.parse({
    externalId: x.id,
    title: x.properties.title,
    summary: `USGS reports ${x.properties.title}. ${x.properties.status === 'reviewed' ? 'The origin has been reviewed by USGS.' : 'The origin is preliminary and may be revised.'} Magnitude and position are provider estimates.`,
    category: 'Natural Disasters',
    status: 'reported',
    occurredAt: new Date(x.properties.time).toISOString(),
    sourceUrl: x.properties.url,
    locationName: x.properties.place ?? 'Location not named by source',
    latitude,
    longitude,
    precision: 'reported_point',
    magnitude: x.properties.mag,
    relevanceScore: Math.min(100, Math.max(5, (x.properties.mag ?? 0) * 12)),
    geometry: x.geometry,
    raw: x,
  });
}
export function normalizeEONET(value: unknown): NormalizedItem {
  const x = eonetEvent.parse(value);
  const geo = [...x.geometry].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
  const point =
    geo.type === 'Point'
      ? z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]).parse(geo.coordinates)
      : null;
  return normalizedSchema.parse({
    externalId: x.id,
    title: x.title,
    summary:
      (x.description ?? '').slice(0, 1600) ||
      `NASA EONET catalogues this ${x.categories.map((c) => c.title.toLowerCase()).join(', ')} event. EONET status: ${x.closed ? 'closed' : 'open'}. Check original source links for details and revisions.`,
    category: x.categories.some((c) =>
      ['wildfires', 'severeStorms', 'volcanoes', 'earthquakes', 'floods', 'landslides'].includes(
        c.id,
      ),
    )
      ? 'Natural Disasters'
      : 'Environment',
    status: x.closed ? 'resolved' : 'developing',
    occurredAt: new Date(x.geometry[0].date).toISOString(),
    sourceUrl: x.link,
    locationName: x.title,
    latitude: point?.[1] ?? null,
    longitude: point?.[0] ?? null,
    precision: point ? 'reported_point' : 'reported_area',
    magnitude: null,
    relevanceScore: 50,
    geometry: { type: geo.type, coordinates: geo.coordinates },
    raw: x,
  });
}
export async function fetchBounded(url: string) {
  if (!allowedFeedUrls.has(url)) throw new Error('Endpoint is not allowlisted');
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    redirect: 'error',
    headers: {
      'User-Agent': 'SIGNAL/0.1 (public metadata research)',
      Accept: 'application/json, application/rss+xml, text/xml',
    },
  });
  if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Empty response');
  let size = 0;
  const parts: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 12_000_000) {
      await reader.cancel();
      throw new Error('Response exceeds 12 MB');
    }
    parts.push(value);
  }
  return Buffer.concat(parts).toString('utf8');
}
export async function fetchConnector(id: string) {
  const definition = sourceDefinitions.find((source) => source.id === id);
  if (definition?.feeds) {
    const deduped = new Map<string, NormalizedItem>();
    const feedErrors: string[] = [];
    let rejected = 0,
      successful = 0;
    for (const feed of definition.feeds) {
      try {
        const result = parseNewsFeed(await fetchBounded(feed.url), feed);
        successful++;
        rejected += result.rejected;
        for (const item of result.items) {
          const existing = deduped.get(item.externalId);
          if (!existing) {
            deduped.set(item.externalId, item);
            continue;
          }
          const refs = [
            ...existing.countryBasis,
            ...item.countryBasis.filter((ref) => !existing.countryCodes.includes(ref.code)),
          ];
          const merged = {
            ...existing,
            countryCodes: refs.map((ref) => ref.code),
            countryBasis: refs,
            precision: refs.length ? 'country' : 'unknown',
            locationName: refs.length
              ? refs.map((ref) => ref.code).join(', ')
              : existing.locationName,
          };
          if (!['Society', 'Politics', 'Geopolitics', 'Science', 'Economy'].includes(feed.category))
            merged.category = item.category;
          deduped.set(item.externalId, normalizedSchema.parse(merged));
        }
      } catch (error) {
        feedErrors.push(feed.url + ': ' + (error as Error).message);
      }
    }
    if (!successful) throw new Error(feedErrors.join('; '));
    return { items: [...deduped.values()], rejected, feedErrors };
  }
  const endpoint = connectorEndpoints[id];
  if (!endpoint) throw new Error('Unknown connector');
  const body = await fetchBounded(endpoint);
  const items: NormalizedItem[] = [];
  let rejected = 0;
  {
    const parsed = JSON.parse(body);
    const raw = z
      .array(z.unknown())
      .max(5000)
      .parse(id === 'usgs' ? parsed.features : parsed.events);
    for (const i of raw) {
      try {
        items.push(id === 'usgs' ? normalizeUSGS(i) : normalizeEONET(i));
      } catch {
        rejected++;
      }
    }
  }
  return { items, rejected, feedErrors: [] as string[] };
}
