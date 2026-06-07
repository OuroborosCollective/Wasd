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

export interface ChatRoutesOptions {
  readonly sendMessage?: (message: Readonly<{ channel: string; text: string; author: string }>) => Promise<unknown> | unknown;
}

export function chatRoute(options: ChatRoutesOptions = {}): ApiRouteDefinition {
  const handler: RequestHandler = asyncRoute(async (req, res) => {
    const ctx = createApiContext(req);
    const body = requireJsonBody(req);
    const channel = asSafeString(body.channel, "global") || "global";
    const author = asSafeString(body.author, "system") || "system";
    const text = asSafeString(body.text ?? body.message, "");

    if (text.length === 0) {
      sendError(res, "chat", ctx, 400, "empty_chat_message", "Chat message must not be empty.");
      return;
    }

    const result = options.sendMessage ? await options.sendMessage({ channel, text, author }) : { accepted: true };

    sendOk(res, "chat", ctx, {
      axiom: "ARELOGIC_CHAT_ROUTE_STABLE",
      deterministic: true,
      channel,
      accepted: true,
      result,
    });
  });

  return {
    method: "POST",
    path: "/api/chat/send",
    handler,
  };
}
