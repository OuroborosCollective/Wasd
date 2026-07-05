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

## 2026-07-05 - [High] Timing-Safe Token Validation
**Vulnerability:** Administrative tokens (MCP, Playtester, Panel) were validated using standard equality operators (===) or array includes, which are susceptible to timing side-channel attacks.
**Learning:** Standard string comparisons return as soon as a mismatch is found, allowing an attacker to guess tokens character-by-character by measuring response times.
**Prevention:** Use the exported `safeEqualText` utility from `adminAuthMiddleware.ts` for all security-sensitive token or key comparisons. It uses `crypto.timingSafeEqual` on SHA256 hashes to ensure constant-time execution regardless of input length or match position.
