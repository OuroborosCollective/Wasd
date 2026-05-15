import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Canonical protocol source (was root `shared/protocol.ts`, now lives in @wasd/shared). */
function protocolSourcePath() {
  return path.resolve(__dirname, "../../../packages/shared/src/types/protocol.ts");
}

describe("Shared protocol types", () => {
  it("shared protocol source exists and is non-empty", () => {
    const protocolPath = protocolSourcePath();
    expect(fs.existsSync(protocolPath)).toBe(true);
    const content = fs.readFileSync(protocolPath, "utf-8");
    expect(content.length).toBeGreaterThan(100);
  });

  it("protocol exports FxKind type with expected values", () => {
    const protocolPath = protocolSourcePath();
    const content = fs.readFileSync(protocolPath, "utf-8");
    expect(content).toContain('"hit"');
    expect(content).toContain('"crit"');
    expect(content).toContain('"heal"');
    expect(content).toContain('"miss"');
    expect(content).toContain('"gold"');
  });

  it("protocol exports ServerMsg with combat_result and fx", () => {
    const protocolPath = protocolSourcePath();
    const content = fs.readFileSync(protocolPath, "utf-8");
    expect(content).toContain("combat_result");
    expect(content).toContain('"fx"');
    expect(content).toContain("loot_spawned");
    expect(content).toContain("loot_picked");
  });

  it("protocol exports LootNet interface", () => {
    const protocolPath = protocolSourcePath();
    const content = fs.readFileSync(protocolPath, "utf-8");
    expect(content).toContain("LootNet");
    expect(content).toContain("despawnAt");
    expect(content).toContain("ownerId");
  });

  it("protocol exports ClientMsg with all gameplay actions", () => {
    const protocolPath = protocolSourcePath();
    const content = fs.readFileSync(protocolPath, "utf-8");
    expect(content).toContain('"attack"');
    expect(content).toContain('"loot_take"');
    expect(content).toContain('"craft"');
    expect(content).toContain('"house_place"');
    expect(content).toContain('"quest_accept"');
  });
});
