import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { financeRouter } from "../api/financeRoute.js";

// Mock paypalAdapter
vi.mock("../finance/PayPalAdapter.js", () => {
  return {
    paypalAdapter: {
      createCheckoutLink: vi.fn().mockResolvedValue({ ok: true, approvalUrl: "http://mock" }),
      creditVerifiedTransaction: vi.fn().mockResolvedValue({ ok: true }),
    },
  };
});

describe("Finance Security", () => {
  it("FIXED: /api/finance/paypal/checkout is NOT accessible without authentication", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/finance", financeRouter());

    const r = await request(app)
      .post("/api/finance/paypal/checkout")
      .send({ credits: 10 });

    expect(r.status).toBe(401);
  });

  it("FIXED: /api/finance/paypal/verify is NOT accessible without authentication", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/finance", financeRouter());

    const r = await request(app)
      .post("/api/finance/paypal/verify")
      .send({ transactionId: "mock" });

    expect(r.status).toBe(401);
  });
});
