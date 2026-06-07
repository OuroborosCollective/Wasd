import type { RequestHandler } from "express";
import {
  ARELOGIC_TICK_MS,
  ARELOGIC_TICK_RATE_HZ,
  asyncRoute,
  createApiContext,
  noStore,
  sendOk,
  type ApiRouteDefinition,
} from "./apiRouteKit.js";

const startedAt = new Date().toISOString();
const bootHrtime = process.hrtime.bigint();

function uptimeMs(): number {
  return Number((process.hrtime.bigint() - bootHrtime) / 1_000_000n);
}

export function healthRoute(): ApiRouteDefinition {
  const handler: RequestHandler = asyncRoute(async (req, res) => {
    noStore(res);
    const ctx = createApiContext(req);

    sendOk(res, "health", ctx, {
      service: "areloria-server",
      status: "healthy",
      deterministic: true,
      startedAt,
      uptimeMs: uptimeMs(),
      tick: {
        rateHz: ARELOGIC_TICK_RATE_HZ,
        tickMs: ARELOGIC_TICK_MS,
      },
    });
  });

  return {
    path: "/health",
    method: "GET",
    handler,
  };
}
