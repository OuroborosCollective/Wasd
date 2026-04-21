import { describe, it, expect } from "vitest";
import { auctionRoute } from "../api/auctionRoute.js";

describe("auctionRoute", () => {
  it("should return the correct route definition", () => {
    const route = auctionRoute();
    expect(route).toBeDefined();
    expect(route.method).toBe("POST");
    expect(route.path).toBe("/api/auction/list");
  });
});
