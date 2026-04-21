import { afterEach, beforeEach, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { adminContentRouter } from "../api/adminContentRoute.js";

type Link = { glbPath: string; targetType: string; targetId: string };

describe("adminContentRoute smart GLB upload", () => {
  const originalCwd = process.cwd();
  const originalEnv = { ...process.env };
  let tempRoot = "";
  let serverDir = "";
  let links: Link[] = [];
  let defaults: Record<string, string> = {};

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "admin-smart-upload-"));
    const repoRoot = path.join(tempRoot, "repo");
    serverDir = path.join(repoRoot, "server");
    const clientModelsDir = path.join(repoRoot, "client", "public", "assets", "models");
    const gameDataNpcDir = path.join(repoRoot, "game-data", "npc");
    fs.mkdirSync(serverDir, { recursive: true });
    fs.mkdirSync(clientModelsDir, { recursive: true });
    fs.mkdirSync(gameDataNpcDir, { recursive: true });
    fs.writeFileSync(
      path.join(gameDataNpcDir, "npcs.json"),
      JSON.stringify([{ id: "npc_guide", name: "Guide", role: "guide" }], null, 2)
    );

    links = [];
    defaults = {};
    process.chdir(serverDir);
    process.env = { ...originalEnv };
    process.env.ADMIN_PANEL_TOKEN = "smart-token";
    delete process.env.CONTENT_ADMIN_READONLY;
  });

  afterEach(() => {
    process.chdir(originalCwd);
    process.env = { ...originalEnv };
    if (tempRoot) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("uploads and auto-links to matching npc id", async () => {
    const tickMock = {
      glbRegistry: {
        addLink: async (link: Link) => {
          links = links.filter((entry) => !(entry.targetType === link.targetType && entry.targetId === link.targetId));
          links.push(link);
        },
        getLinks: () => links,
        scanModels: () => [],
      },
      assetPoolResolver: {
        setDefault: (_category: string, _path: string) => true,
        getDocument: () => ({ defaults, pools: {} }),
      },
    } as any;

    const app = express();
    app.use("/api/admin/content", adminContentRouter(tickMock));

    const response = await request(app)
      .post("/api/admin/content/glb-smart-upload")
      .set("Authorization", "Bearer smart-token")
      .field("category", "npcs")
      .attach("file", Buffer.from("glb-bytes"), { filename: "npc_guide.glb", contentType: "model/gltf-binary" });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.automation?.appliedAction?.type).toBe("glb_link");
    expect(response.body.automation?.appliedAction?.targetType).toBe("npc_single");
    expect(response.body.automation?.appliedAction?.targetId).toBe("npc_guide");
    expect(Array.isArray(response.body.links)).toBe(true);
    expect(response.body.links.length).toBe(1);
  });

  it("falls back to category default when no direct match exists", async () => {
    const tickMock = {
      glbRegistry: {
        addLink: async (_link: Link) => {},
        getLinks: () => links,
        scanModels: () => [],
      },
      assetPoolResolver: {
        setDefault: (category: string, modelPath: string) => {
          defaults[category] = modelPath;
          return true;
        },
        getDocument: () => ({ defaults, pools: {} }),
      },
    } as any;

    const app = express();
    app.use("/api/admin/content", adminContentRouter(tickMock));

    const response = await request(app)
      .post("/api/admin/content/glb-smart-upload")
      .set("Authorization", "Bearer smart-token")
      .field("category", "resources")
      .attach("file", Buffer.from("{}"), { filename: "my_ore_node.gltf", contentType: "model/gltf+json" });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.automation?.appliedAction?.type).toBe("pool_default");
    expect(response.body.automation?.appliedAction?.category).toBe("resources");
    expect(defaults.resources).toBeTypeOf("string");
  });
});
