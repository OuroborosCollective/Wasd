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

export interface EditorRoutesOptions {
  readonly applyCommand?: (command: Readonly<Record<string, unknown>>) => Promise<unknown> | unknown;
}

export function editorRoutes(options: EditorRoutesOptions = {}): ApiRouteDefinition {
  const handler: RequestHandler = asyncRoute(async (req, res) => {
    const ctx = createApiContext(req);
    const body = requireJsonBody(req);
    const action = asSafeString(body.action, "noop");

    if (action.length === 0) {
      sendError(res, "editor", ctx, 400, "invalid_editor_action", "Editor action must be a non-empty string.");
      return;
    }

    const result = options.applyCommand ? await options.applyCommand({ ...body, action }) : { accepted: true };

    sendOk(res, "editor", ctx, {
      axiom: "ARELOGIC_EDITOR_COMMAND_STABLE",
      deterministic: true,
      action,
      result,
    });
  });

  return {
    path: "/editor",
    method: "POST",
    handler,
  };
}
