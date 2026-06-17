## 2025-05-15 - [Critical] Unprotected Admin Mount Points
**Vulnerability:** The `/api/client2d-assets` and `/api/sovereign/deploy` administrative routers were mounted in `ServerBootstrap.ts` without authentication middleware, exposing sensitive system information and potentially dangerous actions.
**Learning:** Mounting administrative routers without top-level middleware creates security gaps where info-leaking endpoints (like `/truth`) remain unprotected even if write operations are individually guarded.
**Prevention:** Always apply `adminAuthMiddleware` at the `app.use()` mount point in `ServerBootstrap.ts` for any administrative or system-level router.

## 2025-05-22 - [High] Production Secret Enforcement
**Vulnerability:** Core auth services (LocalJwtService) allowed falling back to hardcoded development secrets even when running in production environments.
**Learning:** Development-friendly defaults can silently persist into production if not explicitly blocked by environment-aware logic.
**Prevention:** Enforce mandatory environment variables for all cryptographic secrets by throwing fatal errors during service initialization if they are missing in production.

## 2025-06-15 - [High] LLM Proxy Prompt Injection
**Vulnerability:** The science-mascot endpoint allowed clients to provide their own system prompts, enabling users to bypass the intended mascot persona and use the server's AI credits for arbitrary tasks.
**Learning:** Permitting client-side system prompts in LLM proxies effectively creates an open, unauthenticated AI gateway that is prone to both cost-abuse and prompt injection.
**Prevention:** Always hardcode or resolve system prompts on the server side for domain-specific AI proxies, and ensure authentication is enforced before making upstream AI calls.
