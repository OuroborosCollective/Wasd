/**
 * Optional published content pack root.
 *
 * Default:
 * - resolves to legacy `game-data/`
 * - searches from module location, cwd, and one level above cwd
 *
 * Published mode:
 * - set USE_PUBLISHED_CONTENT=1
 * - server loads from `published-content/current/`
 * - pack must contain a valid `content-pack-manifest.json`
 *
 * Direct pack override:
 * - set CONTENT_PACK_DIR=/absolute/or/relative/path
 * - pack must contain a valid `content-pack-manifest.json`
 *
 * Optional hard mode:
 * - set CONTENT_RESOLVER_STRICT=1
 * - invalid explicit pack / missing published pack / missing legacy markers throw instead of falling back
 *
 * Optional cache disable:
 * - set CONTENT_RESOLVER_CACHE=0
 *
 * Safety:
 * - no fake snapshots
 * - no silent success for invalid published packs
 * - no path traversal outside selected content root
 * - symlink-aware root containment checks
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type ContentDataSourceMode = "published" | "pack_dir" | "legacy";

export interface ContentDataSourceLabel {
  mode: ContentDataSourceMode;
  root: string;
  manifest?: string;
  reason?: string;
}

export interface ContentResolverCandidate {
  mode: ContentDataSourceMode;
  root: string;
  exists: boolean;
  hasManifest: boolean;
  manifestValid: boolean;
  hasLegacyMarkers: boolean;
  reason?: string;
}

export interface ContentResolverDiagnostics {
  selected: ContentDataSourceLabel;
  strict: boolean;
  cacheEnabled: boolean;
  candidates: ContentResolverCandidate[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRUTHY = new Set(["1", "true", "yes", "on"]);
const FALSY = new Set(["0", "false", "no", "off"]);
const CONTENT_PACK_MANIFEST = "content-pack-manifest.json";
const MAX_MANIFEST_BYTES = 1024 * 1024;

let cachedSource:
  | {
      key: string;
      value: ContentDataSourceLabel;
    }
  | null = null;

const emittedWarnings = new Set<string>();

function envTruthy(key: string): boolean {
  const value = process.env[key]?.trim().toLowerCase();
  return value ? TRUTHY.has(value) : false;
}

function envFalsy(key: string): boolean {
  const value = process.env[key]?.trim().toLowerCase();
  return value ? FALSY.has(value) : false;
}

function strictMode(): boolean {
  return envTruthy("CONTENT_RESOLVER_STRICT");
}

function cacheEnabled(): boolean {
  return !envFalsy("CONTENT_RESOLVER_CACHE");
}

function warnContent(message: string): void {
  if (emittedWarnings.has(message)) return;
  emittedWarnings.add(message);
  console.warn(`[Content] ${message}`);
}

function failOrWarn(message: string): void {
  if (strictMode()) {
    throw new Error(`[Content] ${message}`);
  }

  warnContent(message);
}

function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function dirExists(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function manifestPath(root: string): string {
  return path.join(root, CONTENT_PACK_MANIFEST);
}

function readJsonObject(filePath: string): Record<string, unknown> | null {
  try {
    const stat = fs.statSync(filePath);

    if (!stat.isFile()) return null;
    if (stat.size <= 0) return null;
    if (stat.size > MAX_MANIFEST_BYTES) return null;

    const raw = fs.readFileSync(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function hasValidManifest(root: string): boolean {
  return readJsonObject(manifestPath(root)) !== null;
}

function isContentRoot(dir: string): boolean {
  return hasValidManifest(dir);
}

function hasLegacyGameDataMarkers(dir: string): boolean {
  return (
    fileExists(path.join(dir, "npc", "npcs.json")) ||
    fileExists(path.join(dir, "quests", "quests.json")) ||
    fileExists(path.join(dir, "items", "items.json")) ||
    dirExists(path.join(dir, "npc")) ||
    dirExists(path.join(dir, "quests")) ||
    dirExists(path.join(dir, "items"))
  );
}

function uniquePaths(paths: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const candidate of paths) {
    const resolved = path.resolve(candidate);

    if (!seen.has(resolved)) {
      seen.add(resolved);
      result.push(resolved);
    }
  }

  return result;
}

function repoRootFromModule(): string {
  /**
   * Supports both common layouts:
   *
   * - server/src/modules/content/...
   * - server/dist/modules/content/...
   *
   * In both cases, four levels up points back to the repo root.
   */
  return path.resolve(__dirname, "../../../../");
}

