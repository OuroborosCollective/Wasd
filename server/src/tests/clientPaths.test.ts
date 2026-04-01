import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveClientDistDir, resolveClientViteRoot } from "../utils/clientPaths.js";

describe("clientPaths", () => {
  let tmp: string;
  let prevCwd: string;
  let prevDist: string | undefined;
  let prevRoot: string | undefined;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ouro-client-paths-"));
    prevCwd = process.cwd();
    prevDist = process.env.CLIENT_DIST_PATH;
    prevRoot = process.env.CLIENT_ROOT;
    delete process.env.CLIENT_DIST_PATH;
    delete process.env.CLIENT_ROOT;
  });

  afterEach(() => {
    process.chdir(prevCwd);
    if (prevDist === undefined) delete process.env.CLIENT_DIST_PATH;
    else process.env.CLIENT_DIST_PATH = prevDist;
    if (prevRoot === undefined) delete process.env.CLIENT_ROOT;
    else process.env.CLIENT_ROOT = prevRoot;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("uses CLIENT_DIST_PATH when set", () => {
    const dist = path.join(tmp, "mydist");
    fs.mkdirSync(dist, { recursive: true });
    fs.writeFileSync(path.join(dist, "index.html"), "<html></html>");
    process.env.CLIENT_DIST_PATH = dist;
    expect(resolveClientDistDir("/fake/server/dist/core")).toBe(path.resolve(dist));
  });

  it("prefers cwd client/dist when relative path from __dirname has no index", () => {
    const monorepo = path.join(tmp, "repo");
    const clientDist = path.join(monorepo, "client", "dist");
    fs.mkdirSync(clientDist, { recursive: true });
    fs.writeFileSync(path.join(clientDist, "index.html"), "<html></html>");
    process.chdir(monorepo);
    const wrong = resolveClientDistDir("/opt/server/dist/core");
    expect(wrong).toBe(clientDist);
  });

  it("resolveClientViteRoot uses CLIENT_ROOT when set", () => {
    const root = path.join(tmp, "client");
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, "vite.config.ts"), "");
    process.env.CLIENT_ROOT = root;
    expect(resolveClientViteRoot("/x", "/y/dist")).toBe(path.resolve(root));
  });
});
