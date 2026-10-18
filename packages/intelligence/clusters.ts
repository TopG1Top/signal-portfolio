import { transaction } from '../database/index';
import { contentHash } from './index';
export async function correctCluster(
  userId: string,
  sourceId: string,
  targetId: string,
  action: 'merge' | 'split',
  reason: string,
) {
  if (sourceId === targetId) throw new Error('An event cannot be merged into itself');
  return transaction(async (c) => {
    const rows = (
      await c.query('SELECT * FROM events WHERE id=ANY($1) ORDER BY id FOR UPDATE', [
        [sourceId, targetId],
      ])
    ).rows;
    const source = rows.find((r) => r.id === sourceId),
      target = rows.find((r) => r.id === targetId);
    if (!source || !target) throw new Error('Both events must exist');
    if (source.synthetic !== target.synthetic)
      throw new Error('Synthetic and real events cannot be combined');
    if (target.merged_into) throw new Error('Target is already merged into another event');
    if (action === 'merge') {
      if (source.merged_into) throw new Error('Source event is already merged');
      if ((await c.query('SELECT 1 FROM events WHERE merged_into=$1', [sourceId])).rowCount)
        throw new Error('Split existing child events before merging this event');
      await c.query(
        'INSERT INTO event_articles(event_id,article_id) SELECT $1,article_id FROM event_articles WHERE event_id=$2 ON CONFLICT DO NOTHING',
        [targetId, sourceId],
      );
      await c.query('UPDATE events SET merged_into=$2,last_updated_at=now() WHERE id=$1', [
        sourceId,
        targetId,
      ]);
    } else {
      if (source.merged_into !== targetId)
        throw new Error('The source is not merged into this target');
      await c.query(
        'DELETE FROM event_articles WHERE event_id=$1 AND article_id IN(SELECT article_id FROM event_articles WHERE event_id=$2)',
        [targetId, sourceId],
      );
      await c.query('UPDATE events SET merged_into=NULL,last_updated_at=now() WHERE id=$1', [
        sourceId,
      ]);
    }
    await c.query('UPDATE events SET last_updated_at=now() WHERE id=$1', [targetId]);
    for (const eventId of [sourceId, targetId]) {
      const snapshot = (await c.query('SELECT signal_snapshot($1) AS snapshot', [eventId])).rows[0]
        .snapshot;
      await c.query('INSERT INTO event_versions(event_id,snapshot,content_hash) VALUES($1,$2,$3)', [
        eventId,
        JSON.stringify(snapshot),
        contentHash(snapshot),
      ]);
      await c.query('INSERT INTO event_updates(event_id,type,description) VALUES($1,$2,$3)', [
        eventId,
        action === 'merge' ? 'event.merged' : 'event.corrected',
        reason,
      ]);
      await c.query('INSERT INTO outbox(type,event_id,payload) VALUES($1,$2,$3)', [
        action === 'merge' ? 'event.merged' : 'event.corrected',
        eventId,
        JSON.stringify({ id: eventId, synthetic: source.synthetic }),
      ]);
    }
    await c.query('INSERT INTO audit_logs(user_id,action,target,details) VALUES($1,$2,$3,$4)', [
      userId,
      'cluster.' + action,
      targetId,
      JSON.stringify({ sourceId, targetId, reason }),
    ]);
    return { ok: true };
  });
}
