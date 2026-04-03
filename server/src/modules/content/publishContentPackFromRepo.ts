import fs from "node:fs";
import path from "node:path";
import { validateContentRoot } from "./validateContentCore.js";
import { findRepoRootWithGameData } from "./repoRoot.js";

export type PublishResult =
  | { ok: true; dest: string; message: string }
  | { ok: false; code: "no_repo" | "validation_failed"; message: string; errors?: string[] };

/**
 * Validates repo `game-data/` and copies it to `published-content/current/` + manifest.
 * Does not depend on server CONTENT_PACK_DIR (always publishes from repo layout).
 */
export function publishContentPackFromRepo(): PublishResult {
  const repo = findRepoRootWithGameData();
  if (!repo) {
    return {
      ok: false,
      code: "no_repo",
      message:
        "Monorepo mit game-data/ nicht gefunden (Arbeitsverzeichnis zu weit vom Projekt?). Publish nur auf dem VPS mit vollem Repo oder setze cwd.",
    };
  }

  const src = path.join(repo, "game-data");
  const dest = path.join(repo, "published-content", "current");

  if (!fs.existsSync(path.join(src, "npc", "npcs.json"))) {
    return { ok: false, code: "no_repo", message: "game-data/ fehlt oder ist unvollständig." };
  }

  const validation = validateContentRoot(src);
  if (!validation.ok) {
    return {
      ok: false,
      code: "validation_failed",
      message: "Inhalt ungültig — bitte Fehler beheben, dann erneut veröffentlichen.",
      errors: validation.errors,
    };
  }

  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: "game-data",
    description: "Published content snapshot — server: USE_PUBLISHED_CONTENT=1 or CONTENT_PACK_DIR",
  };
  fs.writeFileSync(path.join(dest, "content-pack-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

  return {
    ok: true,
    dest,
    message:
      "Pack erstellt. Server neu starten mit USE_PUBLISHED_CONTENT=1 oder CONTENT_PACK_DIR=" + dest,
  };
}
