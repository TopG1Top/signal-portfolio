import 'dotenv/config';
import { test, expect } from './database-fixture';
import { randomUUID } from 'node:crypto';
import { query } from '../../packages/database/index';
import { persistItem } from '../../packages/ingestion/index';
test('SSE publishes persisted events and replays from Last-Event-ID', async () => {
  const key = 'stream-qa-' + randomUUID(),
    id = 'demo-' + key;
  const initial = String((await query('SELECT COALESCE(max(id),0) AS id FROM outbox'))[0].id);
  const abort = new AbortController();
  const response = await fetch('http://127.0.0.1:3000/api/stream/events?mode=demo', {
    headers: { 'Last-Event-ID': initial },
    signal: abort.signal,
  });
  expect(response.status).toBe(200);
  const reader = response.body!.getReader(),
    decoder = new TextDecoder();
  const hello = decoder.decode((await reader.read()).value);
  expect(hello).toContain('event: connected');
  try {
    await persistItem(
      'demo',
      {
        externalId: key,
        title: '[SYNTHETIC] Stream delivery test',
        summary: 'Synthetic test fixture',
        category: 'Science',
        status: 'reported',
        occurredAt: new Date().toISOString(),
        sourceUrl: 'https://example.org/synthetic-stream',
        locationName: 'Unknown',
        latitude: null,
        longitude: null,
        precision: 'unknown',
        magnitude: null,
        relevanceScore: 1,
        raw: { fixture: true },
      },
      true,
    );
    const readUntil = async (r: ReadableStreamDefaultReader<Uint8Array>) => {
      let text = '';
      const deadline = setTimeout(() => abort.abort(), 12000);
      try {
        while (!text.includes(id)) {
          const chunk = await r.read();
          if (chunk.done) break;
          text += decoder.decode(chunk.value);
        }
        return text;
      } finally {
        clearTimeout(deadline);
      }
    };
    const delivered = await readUntil(reader);
    expect(delivered).toContain('event: event.created');
    expect(delivered).toContain(id);
    await reader.cancel();
    const replay = await fetch('http://127.0.0.1:3000/api/stream/events?mode=demo', {
      headers: { 'Last-Event-ID': initial },
      signal: abort.signal,
    });
    const replayReader = replay.body!.getReader();
    expect(await readUntil(replayReader)).toContain(id);
    await replayReader.cancel();
  } finally {
    abort.abort();
    await query('DELETE FROM events WHERE id=$1 AND synthetic=true', [id]);
    await query('DELETE FROM articles WHERE id=$1', ['article-' + id]);
    await query("DELETE FROM raw_items WHERE source_id='demo' AND external_id=$1", [key]);
  }
});
