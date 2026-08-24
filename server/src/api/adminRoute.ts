import { createHash, timingSafeEqual } from "node:crypto";
import type { Request, RequestHandler } from "express";
import {
  asSafeString,
  asyncRoute,
  createApiContext,
  requireJsonBody,
  sendError,
  sendOk,
  type ApiRouteDefinition,
} from "./apiRouteKit.js";

export interface AdminRouteOptions {
  readonly executeCommand?: (command: Readonly<Record<string, unknown>>) => Promise<unknown> | unknown;
  readonly isAuthorized?: (authorizationHeader: string | undefined) => boolean;
}

function hashBuffer(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function safeEqualText(a: string, b: string): boolean {
  const left = hashBuffer(a);
  const right = hashBuffer(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function checkAuthorization(
  req: Request,
  customAuthorized?: (authorizationHeader: string | undefined) => boolean
): boolean {
  const authHeader = typeof req.headers.authorization === "string" ? req.headers.authorization : undefined;
  if (customAuthorized) {
    return customAuthorized(authHeader);
  }

  const panel = process.env.ADMIN_PANEL_TOKEN?.trim();
  const legacyPanel = process.env.GM_PANEL_TOKEN?.trim();
  const acceptedTokens = [panel, legacyPanel].filter((v): v is string => Boolean(v && v.length > 0));

  if (acceptedTokens.length === 0) {
    return true;
  }

  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const headerToken = typeof req.headers["x-admin-token"] === "string" ? req.headers["x-admin-token"].trim() : "";

  return acceptedTokens.some(
    (token) => (bearer.length > 0 && safeEqualText(bearer, token)) || (headerToken.length > 0 && safeEqualText(headerToken, token))
  );
}

export function adminRoute(options: AdminRouteOptions = {}): ApiRouteDefinition {
  const handler: RequestHandler = asyncRoute(async (req, res) => {
    const ctx = createApiContext(req);

    if (!checkAuthorization(req, options.isAuthorized)) {
      sendError(res, "admin", ctx, 403, "admin_forbidden", "Admin command rejected by policy.");
      return;
    }

    const body = requireJsonBody(req);
    const command = asSafeString(body.command, "noop") || "noop";

    if (command === "noop" && body.command !== undefined) {
      sendError(res, "admin", ctx, 400, "invalid_admin_command", "Admin command must be a non-empty string.");
      return;
    }

    const result = options.executeCommand ? await options.executeCommand({ ...body, command }) : { accepted: true };

    sendOk(res, "admin", ctx, {
      axiom: "ARELOGIC_ADMIN_COMMAND_STABLE",
      deterministic: true,
      command,
      result,
    });
  });

  return {
    method: "POST",
    path: "/api/admin/command",
    handler,
  };
}
