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

## 2025-08-01 - [High] Admin Credential Verification Timing Attack Vulnerabilities
**Vulnerability:** Administrative credentials, including `ADMIN_PANEL_TOKEN` and `SOVEREIGN_LAUNCH_KEY`, were validated using non-constant-time string comparison methods like `Array.prototype.includes` and standard equality (`===`). This timing leak allowed remote attackers to infer characters of the secrets one-by-one by measuring subtle response timing differences.
**Learning:** Comparing administrative secrets or tokens using traditional string matching is highly susceptible to side-channel timing attacks, leaking secret content incrementally.
**Prevention:** Always verify security-sensitive strings, API tokens, and credentials in constant-time. Use double HMAC hashing or SHA-256 pre-hashing coupled with a crypto `timingSafeEqual` comparison to hide both candidate content and length differences.
