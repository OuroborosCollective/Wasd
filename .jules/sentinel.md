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

## 2026-07-24 - [Medium] Unprotected Voting System Administration Endpoints
**Vulnerability:** Administrative vote configurations and system diagnostics on the `/api/vote` sub-paths `/admin/banners` and `/admin/diagnostics` were not protected by `adminRateLimiter`, risking DoS or brute-forcing.
**Learning:** Scoping rate limiters at the global router mount level can cause severe functional regressions for public user paths (like standard voting). Scoping must be precise and localized.
**Prevention:** For hybrid routers serving both public endpoints and sensitive administrative routes, selectively apply `adminRateLimiter` to specific administrative routes within the router instead of globally at the mount point.

## 2026-08-10 - [Medium] Leaderboard Refresh Timing Attack Vulnerability
**Vulnerability:** The `/api/leaderboard/refresh` administrative cache purging endpoint used standard `===` string equality of provided and expected admin tokens, exposing the `ADMIN_PANEL_TOKEN` or fallback tokens to potential timing attacks.
**Learning:** Admin token checks on hybrid or utility endpoints are often implemented using simple string comparison, leaving them open to remote timing analysis of administrative tokens.
**Prevention:** Always use constant-time string comparison algorithms (e.g., hashing inputs via SHA-256 and utilizing `crypto.timingSafeEqual`) for all sensitive credentials or administrative keys, regardless of the router's scope or function.

## 2026-08-15 - [Medium] MCP Administrative Bearer Token Timing Attack
**Vulnerability:** The `/api/mcp` route used the standard `!==` relational string comparison to validate the incoming administrative bearer token against the configured `MCP_ADMIN_TOKEN`, exposing the token to potential timing analysis attacks.
**Learning:** Custom administrative router middlewares often rely on standard non-constant-time comparison operators, creating easily exploitable leaks of sensitive platform keys.
**Prevention:** Always implement timing-attack-resilient constant-time comparisons by hashing inputs (e.g., using SHA-256) and comparing them using `crypto.timingSafeEqual` in all custom middleware token checkers.

## 2026-08-25 - [Medium] Sovereign Launch Key Verification Timing Attack
**Vulnerability:** The `/api/sovereign/deploy` route used the standard `===` relational string comparison in `requireLaunchKey` to validate the provided sovereign launch key against the expected `SOVEREIGN_LAUNCH_KEY` or `ADMIN_DEPLOY_TOKEN`, exposing the token to timing analysis attacks.
**Learning:** Sensitive deploy/launch endpoints can have custom validator functions that bypass standard auth middleware checks, leaving them vulnerable if they perform plain string comparisons.
**Prevention:** Always implement a timing-attack-resilient constant-time comparison helper `safeEqualText` that hashes inputs using SHA-256 and compares them using `crypto.timingSafeEqual` to validate any administrative launch credentials or API keys.
