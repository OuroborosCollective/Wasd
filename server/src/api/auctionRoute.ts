import type { RequestHandler } from "express";
import {
  asPositiveSafeInteger,
  asSafeString,
  asyncRoute,
  createApiContext,
  requireJsonBody,
  sendError,
  sendOk,
  type ApiRouteDefinition,
} from "./apiRouteKit.js";

export interface AuctionRouteOptions {
  readonly createListing?: (listing: Readonly<{ itemId: string; price: number; sellerId: string }>) => Promise<unknown> | unknown;
}

export function auctionRoute(options: AuctionRouteOptions = {}): ApiRouteDefinition {
  const handler: RequestHandler = asyncRoute(async (req, res) => {
    const ctx = createApiContext(req);
    const body = requireJsonBody(req);
    const itemId = asSafeString(body.itemId, "");
    const sellerId = asSafeString(body.sellerId, "");
    const price = asPositiveSafeInteger(body.price, 0);

    if (!itemId || !sellerId || price <= 0) {
      sendError(res, "auction", ctx, 400, "invalid_auction_listing", "Auction listing requires itemId, sellerId and positive integer price.");
      return;
    }

    const result = options.createListing ? await options.createListing({ itemId, sellerId, price }) : { accepted: true };

    sendOk(res, "auction", ctx, {
      axiom: "ARELOGIC_AUCTION_ROUTE_STABLE",
      deterministic: true,
      accepted: true,
      listing: { itemId, sellerId, price },
      result,
    });
  });

  return {
    method: "POST",
    path: "/api/auction/list",
    handler,
  };
}
