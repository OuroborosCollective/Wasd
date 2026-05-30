import express, { type Request, type Response, type Router } from "express";
import { createWriteStream, existsSync, mkdirSync, rmSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const DEFAULT_ROOT = "/opt/areloria/private-assets/graphicriver-iso";
const MAX_UPLOAD_BYTES = 900 * 1024 * 1024;

function privateAssetRoot(): string {
  return path.resolve(process.env.CLIENT2D_GRAPHICRIVER_ISO_ROOT || DEFAULT_ROOT);
}

function run(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

async function processZip(zipPath: string, publicDir: string, repoRoot: string): Promise<void> {
  if (existsSync(publicDir)) rmSync(publicDir, { recursive: true, force: true });
  mkdirSync(publicDir, { recursive: true });
  await run("unzip", ["-q", "-o", zipPath, "-d", publicDir], repoRoot);
  await run("node", [
    "scripts/client2d-graphicriver-iso-manifest.mjs",
    "--root", publicDir,
    "--out", path.join(publicDir, "manifest.json"),
    "--public-base", "/client2d-assets/graphicriver-iso",
  ], repoRoot);
}

function statusPayload() {
  const root = privateAssetRoot();
  const rawZip = path.join(root, "raw", "graphicriver-iso-pack.zip");
  const publicDir = path.join(root, "public");
  const manifest = path.join(publicDir, "manifest.json");
  return {
    ok: true,
    root,
    rawZipExists: existsSync(rawZip),
    publicDirExists: existsSync(publicDir),
    manifestExists: existsSync(manifest),
    manifestUrl: "/client2d-assets/graphicriver-iso/manifest.json",
    uploadPage: "/client2d-asset-upload.html",
    uploadUrl: "/api/client2d-assets/upload",
    maxUploadBytes: MAX_UPLOAD_BYTES,
  };
}

export function client2dAssetUploadRouter(): Router {
  const r = express.Router();

  r.get("/status", (_req: Request, res: Response) => {
    res.json(statusPayload());
  });

  r.get("/upload", (_req: Request, res: Response) => {
    res.redirect(302, "/client2d-asset-upload.html");
  });

  r.post("/upload", async (req: Request, res: Response) => {
    const length = Number(req.headers["content-length"] || 0);
    if (!Number.isFinite(length) || length <= 0) return res.status(411).json({ error: "content-length required" });
    if (length > MAX_UPLOAD_BYTES) return res.status(413).json({ error: "zip too large", maxBytes: MAX_UPLOAD_BYTES });

    const contentType = String(req.headers["content-type"] || "").toLowerCase();
    if (contentType && !contentType.includes("zip") && !contentType.includes("octet-stream")) {
      return res.status(415).json({ error: "expected zip upload", contentType });
    }

    const root = privateAssetRoot();
    const rawDir = path.join(root, "raw");
    const publicDir = path.join(root, "public");
    const zipPath = path.join(rawDir, "graphicriver-iso-pack.zip");
    const repoRoot = path.resolve(process.cwd());

    mkdirSync(rawDir, { recursive: true });
    mkdirSync(publicDir, { recursive: true });

    try {
      await pipeline(req, createWriteStream(zipPath));
      await processZip(zipPath, publicDir, repoRoot);
      res.json({ ...statusPayload(), uploaded: true });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  return r;
}