function legacyGameDataCandidates(): string[] {
  const cwd = process.cwd();
  const repoRoot = repoRootFromModule();

  return uniquePaths([
    path.resolve(repoRoot, "game-data"),
    path.resolve(cwd, "game-data"),
    path.resolve(cwd, "../game-data"),
  ]);
}

function publishedContentCandidates(): string[] {
  const cwd = process.cwd();
  const repoRoot = repoRootFromModule();

  return uniquePaths([
    path.resolve(repoRoot, "published-content/current"),
    path.resolve(cwd, "published-content/current"),
    path.resolve(cwd, "../published-content/current"),
  ]);
}

function resolveEnvPath(input: string): string {
  return path.isAbsolute(input) ? path.resolve(input) : path.resolve(process.cwd(), input);
}

function pickLegacyGameData(): string {
  for (const candidate of legacyGameDataCandidates()) {
    if (hasLegacyGameDataMarkers(candidate)) {
      return candidate;
    }
  }

  const fallback = path.resolve(repoRootFromModule(), "game-data");

  failOrWarn(
    `No legacy game-data markers found. Falling back to expected path: ${fallback}`
  );

  return fallback;
}

function cacheKey(): string {
  return JSON.stringify({
    cwd: process.cwd(),
    dirname: __dirname,
    contentPackDir: process.env.CONTENT_PACK_DIR?.trim() ?? "",
    usePublishedContent: process.env.USE_PUBLISHED_CONTENT?.trim() ?? "",
    strict: process.env.CONTENT_RESOLVER_STRICT?.trim() ?? "",
  });
}

function resolveContentDataSourceUncached(): ContentDataSourceLabel {
  const override = process.env.CONTENT_PACK_DIR?.trim();

  if (override) {
    const root = resolveEnvPath(override);
    const manifest = manifestPath(root);

    if (isContentRoot(root)) {
      return {
        mode: "pack_dir",
        root,
        manifest,
        reason: "CONTENT_PACK_DIR",
      };
    }

    failOrWarn(
      `CONTENT_PACK_DIR=${override} has no valid ${CONTENT_PACK_MANIFEST} — falling back to legacy game-data`
    );
  }

  if (envTruthy("USE_PUBLISHED_CONTENT")) {
    for (const root of publishedContentCandidates()) {
      const manifest = manifestPath(root);

      if (isContentRoot(root)) {
        return {
          mode: "published",
          root,
          manifest,
          reason: "USE_PUBLISHED_CONTENT",
        };
      }
    }

    failOrWarn(
      `USE_PUBLISHED_CONTENT is set but no valid published pack with ${CONTENT_PACK_MANIFEST} was found — using legacy game-data`
    );
  }

  return {
    mode: "legacy",
    root: pickLegacyGameData(),
    reason: "legacy-game-data",
  };
}

function resolveContentDataSource(): ContentDataSourceLabel {
  if (!cacheEnabled()) {
    return resolveContentDataSourceUncached();
  }

  const key = cacheKey();

  if (cachedSource && cachedSource.key === key) {
    return cachedSource.value;
  }

  const value = resolveContentDataSourceUncached();
  cachedSource = { key, value };

  return value;
}

function realPathIfExists(inputPath: string): string | null {
  try {
    return fs.realpathSync.native(inputPath);
  } catch {
    return null;
  }
}

function nearestExistingPath(inputPath: string): string | null {
  let current = path.resolve(inputPath);

  while (true) {
    if (fs.existsSync(current)) {
      return current;
    }

    const parent = path.dirname(current);

    if (parent === current) {
      return null;
    }

    current = parent;
  }
}

