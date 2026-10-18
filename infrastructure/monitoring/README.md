# Monitoring integration

Implemented observability:

- HTTP readiness: `GET /api/system/status` (database check)
- Admin source health and ingestion jobs: `/admin/monitoring`
- Structured worker JSON: source ID, imported/unchanged/rejected counts and duration
- PostgreSQL durable job records, version history, audit log and outbox

Suggested external probes: poll the readiness URL every 30 seconds; alert when a configured source has no success for more than twice its poll interval; watch PostgreSQL disk/connection counts and worker process restarts. The database and Redis images expose container healthchecks.

There is no Prometheus exporter/Grafana dashboard or paging integration currently installed. `/api/system/status` reports Redis and AI configuration, not verified connectivity. Production monitoring must test those independently and route actionable alerts to an operator.
