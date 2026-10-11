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
import { resolveHttpPlayerIdentity, assertPlayerIdentityAllowed } from "../auth/PlayerIdentityResolver.js";

export interface MailRouteOptions {
  readonly sendMail?: (mail: Readonly<{ to: string; subject: string; body: string; senderId?: string }>) => Promise<unknown> | unknown;
}

export function mailRoute(options: MailRouteOptions = {}): ApiRouteDefinition {
  const handler: RequestHandler = asyncRoute(async (req, res) => {
    const ctx = createApiContext(req);

    // Security: Enforce server-authoritative authentication on mail dispatch
    const identity = resolveHttpPlayerIdentity(req);
    if (!identity.playerId || identity.playerId === "anonymous") {
      sendError(res, "mail", ctx, 401, "unauthorized", "Authentication required to send mail.");
      return;
    }

    try {
      assertPlayerIdentityAllowed(identity);
    } catch {
      sendError(res, "mail", ctx, 401, "authenticated_player_required", "Authenticated player required.");
      return;
    }

    const body = requireJsonBody(req);
    const to = asSafeString(body.to, "");
    const subject = asSafeString(body.subject, "");
    const mailBody = asSafeString(body.body ?? body.message, "");

    if (!to || !subject || !mailBody) {
      sendError(res, "mail", ctx, 400, "invalid_mail_payload", "Mail requires to, subject and body.");
      return;
    }

    const result = options.sendMail ? await options.sendMail({ to, subject, body: mailBody, senderId: identity.playerId }) : { accepted: true };

    sendOk(res, "mail", ctx, {
      axiom: "ARELOGIC_MAIL_ROUTE_STABLE",
      deterministic: true,
      accepted: true,
      result,
    });
  });

  return {
    method: "POST",
    path: "/api/mail/send",
    handler,
  };
}
