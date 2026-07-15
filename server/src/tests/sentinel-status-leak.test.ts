import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { financeRouter } from "../api/financeRoute.js";
import { areValidationRouter } from "../api/areValidationRoute.js";
import { createManifestResyncRouter } from "../api/manifestResyncRoute.js";

describe("Sentinel Status Leak Protection", () => {
  describe("Finance Status", () => {
    it("GET /api/finance/status is protected by adminAuthMiddleware", async () => {
      const app = express();
      app.use("/api/finance", financeRouter());
      const r = await request(app).get("/api/finance/status");
      expect(r.status).toBe(401);
    });
  });

  describe("ARE Validation Status", () => {
    it("GET /api/are/validation/status is protected by adminAuthMiddleware", async () => {
      const app = express();
      const mockTick = {} as any;
      app.use("/api/are/validation", areValidationRouter(mockTick));
      const r = await request(app).get("/api/are/validation/status");
      expect(r.status).toBe(401);
    });

    it("GET /api/are/validation/world-hash is protected by adminAuthMiddleware", async () => {
      const app = express();
      const mockTick = {
        getWorldHashSnapshot: () => ({ worldHash: "abc" })
      } as any;
      app.use("/api/are/validation", areValidationRouter(mockTick));
      const r = await request(app).get("/api/are/validation/world-hash");
      expect(r.status).toBe(401);
    });
  });

  describe("Manifest Status", () => {
    it("GET /api/manifest/status is protected by adminAuthMiddleware", async () => {
      const app = express();
      const mockTick = {
        getManifestManager: () => ({
          getLastStateHash: () => "hash",
          getLastSnapshotTick: () => 0,
          getReplayGuard: () => ({
            getHighestTick: () => 0,
            getNonceCount: () => 0
          })
        })
      } as any;
      app.use("/api/manifest", createManifestResyncRouter(mockTick));
      const r = await request(app).get("/api/manifest/status");
      expect(r.status).toBe(401);
    });
  });
});
