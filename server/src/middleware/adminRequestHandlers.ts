import type { RequestHandler } from "express";
import { adminAuthMiddleware, adminWriteBlocked } from "./adminAuthMiddleware.js";

/** Typed adapters for existing admin middleware implementations. */
export const adminAuthRequestHandler = adminAuthMiddleware as unknown as RequestHandler;
export const adminWriteBlockedHandler = adminWriteBlocked as unknown as RequestHandler;
