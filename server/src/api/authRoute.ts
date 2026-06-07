import type { RequestHandler } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  asSafeString,
  asyncRoute,
  createApiContext,
  requireJsonBody,
  sendError,
  sendOk,
  type ApiRouteDefinition,
} from "./apiRouteKit.js";

export interface AuthenticatedUser {
  readonly username: string;
  readonly role: "player" | "admin";
}

export interface AuthRouteOptions {
  readonly validateCredentials?: (credentials: Readonly<{ username: string; password: string }>) => Promise<AuthenticatedUser | null> | AuthenticatedUser | null;
  readonly jwtSecret?: string;
  readonly tokenTtlSeconds?: number;
}

const DEV_SECRET = "areloria_local_development_secret_change_me";

function getJwtSecret(options: AuthRouteOptions): string {
  return options.jwtSecret ?? process.env.JWT_SECRET ?? DEV_SECRET;
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signJwt(payload: Record<string, unknown>, secret: string): string {
  const header = base64UrlJson({ alg: "HS256", typ: "JWT" });
  const body = base64UrlJson(payload);
  const signature = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function defaultValidateCredentials(username: string, password: string): Promise<AuthenticatedUser | null> {
  const configuredUser = process.env.ARELORIA_ADMIN_USER;
  const configuredPassword = process.env.ARELORIA_ADMIN_PASSWORD;

  if (configuredUser && configuredPassword) {
    if (safeEqual(username, configuredUser) && safeEqual(password, configuredPassword)) {
      return { username: username.toLowerCase(), role: "admin" };
    }
    return null;
  }

  if (username.length >= 3 && password.length >= 4) {
    return { username: username.toLowerCase(), role: "player" };
  }

  return null;
}

export function authRoute(options: AuthRouteOptions = {}): ApiRouteDefinition {
  const handler: RequestHandler = asyncRoute(async (req, res) => {
    const ctx = createApiContext(req);
    const body = requireJsonBody(req);
    const username = asSafeString(body.username, "").toLowerCase();
    const password = asSafeString(body.password, "");

    if (!username || !password) {
      sendError(res, "auth", ctx, 400, "missing_credentials", "Username and password are required.");
      return;
    }

    const user = options.validateCredentials
      ? await options.validateCredentials({ username, password })
      : await defaultValidateCredentials(username, password);

    if (!user) {
      sendError(res, "auth", ctx, 401, "invalid_credentials", "Invalid username or password.");
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const ttl = Number.isSafeInteger(options.tokenTtlSeconds) && Number(options.tokenTtlSeconds) > 0
      ? Number(options.tokenTtlSeconds)
      : 24 * 60 * 60;

    const token = signJwt(
      {
        sub: user.username,
        username: user.username,
        role: user.role,
        iat: now,
        exp: now + ttl,
      },
      getJwtSecret(options)
    );

    sendOk(res, "auth", ctx, {
      axiom: "ARELOGIC_AUTH_ROUTE_STABLE",
      deterministic: false,
      token,
      tokenType: "Bearer",
      expiresIn: ttl,
      user: {
        username: user.username,
        role: user.role,
      },
    });
  });

  return {
    method: "POST",
    path: "/api/auth/login",
    handler,
  };
}
