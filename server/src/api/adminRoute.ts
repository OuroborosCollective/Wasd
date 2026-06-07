import type { RequestHandler } from "express";
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

export function adminRoute(options: AdminRouteOptions = {}): ApiRouteDefinition {
  const handler: RequestHandler = asyncRoute(async (req, res) => {
    const ctx = createApiContext(req);
    const authHeader = typeof req.headers.authorization === "string" ? req.headers.authorization : undefined;

    if (options.isAuthorized && !options.isAuthorized(authHeader)) {
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
