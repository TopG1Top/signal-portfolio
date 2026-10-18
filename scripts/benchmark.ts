import 'dotenv/config';
import { pool } from '../packages/database/index';
import { mkdir, writeFile } from 'node:fs/promises';
const c = await pool.connect();
const results = [];
try {
  await c.query('BEGIN');
  await c.query(
    `CREATE TEMP TABLE signal_benchmark(id integer,title text,occurred_at timestamptz,longitude float8,latitude float8,search_vector tsvector GENERATED ALWAYS AS(to_tsvector('simple',title)) STORED) ON COMMIT DROP`,
  );
  await c.query('CREATE INDEX bench_time ON signal_benchmark(occurred_at DESC)');
  await c.query('CREATE INDEX bench_geo ON signal_benchmark(longitude,latitude)');
  await c.query('CREATE INDEX bench_text ON signal_benchmark USING gin(search_vector)');
  for (const count of [10000, 100000]) {
    await c.query('TRUNCATE signal_benchmark');
    await c.query(
      `INSERT INTO signal_benchmark(id,title,occurred_at,longitude,latitude) SELECT i,'SYNTHETIC benchmark earthquake '||i,now()-(i||' seconds')::interval,((i*17)%360)-180,((i*13)%170)-85 FROM generate_series(1,$1) AS i`,
      [count],
    );
    await c.query('ANALYZE signal_benchmark');
    for (const [name, sql] of [
      ['recent page', 'SELECT id,title FROM signal_benchmark ORDER BY occurred_at DESC LIMIT 50'],
      [
        'viewport count',
        'SELECT count(*) FROM signal_benchmark WHERE longitude BETWEEN -20 AND 40 AND latitude BETWEEN 20 AND 60',
      ],
      [
        'full-text page',
        "SELECT id FROM signal_benchmark WHERE search_vector @@ websearch_to_tsquery('simple','earthquake') ORDER BY occurred_at DESC LIMIT 50",
      ],
    ]) {
      const timings = [];
      for (let i = 0; i < 20; i++) {
        const t = performance.now();
        await c.query(sql);
        timings.push(performance.now() - t);
      }
      timings.sort((a, b) => a - b);
      results.push({
        syntheticRows: count,
        query: name,
        runs: 20,
        medianMs: Number(timings[10].toFixed(2)),
        p95Ms: Number(timings[18].toFixed(2)),
      });
    }
  }
  await c.query('ROLLBACK');
} finally {
  c.release();
  await pool.end();
}
await mkdir('docs', { recursive: true });
const report = {
  measuredAt: new Date().toISOString(),
  environment: 'Local Windows / Node 24 / native PostgreSQL 17, single client, warm cache',
  limitations:
    'Synthetic temporary table benchmark, not an end-to-end capacity test. Does not measure PostGIS, pgvector, concurrent users, SSE fanout or production latency.',
  results,
};
await writeFile('docs/BENCHMARK.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
