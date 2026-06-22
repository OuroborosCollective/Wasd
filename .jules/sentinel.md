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

## 2025-06-12 - [Critical] Unprotected Loot Administration Endpoints
**Vulnerability:** The ARE Infinite Loot Machine endpoints (`/admin/loot/status` and `/admin/loot/generate`) were mounted directly on the Express app without authentication middleware, allowing unauthenticated users to trigger expensive loot generation and observe system status. Furthermore, error responses leaked full stack traces.
**Learning:** Legacy mounting patterns (passing `app` to a function) often bypass global middleware stacks applied to administrative path prefixes. Stack traces in API responses facilitate reconnaissance for further attacks.
**Prevention:** Use Express `Router` for all sub-systems and mount them with appropriate `adminAuthMiddleware` and `adminRateLimiter` at the `ServerBootstrap` level. Ensure error handlers sanitize output to remove implementation details.
