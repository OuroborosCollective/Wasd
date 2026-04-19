/**
 * Asset Validation Cache
 *
 * Caches GLB validation results to avoid re-checking unchanged files.
 * Uses mtime + fileSize as primary key (optional SHA1 for higher confidence).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import type {
  AssetCacheEntry,
  GLBValidationResult,
} from "../core/liveheal/LiveHealTypes.js";

function safeReadJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJson(filePath: string, data: unknown): void {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // best effort
  }
}

export class AssetValidationCache {
  private readonly cache = new Map<string, AssetCacheEntry>();
  private readonly cachePath: string;
  private readonly hashStrategy: "mtime-size" | "sha1";
  private dirty = false;

  constructor(cachePath: string, hashStrategy: "mtime-size" | "sha1" = "mtime-size") {
    this.cachePath = cachePath;
    this.hashStrategy = hashStrategy;
    this.load();
  }

  private load(): void {
    const data = safeReadJson<AssetCacheEntry[]>(this.cachePath, []);
    for (const entry of data) {
      if (entry && typeof entry.filePath === "string") {
        this.cache.set(entry.filePath, entry);
      }
    }
  }

  persist(): void {
    if (!this.dirty) return;
    this.dirty = false;
    const data = Array.from(this.cache.values());
    safeWriteJson(this.cachePath, data);
  }

  /**
   * Get the cache key for a file based on current filesystem state.
   */
  getCacheKey(filePath: string): string | null {
    try {
      const stat = fs.statSync(filePath);
      if (this.hashStrategy === "sha1") {
        const buf = fs.readFileSync(filePath);
        const hash = crypto.createHash("sha1").update(buf).digest("hex");
        return `${stat.mtimeMs}:${stat.size}:${hash}`;
      }
      return `${stat.mtimeMs}:${stat.size}`;
    } catch {
      return null;
    }
  }

  /**
   * Check if a file has a cached validation result that matches its current state.
   */
  getCached(filePath: string): GLBValidationResult | null {
    const entry = this.cache.get(filePath);
    if (!entry) return null;

    const currentKey = this.getCacheKey(filePath);
    if (!currentKey) return null;

    // Build the cached key from entry data
    let cachedKey: string;
    if (entry.hash) {
      cachedKey = `${entry.mtimeMs}:${entry.fileSize}:${entry.hash}`;
    } else {
      cachedKey = `${entry.mtimeMs}:${entry.fileSize}`;
    }

    if (cachedKey !== currentKey) {
      // File changed, cache miss
      return null;
    }

    return entry.lastValidation;
  }

  /**
   * Store a validation result in the cache.
   */
  set(filePath: string, result: GLBValidationResult): void {
    const stat = (() => {
      try {
        return fs.statSync(filePath);
      } catch {
        return null;
      }
    })();

    let hash: string | undefined;
    if (this.hashStrategy === "sha1") {
      try {
        const buf = fs.readFileSync(filePath);
        hash = crypto.createHash("sha1").update(buf).digest("hex");
      } catch {
        // best effort
      }
    }

    this.cache.set(filePath, {
      filePath,
      mtimeMs: stat?.mtimeMs ?? result.mtimeMs,
      fileSize: stat?.size ?? result.fileSize,
      hash,
      lastValidation: result,
    });
    this.dirty = true;
  }

  /**
   * Remove an entry from the cache.
   */
  delete(filePath: string): void {
    this.cache.delete(filePath);
    this.dirty = true;
  }

  /**
   * Get all cached file paths.
   */
  getFilePaths(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get the count of cached entries.
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Force persist.
   */
  flush(): void {
    this.persist();
  }
}
