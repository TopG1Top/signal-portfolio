# SIGNAL architecture

## Runtime

SIGNAL is an npm workspace with Next.js 16 App Router, React 19 and strict TypeScript. HTTP endpoints live in Next.js; a separate Node worker handles collection. PostgreSQL is the durable source of truth. Redis/BullMQ is optional for local development and required for the container worker’s retries, scheduling and dead-letter queue.

```
USGS / NASA EONET / NASA RSS / SRF / tagesschau / heise
  -> bounded, allowlisted fetch -> Zod normalization
  -> per-record PostgreSQL transaction
     raw metadata -> article -> event -> location -> claim/evidence
     -> version snapshot -> durable outbox -> watchlist notification
  -> paginated/filterable REST -> TanStack Query -> MapLibre / feed / analysis
  -> SSE cursor + heartbeat -> query invalidation
```

## Decisions

- A modular monolith avoids service-to-service complexity. `apps/api` records this boundary instead of running a redundant server.
- Parameterized `pg` SQL implements transactions, spatial queries, full-text search and the outbox. Prisma 7 contains the introspected relational schema. Prisma Client is **not** the runtime query layer; SQL migrations remain authoritative because PostgreSQL checks, generated tsvector columns, PostGIS and pgvector need SQL features.
- PostgreSQL 17 runs natively on this Windows installation for verified development. Native package versions identify the wrapper as beta; this is a development convenience, not the production database image. PostGIS and pgvector are supplied by the Docker database image and are unavailable in the native installation. Spatial queries fall back explicitly to numeric bounds. Semantic search fails clearly without pgvector.
- MapLibre 6 uses local worker assets copied by `postinstall`. Natural Earth boundaries ship locally; country-label glyphs load from the MapLibre demo font endpoint. These glyphs and the associated source policy need a production hosting decision. Basemap rendering does not need a map API key.
- Geography comes only from provider point/polygon geometry. No geocoder guesses exact coordinates. Country tags for headlines derive from publisher domestic sections or explicit full-word headline references; their basis is displayed. No exact point is inferred from these tags. Polygon metadata is stored; the current map visualizes points only.
- Deterministic normalization and a content hash make repeated source identities idempotent. Per-event advisory locks serialize competing updates. Source locks prevent overlapping polls. A failure in one connector does not cancel other sources.
- Similar titles alone never auto-merge events. Candidate scoring uses title overlap, time, distance and category. Suggestions are review decisions. Admin merge/split corrections attach/detach source article memberships while retaining original records, version snapshots and an audit reason. Cross-mode and nested merges are rejected.
- Every revision, including a reversion to an earlier content hash, creates a snapshot. Historical replay selects the latest snapshot recorded by the requested time. Current revisions are not substituted into historical map/feed results. Opening an event detail shows the current analysis and is not itself a historical reconstruction.
- SSE reads a durable PostgreSQL outbox in batches and uses IDs and heartbeats. It has native EventSource reconnection. Polling every four seconds is deliberately simple; Redis fanout and connection quotas remain production scale work.
- Better Auth owns password hashing, session management, reset tokens and verification. Server endpoints enforce account ownership and admin roles. Mutations require an allowlisted Origin. Public APIs and account writes use database-backed rate limits. The public read limiter is currently a global installation budget, not per-IP; replace it with trusted-proxy-aware throttling for public deployment.
- Notification matching is literal phrase/category/source matching. Notifications are deduplicated per watchlist/event revision, capped at 50/hour/user and suppressed during configured quiet hours. Only in-app notifications are implemented; no email or push is silently simulated.
- AI provider adapters are server-side only. OpenAI uses JSON Schema structured outputs; Anthropic/Ollama outputs are validated with Zod. Citation IDs must belong to retrieved records and quotations must occur verbatim in their evidence. This verifies references, **not the truth of every generated interpretation**. Model evaluation and contradiction analysis remain open.
- With `AI_PROVIDER=none`, the assistant returns explicitly labeled retrieved evidence. It never pretends to generate model analysis. Embedding ingestion/search is an optional adapter path requiring 1536-dimensional vectors and pgvector; it has not been exercised against a live model.
- Demo records use the same contracts and SQL paths, isolated by the `synthetic` flag. Every displayed title is marked `[SYNTHETIC]`; test fixtures are similarly marked. Synthetic source links use example.org and are not presented as genuine reporting.
- Query caches for private data include the current account identity. Chat rows retain provider/mode context and are committed as a question/answer pair. History is ordered by timestamp and ID to preserve order when both rows share a transaction timestamp.
- The production service worker caches only explicitly public static assets and an offline information page. API responses, authenticated documents and news records are never cached by it. It does not provide push notifications or offline research.
- Updated event metadata invalidates optional embeddings. The indexer checks that the title/summary still match before persisting a generated vector. Model-version migration and automatic recurring indexing remain open.

## Security and operations boundaries

Fixed source endpoint allowlists, redirect rejection, a 20-second timeout and 12 MB body limit bound ingestion. RSS rejects XML DTD/entity declarations and stores only metadata. React escapes external strings; source URLs are limited to HTTP(S). AI cannot execute database tools or administrative actions.

CSP is compatible with Next.js/MapLibre but still allows inline scripts/styles and `unsafe-eval`. This is **not** a completed strict-CSP security audit. Production needs nonce-based script policy, HTTPS, trusted origins/proxy rules, email verification, SMTP, retention policy, backups and monitoring alerts. The app makes no GDPR/Swiss DPA certification claim.

## Official references consulted

- USGS GeoJSON contract: https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
- EONET v3 contract: https://eonet.gsfc.nasa.gov/docs/v3
- Better Auth installation: https://better-auth.com/docs/installation
- Next.js installed documentation: `node_modules/next/dist/docs/`
- OpenAI structured outputs: https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat
- OpenAI embeddings: https://developers.openai.com/api/reference/typescript/resources/embeddings/methods/create
- Natural Earth terms: https://www.naturalearthdata.com/about/terms-of-use/

## News and country extension

The source registry groups multiple feeds by publisher so one article appearing in two sections remains one provider record. Canonical-URL hashes identify news records; NASA identities retain their original IDs. RSS and Atom content bodies/images are discarded. Only title/link/publication metadata and the country/category classification provenance are persisted. A failed section marks its source degraded while other sections can still import.

Countries use ISO alpha-2 arrays and a GIN index. A domestic section establishes editorial country context; explicit headline names add further countries. Whole-word matching avoids false tags from words such as “Kinder”, “weniger” or “Romane”. This conservative heuristic can miss locations and does not establish that an event occurred at a specific point. The map shades Natural Earth country areas and labels country reports separately from provider coordinates. Native viewport queries include national context using coarse country bounding boxes; PostGIS still handles precise provider geometry. Geographic bounds are context selection, not country-event geocoding.

News `time_basis=publication` is visible in details. Natural events retain provider event time. Current and historical records preserve their own country tags. Analytics now applies country/category/source/date/full-text filters across the complete matching dataset. Public news deployment requires review of publisher rights; the locally enabled headline reader does not grant redistribution permission.
