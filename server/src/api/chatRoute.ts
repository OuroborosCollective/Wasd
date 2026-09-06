import type { RequestHandler } from "express";
import { sensitiveWriteRateLimiter } from "../middleware/rateLimitMiddleware.js";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
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
  const handler: RequestHandler = asyncRoute(async (req, res, next) => {
    sensitiveWriteRateLimiter(req, res, (err?: unknown) => {
      if (err) {
        next(err);
        return;
      }

      try {
        const ctx = createApiContext(req);
        const body = requireJsonBody(req);
        const channel = asSafeString(body.channel, "global") || "global";

        const identity = resolveHttpPlayerIdentity(req);
        const resolvedAuthor = identity.playerId !== "anonymous"
          ? identity.playerId
          : asSafeString(body.author, "system") || "system";

        const text = asSafeString(body.text ?? body.message, "");

        if (text.length === 0) {
          sendError(res, "chat", ctx, 400, "empty_chat_message", "Chat message must not be empty.");
          return;
        }

        Promise.resolve(
          options.sendMessage
            ? options.sendMessage({ channel, text, author: resolvedAuthor })
            : { accepted: true }
        )
          .then((result) => {
            sendOk(res, "chat", ctx, {
              axiom: "ARELOGIC_CHAT_ROUTE_STABLE",
              deterministic: true,
              channel,
              accepted: true,
              result,
            });
          })
          .catch(next);
      } catch (error) {
        next(error);
      }
    });
  });

  return {
    method: "POST",
    path: "/api/chat/send",
    handler,
  };
}
