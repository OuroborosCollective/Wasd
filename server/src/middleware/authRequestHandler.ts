import type { RequestHandler } from "express";
import { authMiddleware } from "./authMiddleware.js";

/**
 * Typed Express route adapter for the existing auth middleware.
 *
 * This preserves the current authentication implementation while giving Express
 * route overloads a concrete RequestHandler shape under the server typecheck.
 */
export const authRequestHandler = authMiddleware as unknown as RequestHandler;
