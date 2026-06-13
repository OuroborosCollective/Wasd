import express, { type Request, type Response, type Router } from "express";
import { adminWriteBlocked } from "../middleware/adminAuthMiddleware.js";
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

function uploadPage(): string {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Areloria Asset Upload</title><style>body{margin:0;min-height:100vh;background:#07120b;color:#f7ffd7;font-family:system-ui,sans-serif;display:grid;place-items:center;padding:20px}main{width:min(720px,100%);border:1px solid rgba(120,255,160,.28);border-radius:22px;padding:22px;background:linear-gradient(180deg,rgba(12,32,18,.96),rgba(2,8,4,.96));box-shadow:0 0 40px rgba(57,255,20,.14)}input,button{width:100%;box-sizing:border-box;border-radius:14px;border:1px solid rgba(170,255,190,.28);padding:13px;background:#061009;color:#fff}button{margin-top:16px;background:#16813c;font-weight:800}pre{white-space:pre-wrap;background:#010501;padding:14px;border-radius:14px;max-height:280px;overflow:auto}</style></head><body><main><h1>Areloria Client2D Asset Upload</h1><p>Wähle das GraphicRiver-Iso-ZIP aus. Es wird nur auf dem VPS gespeichert, entpackt und als Manifest bereitgestellt.</p><input id="file" type="file" accept=".zip,application/zip"><button id="btn" type="button">Upload & verarbeiten</button><h2>Status</h2><pre id="out">Bereit.</pre></main><script>const fileInput=document.getElementById('file');const btn=document.getElementById('btn');const out=document.getElementById('out');async function refresh(){try{const r=await fetch('/api/client2d-assets/status',{cache:'no-store'});out.textContent=JSON.stringify(await r.json(),null,2)}catch(e){out.textContent=String(e)}}btn.onclick=async()=>{const file=fileInput.files&&fileInput.files[0];if(!file){out.textContent='Bitte zuerst eine ZIP-Datei auswählen.';return}btn.disabled=true;out.textContent='Upload läuft. Bitte warten...';try{const r=await fetch('/api/client2d-assets/upload',{method:'POST',headers:{'content-type':'application/zip'},body:file});const text=await r.text();try{out.textContent=JSON.stringify(JSON.parse(text),null,2)}catch{out.textContent=text}}catch(e){out.textContent=String(e)}finally{btn.disabled=false}};refresh();</script></body></html>`;
}

export function client2dAssetUploadRouter(): Router {
  const r = express.Router();

  r.get("/status", (_req: Request, res: Response) => {
    res.json(statusPayload());
  });

  r.get("/upload", (_req: Request, res: Response) => {
    res.type("html").send(uploadPage());
  });

  r.post("/upload", adminWriteBlocked, async (req: Request, res: Response) => {
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
