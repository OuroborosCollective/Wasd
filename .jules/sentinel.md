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

## 2025-06-12 - [Medium] Unprotected Monitoring Endpoints
**Vulnerability:** The `/agora/api` routes provided detailed system status (uptime, build hash, persistence stats, world hash) to unauthenticated users.
**Learning:** Sub-routers often inherit the security posture of their mount point. If the mount point is public, all sub-routes are public unless explicitly guarded.
**Prevention:** Apply `adminRateLimiter` and `adminAuthMiddleware` to all administrative monitoring sub-routers at the mount point to ensure defense in depth.
