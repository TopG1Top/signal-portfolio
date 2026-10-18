ALTER TABLE events ADD COLUMN IF NOT EXISTS merged_into text REFERENCES events(id);
CREATE INDEX IF NOT EXISTS events_merged_into ON events(merged_into);
CREATE UNIQUE INDEX IF NOT EXISTS cluster_decision_pair ON cluster_decisions(left_id,right_id);
CREATE OR REPLACE FUNCTION signal_snapshot(event_key text) RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT jsonb_build_object('id',e.id,'title',e.title,'summary',e.summary,'category',e.category,'status',e.status,'verificationStatus',e.verification_status,'relevanceScore',e.relevance_score,'occurredAt',e.occurred_at,'firstDetectedAt',e.first_detected_at,'lastUpdatedAt',e.last_updated_at,'sourceId',e.source_id,'sourceName',s.name,'sourceCount',(SELECT count(DISTINCT a.source_id) FROM event_articles ea JOIN articles a ON a.id=ea.article_id WHERE ea.event_id=e.id),'sourceUrl',(SELECT canonical_url FROM articles a JOIN event_articles ea ON ea.article_id=a.id WHERE ea.event_id=e.id ORDER BY a.published_at LIMIT 1),'latitude',l.latitude,'longitude',l.longitude,'locationName',l.name,'countryCode',l.country_code,'precision',l.precision,'geometry',l.geojson,'synthetic',e.synthetic,'magnitude',e.magnitude,'mergedInto',e.merged_into)
 FROM events e JOIN news_sources s ON s.id=e.source_id LEFT JOIN event_locations l ON l.event_id=e.id WHERE e.id=event_key
$$;
