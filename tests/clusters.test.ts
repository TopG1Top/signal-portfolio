import 'dotenv/config';
import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { query, pool } from '../packages/database/index';
import { persistItem } from '../packages/ingestion/index';
import { correctCluster } from '../packages/intelligence/clusters';
import type { NormalizedInput as NormalizedItem } from '../packages/validation/index';
const suffix = randomUUID(),
  userId = 'cluster-qa-' + suffix;
const ids = ['left-' + suffix, 'right-' + suffix];
const eventIds = ids.map((id) => 'demo-' + id);
describe.skipIf(!process.env.DATABASE_URL)('audited manual cluster corrections', () => {
  it('merges and splits without deleting source records or leaking future state', async () => {
    await query(
      "INSERT INTO \"user\"(id,name,email,role) VALUES($1,'Synthetic QA cluster',$2,'admin')",
      [userId, userId + '@example.org'],
    );
    for (const externalId of ids) {
      const item: NormalizedItem = {
        externalId,
        title: '[SYNTHETIC] Cluster correction fixture',
        summary: 'Synthetic fixture',
        category: 'Science',
        status: 'reported',
        occurredAt: '2024-01-01T00:00:00.000Z',
        sourceUrl: 'https://example.org/' + externalId,
        locationName: 'Unknown',
        latitude: null,
        longitude: null,
        precision: 'unknown',
        magnitude: null,
        relevanceScore: 1,
        raw: { test: true },
      };
      await persistItem('demo', item, true);
    }
    await correctCluster(
      userId,
      eventIds[0],
      eventIds[1],
      'merge',
      'Synthetic test: two reports of the same exercise',
    );
    expect(
      (await query('SELECT merged_into FROM events WHERE id=$1', [eventIds[0]]))[0].merged_into,
    ).toBe(eventIds[1]);
    expect(
      (await query('SELECT * FROM event_articles WHERE event_id=$1', [eventIds[1]])).length,
    ).toBe(2);
    await correctCluster(
      userId,
      eventIds[0],
      eventIds[1],
      'split',
      'Synthetic test: correcting an erroneous manual merge',
    );
    expect(
      (await query('SELECT merged_into FROM events WHERE id=$1', [eventIds[0]]))[0].merged_into,
    ).toBeNull();
    expect(
      (await query('SELECT * FROM event_articles WHERE event_id=$1', [eventIds[1]])).length,
    ).toBe(1);
    const history = await query(
      'SELECT snapshot FROM event_versions WHERE event_id=$1 ORDER BY id',
      [eventIds[0]],
    );
    expect(history).toHaveLength(3);
    expect(history[0].snapshot.mergedInto).toBeNull();
    expect(history[1].snapshot.mergedInto).toBe(eventIds[1]);
    expect(history[2].snapshot.mergedInto).toBeNull();
    expect((await query('SELECT * FROM audit_logs WHERE user_id=$1', [userId])).length).toBe(2);
    await expect(
      correctCluster(userId, eventIds[0], eventIds[0], 'merge', 'Invalid self merge test'),
    ).rejects.toThrow();
  });
  afterAll(async () => {
    await query('DELETE FROM audit_logs WHERE user_id=$1', [userId]);
    await query('DELETE FROM "user" WHERE id=$1', [userId]);
    await query('DELETE FROM events WHERE id=ANY($1) AND synthetic=true', [eventIds]);
    await query('DELETE FROM articles WHERE id=ANY($1)', [eventIds.map((x) => 'article-' + x)]);
    await query("DELETE FROM raw_items WHERE source_id='demo' AND external_id=ANY($1)", [ids]);
    await pool.end();
  });
});
