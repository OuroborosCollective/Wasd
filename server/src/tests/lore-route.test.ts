import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { loreRouter } from "../api/loreRoute.js";
import { GameConfig } from "../config/GameConfig.js";
import { clearWorldFragmentsCache } from "../modules/lore/worldFragments.js";

describe("loreRouter", () => {
  beforeEach(() => {
    clearWorldFragmentsCache();
  });
  afterEach(() => {
    clearWorldFragmentsCache();
  });

  it("GET /interact includes worldFragments summary", async () => {
    const app = express();
    app.use("/api/lore", loreRouter());
    const r = await request(app).get("/api/lore/interact");
    expect(r.status).toBe(200);
    expect(r.body.kind).toBe("lore_interact");
    expect(r.body.radius).toBe(GameConfig.interactDistance);
    expect(r.body.worldFragments?.version).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(r.body.worldFragments?.summary)).toBe(true);
    expect(r.body.worldFragments.summary.length).toBeGreaterThan(0);
  });

  it("GET /fragments lists ids and titles", async () => {
    const app = express();
    app.use("/api/lore", loreRouter());
    const r = await request(app).get("/api/lore/fragments");
    expect(r.status).toBe(200);
    expect(r.body.kind).toBe("world_fragments");
    expect(r.body.fragments.some((f: { id: string }) => f.id === "ouroboros_ring")).toBe(true);
  });

  it("GET /fragments/:id returns one fragment", async () => {
    const app = express();
    app.use("/api/lore", loreRouter());
    const r = await request(app).get("/api/lore/fragments/ouroboros_ring");
    expect(r.status).toBe(200);
    expect(r.body.kind).toBe("world_fragment");
    expect(r.body.fragment.id).toBe("ouroboros_ring");
    expect(r.body.fragment.title.de).toBeTruthy();
  });

  it("GET /fragments/:id 404 for unknown id", async () => {
    const app = express();
    app.use("/api/lore", loreRouter());
    const r = await request(app).get("/api/lore/fragments/no_such_fragment_xyz");
    expect(r.status).toBe(404);
    expect(r.body.error).toBe("not_found");
  });
});
