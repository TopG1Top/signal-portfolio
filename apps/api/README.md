# API boundary

The modular API runs inside Next.js Route Handlers in `apps/web/app/api`. This directory documents the boundary; there is deliberately no redundant HTTP microservice. Worker jobs share the same domain packages and database transactions.

See `docs/openapi.json` for the implemented REST surface. No endpoint accepts arbitrary SQL, arbitrary connector URLs, or client-supplied AI system instructions.
