import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveMonorepoRootEnvPath } from "../config/loadRootEnv.js";

describe("loadRootEnvFiles path resolution", () => {
  it("resolves monorepo root .env (parent of server/, not server/.env)", () => {
    const envFile = resolveMonorepoRootEnvPath();
    const repoRoot = path.dirname(envFile);
    expect(path.basename(envFile)).toBe(".env");
    expect(fs.existsSync(path.join(repoRoot, "server", "package.json"))).toBe(true);
  });
});
