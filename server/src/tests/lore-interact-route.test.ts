import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { loreInteractRouter } from "../api/loreInteractRoute.js";
import { GameConfig } from "../config/GameConfig.js";

describe("loreInteractRouter", () => {
  it("returns interact lore JSON with server radius", async () => {
    const app = express();
    app.use("/api/lore", loreInteractRouter());
    const r = await request(app).get("/api/lore/interact");
    expect(r.status).toBe(200);
    expect(r.body.kind).toBe("lore_interact");
    expect(r.body.radius).toBe(GameConfig.interactDistance);
    expect(typeof r.body.haiku?.de).toBe("string");
    expect(typeof r.body.fauna?.birds).toBe("string");
  });
});
