import type { RequestHandler } from "express";
import {
  asyncRoute,
  createApiContext,
  noStore,
  sendOk,
  type ApiRouteDefinition,
} from "./apiRouteKit.js";

export interface PlayerRoutesOptions {
  readonly getPlayers?: () => Promise<unknown[]> | unknown[];
}

export function playerRoutes(options: PlayerRoutesOptions = {}): ApiRouteDefinition {
  const handler: RequestHandler = asyncRoute(async (req, res) => {
    noStore(res);
    const ctx = createApiContext(req);
    const players = options.getPlayers ? await options.getPlayers() : [];

    sendOk(res, "players", ctx, {
      axiom: "ARELOGIC_PLAYERS_ROUTE_STABLE",
      deterministic: true,
      count: Array.isArray(players) ? players.length : 0,
      players: Array.isArray(players) ? players : [],
    });
  });

  return {
    path: "/players",
    method: "GET",
    handler,
  };
}
