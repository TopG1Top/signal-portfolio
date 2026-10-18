# SIGNAL

**See the world as it happens.**

## Public portfolio demo

Created by **Linhard Zejneli**. The public Vercel edition is a read-only portfolio demonstration with 24 original, explicitly synthetic scenarios across politics, business, technology, science, culture and other topics. Country filters include Switzerland and Germany. It contains no real news feed, database, account service, importer, AI provider or paid API requirement. Scenario timestamps are illustrative and refreshed relative to the demo clock.

[Open the portfolio demo](https://signal-portfolio-five.vercel.app) · [Source on GitHub](https://github.com/TopG1Top/signal-portfolio)

```powershell
npm ci
npm run dev:portfolio
```

Open http://127.0.0.1:3002. For a production build, run `npm run build:portfolio` and `npm run start:portfolio`. Verify it with `npm run test:portfolio`.

For Vercel, import this repository, set **Root Directory** to `apps/web`, enable files outside the root directory, and set `NEXT_PUBLIC_SIGNAL_PORTFOLIO=true` for Production and Preview. The included `apps/web/vercel.json` runs installation and the portfolio build from the workspace root. No database URL or private key is needed. See [docs/PORTFOLIO_DEPLOYMENT.md](docs/PORTFOLIO_DEPLOYMENT.md).

The map loads third-party map tiles and glyphs; hosting and those providers can receive ordinary request metadata. Display preferences remain in the visitor's browser. The demo does not publish third-party article text or imported news records.

## Full local edition

A working global event intelligence core with real public connectors, PostgreSQL persistence, an interactive world map, versioned source evidence, SSE updates, account-owned watchlists and an administrator workspace. The full 42-chapter product specification is **not yet completely implemented**. See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for verified capabilities and explicit gaps.

News now includes SRF, tagesschau and heise headlines across politics, business, IT, AI, cybersecurity, science, health, sport and culture. Country filters include Switzerland (`CH`) and Germany (`DE`) and apply to feeds, map context and analytics. See [docs/NEWS_COVERAGE.md](docs/NEWS_COVERAGE.md) for coverage and publisher-use boundaries. The interface footer credits Linhard Zejneli.

## Quick start on this Windows computer

Requirements: Node.js 22+ (tested with Node 24), npm, network access for initial dependencies and public feed imports. From this project directory:

```powershell
npm ci
npm run db:local
```

Keep that terminal running. The first start creates an ignored local PostgreSQL data directory and random local credentials. In a second terminal:

```powershell
npm run db:migrate
npm run ingest
npm run db:seed
npm run dev
```

Open **http://127.0.0.1:3000**. A third terminal runs periodic live collection:

```powershell
npm run worker
```

The native development profile does not include PostGIS, pgvector or Redis. It uses real PostgreSQL, numeric viewport queries and a clearly logged polling fallback. There are no fabricated live records. The seed command writes only explicitly synthetic demo records. Do not seed repeatedly unless you intend to update the demo’s exercise timestamps.

## Docker profile

Docker Desktop must have a working Linux engine. In this environment the CLI is installed but the engine could not be reached; container startup has therefore **not been verified**.

```powershell
Copy-Item .env.example .env
# Set POSTGRES_PASSWORD and BETTER_AUTH_SECRET to independent random secrets.
docker compose up --build -d
docker compose logs -f worker
```

Compose builds PostgreSQL with PostGIS/pgvector, Redis, a one-shot migration service, web and a BullMQ worker. Database/Redis ports are not exposed to the host; the web port binds to loopback. Migrations run before web/worker. For a private remote deployment, put a configured HTTPS reverse proxy in front; see [docs/OPERATIONS.md](docs/OPERATIONS.md).

## Accounts

Register through `/register`; no default administrator or known password is shipped. To promote a registered account locally:

```powershell
npm run admin -- your-registered-address@example.org
```

Account role changes are made using operator access. Public registration cannot set a privileged role. SMTP is necessary for verification and password-reset delivery. Enable `REQUIRE_EMAIL_VERIFICATION=true` before public registration after configuring SMTP.

## Optional AI

Set `AI_PROVIDER` to `openai`, `anthropic` or `ollama`, provide an available `AI_MODEL`, and supply the server-only credentials or local Ollama URL. Restart the web process. No model or paid account is silently selected. `none` is an explicitly labeled evidence-retrieval mode.

For optional semantic indexing on a pgvector-enabled database, set `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL` and credentials, then run `npm run ai:index -- 50`. The current schema requires 1536 dimensions. `/api/search?searchMode=semantic&q=...` and `hybrid` require authentication and are rate limited. Model-provider and vector integrations still require deployment verification.

## Checks

```powershell
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm audit --audit-level=high
npm run prisma:validate
npm run benchmark
```

The build uses `.next-production`, independently of the development cache. `npm start` runs that build. Local E2E tests create synthetic QA accounts under example.org; these are not real user accounts. Unit/integration fixtures clean up their own records. See `scripts/cleanup-qa.ts` for the explicit test-account cleanup command.

## Structure

```text
apps/web       Next.js UI, REST and SSE
apps/worker    Real source collection; BullMQ or local polling
apps/api       API boundary documentation
packages/database     PostgreSQL access, SQL migrations, Prisma schema
packages/ingestion    Public connectors and idempotent persistence
packages/intelligence Conservative candidate scoring and manual corrections
packages/ai           Grounded provider adapters and embeddings
packages/shared       Event contracts and taxonomy
packages/validation   Zod input/source contracts
infrastructure        Container and monitoring configuration
tests                 Vitest and Playwright suites
docs                  API, operations, measured benchmarks
```

Source content is subject to provider and upstream rights. SIGNAL stores only API metadata and permitted feed metadata, not scraped full articles. No paywall bypass is implemented.
