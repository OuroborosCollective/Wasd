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

## 2025-07-15 - [Medium] Inaccessible Private Assets and Database Detail Leakage in Asset-Brain API
**Vulnerability:** The `/api/asset-brain/specs/:id` and `/api/asset-brain/variants/:id` routes checked specification ownership against `req.playerId` but lacked authentication middleware, rendering private specs completely inaccessible to their owners. Additionally, internal database schema and query details were leaked to the client upon route errors.
**Learning:** Endpoints designed with "ownership checking" logic will silently fail/block authorized owners if authentication middleware is completely omitted from those endpoints. Error handlers that forward raw error messages (like `error.message`) are high-risk for database detail disclosure.
**Prevention:** Implement and use an `optionalAuthRequestHandler` for endpoints requiring guest-or-authenticated hybrid access, and always sanitize error catch blocks to return standardized database-generic error messages.

## 2026-03-20 - [High] Production JWT Secret Fallback Enforcement in Auth Route
**Vulnerability:** The standard authRoute used a fallback development JWT secret (`areloria_local_development_secret_change_me`) when `JWT_SECRET` was not set, which could silently persist in production environments.
**Learning:** Hardcoded dev credentials and secrets can easily bypass operational security checks if they are allowed to persist when `process.env.NODE_ENV === "production"`.
**Prevention:** Enforce mandatory environment variable validation on server startup or handler invocation for any cryptographic route by throwing fatal initialization/runtime errors when secrets are missing in production.
