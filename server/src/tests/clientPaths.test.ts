import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { resolveClientPaths } from "../core/clientPaths.js";

describe("resolveClientPaths", () => {
  it("finds the monorepo client package (vite root + dist)", () => {
    const { root, dist } = resolveClientPaths();
    expect(fs.existsSync(path.join(root, "vite.config.ts"))).toBe(true);
    expect(dist).toBe(path.join(root, "dist"));
  });
});
