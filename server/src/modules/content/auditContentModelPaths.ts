import fs from "node:fs";
import path from "node:path";

export type ModelPathAuditIssue = {
  urlPath: string;
  source: string;
};

const ASSETS_PREFIX = "/assets/models/";
const LEGACY_WORLD_PREFIX = "/world-assets/";

function isModelUrl(s: string): boolean {
  const t = s.trim();
  return t.startsWith(ASSETS_PREFIX) || t.startsWith(LEGACY_WORLD_PREFIX);
}

/**
 * Resolve a game URL to an on-disk file under the monorepo (first match wins).
 */
export function resolveModelPathOnDisk(urlPath: string, repoRoot: string): string | null {
  const p = urlPath.trim();
  if (!p.startsWith("/")) return null;

  if (p.startsWith(ASSETS_PREFIX)) {
    const rel = p.slice(ASSETS_PREFIX.length);
    if (!rel || rel.includes("..")) return null;
    const abs = path.join(repoRoot, "client", "public", "assets", "models", rel);
    return fs.existsSync(abs) && fs.statSync(abs).isFile() ? abs : null;
  }

  if (p.startsWith(LEGACY_WORLD_PREFIX)) {
    const rel = p.slice(LEGACY_WORLD_PREFIX.length);
    if (!rel || rel.includes("..")) return null;
    const candidates = [
      path.join(repoRoot, "world-assets", rel),
      path.join(repoRoot, "client", "public", "assets", "models", "world-assets", rel),
      path.join(repoRoot, "client", "public", "world-assets", rel),
    ];
    for (const abs of candidates) {
      if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
    }
    return null;
  }

  return null;
}

function collectStringsFromJson(value: unknown, acc: Set<string>): void {
  if (value === null || value === undefined) return;
  if (typeof value === "string") {
    if (isModelUrl(value)) acc.add(value.trim());
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v) => collectStringsFromJson(v, acc));
    return;
  }
  if (typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectStringsFromJson(v, acc);
    }
  }
}

export type ModelPathAuditResult = {
  ok: boolean;
  missing: ModelPathAuditIssue[];
  checked: number;
  uniqueModelUrls: number;
  repoRoot: string;
  contentRoot: string;
};

/**
 * Compare glbPath / asset-pool model URLs in game-data against files under client/public and world-assets.
 */
export function auditContentModelPaths(contentRoot: string, repoRoot: string): ModelPathAuditResult {
  const refs: ModelPathAuditIssue[] = [];

  const glbLinksPath = path.join(contentRoot, "glb-links.json");
  if (fs.existsSync(glbLinksPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(glbLinksPath, "utf-8")) as Array<{
        glbPath?: string;
        targetType?: string;
        targetId?: string;
      }>;
      if (Array.isArray(raw)) {
        for (const row of raw) {
          const u = typeof row.glbPath === "string" ? row.glbPath.trim() : "";
          if (!u) continue;
          const src = `glb-links.json: ${row.targetType ?? "?"}/${row.targetId ?? "?"}`;
          refs.push({ urlPath: u, source: src });
        }
      }
    } catch {
      refs.push({ urlPath: "(parse error)", source: "glb-links.json" });
    }
  }

  const objectsPath = path.join(contentRoot, "world", "objects.json");
  if (fs.existsSync(objectsPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(objectsPath, "utf-8")) as Array<{ id?: string; glbPath?: string }>;
      if (Array.isArray(raw)) {
        for (const row of raw) {
          const u = typeof row.glbPath === "string" ? row.glbPath.trim() : "";
          if (!u) continue;
          refs.push({ urlPath: u, source: `world/objects.json: ${row.id ?? "?"}` });
        }
      }
    } catch {
      refs.push({ urlPath: "(parse error)", source: "world/objects.json" });
    }
  }

  const poolsPath = path.join(contentRoot, "world", "asset-pools.json");
  if (fs.existsSync(poolsPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(poolsPath, "utf-8")) as unknown;
      const urls = new Set<string>();
      collectStringsFromJson(raw, urls);
      for (const u of urls) {
        refs.push({ urlPath: u, source: "world/asset-pools.json" });
      }
    } catch {
      refs.push({ urlPath: "(parse error)", source: "world/asset-pools.json" });
    }
  }

  const unique = new Set<string>();
  const missing: ModelPathAuditIssue[] = [];

  for (const r of refs) {
    if (r.urlPath.startsWith("(")) {
      missing.push(r);
      continue;
    }
    unique.add(r.urlPath);
    if (!resolveModelPathOnDisk(r.urlPath, repoRoot)) {
      missing.push(r);
    }
  }

  return {
    ok: missing.length === 0,
    missing,
    checked: refs.length,
    uniqueModelUrls: unique.size,
    repoRoot,
    contentRoot,
  };
}
