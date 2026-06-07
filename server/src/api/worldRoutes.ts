import type { RequestHandler } from "express";
import {
  ARELOGIC_TICK_MS,
  ARELOGIC_TICK_RATE_HZ,
  asPositiveSafeInteger,
  asyncRoute,
  createApiContext,
  noStore,
  sendOk,
  type ApiRouteDefinition,
} from "./apiRouteKit.js";

export interface WorldRouteSnapshot {
  readonly tick: number;
  readonly logicalIndex: number;
  readonly tickRateHz: typeof ARELOGIC_TICK_RATE_HZ;
  readonly tickMs: typeof ARELOGIC_TICK_MS;
  readonly status: "healthy" | "degraded" | "booting";
  readonly entities: number;
  readonly players: number;
  readonly generatedAt: string;
}

export interface WorldRoutesOptions {
  readonly getSnapshot?: () => Promise<Partial<WorldRouteSnapshot>> | Partial<WorldRouteSnapshot>;
}

function normalizeWorldStatus(value: unknown): WorldRouteSnapshot["status"] {
  return value === "healthy" || value === "degraded" || value === "booting" ? value : "booting";
}

function normalizeSnapshot(input: Partial<WorldRouteSnapshot> = {}): WorldRouteSnapshot {
  return {
    tick: asPositiveSafeInteger(input.tick, 0),
    logicalIndex: asPositiveSafeInteger(input.logicalIndex, asPositiveSafeInteger(input.tick, 0)),
    tickRateHz: ARELOGIC_TICK_RATE_HZ,
    tickMs: ARELOGIC_TICK_MS,
    status: normalizeWorldStatus(input.status),
    entities: asPositiveSafeInteger(input.entities, 0),
    players: asPositiveSafeInteger(input.players, 0),
    generatedAt: typeof input.generatedAt === "string" ? input.generatedAt : new Date().toISOString(),
  };
}

export function worldRoutes(options: WorldRoutesOptions = {}): ApiRouteDefinition {
  const handler: RequestHandler = asyncRoute(async (_req, res) => {
    noStore(res);
    const ctx = createApiContext(_req);
    const rawSnapshot = options.getSnapshot ? await options.getSnapshot() : {};
    const snapshot = normalizeSnapshot(rawSnapshot);

    sendOk(res, "world", ctx, {
      axiom: "ARELOGIC_WORLD_ROUTE_STABLE",
      deterministic: true,
      snapshot,
    });
  });

  return {
    path: "/world",
    method: "GET",
    handler,
  };
}
