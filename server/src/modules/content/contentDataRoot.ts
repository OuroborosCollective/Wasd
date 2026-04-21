/**
 * Optional published content pack root. When disabled (default), resolves to legacy `game-data/`
 * (repo root or one level up from server cwd). Generators and editors can write snapshots to
 * `published-content/current/` and set USE_PUBLISHED_CONTENT=1 for the server to load them.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRUTHY = new Set(["1", "true", "yes", "on"]);

function envTruthy(key: string): boolean {
  const v = process.env[key]?.trim().toLowerCase();
  return v ? TRUTHY.has(v) : false;
}

function manifestPath(root: string): string {
  return path.join(root, "content-pack-manifest.json");
}

function isContentRoot(dir: string): boolean {
  try {
    return fs.existsSync(manifestPath(dir));
  } catch {
    return false;
  }
}

function legacyGameDataCandidates(): string[] {
  const cwd = process.cwd();
  /** From server/src/modules/content → repo root game-data (same as validateContent.ts). */
  const fromModule = path.resolve(__dirname, "../../../../game-data");
  return [
    fromModule,
    path.resolve(cwd, "game-data"),
    path.resolve(cwd, "../game-data"),
  ];
}

/** First directory that looks like legacy game-data (has npc or quests). */
function pickLegacyGameData(): string {
  for (const g of legacyGameDataCandidates()) {
    if (
      fs.existsSync(path.join(g, "npc", "npcs.json")) ||
      fs.existsSync(path.join(g, "quests", "quests.json"))
    ) {
      return g;
    }
  }
  return path.resolve(__dirname, "../../../../game-data");
}

/**
 * Absolute path to the root folder that contains `npc/`, `quests/`, etc.
 * (either `game-data` layout or a published pack snapshot of the same layout).
 */
export function getContentDataRoot(): string {
  const override = process.env.CONTENT_PACK_DIR?.trim();
  if (override) {
    const abs = path.isAbsolute(override) ? override : path.resolve(process.cwd(), override);
    if (isContentRoot(abs)) {
      return abs;
    }
    console.warn(
      `[Content] CONTENT_PACK_DIR=${override} has no content-pack-manifest.json — falling back to legacy game-data`
    );
  }

  if (envTruthy("USE_PUBLISHED_CONTENT")) {
    const cwd = process.cwd();
    const publishedCandidates = [
      path.resolve(cwd, "published-content/current"),
      path.resolve(cwd, "../published-content/current"),
    ];
    for (const p of publishedCandidates) {
      if (isContentRoot(p)) {
        return p;
      }
    }
    console.warn(
      "[Content] USE_PUBLISHED_CONTENT is set but no valid published pack found — using legacy game-data"
    );
  }

  return pickLegacyGameData();
}

/** Join a path relative to content root (use forward slashes in `relative`, e.g. `items/items.json`). */
export function resolveContentFile(relative: string): string {
  const rel = relative.replace(/^[/\\]+/, "");
  return path.join(getContentDataRoot(), rel);
}

export function resolveContentDir(relativeDir: string): string {
  const rel = relativeDir.replace(/^[/\\]+/, "").replace(/[/\\]+$/, "");
  return path.join(getContentDataRoot(), rel);
}

/** For health / logs */
export function getContentDataSourceLabel(): { mode: "published" | "pack_dir" | "legacy"; root: string } {
  const root = getContentDataRoot();
  if (process.env.CONTENT_PACK_DIR?.trim() && isContentRoot(root)) {
    return { mode: "pack_dir", root };
  }
  if (envTruthy("USE_PUBLISHED_CONTENT") && isContentRoot(root)) {
    return { mode: "published", root };
  }
  return { mode: "legacy", root };
}
