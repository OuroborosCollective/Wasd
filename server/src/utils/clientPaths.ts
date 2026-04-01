import fs from "node:fs";
import path from "node:path";

function existsIndexHtml(dir: string): boolean {
  return fs.existsSync(path.join(dir, "index.html"));
}

/**
 * Resolves the directory containing the built SPA (Vite `client/dist`).
 * On VPS layouts where only `server/` is deployed under `/opt/server`, the
 * relative path from compiled `dist/core` goes to `/opt/client/dist` instead of
 * the monorepo's `.../areloria/client/dist`. This checks several candidates and
 * supports CLIENT_DIST_PATH / CLIENT_ROOT overrides.
 */
export function resolveClientDistDir(serverCoreDir: string): string {
  const env = process.env.CLIENT_DIST_PATH?.trim();
  if (env) {
    return path.isAbsolute(env) ? env : path.resolve(process.cwd(), env);
  }

  const candidates = [
    path.resolve(serverCoreDir, "../../../client/dist"),
    path.resolve(process.cwd(), "client/dist"),
    path.resolve(process.cwd(), "../client/dist"),
  ];

  for (const dir of candidates) {
    if (existsIndexHtml(dir)) return dir;
  }

  return candidates[0];
}

/** Vite dev server root (`client/`, not `dist`). */
export function resolveClientViteRoot(serverCoreDir: string, clientDistDir: string): string {
  const env = process.env.CLIENT_ROOT?.trim();
  if (env) {
    return path.isAbsolute(env) ? env : path.resolve(process.cwd(), env);
  }

  const fromDistParent = path.resolve(clientDistDir, "..");
  if (
    existsIndexHtml(fromDistParent) ||
    fs.existsSync(path.join(fromDistParent, "vite.config.ts")) ||
    fs.existsSync(path.join(fromDistParent, "vite.config.mts")) ||
    fs.existsSync(path.join(fromDistParent, "vite.config.js"))
  ) {
    return fromDistParent;
  }

  const candidates = [
    path.resolve(serverCoreDir, "../../../client"),
    path.resolve(process.cwd(), "client"),
    path.resolve(process.cwd(), "../client"),
  ];

  for (const dir of candidates) {
    if (
      existsIndexHtml(dir) ||
      fs.existsSync(path.join(dir, "vite.config.ts")) ||
      fs.existsSync(path.join(dir, "vite.config.mts")) ||
      fs.existsSync(path.join(dir, "vite.config.js"))
    ) {
      return dir;
    }
  }

  return path.resolve(serverCoreDir, "../../../client");
}
