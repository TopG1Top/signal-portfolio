import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { pool } from '../packages/database/index';
import { categories, categoryColors } from '../packages/shared/index';
import { sourceDefinitions } from '../packages/ingestion/sources';
const client = await pool.connect();
try {
  await client.query('SELECT pg_advisory_lock(846239)');
  await client.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, applied_at timestamptz DEFAULT now())',
  );
  for (const name of [
    '001_core.sql',
    '002_extensions.sql',
    '003_auth_rate.sql',
    '004_clusters.sql',
    '005_version_reversions.sql',
    '006_chat_context.sql',
    '007_news_geography.sql',
  ]) {
    if ((await client.query('SELECT 1 FROM schema_migrations WHERE name=$1', [name])).rowCount)
      continue;
    if (name.includes('extensions')) {
      const a = await client.query(
        "SELECT name FROM pg_available_extensions WHERE name IN ('postgis','vector')",
      );
      if (a.rowCount !== 2) {
        console.log(
          'PostGIS/pgvector unavailable in local native PostgreSQL; SQL bounds and full-text search remain enabled. Docker supplies both extensions.',
        );
        continue;
      }
    }
    await client.query('BEGIN');
    try {
      await client.query(
        await readFile(new URL('../packages/database/migrations/' + name, import.meta.url), 'utf8'),
      );
      await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
      await client.query('COMMIT');
      console.log('Applied', name);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
  }
  for (const cat of categories)
    await client.query('INSERT INTO categories(id,color) VALUES($1,$2) ON CONFLICT DO NOTHING', [
      cat,
      categoryColors[cat] ?? '#818cf8',
    ]);
  for (const source of sourceDefinitions) {
    const enabled =
      source.id === 'nasa-rss'
        ? process.env.RSS_ENABLED === 'true'
        : ['srf', 'tagesschau', 'heise'].includes(source.id)
          ? process.env.NEWS_FEEDS_ENABLED !== 'false'
          : true;
    await client.query(
      'INSERT INTO news_sources(id,name,type,endpoint,enabled,license) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET name=excluded.name,type=excluded.type,endpoint=excluded.endpoint,license=excluded.license',
      [source.id, source.name, source.type, source.endpoint, enabled, source.license],
    );
  }
  await client.query(
    "INSERT INTO news_sources(id,name,type,endpoint,enabled,license) VALUES('demo','Synthetic training dataset','synthetic','local:demo',false,'Synthetic examples, not news') ON CONFLICT DO NOTHING",
  );
} finally {
  await client.query('SELECT pg_advisory_unlock(846239)');
  client.release();
  await pool.end();
}
