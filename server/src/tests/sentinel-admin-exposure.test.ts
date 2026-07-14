import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { areValidationRouter } from "../api/areValidationRoute.js";
import { areReplayRouter } from "../api/areReplayRoute.js";
import { financeRouter } from "../api/financeRoute.js";

describe("Sentinel Admin Exposure Test", () => {
  const mockTick = {
    getReplayRecorderStats: () => ({ recorder: "active" }),
    getAutoRepairStatus: () => ({ status: "ok" }),
    getDeterministicUsageStats: () => ({ hashesInWindow: 100 }),
    getSdkBillingStatus: () => ({ suspended: false }),
    getOracleReport: () => ({ prophecies: [] }),
    getWorldHashSnapshot: () => ({ worldHash: "abc" }),
    getManifestManager: () => ({
        getLastStateHash: () => "hash",
        getLastSnapshotTick: () => 0,
        getReplayGuard: () => ({
            getHighestTick: () => 0,
            getNonceCount: () => 0
        })
    })
  } as any;

  describe("/api/are/validation", () => {
    it("is protected from leaking validation status without auth", async () => {
      const app = express();
      app.use("/api/are/validation", areValidationRouter(mockTick));
      const r = await request(app).get("/api/are/validation/status");
      expect(r.status).toBe(401);
    });
  });

  describe("/api/are/replay", () => {
    it("is protected from leaking replay stats without auth", async () => {
      const app = express();
      app.use("/api/are/replay", areReplayRouter(mockTick));
      const r = await request(app).get("/api/are/replay/stats");
      expect(r.status).toBe(401);
    });

    it("is protected from leaking billing status without auth", async () => {
      const app = express();
      app.use("/api/are/replay", areReplayRouter(mockTick));
      const r = await request(app).get("/api/are/replay/billing/status");
      expect(r.status).toBe(401);
    });
  });

  describe("/api/finance", () => {
    it("is protected from leaking paypal configuration without auth", async () => {
      const app = express();
      app.use("/api/finance", financeRouter());
      const r = await request(app).get("/api/finance/status");
      expect(r.status).toBe(401);
    });
  });

  describe("Oracle protection", () => {
    it("is protected from leaking oracle prophecy without auth", async () => {
      const app = express();
      app.use("/api/are/replay", areReplayRouter(mockTick));
      const r = await request(app).get("/api/are/replay/oracle/prophecy");
      expect(r.status).toBe(401);
    });

    it("is protected from leaking oracle status without auth", async () => {
      const app = express();
      app.use("/api/are/replay", areReplayRouter(mockTick));
      const r = await request(app).get("/api/are/replay/oracle/status");
      expect(r.status).toBe(401);
    });
  });
});