function isInsideOrSame(root: string, target: string): boolean {
  const relative = path.relative(root, target);

  return (
    relative === "" ||
    (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function assertInsideRoot(root: string, target: string): string {
  const normalizedRoot = path.resolve(root);
  const normalizedTarget = path.resolve(target);

  if (!isInsideOrSame(normalizedRoot, normalizedTarget)) {
    throw new Error(
      `[Content] Refusing to resolve path outside content root: ${normalizedTarget}`
    );
  }

  /**
   * Symlink-aware containment:
   * - if root exists, compare against real root
   * - if target exists, compare real target
   * - if target does not exist, compare nearest existing parent
   *
   * This prevents a path like `content/symlink-to-outside/file.json`
   * from passing only because the lexical path starts with the root.
   */
  const realRoot = realPathIfExists(normalizedRoot) ?? normalizedRoot;
  const existingTargetOrParent = nearestExistingPath(normalizedTarget);

  if (existingTargetOrParent) {
    const realExisting = realPathIfExists(existingTargetOrParent) ?? existingTargetOrParent;

    if (!isInsideOrSame(realRoot, realExisting)) {
      throw new Error(
        `[Content] Refusing to resolve symlinked path outside content root: ${normalizedTarget}`
      );
    }
  }

  return normalizedTarget;
}

function normalizeRelativeContentPath(relativePath: string): string {
  if (typeof relativePath !== "string") {
    throw new TypeError("[Content] Content path must be a string");
  }

  if (relativePath.includes("\0")) {
    throw new Error("[Content] Content path contains a null byte");
  }

  const slashPath = relativePath.replace(/\\/g, "/");

  if (/^[a-zA-Z]:\//.test(slashPath)) {
    throw new Error(`[Content] Absolute drive paths are not allowed: ${relativePath}`);
  }

  /**
   * Keep compatibility with older callers that accidentally passed `/npc/npcs.json`.
   * It still resolves inside the content root, never as a filesystem absolute path.
   */
  return slashPath.replace(/^\/+/, "").replace(/\/+$/, "");
}

function describeCandidate(mode: ContentDataSourceMode, root: string, reason?: string): ContentResolverCandidate {
  const manifest = manifestPath(root);
  const hasManifest = fileExists(manifest);

  return {
    mode,
    root,
    exists: dirExists(root),
    hasManifest,
    manifestValid: hasManifest ? hasValidManifest(root) : false,
    hasLegacyMarkers: hasLegacyGameDataMarkers(root),
    reason,
  };
}

function buildDiagnosticsCandidates(): ContentResolverCandidate[] {
  const candidates: ContentResolverCandidate[] = [];

  const override = process.env.CONTENT_PACK_DIR?.trim();

  if (override) {
    candidates.push(
      describeCandidate("pack_dir", resolveEnvPath(override), "CONTENT_PACK_DIR")
    );
  }

  for (const root of publishedContentCandidates()) {
    candidates.push(describeCandidate("published", root, "published-candidate"));
  }

  for (const root of legacyGameDataCandidates()) {
    candidates.push(describeCandidate("legacy", root, "legacy-candidate"));
  }

  return candidates;
}

/**
 * Absolute path to the root folder that contains `npc/`, `quests/`, etc.
 * This can be either:
 *
 * - legacy `game-data`
 * - published snapshot with manifest
 * - explicit CONTENT_PACK_DIR with manifest
 */
export function getContentDataRoot(): string {
  return resolveContentDataSource().root;
}

/**
 * Join a path relative to content root.
 *
 * Use forward slashes:
 * - `items/items.json`
 * - `npc/npcs.json`
 *
 * Throws if the resolved path would escape the selected content root.
 */
export function resolveContentFile(relative: string): string {
  const root = getContentDataRoot();
  const rel = normalizeRelativeContentPath(relative);
  const target = path.resolve(root, rel);

  return assertInsideRoot(root, target);
}

/**
 * Join a directory path relative to content root.
 *
 * Empty string resolves to the selected content root.
 */
export function resolveContentDir(relativeDir: string): string {
  const root = getContentDataRoot();
  const rel = normalizeRelativeContentPath(relativeDir);
  const target = rel ? path.resolve(root, rel) : root;

  return assertInsideRoot(root, target);
}

/**
 * For health / logs.
 *
 * This returns the actual resolver decision instead of guessing from env afterward.
 */
export function getContentDataSourceLabel(): ContentDataSourceLabel {
  return resolveContentDataSource();
}

/**
 * Useful for tests that mutate process.env or process.cwd().
 */
export function resetContentDataRootCache(): void {
  cachedSource = null;
  emittedWarnings.clear();
}

/**
 * Useful for health endpoints, debug logs, or deploy diagnostics.
 * Does not change resolver state.
 */
export function getContentResolverDiagnostics(): ContentResolverDiagnostics {
  return {
    selected: resolveContentDataSource(),
    strict: strictMode(),
    cacheEnabled: cacheEnabled(),
    candidates: buildDiagnosticsCandidates(),
  };
}
