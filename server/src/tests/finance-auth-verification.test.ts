import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { financeRouter } from "../api/financeRoute.js";

describe("Finance Router Security", () => {
  it("FIXED: /paypal/checkout now requires authentication", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/finance", financeRouter());

    // Should now fail with 401
    const r = await request(app)
      .post("/api/finance/paypal/checkout")
      .send({
        clientId: "spoofed-player-id",
        credits: 100
      });

    expect(r.status).toBe(401);
  });

  it("FIXED: /paypal/verify now requires authentication", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/finance", financeRouter());

    // Should now fail with 401
    const r = await request(app)
      .post("/api/finance/paypal/verify")
      .send({
        transactionId: "test-tx"
      });

    expect(r.status).toBe(401);
  });
});
