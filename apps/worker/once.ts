import 'dotenv/config';
import { pool } from '../../packages/database/index';
import { ingestSource } from '../../packages/ingestion/index';
const sources = (
  await pool.query("SELECT id FROM news_sources WHERE enabled AND type<>'synthetic'")
).rows;
const results = await Promise.allSettled(sources.map((s) => ingestSource(s.id)));
results.forEach((r, i) => {
  if (r.status === 'rejected') console.error(sources[i].id, r.reason.message);
});
await pool.end();
if (results.every((r) => r.status === 'rejected')) process.exitCode = 1;
