# Public portfolio edition

Live demo: https://signal-portfolio-five.vercel.app. Source: https://github.com/TopG1Top/signal-portfolio. Portfolio project card: https://linhard-portfolio-pro.vercel.app/projects.

The public edition is intentionally read-only. Every scenario is original fictional content marked `[SYNTHETIC]`; none represents a current news report. Dates are illustrative and move with the demonstration clock. The full local edition remains available separately in the same source tree.

## Vercel settings

- Framework: Next.js; Node.js 24.
- Root Directory: `apps/web`; include files outside the Root Directory.
- Install: `cd ../.. && npm ci`.
- Build: `cd ../.. && npm run build:portfolio`.
- Output: `.next` (automatically selected when Vercel builds).
- Production and Preview variable: `NEXT_PUBLIC_SIGNAL_PORTFOLIO=true`.
- No database, Redis, SMTP, auth secret, AI key or import worker.

`build:portfolio` enables the same flag at build time and prevents a developer's local service credentials from being used by that build. The API serves synthetic data in memory and rejects all mutations. Sign-in, registration, saved events and administrative features explain that they belong to the full edition. The public interface does not open a live SSE subscription.

## Verification

Run `npm ci`, `npm run build:portfolio`, then `npm run start:portfolio`. From another terminal, set `PORTFOLIO_TEST_URL=http://127.0.0.1:3002` and run `npm run test:portfolio`. The suite checks the synthetic banner, country/category filters, event dialog, analytics, graph, replay, mobile layout, author credit, and rejected account/write requests. `/api/system/status` must report `portfolio: true`, `database: "not-used"`, and `queue: "not-used"`.

MapLibre uses local country boundaries and worker assets. Map tiles/glyphs are requested from the configured public map providers; their terms and hosting request processing still apply. Display preferences use browser storage. No imported news database or `.env` file belongs in the public repository or deployment.

## GitHub

Commit source and the lockfile, never `.env`, `.data`, `.vercel`, build output or local news screenshots. Connect the GitHub repository to this Vercel project to enable automatic deployments for later commits. Without that connection, a source deployment can be online, but pushing to GitHub will not automatically update it.
