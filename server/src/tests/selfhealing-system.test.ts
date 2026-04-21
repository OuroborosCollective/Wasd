import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createSelfHealingSystem,
  resolveSelfHealingConfigFromEnv,
  resolveSelfHealingDashboardConfigFromEnv,
  type SelfHealingSystem,
} from "../selfhealing/SelfHealingSystem.js";

describe("SelfHealingSystem", () => {
  let tmpDir = "";
  let system: SelfHealingSystem | null = null;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arel-selfheal-"));
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    system?.deactivate();
    system = null;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    process.env = { ...originalEnv };
  });

  it("applies an automatic null-guard patch in auto mode", async () => {
    const targetFile = path.join(tmpDir, "heal-target.ts");
    fs.writeFileSync(
      targetFile,
      ["export function update() {", "  player.stats.hp += 1;", "  return true;", "}"].join("\n"),
      "utf-8"
    );

    system = createSelfHealingSystem({
      enabled: true,
      patchMode: "auto",
      verboseLogging: false,
      watchPaths: [tmpDir],
      ignorePaths: [],
      storageDirectory: path.join(tmpDir, ".selfhealing"),
      healingCooldownMs: 1,
    });
    system.activate();

    const error = new Error("Cannot read properties of undefined (reading 'hp')");
    error.name = "TypeError";
    error.stack = `TypeError: Cannot read properties of undefined (reading 'hp')\n    at update (${targetFile}:2:3)`;

    const healed = await system.submitError(error, targetFile);
    const patched = fs.readFileSync(targetFile, "utf-8");
    expect(healed).toBe(true);
    expect(patched).toContain("if (player != null) { player.stats.hp += 1; }");
  });

  it("keeps files unchanged in log-only mode", async () => {
    const targetFile = path.join(tmpDir, "log-only.ts");
    const originalCode = ["export function parse(raw: string) {", "  return JSON.parse(raw);", "}"].join("\n");
    fs.writeFileSync(targetFile, originalCode, "utf-8");

    system = createSelfHealingSystem({
      enabled: true,
      patchMode: "log-only",
      verboseLogging: false,
      watchPaths: [tmpDir],
      ignorePaths: [],
      storageDirectory: path.join(tmpDir, ".selfhealing"),
      healingCooldownMs: 1,
    });
    system.activate();

    const error = new Error("Unexpected token } in JSON at position 1");
    error.name = "SyntaxError";
    error.stack = `SyntaxError: Unexpected token } in JSON at position 1\n    at parse (${targetFile}:2:10)`;

    const healed = await system.submitError(error, targetFile);
    const after = fs.readFileSync(targetFile, "utf-8");
    expect(healed).toBe(true);
    expect(after).toBe(originalCode);
  });

  it("emits runtime fallback values for reference errors", async () => {
    system = createSelfHealingSystem({
      enabled: true,
      patchMode: "auto",
      verboseLogging: false,
      watchPaths: [tmpDir],
      ignorePaths: [],
      storageDirectory: path.join(tmpDir, ".selfhealing"),
      healingCooldownMs: 1,
    });
    system.activate();

    const eventPromise = new Promise<{ variable: string; fallbackValue: unknown }>((resolve) => {
      system?.once("fallback_applied", (payload) => {
        resolve(payload as { variable: string; fallbackValue: unknown });
      });
    });

    const error = new Error("missingCounter is not defined");
    error.name = "ReferenceError";
    await system.submitError(error);

    const payload = await eventPromise;
    expect(payload.variable).toBe("missingCounter");
    expect(payload.fallbackValue).toBe(0);
  });

  it("parses self-heal env config flags", () => {
    process.env.SELF_HEAL_ENABLED = "1";
    process.env.SELF_HEAL_PATCH_MODE = "log-only";
    process.env.SELF_HEAL_VERBOSE = "0";
    process.env.SELF_HEAL_MAX_ATTEMPTS = "9";
    process.env.SELF_HEAL_WATCHDOG_INTERVAL_MS = "45000";
    process.env.SELF_HEAL_DASHBOARD_ENABLED = "1";
    process.env.SELF_HEAL_DASHBOARD_PREFIX = "/healing";

    const config = resolveSelfHealingConfigFromEnv();
    const dashboard = resolveSelfHealingDashboardConfigFromEnv();
    expect(config.enabled).toBe(true);
    expect(config.patchMode).toBe("log-only");
    expect(config.verboseLogging).toBe(false);
    expect(config.maxHealingAttemptsPerError).toBe(9);
    expect(config.watchdogIntervalMs).toBe(45000);
    expect(dashboard.enabled).toBe(true);
    expect(dashboard.routePrefix).toBe("/healing");
  });
});
