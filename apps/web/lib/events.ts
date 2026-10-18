import { countriesInBounds } from '../../../packages/shared/countries';
import { query } from '../../../packages/database/index';
import { filtersSchema } from '../../../packages/validation/index';
import type { EventRecord } from '../../../packages/shared/index';
export const eventSelect = `SELECT e.id,e.title,e.summary,e.category,e.status,e.verification_status AS "verificationStatus",e.relevance_score AS "relevanceScore",e.occurred_at AS "occurredAt",e.first_detected_at AS "firstDetectedAt",e.last_updated_at AS "lastUpdatedAt",e.source_id AS "sourceId",e.magnitude,e.synthetic,e.time_basis AS "timeBasis",l.name AS "locationName",l.country_code AS "countryCode",l.country_codes AS "countryCodes",l.country_basis AS "countryBasis",l.latitude,l.longitude,l.precision,l.geojson AS geometry,s.name AS "sourceName",(SELECT canonical_url FROM articles a JOIN event_articles ea ON ea.article_id=a.id WHERE ea.event_id=e.id ORDER BY a.published_at LIMIT 1) AS "sourceUrl",(SELECT count(DISTINCT a.source_id)::int FROM articles a JOIN event_articles ea ON ea.article_id=a.id WHERE ea.event_id=e.id) AS "sourceCount" FROM events e JOIN news_sources s ON s.id=e.source_id LEFT JOIN event_locations l ON l.event_id=e.id`;
export async function listEvents(params: URLSearchParams) {
  const f = filtersSchema.parse(Object.fromEntries(params));
  const values: unknown[] = [f.mode === 'demo'];
  const where = ['e.synthetic=$1', 'e.merged_into IS NULL'];
  const add = (v: unknown) => {
    values.push(v);
    return '$' + values.length;
  };
  let semanticOrder = '';
  if (f.searchMode !== 'fulltext' && f.q) {
    if (f.asOf) throw new Error('Semantic search is not supported during historical replay');
    const { semanticIds } = await import('../../../packages/ai/embeddings');
    const candidates = await semanticIds(f.q, f.mode === 'demo', 200);
    const ids = add(candidates.map((c) => c.id));
    if (f.searchMode === 'hybrid') {
      const p = add(f.q);
      where.push(`(e.id=ANY(${ids}) OR e.search_vector @@ websearch_to_tsquery('simple',${p}))`);
    } else where.push(`e.id=ANY(${ids})`);
    semanticOrder = `array_position(${ids}::text[],e.id) ASC NULLS LAST,`;
  } else if (f.q) {
    const p = add(f.q);
    where.push(
      `(e.search_vector @@ websearch_to_tsquery('simple',${p}) OR e.title ILIKE '%'||${p}||'%')`,
    );
  }
  if (f.category) where.push(`e.category=ANY(${add(f.category.split(','))})`);
  if (f.source) where.push(`e.source_id=${add(f.source)}`);
  if (f.country) where.push(`l.country_codes @> ${add([f.country.toUpperCase()])}::text[]`);
  if (f.from) where.push(`e.occurred_at>=${add(f.from)}`);
  if (f.to) where.push(`e.occurred_at<=${add(f.to)}`);
  if (f.bbox) {
    const [w, s, e, n] = f.bbox.split(',').map(Number);
    const west = add(w),
      south = add(s),
      east = add(e),
      north = add(n);
    const spatial = (await query("SELECT 1 FROM pg_extension WHERE extname='postgis'")).length > 0;
    const countryAreas = add(countriesInBounds([w, s, e, n]));
    const national = `(l.latitude IS NULL AND l.country_codes && ${countryAreas}::text[])`;
    if (spatial)
      where.push(
        w <= e
          ? `(ST_Intersects(l.geometry,ST_MakeEnvelope(${west},${south},${east},${north},4326)) OR ${national})`
          : `(ST_Intersects(l.geometry,ST_MakeEnvelope(${west},${south},180,${north},4326)) OR ST_Intersects(l.geometry,ST_MakeEnvelope(-180,${south},${east},${north},4326)) OR ${national})`,
      );
    else
      where.push(
        `((l.latitude BETWEEN ${south} AND ${north} AND ${w <= e ? `l.longitude BETWEEN ${west} AND ${east}` : `(l.longitude>=${west} OR l.longitude<=${east})`}) OR ${national})`,
      );
  }
  if (f.asOf) {
    // Query snapshots, never current values, so no future revisions leak into replay.
    const records = await query<{ snapshot: EventRecord }>(
      `SELECT snapshot FROM (SELECT DISTINCT ON(event_id) snapshot,event_id FROM event_versions WHERE recorded_at<=$1 ORDER BY event_id,recorded_at DESC,id DESC) v`,
      [f.asOf],
    );
    const items = records
      .map((r) => r.snapshot)
      .filter(
        (x) =>
          x.synthetic === (f.mode === 'demo') &&
          !(x as EventRecord & { mergedInto?: string }).mergedInto &&
          (!f.q || (x.title + ' ' + x.summary).toLowerCase().includes(f.q.toLowerCase())) &&
          (!f.category || f.category.split(',').includes(x.category)) &&
          (!f.source || x.sourceId === f.source) &&
          (!f.country || (x.countryCodes ?? [x.countryCode]).includes(f.country.toUpperCase())) &&
          (!f.from || Date.parse(x.occurredAt) >= Date.parse(f.from)) &&
          (!f.to || Date.parse(x.occurredAt) <= Date.parse(f.to)) &&
          (!f.bbox ||
            (() => {
              const [w, s, e, n] = f.bbox!.split(',').map(Number);
              if (x.latitude === null)
                return countriesInBounds([w, s, e, n]).some((code) =>
                  (x.countryCodes ?? []).includes(code),
                );
              return (
                x.latitude !== null &&
                x.longitude !== null &&
                x.latitude >= s &&
                x.latitude <= n &&
                (w <= e
                  ? x.longitude >= w && x.longitude <= e
                  : x.longitude >= w || x.longitude <= e)
              );
            })()),
      );
    items.sort((a, b) =>
      f.sort === 'relevance'
        ? b.relevanceScore - a.relevanceScore
        : f.sort === 'oldest'
          ? a.occurredAt.localeCompare(b.occurredAt)
          : b.occurredAt.localeCompare(a.occurredAt),
    );
    return {
      items: items.slice((f.page - 1) * f.pageSize, f.page * f.pageSize),
      total: items.length,
      page: f.page,
      pageSize: f.pageSize,
      asOf: f.asOf,
      mode: f.mode,
    };
  }
  const clause = ' WHERE ' + where.join(' AND ');
  const [{ count }] = await query(
    `SELECT count(*)::int AS count FROM events e LEFT JOIN event_locations l ON l.event_id=e.id${clause}`,
    values,
  );
  const order =
    f.sort === 'relevance'
      ? 'e.relevance_score DESC,e.occurred_at DESC'
      : f.sort === 'oldest'
        ? 'e.occurred_at ASC'
        : 'e.occurred_at DESC';
  const limit = add(f.pageSize),
    offset = add((f.page - 1) * f.pageSize);
  const items = await query<EventRecord>(
    eventSelect +
      clause +
      ` ORDER BY ${semanticOrder}${order},e.id LIMIT ${limit} OFFSET ${offset}`,
    values,
  );
  return {
    items,
    total: count,
    page: f.page,
    pageSize: f.pageSize,
    asOf: new Date().toISOString(),
    mode: f.mode,
  };
}
