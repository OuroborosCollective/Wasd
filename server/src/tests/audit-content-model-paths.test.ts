import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { auditContentModelPaths, resolveModelPathOnDisk } from "../modules/content/auditContentModelPaths.js";

describe("auditContentModelPaths", () => {
  let tmp: string;
  let repo: string;
  let content: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "audit-models-"));
    repo = path.join(tmp, "repo");
    content = path.join(repo, "game-data");
    fs.mkdirSync(path.join(repo, "client", "public", "assets", "models", "monsters"), { recursive: true });
    fs.writeFileSync(path.join(repo, "client", "public", "assets", "models", "monsters", "a.glb"), "x");
    fs.mkdirSync(path.join(content, "world"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("resolveModelPathOnDisk finds file under client/public/assets/models", () => {
    expect(resolveModelPathOnDisk("/assets/models/monsters/a.glb", repo)).toContain("monsters/a.glb");
    expect(resolveModelPathOnDisk("/assets/models/missing.glb", repo)).toBeNull();
  });

  it("reports missing glb-links and passes when file exists", () => {
    fs.writeFileSync(
      path.join(content, "glb-links.json"),
      JSON.stringify([{ glbPath: "/assets/models/monsters/a.glb", targetType: "npc_single", targetId: "x" }])
    );
    let r = auditContentModelPaths(content, repo);
    expect(r.ok).toBe(true);
    expect(r.missing).toHaveLength(0);

    fs.writeFileSync(
      path.join(content, "glb-links.json"),
      JSON.stringify([{ glbPath: "/assets/models/monsters/nope.glb", targetType: "npc_single", targetId: "x" }])
    );
    r = auditContentModelPaths(content, repo);
    expect(r.ok).toBe(false);
    expect(r.missing.some((m) => m.urlPath.includes("nope"))).toBe(true);
  });
});
