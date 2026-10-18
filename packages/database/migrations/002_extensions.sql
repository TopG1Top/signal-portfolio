CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE event_locations ADD COLUMN IF NOT EXISTS geometry geometry(Geometry,4326);
UPDATE event_locations SET geometry=ST_SetSRID(ST_MakePoint(longitude,latitude),4326) WHERE longitude IS NOT NULL AND latitude IS NOT NULL AND geometry IS NULL;
CREATE INDEX IF NOT EXISTS event_locations_geometry ON event_locations USING GIST(geometry);
ALTER TABLE events ADD COLUMN IF NOT EXISTS embedding vector(1536);
CREATE INDEX IF NOT EXISTS events_embedding ON events USING hnsw(embedding vector_cosine_ops);
