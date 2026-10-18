import 'dotenv/config';
import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { pool, query } from '../packages/database/index';
import { persistItem } from '../packages/ingestion/index';
import type { NormalizedInput as NormalizedItem } from '../packages/validation/index';
import { listEvents } from '../apps/web/lib/events';
const enabled = !!process.env.DATABASE_URL;
const externalId = 'test-' + randomUUID(),
  id = 'demo-' + externalId;
const item: NormalizedItem = {
  externalId,
  title: '[SYNTHETIC] Integration fixture',
  summary: 'Synthetic test only',
  category: 'Science',
  status: 'reported',
  occurredAt: '2024-01-01T00:00:00.000Z',
  sourceUrl: 'https://example.org/synthetic-test',
  locationName: 'Unknown',
  latitude: null,
  longitude: null,
  precision: 'unknown',
  magnitude: null,
  relevanceScore: 1,
  raw: { fixture: true },
};
describe.skipIf(!enabled)('transactional ingestion', () => {
  it('persists once, deduplicates repeat import, versions corrections and publishes durable outbox', async () => {
    expect(await persistItem('demo', item, true)).toBe(true);
    expect(await persistItem('demo', item, true)).toBe(false);
    expect((await query('SELECT * FROM outbox WHERE event_id=$1', [id])).length).toBe(1);
    const captured = (
      await query(`SELECT to_char(recorded_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS instant FROM event_versions WHERE event_id=$1`, [id])
    )[0].instant;
    expect(
      await persistItem(
        'demo',
        { ...item, title: '[SYNTHETIC] Corrected integration fixture' },
        true,
      ),
    ).toBe(true);
    const versions = await query(
      'SELECT snapshot FROM event_versions WHERE event_id=$1 ORDER BY id',
      [id],
    );
    expect(versions.length).toBe(2);
    expect(versions[0].snapshot.title).toBe(item.title);
    expect(versions[1].snapshot.title).toContain('Corrected');
    const historic = await listEvents(
      new URLSearchParams({ mode: 'demo', asOf: captured, pageSize: '500' }),
    );
    expect(historic.items.find((row) => row.id === id)?.title).toBe(item.title);
    expect((await query('SELECT * FROM outbox WHERE event_id=$1', [id])).length).toBe(2);
    expect(await persistItem('demo', item, true)).toBe(true);
    expect((await query('SELECT * FROM event_versions WHERE event_id=$1', [id])).length).toBe(3);
  });
  afterAll(async () => {
    await query('DELETE FROM events WHERE id=$1 AND synthetic=true', [id]);
    await query('DELETE FROM articles WHERE id=$1', ['article-' + id]);
    await query("DELETE FROM raw_items WHERE source_id='demo' AND external_id=$1", [externalId]);
    await pool.end();
  });
});
