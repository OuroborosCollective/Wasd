import { describe, it, expect, vi } from "vitest";
import { createPayPalOrder } from "../modules/payment/PayPalService.js";
import https from "https";
import { EventEmitter } from "events";

vi.mock("https");

describe("PayPalService", () => {
  describe("createPayPalOrder edge cases", () => {
    it("throws an error for an unknown product ID", async () => {
      // Mock https.request to immediately resolve a fake token payload
      // so `getPayPalToken` succeeds and we reach the productId check
      const mockRequest = vi.fn((options, cb) => {
        const req = new EventEmitter();
        (req as any).write = vi.fn();
        (req as any).end = vi.fn(() => {
          const res = new EventEmitter();
          if (cb) cb(res);
          res.emit("data", JSON.stringify({ access_token: "fake_token" }));
          res.emit("end");
        });
        return req;
      });
      (https.request as any) = mockRequest;

      await expect(
        createPayPalOrder("unknown_product", "player1", "Alice", "http://return", "http://cancel")
      ).rejects.toThrow("Unknown product: unknown_product");
    });
  });
});
