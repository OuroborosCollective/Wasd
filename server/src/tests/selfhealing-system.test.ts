import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SelfHealingSystem,
  bootstrapSelfHealing,
  resolveSelfHealingConfigFromEnv,
  resolveSelfHealingDashboardConfigFromEnv,
} from "../selfhealing/SelfHealingSystem.js";

describe("SelfHealingSystem", () => {
  let tmpDir = "";
  const originalEnv = { ...process.env };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arel-selfheal-"));
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    process.env = { ...originalEnv };
  });

  it("bootstrapSelfHealing returns a SelfHealingSystem instance", () => {
    const sys = bootstrapSelfHealing({ patchMode: "atomic" });
    expect(sys).toBeInstanceOf(SelfHealingSystem);
  });

  it("validateAndPatch can inject a deterministic null-guard marker", () => {
    const targetFile = path.join(tmpDir, "heal-target.ts");
    fs.writeFileSync(targetFile, "player.stats.hp += 1;\n", "utf-8");
    const sys = new SelfHealingSystem();
    const pos = Buffer.from(fs.readFileSync(targetFile, "utf-8"), "utf8").indexOf("player");
    expect(pos).toBeGreaterThanOrEqual(0);
    const ok = sys.validateAndPatch(targetFile, pos, "player");
    expect(ok).toBe(true);
    const patched = fs.readFileSync(targetFile, "utf-8");
    expect(patched).toContain("(/*SH*/player??");
  });

  it("resolveSelfHealingConfigFromEnv returns defaults", () => {
    const config = resolveSelfHealingConfigFromEnv();
    expect(config.patchMode).toBe("atomic");
  });

  it("resolveSelfHealingDashboardConfigFromEnv returns an object", () => {
    const dashboard = resolveSelfHealingDashboardConfigFromEnv();
    expect(dashboard).toBeTypeOf("object");
  });
});
