import { describe, it, expect, beforeEach } from "vitest";
import { AuctionFees } from "../modules/auction/AuctionFees.js";
import { AuctionHouse } from "../modules/auction/AuctionHouse.js";
import { AuctionSettlement } from "../modules/auction/AuctionSettlement.js";

// ---------------------------------------------------------------------------
// AuctionFees
// ---------------------------------------------------------------------------
describe("AuctionFees", () => {
  it("has a listing fee of 2%", () => {
    expect(AuctionFees.listingFeePercent).toBe(0.02);
  });

  it("has a sale tax of 5%", () => {
    expect(AuctionFees.saleTaxPercent).toBe(0.05);
  });

  it("listing fee applied to 1000 yields 20", () => {
    expect(1000 * AuctionFees.listingFeePercent).toBeCloseTo(20);
  });

  it("sale tax applied to 200 yields 10", () => {
    expect(200 * AuctionFees.saleTaxPercent).toBeCloseTo(10);
  });
});

// ---------------------------------------------------------------------------
// AuctionHouse
// ---------------------------------------------------------------------------
describe("AuctionHouse", () => {
  let house: AuctionHouse;

  beforeEach(() => {
    house = new AuctionHouse();
  });

  it("starts with no listings", () => {
    expect(house.all()).toHaveLength(0);
  });

  it("list() adds a listing and returns it", () => {
    const listing = house.list({ id: "iron_sword" }, "player1", 500);
    expect(listing).toMatchObject({ sellerId: "player1", price: 500 });
    expect(listing.item).toEqual({ id: "iron_sword" });
  });

  it("all() returns all listings after multiple lists", () => {
    house.list({ id: "potion" }, "p1", 10);
    house.list({ id: "shield" }, "p2", 300);
    expect(house.all()).toHaveLength(2);
  });

  it("listing includes a createdAt timestamp", () => {
    const before = Date.now();
    const listing = house.list({ id: "gem" }, "p1", 999);
    const after = Date.now();
    expect(listing.createdAt).toBeGreaterThanOrEqual(before);
    expect(listing.createdAt).toBeLessThanOrEqual(after);
  });

  it("each listing preserves the item reference", () => {
    const item = { id: "ring", level: 5 };
    const listing = house.list(item, "seller", 42);
    expect(listing.item).toBe(item);
  });
});

// ---------------------------------------------------------------------------
// AuctionSettlement
// ---------------------------------------------------------------------------
describe("AuctionSettlement", () => {
  let settlement: AuctionSettlement;

  beforeEach(() => {
    settlement = new AuctionSettlement();
  });

  it("settle() returns correct gross, fee and net for 0% fee", () => {
    const result = settlement.settle(1000, 0);
    expect(result.gross).toBe(1000);
    expect(result.fee).toBe(0);
    expect(result.net).toBe(1000);
  });

  it("settle() calculates 5% tax correctly on price 200", () => {
    const result = settlement.settle(200, 0.05);
    expect(result.gross).toBe(200);
    expect(result.fee).toBeCloseTo(10);
    expect(result.net).toBeCloseTo(190);
  });

  it("settle() calculates 2% listing fee correctly on price 1000", () => {
    const result = settlement.settle(1000, 0.02);
    expect(result.gross).toBe(1000);
    expect(result.fee).toBeCloseTo(20);
    expect(result.net).toBeCloseTo(980);
  });

  it("settle() net + fee always equals gross", () => {
    const result = settlement.settle(750, 0.1);
    expect(result.fee + result.net).toBeCloseTo(result.gross);
  });

  it("settle() handles a price of 0", () => {
    const result = settlement.settle(0, 0.05);
    expect(result.gross).toBe(0);
    expect(result.fee).toBe(0);
    expect(result.net).toBe(0);
  });
});
