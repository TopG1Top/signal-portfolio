import { query } from '../../../packages/database/index';
import { filtersSchema } from '../../../packages/validation/index';
export async function analytics(section: string, params: URLSearchParams) {
  const f = filtersSchema.parse(Object.fromEntries(params));
  const values: unknown[] = [f.mode === 'demo'];
  const where = ['e.synthetic=$1', 'e.merged_into IS NULL'];
  const add = (value: unknown) => {
    values.push(value);
    return '$' + values.length;
  };
  if (f.country) where.push(`l.country_codes @> ${add([f.country.toUpperCase()])}::text[]`);
  if (f.category) where.push(`e.category=ANY(${add(f.category.split(','))})`);
  if (f.source) where.push(`e.source_id=${add(f.source)}`);
  if (f.from) where.push(`e.occurred_at>=${add(f.from)}`);
  if (f.to) where.push(`e.occurred_at<=${add(f.to)}`);
  if (f.q) {
    const term = add(f.q);
    where.push(
      `(e.search_vector @@ websearch_to_tsquery('simple',${term}) OR e.title ILIKE '%'||${term}||'%')`,
    );
  }
  const scope = `WITH filtered AS(SELECT e.*,l.latitude,l.country_codes FROM events e LEFT JOIN event_locations l ON l.event_id=e.id WHERE ${where.join(' AND ')}) `;
  if (section === 'activity')
    return query(
      scope +
        `SELECT h.hour,count(e.id)::int AS count FROM generate_series(date_trunc('hour',now())-interval '47 hours',date_trunc('hour',now()),interval '1 hour') AS h(hour) LEFT JOIN filtered e ON e.occurred_at>=h.hour AND e.occurred_at<h.hour+interval '1 hour' GROUP BY h.hour ORDER BY h.hour`,
      values,
    );
  if (section === 'overview') {
    const [stats] = await query(
      scope +
        `SELECT count(*)::int AS total,count(*) FILTER(WHERE occurred_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')::int AS today,count(*) FILTER(WHERE status='developing')::int AS developing,count(DISTINCT source_id)::int AS sources,max(last_updated_at) AS latest,min(occurred_at) AS earliest,(SELECT count(DISTINCT code)::int FROM filtered CROSS JOIN LATERAL unnest(country_codes) AS code) AS countries,count(*) FILTER(WHERE latitude IS NOT NULL)::int AS mapped FROM filtered`,
      values,
    );
    return {
      ...stats,
      mode: f.mode,
      basis:
        'Filtered stored reports/events. News dates are publication dates. Country associations use domestic feed sections or explicit headline references, not exact event locations.',
      asOf: new Date().toISOString(),
    };
  }
  const [daily, categories, sources] = await Promise.all([
    query(
      scope +
        `SELECT to_char(occurred_at AT TIME ZONE 'UTC','YYYY-MM-DD') AS day,count(*)::int AS count FROM filtered GROUP BY day ORDER BY day`,
      values,
    ),
    query(
      scope +
        'SELECT category,count(*)::int AS count FROM filtered GROUP BY category ORDER BY count DESC',
      values,
    ),
    query(
      scope +
        'SELECT s.name,count(*)::int AS count FROM filtered e JOIN news_sources s ON s.id=e.source_id GROUP BY s.name',
      values,
    ),
  ]);
  return { daily, categories, sources };
}
