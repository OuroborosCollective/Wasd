import express from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SelfHealingSystem,
  registerSelfHealingDashboard,
  selfHealingMiddleware,
} from "../selfhealing/SelfHealingSystem.js";

describe("SelfHealingSystem", () => {
  let tempDir: string;
  let system: SelfHealingSystem;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "areloria-self-heal-"));
    system = new SelfHealingSystem({
      rootDir: tempDir,
      watchPaths: ["src"],
      ignorePaths: ["node_modules", ".git", ".selfhealing"],
      verboseLogging: false,
      dashboardEnabled: true,
      dashboardRoutePrefix: "/selfhealing",
      patchMode: "auto",
    });
    system.activate();
  });

  afterEach(() => {
    system.deactivate();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("patches a watched file, writes a backup, and records the heal", async () => {
    const srcDir = path.join(tempDir, "src");
    fs.mkdirSync(srcDir, { recursive: true });
    const filePath = path.join(srcDir, "jsonRuntime.ts");
    fs.writeFileSync(
      filePath,
      ['const raw = "{bad json}";', "const parsed = JSON.parse(raw);", "export { parsed };"].join("\n"),
      "utf8"
    );

    const error = new Error("JSON.parse failed because payload is not valid JSON");
    error.name = "RuntimeError";
    error.stack = `RuntimeError: JSON.parse failed because payload is not valid JSON\n    at parsePayload (${filePath}:2:22)`;

    const healed = await system.submitError(error, filePath);
    const healedFile = fs.readFileSync(filePath, "utf8");

    expect(healed).toBe(true);
    expect(healedFile).toContain("try { return JSON.parse(raw); } catch { return {}; }");
    expect(system.getStatus().totalHealed).toBe(1);
    expect(system.getStatus().backups.length).toBe(1);
    expect(system.getRecentLogs(1)).toHaveLength(1);
  });

  it("exposes status and logs through the self-healing dashboard", async () => {
    await system.submitError(new Error("NetworkError while loading scene metadata"));

    const app = express();
    registerSelfHealingDashboard(app, system);

    const statusResponse = await request(app).get("/selfhealing/status");
    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body.active).toBe(true);

    const logsResponse = await request(app).get("/selfhealing/logs?count=5");
    expect(logsResponse.status).toBe(200);
    expect(Array.isArray(logsResponse.body)).toBe(true);
    expect(logsResponse.body.length).toBeGreaterThan(0);
  });

  it("captures express errors through the middleware and returns a stable response", async () => {
    const app = express();
    app.get("/boom", (_req, _res, next) => {
      next(new Error("ECONNREFUSED while opening upstream socket"));
    });
    app.use(selfHealingMiddleware(system));

    const response = await request(app).get("/boom");

    expect(response.status).toBe(500);
    expect(response.body.healed).toBe(true);
    expect(system.getStatus().totalErrors).toBeGreaterThan(0);
  });
});
