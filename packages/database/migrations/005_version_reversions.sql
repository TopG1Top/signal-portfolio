ALTER TABLE event_versions DROP CONSTRAINT IF EXISTS event_versions_event_id_content_hash_key;
CREATE INDEX IF NOT EXISTS event_versions_replay ON event_versions(event_id,recorded_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS outbox_created ON outbox(created_at);
CREATE INDEX IF NOT EXISTS notification_user_time ON notifications(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS watchlist_user ON watchlists(user_id);
