## 2025-05-15 - [Critical] Unprotected Admin Mount Points
**Vulnerability:** The `/api/client2d-assets` and `/api/sovereign/deploy` administrative routers were mounted in `ServerBootstrap.ts` without authentication middleware, exposing sensitive system information and potentially dangerous actions.
**Learning:** Mounting administrative routers without top-level middleware creates security gaps where info-leaking endpoints (like `/truth`) remain unprotected even if write operations are individually guarded.
**Prevention:** Always apply `adminAuthMiddleware` at the `app.use()` mount point in `ServerBootstrap.ts` for any administrative or system-level router.

## 2025-05-22 - [High] Production Secret Enforcement
**Vulnerability:** Core auth services (LocalJwtService) allowed falling back to hardcoded development secrets even when running in production environments.
**Learning:** Development-friendly defaults can silently persist into production if not explicitly blocked by environment-aware logic.
**Prevention:** Enforce mandatory environment variables for all cryptographic secrets by throwing fatal errors during service initialization if they are missing in production.

## 2025-05-30 - [High] Unprotected AI Proxy and State Endpoints
**Vulnerability:** The `/science-mascot` endpoint was a public proxy for the Gemini AI API using a server-side secret, and `/resync` / `/snapshot` endpoints exposed full world state snapshots to unauthenticated users.
**Learning:** AI proxy endpoints that allow client-controlled system prompts are high-risk for both resource abuse and prompt injection. State snapshots are sensitive data that should always be guarded by authentication.
**Prevention:** Always apply `authMiddleware` to any endpoint that proxies external LLM APIs or returns comprehensive system/world state. Hardcode or strictly validate system prompts on the server.

## 2025-06-27 - [High] Public Agora Monitoring API
**Vulnerability:** The Agora Monitor API (mounted at `/agora/api/live`, `/agora/api/config`, etc.) was publicly accessible, exposing system uptime, port configuration, build hashes, and persistence/ARE guard statistics.
**Learning:** Monitoring endpoints are often overlooked because they seem like "read-only status," but they leak internal system architecture details that can be used to plan further attacks.
**Prevention:** Apply `adminAuthMiddleware` and `adminRateLimiter` to all monitoring and diagnostic API routers, even if they only provide "live status" information.

## 2026-08-15 - [High] Public Diagnostic Endpoints in Hybrid Routers
**Vulnerability:** Diagnostic status/hash/stats endpoints (such as `/api/finance/status`, `/api/manifest/status`, `/api/are/validation/status`, and all replay/oracle diagnostics in `/api/are/replay`) were completely unprotected by auth middleware, leaking sensitive system diagnostics, transaction stats, block states, and world hashes to anonymous callers.
**Learning:** Hybrid routers serving both player gameplay syncing (e.g., `/api/manifest/resync`) and diagnostics often mount without top-level `adminAuthMiddleware`. Consequently, any route inside that router not specifically protected by middleware is silently left fully public.
**Prevention:** Never assume a diagnostic status/stats route inside a hybrid router is protected. Individually apply `adminAuthMiddleware` to all diagnostics, stats, prophecy, and snapshot endpoints within hybrid/specialized routers.
