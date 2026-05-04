// @ts-nocheck
/**
 * Asset Health Service
 *
 * Scans GLB assets in configured root paths, validates them,
 * caches results, quarantines hard failures, and provides
 * health snapshots for the LiveHeal subsystem.
 *
 * Startup scan + incremental (only changed files).
 * Never deletes functioning assets. Warns on questionable files.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type {
  HealthSnapshot,
  SubSystemAdapter,
  GLBValidationResult,
  AssetHealthConfig,
  QuarantineEntry,
} from "../core/liveheal/LiveHealTypes.js";
import { validateGLBFile } from "./GLBAssetValidator.js";
import { AssetValidationCache } from "./AssetValidationCache.js";
import { AssetQuarantineService } from "./AssetQuarantineService.js";

function findGLBFiles(dirPath: string): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        // Skip quarantine directories and hidden directories
        if (entry.name.startsWith("_quarantine") || entry.name.startsWith(".")) {
          continue;
        }
        results.push(...findGLBFiles(fullPath));
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".glb")) {
        results.push(fullPath);
      }
    }
  } catch {
    // best effort - skip inaccessible directories
  }
  return results;
}

export class AssetHealthService implements SubSystemAdapter {
  readonly id = "asset-health";

  private readonly config: AssetHealthConfig;
  private readonly cache: AssetValidationCache;
  private readonly quarantine: AssetQuarantineService;

  private totalScanned = 0;
  private totalValid = 0;
  private totalWarnings = 0;
  private totalHardFailures = 0;
  private totalQuarantined = 0;
  private lastScanAt = 0;
  private scanDurationMs = 0;
  private startupScanDone = false;

  constructor(config: AssetHealthConfig) {
    this.config = config;
    this.cache = new AssetValidationCache(
      path.join(config.quarantinePath, "..", "asset-validation-cache.json"),
      config.hashStrategy
    );
    this.quarantine = new AssetQuarantineService(config.quarantinePath);
  }

  /**
   * Perform a full startup scan of all configured asset root paths.
   */
  async startupScan(): Promise<void> {
    if (!this.config.enabled || !this.config.startupScan) {
      return;
    }
    const startTime = Date.now();

    for (const rootPath of this.config.assetRootPaths) {
      const resolved = path.resolve(process.cwd(), rootPath);
      if (!fs.existsSync(resolved)) {
        continue;
      }
      const glbFiles = findGLBFiles(resolved);
      for (const filePath of glbFiles) {
        await this.validateFile(filePath);
      }
    }

    this.scanDurationMs = Date.now() - startTime;
    this.lastScanAt = Date.now();
    this.startupScanDone = true;
  }

  /**
   * Perform an incremental scan - only check new or changed files.
   */
  async incrementalScan(): Promise<void> {
    if (!this.config.enabled || !this.config.incrementalScan) {
      return;
    }

    const startTime = Date.now();
    let checked = 0;

    for (const rootPath of this.config.assetRootPaths) {
      const resolved = path.resolve(process.cwd(), rootPath);
      if (!fs.existsSync(resolved)) {
        continue;
      }
      const glbFiles = findGLBFiles(resolved);
      for (const filePath of glbFiles) {
        if (this.config.validateOnlyChangedFiles) {
          const cached = this.cache.getCached(filePath);
          if (cached) {
            // File unchanged, use cached result
            this.totalScanned += 1;
            if (cached.valid) this.totalValid += 1;
            continue;
          }
        }
        await this.validateFile(filePath);
        checked += 1;
      }
    }

    this.scanDurationMs = Date.now() - startTime;
    this.lastScanAt = Date.now();
  }

  /**
   * Validate a single GLB file. Caches result and quarantines on hard failure.
   */
  async validateFile(filePath: string): Promise<GLBValidationResult> {
    this.totalScanned += 1;

    // Check cache first
    const cached = this.cache.getCached(filePath);
    if (cached) {
      if (cached.valid) this.totalValid += 1;
      return cached;
    }

    // Validate
    const result = validateGLBFile(filePath);
    this.cache.set(filePath, result);

    if (result.severity === "ok") {
      this.totalValid += 1;
    } else if (result.severity === "warning") {
      this.totalWarnings += 1;
    } else if (result.severity === "hardFailure") {
      this.totalHardFailures += 1;

      // Quarantine on hard failure
      const quarantineEntry = this.quarantine.quarantine(result);
      if (quarantineEntry) {
        this.totalQuarantined += 1;
      }
    }

    return result;
  }

  /**
   * Get a health snapshot for the LiveHeal subsystem adapter interface.
   */
  getHealthSnapshot(): HealthSnapshot {
    const total = this.totalScanned;
    const errorRate = total > 0 ? this.totalHardFailures / total : 0;

    // Score: 100 if all OK, reduced by warnings and failures
    let score = 100;
    if (total > 0) {
      score = Math.max(0, 100 - (this.totalHardFailures / total) * 80 - (this.totalWarnings / total) * 20);
    }

    let status: "healthy" | "degraded" | "critical";
    if (errorRate > 0.1) {
      status = "critical";
    } else if (errorRate > 0.03 || this.totalHardFailures > 0) {
      status = "degraded";
    } else {
      status = "healthy";
    }

    const symptomTags: string[] = [];
    if (this.totalHardFailures > 0) symptomTags.push("hard_failure_detected");
    if (this.totalQuarantined > 0) symptomTags.push("assets_quarantined");
    if (!this.startupScanDone) symptomTags.push("startup_scan_pending");

    return {
      ok: status === "healthy",
      status,
      score: Math.round(score),
      errorCode: this.totalHardFailures > 0 ? "asset_corruption_detected" : undefined,
      symptomTags,
      metrics: {
        custom: {
          totalScanned: this.totalScanned,
          totalValid: this.totalValid,
          totalWarnings: this.totalWarnings,
          totalHardFailures: this.totalHardFailures,
          totalQuarantined: this.totalQuarantined,
          scanDurationMs: this.scanDurationMs,
          cacheSize: this.cache.size,
        },
      },
      details: {
        lastScanAt: this.lastScanAt,
        startupScanDone: this.startupScanDone,
      },
      canServeReadOnly: true,
    };
  }

  /**
   * Get all validation results for introspection.
   */
  getCachedResults(): GLBValidationResult[] {
    return this.cache.getFilePaths()
      .map((p) => this.cache.getCached(p))
      .filter((r): r is GLBValidationResult => r !== null);
  }

  /**
   * Get all quarantine entries.
   */
  getQuarantineEntries(): QuarantineEntry[] {
    return this.quarantine.getEntries();
  }

  /**
   * Restore a quarantined file.
   */
  restoreFromQuarantine(originalPath: string): boolean {
    const success = this.quarantine.restore(originalPath);
    if (success) {
      this.cache.delete(originalPath);
      this.totalQuarantined = Math.max(0, this.totalQuarantined - 1);
      this.totalHardFailures = Math.max(0, this.totalHardFailures - 1);
    }
    return success;
  }

  /**
   * Get service stats.
   */
  getStats() {
    return {
      totalScanned: this.totalScanned,
      totalValid: this.totalValid,
      totalWarnings: this.totalWarnings,
      totalHardFailures: this.totalHardFailures,
      totalQuarantined: this.totalQuarantined,
      lastScanAt: this.lastScanAt,
      scanDurationMs: this.scanDurationMs,
      startupScanDone: this.startupScanDone,
      cacheSize: this.cache.size,
    };
  }

  /**
   * Flush cache to disk.
   */
  flush(): void {
    this.cache.flush();
  }
}
