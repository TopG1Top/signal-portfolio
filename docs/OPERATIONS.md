# Deployment and operations

## Local vs production

Use the native PostgreSQL process for local Windows development only. Docker Compose is the intended complete infrastructure profile. Its configuration is supplied but the local Docker Linux engine was unreachable, so container build/start, PostGIS and Redis/BullMQ require a separate acceptance run.

1. Provision a host with a supported Docker Linux engine and adequate persistent storage.
2. Create deployment-only environment variables. Never use test or example secrets.
3. Configure `BETTER_AUTH_URL` and `APP_ORIGIN` to the exact HTTPS origin. Production trusts the configured origin; the extra loopback origin applies only in development.
4. Build and start with `docker compose up --build -d`. Verify migration exit success, PostgreSQL/Redis health, worker import logs and `/api/system/status`.
5. Put the web service behind Caddy/nginx with managed TLS. Set upstream SSE buffering off and idle timeouts above heartbeat intervals. Do not expose PostgreSQL or Redis publicly.
6. Configure SMTP and email verification; confirm delivery and reset flows with a test mailbox before opening registration.
7. Enable optional AI only with explicit budgets and provider-approved models. Native local mode has no vector extension.

## Monitoring

`/api/system/status` verifies PostgreSQL connectivity and reports configuration state. It does not prove Redis or an AI provider is reachable. Admin monitoring reports per-source status, job durations/errors, AI request counts and outbox cursor. The worker emits JSON logs without credentials. Integration guidance is in `infrastructure/monitoring/README.md`; no Prometheus exporter or hosted monitoring service is preconfigured.

Monitor failed imports, last successful import age (>2 polling intervals), worker liveness, PostgreSQL connections/disk/WAL growth, Redis persistence, HTTP 5xx rates, SSE connection counts and AI spend. Configure an external alert recipient before production. Local polling does not implement BullMQ retry/dead-letter guarantees.

## Backup

Back up PostgreSQL with `pg_dump --format=custom`, using a protected `.pgpass` or deployment secret instead of putting a password in shell history. Example inside the running Compose database container:

```sh
docker compose exec -T postgres pg_dump -U signal -d signal -Fc -f /tmp/signal-backup.dump
docker compose cp postgres:/tmp/signal-backup.dump ./signal-backup.dump
```

Encrypt the exported dump, restrict permissions, store a copy off-host, and maintain an operator-approved retention schedule. Back up configuration/secrets separately using a secret manager. Redis is a job transport; PostgreSQL is the durable record/history/outbox store. Do not rely solely on Redis snapshots.

## Restore rehearsal

Restore into a **new isolated database**, never overwrite the active database as a routine test. Create the required extensions first, then use `pg_restore --no-owner --no-acl` against the isolated target. Run migrations, integrity checks, source counts, a known event detail and a sample replay. Disable the worker during restore validation to avoid duplicate external fetches. Switch the deployment connection only after validation and preserve the old database for rollback.

## Retention

No automatic destructive retention job is enabled. Raw source metadata, event revisions, outbox and audit records currently grow without pruning. Before production set a documented policy for raw metadata, source evidence, accounts, chat history, jobs and backups. A cursor-retention protocol is necessary before pruning outbox rows; a reconnect older than the retained cursor must trigger a full resync. Account deletion cascades owned research data; security audit identifiers are nulled where applicable.

## Costs and external dependencies

No paid infrastructure was purchased or deployed. Running costs depend on compute, PostgreSQL storage/backups, Redis, outgoing network traffic, SMTP, monitoring, TLS/domain administration and optional AI tokens/embeddings. Exact prices are not asserted. USGS/EONET access and NASA RSS are public endpoints but availability/rate limits/terms can change. Map label glyphs currently use the MapLibre demo font endpoint and should be self-hosted for production. No licensed commercial news provider is configured.

## Release acceptance still required

Full Docker build/start; PostGIS/pgvector spatial and vector integration tests; Redis restart/dead-letter tests; production reverse proxy/HTTPS; SMTP delivery/reset/verification tests; strict CSP rollout; independent security review; realistic concurrent-user/SSE soak test; backup restore rehearsal; deployment-specific privacy/legal review and source license review.
