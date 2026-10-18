import { randomUUID } from 'node:crypto';
import { pool, transaction } from '../database/index';
import { canonicalUrl, contentHash, clusterDecision } from '../intelligence/index';
import { fetchConnector } from './connectors';
import { normalizedSchema, type NormalizedInput } from '../validation/index';
export async function persistItem(sourceId: string, input: NormalizedInput, synthetic = false) {
  const item = normalizedSchema.parse(input);
  const id = `${sourceId}-${item.externalId}`,
    articleId = `article-${id}`;
  const { raw, ...normalized } = item;
  const hash = contentHash(normalized);
  return transaction(async (c) => {
    await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [id]);
    const previous = (await c.query('SELECT content_hash FROM articles WHERE id=$1', [articleId]))
      .rows[0];
    if (previous?.content_hash === hash) return false;
    await c.query(
      'INSERT INTO raw_items(id,source_id,external_id,content_hash,payload) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
      [randomUUID(), sourceId, item.externalId, hash, JSON.stringify(raw)],
    );
    await c.query(
      `INSERT INTO articles(id,source_id,external_id,canonical_url,title,permitted_excerpt,published_at,content_hash,language) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO UPDATE SET title=excluded.title,permitted_excerpt=excluded.permitted_excerpt,content_hash=excluded.content_hash,fetched_at=now(),published_at=excluded.published_at,canonical_url=excluded.canonical_url,language=excluded.language`,
      [
        articleId,
        sourceId,
        item.externalId,
        canonicalUrl(item.sourceUrl),
        item.title,
        item.summary,
        item.occurredAt,
        hash,
        item.language ?? 'en',
      ],
    );
    await c.query(
      `INSERT INTO events(id,title,summary,category,status,relevance_score,occurred_at,source_id,magnitude,synthetic) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(id) DO UPDATE SET title=excluded.title,summary=excluded.summary,category=excluded.category,status=excluded.status,relevance_score=excluded.relevance_score,last_updated_at=now(),occurred_at=excluded.occurred_at,magnitude=excluded.magnitude`,
      [
        id,
        item.title,
        item.summary,
        item.category,
        item.status,
        item.relevanceScore,
        item.occurredAt,
        sourceId,
        item.magnitude,
        synthetic,
      ],
    );
    await c.query('UPDATE events SET time_basis=$2 WHERE id=$1', [
      id,
      item.timeBasis ?? 'provider_event',
    ]);
    await c.query(
      'INSERT INTO event_articles(event_id,article_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
      [id, articleId],
    );
    await c.query(
      `INSERT INTO event_locations(id,event_id,name,latitude,longitude,precision,geojson) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(event_id) DO UPDATE SET name=excluded.name,latitude=excluded.latitude,longitude=excluded.longitude,precision=excluded.precision,geojson=excluded.geojson`,
      [
        'loc-' + id,
        id,
        item.locationName,
        item.latitude,
        item.longitude,
        item.precision,
        JSON.stringify(item.geometry ?? null),
      ],
    );
    await c.query(
      'UPDATE event_locations SET country_code=$2,country_codes=$3,country_basis=$4 WHERE event_id=$1',
      [
        id,
        item.countryCodes?.[0] ?? null,
        item.countryCodes ?? [],
        JSON.stringify(item.countryBasis ?? []),
      ],
    );
    const spatial = (await c.query("SELECT 1 FROM pg_extension WHERE extname='postgis'")).rowCount;
    if (spatial)
      await c.query(
        'UPDATE event_locations SET geometry=CASE WHEN $1::text IS NULL THEN NULL ELSE ST_SetSRID(ST_GeomFromGeoJSON($1),4326) END WHERE event_id=$2',
        [item.geometry ? JSON.stringify(item.geometry) : null, id],
      );
    if ((await c.query("SELECT 1 FROM pg_extension WHERE extname='vector'")).rowCount)
      await c.query('UPDATE events SET embedding=NULL WHERE id=$1', [id]);
    const dates = (
      await c.query('SELECT first_detected_at,last_updated_at FROM events WHERE id=$1', [id])
    ).rows[0];
    const source = (await c.query('SELECT name FROM news_sources WHERE id=$1', [sourceId])).rows[0];
    const snapshot = (await c.query('SELECT signal_snapshot($1) AS snapshot', [id])).rows[0]
      .snapshot;
    await c.query(
      'INSERT INTO event_versions(event_id,snapshot,content_hash) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
      [id, JSON.stringify(snapshot), hash],
    );
    const type = previous ? 'event.updated' : 'event.created';
    await c.query('INSERT INTO event_updates(event_id,type,description) VALUES($1,$2,$3)', [
      id,
      type,
      previous
        ? 'Source metadata revised; prior snapshot retained.'
        : 'First collected from ' + source.name,
    ]);
    await c.query('INSERT INTO outbox(type,event_id,payload) VALUES($1,$2,$3)', [
      type,
      id,
      JSON.stringify({ id, synthetic }),
    ]);
    await c.query(
      `INSERT INTO event_claims(id,event_id,claim,verification_status) VALUES($1,$2,$3,'source_reported') ON CONFLICT(id) DO UPDATE SET claim=excluded.claim`,
      ['claim-' + id, id, item.title],
    );
    await c.query(
      `INSERT INTO claim_evidence(id,claim_id,article_id,evidence_type,excerpt) VALUES($1,$2,$3,'provider_metadata',$4) ON CONFLICT(id) DO UPDATE SET excerpt=excluded.excerpt`,
      ['evidence-' + id, 'claim-' + id, articleId, item.title],
    );
    if (!synthetic) {
      if (!previous && item.latitude !== null && item.longitude !== null) {
        const candidates = (
          await c.query(
            `SELECT v.snapshot FROM events e JOIN event_locations l ON l.event_id=e.id JOIN LATERAL(SELECT snapshot FROM event_versions WHERE event_id=e.id ORDER BY recorded_at DESC,id DESC LIMIT 1)v ON true WHERE e.id<>$1 AND e.synthetic=false AND e.category=$2 AND e.occurred_at BETWEEN $3::timestamptz-interval '6 hours' AND $3::timestamptz+interval '6 hours' AND abs(l.latitude-$4)<1 LIMIT 20`,
            [id, item.category, item.occurredAt, item.latitude],
          )
        ).rows;
        for (const candidate of candidates) {
          const other = candidate.snapshot;
          const decision = clusterDecision(item, { ...other, externalId: other.id, raw: {} });
          await c.query(
            'INSERT INTO cluster_decisions(left_id,right_id,decision,scores) VALUES($1,$2,$3,$4) ON CONFLICT(left_id,right_id) DO UPDATE SET decision=excluded.decision,scores=excluded.scores',
            [id, other.id, decision.decision, JSON.stringify(decision.scores)],
          );
        }
      }
      const watches = (
        await c.query(
          `SELECT w.* FROM watchlists w LEFT JOIN user_preferences p ON p.user_id=w.user_id WHERE w.enabled AND COALESCE(p.alerts_enabled,true) AND (w.category='' OR w.category=$1) AND (w.source='' OR w.source=$2) AND (w.keywords='' OR position(lower(w.keywords) in lower($3))>0) AND (p.quiet_start IS NULL OR p.quiet_end IS NULL OR CASE WHEN p.quiet_start<p.quiet_end THEN NOT (extract(hour FROM now() AT TIME ZONE p.timezone)>=p.quiet_start AND extract(hour FROM now() AT TIME ZONE p.timezone)<p.quiet_end) ELSE NOT (extract(hour FROM now() AT TIME ZONE p.timezone)>=p.quiet_start OR extract(hour FROM now() AT TIME ZONE p.timezone)<p.quiet_end) END)`,
          [item.category, sourceId, item.title + ' ' + item.summary],
        )
      ).rows;
      for (const w of watches) {
        const key = `${w.id}:${id}:${hash}`;
        await c.query(
          `INSERT INTO notifications(id,user_id,event_id,title,dedupe_key) SELECT $1,$2,$3,$4,$5 WHERE (SELECT count(*) FROM notifications WHERE user_id=$2 AND created_at>now()-interval '1 hour')<50 ON CONFLICT(dedupe_key) DO NOTHING`,
          [randomUUID(), w.user_id, id, `${w.name}: ${item.title}`, key],
        );
      }
    }
    return true;
  });
}
export async function ingestSource(sourceId: string) {
  const job = randomUUID(),
    start = Date.now();
  const lock = await pool.connect();
  if (
    !(
      await lock.query('SELECT pg_try_advisory_lock(hashtext($1)) AS acquired', [
        'ingest:' + sourceId,
      ])
    ).rows[0].acquired
  ) {
    lock.release();
    return { skipped: true };
  }
  try {
    const source = (
      await lock.query('SELECT * FROM news_sources WHERE id=$1 AND enabled', [sourceId])
    ).rows[0];
    if (!source) throw new Error('Source disabled or missing');
    await lock.query("INSERT INTO ingestion_jobs(id,source_id,status) VALUES($1,$2,'running')", [
      job,
      sourceId,
    ]);
    await lock.query("UPDATE news_sources SET last_attempt=now(),status='fetching' WHERE id=$1", [
      sourceId,
    ]);
    const { items, rejected, feedErrors } = await fetchConnector(sourceId);
    let imported = 0,
      unchanged = 0;
    for (const item of items) {
      if (await persistItem(sourceId, item)) imported++;
      else unchanged++;
    }
    await lock.query(
      "UPDATE ingestion_jobs SET status='completed',completed_at=now(),imported=$2,unchanged=$3,rejected=$4,duration_ms=$5 WHERE id=$1",
      [job, imported, unchanged, rejected, Date.now() - start],
    );
    await lock.query('UPDATE news_sources SET last_success=now(),status=$2,error=$3 WHERE id=$1', [
      sourceId,
      feedErrors.length ? 'degraded' : 'healthy',
      feedErrors.length ? feedErrors.join('; ') : null,
    ]);
    console.log(
      JSON.stringify({
        level: 'info',
        action: 'ingest',
        sourceId,
        imported,
        unchanged,
        rejected,
        durationMs: Date.now() - start,
      }),
    );
    return { imported, unchanged, rejected };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Import failed';
    await lock.query("UPDATE news_sources SET status='error',error=$2 WHERE id=$1", [
      sourceId,
      message,
    ]);
    await lock.query(
      "UPDATE ingestion_jobs SET status='failed',completed_at=now(),error=$2,duration_ms=$3 WHERE id=$1",
      [job, message, Date.now() - start],
    );
    throw e;
  } finally {
    await lock.query('SELECT pg_advisory_unlock(hashtext($1))', ['ingest:' + sourceId]);
    lock.release();
  }
}
