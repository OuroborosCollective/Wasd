// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import type { WorldTick } from "../core/WorldTick.js";
import { adminContentRouter } from "../api/adminContentRoute.js";
import type { GLBLink } from "../modules/asset-registry/GLBRegistry.js";
import type { AssetPoolResolver } from "../modules/world/AssetPoolResolver.js";

function buildTestApp(tick: Pick<WorldTick, "glbRegistry" | "assetPoolResolver">) {
  const app = express();
  app.use("/api/admin/content", adminContentRouter(tick as WorldTick));
  return app;
}

describe("admin content /glb-links routes", () => {
  let links: GLBLink[];

  beforeEach(() => {
    delete process.env.CONTENT_ADMIN_READONLY;
    process.env.ADMIN_PANEL_TOKEN = "test-admin-panel-token";
    links = [];
  });

  afterEach(() => {
    delete process.env.ADMIN_PANEL_TOKEN;
    delete process.env.CONTENT_ADMIN_READONLY;
    vi.restoreAllMocks();
  });

  function makeTick(): Pick<WorldTick, "glbRegistry" | "assetPoolResolver"> {
    return {
      glbRegistry: {
        addLink: vi.fn(async (link: GLBLink) => {
          links = links.filter((l) => !(l.targetType === link.targetType && l.targetId === link.targetId));
          links.push(link);
        }),
        removeLink: vi.fn(async (targetType: string, targetId: string) => {
          links = links.filter((l) => !(l.targetType === targetType && l.targetId === targetId));
        }),
        getLinks: () => links,
      } as any,
      assetPoolResolver: {
        getDocument: () => ({}),
        setEntry: () => true,
        removeEntry: () => true,
        setDefault: () => true,
        removeDefault: () => true,
        reload: () => {},
      } as unknown as AssetPoolResolver,
    };
  }

  const authHeader = { Authorization: "Bearer test-admin-panel-token" };

  it("rejects DELETE /glb-links without admin auth (401)", async () => {
    const app = buildTestApp(makeTick());
    const r = await request(app).delete("/api/admin/content/glb-links").query({
      targetType: "npc_single",
      targetId: "npc_guide",
    });
    expect(r.status).toBe(401);
  });

  it("DELETE /glb-links returns 400 when query params are missing", async () => {
    const app = buildTestApp(makeTick());
    const r = await request(app).delete("/api/admin/content/glb-links").set(authHeader);
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/targetType and targetId required/i);
  });

  it("DELETE /glb-links returns 400 for invalid targetType", async () => {
    const tick = makeTick();
    const app = buildTestApp(tick);
    const r = await request(app)
      .delete("/api/admin/content/glb-links")
      .set(authHeader)
      .query({ targetType: "not_a_real_type", targetId: "x" });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/invalid targetType/i);
    expect(tick.glbRegistry.removeLink).not.toHaveBeenCalled();
  });

  it("DELETE /glb-links calls removeLink and returns updated links when authorized", async () => {
    links.push({
      glbPath: "/world-assets/test.glb",
      targetType: "npc_single",
      targetId: "npc_guide",
    });
    const tick = makeTick();
    const app = buildTestApp(tick);
    const r = await request(app)
      .delete("/api/admin/content/glb-links")
      .set(authHeader)
      .query({ targetType: "npc_single", targetId: "npc_guide" });
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    expect(tick.glbRegistry.removeLink).toHaveBeenCalledWith("npc_single", "npc_guide");
    expect(r.body.links).toEqual([]);
  });

  it("rejects POST /glb-links without admin auth (401)", async () => {
    const app = buildTestApp(makeTick());
    const r = await request(app).post("/api/admin/content/glb-links").send({
      glbPath: "/world-assets/x.glb",
      targetType: "npc_single",
      targetId: "npc_guide",
    });
    expect(r.status).toBe(401);
  });

  it("POST /glb-links returns 403 when CONTENT_ADMIN_READONLY is set", async () => {
    process.env.CONTENT_ADMIN_READONLY = "1";
    const tick = makeTick();
    const app = buildTestApp(tick);
    const r = await request(app)
      .post("/api/admin/content/glb-links")
      .set(authHeader)
      .send({
        glbPath: "/world-assets/x.glb",
        targetType: "npc_single",
        targetId: "npc_guide",
      });
    expect(r.status).toBe(403);
    expect(tick.glbRegistry.addLink).not.toHaveBeenCalled();
  });

  it("POST /glb-links returns 400 when required fields are missing", async () => {
    const tick = makeTick();
    const app = buildTestApp(tick);
    const r = await request(app).post("/api/admin/content/glb-links").set(authHeader).send({
      glbPath: "/world-assets/x.glb",
      targetType: "npc_single",
    });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/glbPath, targetType, targetId required/i);
    expect(tick.glbRegistry.addLink).not.toHaveBeenCalled();
  });

  it("POST /glb-links returns 400 for invalid targetType", async () => {
    const tick = makeTick();
    const app = buildTestApp(tick);
    const r = await request(app)
      .post("/api/admin/content/glb-links")
      .set(authHeader)
      .send({
        glbPath: "/world-assets/x.glb",
        targetType: "invalid_type",
        targetId: "npc_guide",
      });
    expect(r.status).toBe(400);
    expect(tick.glbRegistry.addLink).not.toHaveBeenCalled();
  });

  it("POST /glb-links returns 400 for path traversal under /assets/models/", async () => {
    const tick = makeTick();
    const app = buildTestApp(tick);
    const r = await request(app)
      .post("/api/admin/content/glb-links")
      .set(authHeader)
      .send({
        glbPath: "/assets/models/../../etc/passwd",
        targetType: "npc_single",
        targetId: "npc_guide",
      });
    expect(r.status).toBe(400);
    expect(tick.glbRegistry.addLink).not.toHaveBeenCalled();
  });

  it("POST /glb-links accepts /world-assets/ path and calls addLink", async () => {
    const tick = makeTick();
    const app = buildTestApp(tick);
    const r = await request(app)
      .post("/api/admin/content/glb-links")
      .set(authHeader)
      .send({
        glbPath: "/world-assets/custom/tree.glb",
        targetType: "npc_single",
        targetId: "npc_guide",
      });
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    expect(tick.glbRegistry.addLink).toHaveBeenCalledWith({
      glbPath: "/world-assets/custom/tree.glb",
      targetType: "npc_single",
      targetId: "npc_guide",
    });
    expect(r.body.links).toEqual([
      {
        glbPath: "/world-assets/custom/tree.glb",
        targetType: "npc_single",
        targetId: "npc_guide",
      },
    ]);
  });
});
