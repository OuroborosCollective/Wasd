import type { NextFunction, Request, RequestHandler, Response } from "express";
import { randomUUID } from "node:crypto";

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRouteDefinition {
  readonly path: string;
  readonly method: ApiMethod;
  readonly handler: RequestHandler;
}

export interface ApiEnvelope<T = unknown> {
  readonly ok: boolean;
  readonly route: string;
  readonly version: string;
  readonly requestId: string;
  readonly generatedAt: string;
  readonly data?: T;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}

export interface ApiContext {
  readonly requestId: string;
  readonly generatedAt: string;
}

export const API_VERSION = "1.1.0";
export const ARELOGIC_TICK_RATE_HZ = 10 as const;
export const ARELOGIC_TICK_MS = 100 as const;

export function createApiContext(req: Request): ApiContext {
  const incoming = req.headers["x-request-id"];
  const requestId =
    typeof incoming === "string" && incoming.trim().length > 0
      ? incoming.trim().slice(0, 128)
      : randomUUID();

  return {
    requestId,
    generatedAt: new Date().toISOString(),
  };
}

export function sendOk<T>(res: Response, route: string, ctx: ApiContext, data: T, status = 200): void {
  const envelope: ApiEnvelope<T> = {
    ok: true,
    route,
    version: API_VERSION,
    requestId: ctx.requestId,
    generatedAt: ctx.generatedAt,
    data,
  };

  res.status(status).json(envelope);
}

export function sendError(
  res: Response,
  route: string,
  ctx: ApiContext,
  status: number,
  code: string,
  message: string
): void {
  const envelope: ApiEnvelope = {
    ok: false,
    route,
    version: API_VERSION,
    requestId: ctx.requestId,
    generatedAt: ctx.generatedAt,
    error: { code, message },
  };

  res.status(status).json(envelope);
}

export function noStore(res: Response): void {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
}

export function asyncRoute(handler: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function asPositiveSafeInteger(value: unknown, fallback: number): number {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : fallback;
}

export function asSafeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim().slice(0, 512) : fallback;
}

export function requireJsonBody(req: Request): Record<string, unknown> {
  return req.body && typeof req.body === "object" && !Array.isArray(req.body)
    ? (req.body as Record<string, unknown>)
    : {};
}
