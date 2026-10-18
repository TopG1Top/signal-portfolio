import 'dotenv/config';
import { Queue, Worker } from 'bullmq';
import { pool } from '../../packages/database/index';
import { ingestSource } from '../../packages/ingestion/index';
const interval = Number(process.env.INGEST_INTERVAL_MS ?? 300000);
if (process.env.REDIS_URL) {
  const url = new URL(process.env.REDIS_URL);
  const connection = {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    maxRetriesPerRequest: null,
  };
  const queue = new Queue('signal-ingestion', { connection });
  const dead = new Queue('signal-dead-letter', { connection });
  const worker = new Worker('signal-ingestion', async (job) => ingestSource(job.data.sourceId), {
    connection,
    concurrency: 3,
  });
  worker.on('failed', async (job, error) => {
    if (job && job.attemptsMade >= Number(job.opts.attempts ?? 1))
      await dead.add(
        'failed',
        { sourceId: job.data.sourceId, error: error.message, jobId: job.id },
        { removeOnComplete: 1000 },
      );
  });
  for (const { id } of (
    await pool.query("SELECT id FROM news_sources WHERE enabled AND type<>'synthetic'")
  ).rows)
    await queue.upsertJobScheduler(
      'poll-' + id,
      { every: interval },
      {
        name: 'poll',
        data: { sourceId: id },
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      },
    );
  console.log('BullMQ worker ready.');
  for (const sig of ['SIGINT', 'SIGTERM'] as const)
    process.on(sig, async () => {
      await worker.close();
      await queue.close();
      await dead.close();
      await pool.end();
      process.exit(0);
    });
} else {
  console.log(
    'Local polling mode: no Redis configured. Durable job history in PostgreSQL; BullMQ retries/dead-letter require Redis.',
  );
  const tick = async () => {
    for (const { id } of (
      await pool.query("SELECT id FROM news_sources WHERE enabled AND type<>'synthetic'")
    ).rows) {
      try {
        await ingestSource(id);
      } catch (e) {
        console.error(JSON.stringify({ source: id, error: String(e) }));
      }
    }
  };
  await tick();
  setInterval(() => void tick(), interval);
}
