import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SelfHealingSystem,
  resolveSelfHealingConfigFromEnv,
  resolveSelfHealingDashboardConfigFromEnv,
  safeExecute,
} from "../selfhealing/SelfHealingSystem.js";

describe("SelfHealingSystem", () => {
  let tmpDir = "";
  const originalEnv = { ...process.env };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arel-selfheal-"));
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    process.env = { ...originalEnv };
  });

  it("applies a deterministic atomic guard marker at an explicit source offset", () => {
    const targetFile = path.join(tmpDir, "heal-target.ts");
    const source = ["export function update(player: { stats: { hp: number } }) {", "  player.stats.hp += 1;", "}"].join("\n");
    fs.writeFileSync(targetFile, source, "utf-8");

    const system = new SelfHealingSystem();
    const position = source.indexOf("player.stats");
    const patched = system.validateAndPatch(targetFile, position, "player");

    expect(patched).toBe(true);
    expect(fs.readFileSync(targetFile, "utf-8")).toContain("/*SH*/player??");
  });

  it("refuses to patch excluded Jules paths", () => {
    const targetFile = path.join(tmpDir, "Jules-generated.ts");
    const source = "export const value = 1;";
    fs.writeFileSync(targetFile, source, "utf-8");

    const system = new SelfHealingSystem();
    expect(system.validateAndPatch(targetFile, 0, "value")).toBe(false);
    expect(fs.readFileSync(targetFile, "utf-8")).toBe(source);
  });

  it("records source scans through the deterministic invariant guard", () => {
    const targetFile = path.join(tmpDir, "source.ts");
    fs.writeFileSync(targetFile, "export const now = Date.now();", "utf-8");

    const system = new SelfHealingSystem();
    system.scanSourceFile(targetFile);
    const status = system.getStatus();

    expect(status.sourceScans).toBe(1);
    expect(status.areGuardStatus).toBeDefined();
  });

  it("returns the requested fallback while scheduling a best-effort patch", () => {
    const fallback = safeExecute(
      () => {
        throw new Error("runtime failure");
      },
      0,
      path.join(tmpDir, "missing.ts"),
      0,
      "missingCounter",
    );

    expect(fallback).toBe(0);
  });

  it("exposes the fixed deterministic runtime configuration", () => {
    process.env.SELF_HEAL_PATCH_MODE = "safe";
    const config = resolveSelfHealingConfigFromEnv();
    const dashboard = resolveSelfHealingDashboardConfigFromEnv();

    expect(config).toEqual({ patchMode: "atomic" });
    expect(dashboard).toEqual({});
  });
});
