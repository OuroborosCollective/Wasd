import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type ClientPaths = { root: string; dist: string };

/**
 * Resolves client Vite root and production `dist` for static hosting.
 * Deployments that only copy `server/` under e.g. `/opt/server` break a naive
 * `../../../client/dist` from `server/dist/core` (that points at `/opt/client/dist`).
 * Prefer CLIENT_DIST_PATH / CLIENT_ROOT_PATH, then cwd, then extra parent segments.
 */
export function resolveClientPaths(): ClientPaths {
  const envRoot = process.env.CLIENT_ROOT_PATH?.trim();
  const envDist = process.env.CLIENT_DIST_PATH?.trim();

  if (envDist) {
    const dist = path.resolve(envDist);
    const root = envRoot ? path.resolve(envRoot) : path.resolve(dist, "..");
    return { root, dist };
  }

  if (envRoot) {
    const root = path.resolve(envRoot);
    return { root, dist: path.join(root, "dist") };
  }

  const cwdClient = path.join(process.cwd(), "client");
  const coreDir = __dirname;

  const rootCandidates = [
    path.resolve(coreDir, "../../../client"),
    path.resolve(coreDir, "../../../../client"),
    cwdClient,
  ];

  for (const root of rootCandidates) {
    if (!fs.existsSync(path.join(root, "vite.config.ts"))) {
      continue;
    }
    const dist = path.join(root, "dist");
    return { root, dist };
  }

  const distCandidates = [
    path.resolve(coreDir, "../../../client/dist"),
    path.resolve(coreDir, "../../../../client/dist"),
    path.join(cwdClient, "dist"),
  ];

  for (const dist of distCandidates) {
    if (fs.existsSync(path.join(dist, "index.html"))) {
      return { root: path.resolve(dist, ".."), dist: path.resolve(dist) };
    }
  }

  const fallbackRoot = path.resolve(coreDir, "../../../client");
  return { root: fallbackRoot, dist: path.join(fallbackRoot, "dist") };
}
