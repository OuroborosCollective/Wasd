#!/usr/bin/env node
/**
 * Populate `client/dist/` with `client/public/` so production `express.static(client/dist)`
 * serves smoke and admin HTML without a full Vite bundle (used by `pnpm run test:e2e:ci` / DGCC).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const pub = path.join(root, "client", "public");
const dist = path.join(root, "client", "dist");

function rmrf(p) {
  if (!fs.existsSync(p)) return;
  fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, name.name);
    const to = path.join(dest, name.name);
    if (name.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

if (!fs.existsSync(pub)) {
  console.error("[e2e-mirror-client-public] Missing", pub);
  process.exit(1);
}
rmrf(dist);
fs.mkdirSync(dist, { recursive: true });
copyDir(pub, dist);
console.log("[e2e-mirror-client-public] Mirrored", path.relative(root, pub), "→", path.relative(root, dist));
