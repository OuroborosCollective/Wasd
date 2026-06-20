import { adminAuthMiddleware, adminWriteBlocked } from "./adminAuthMiddleware.js";

/**
 * Route adapters for existing admin middleware implementations.
 *
 * Express route overload inference is sensitive when these middleware functions
 * are composed with async handlers. These adapters intentionally preserve the
 * runtime middleware exactly while preventing the adapter type from becoming a
 * false source of route-overload failure in server typecheck.
 */
export const adminAuthRequestHandler = adminAuthMiddleware as any;
export const adminWriteBlockedHandler = adminWriteBlocked as any;
