/**
 * Asset Quarantine Service
 *
 * Handles quarantining of definitively corrupt GLB files.
 * Never deletes files - moves them to a quarantine directory with a manifest.
 * Only acts on hard failures, never on warnings.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type {
  GLBValidationResult,
  QuarantineEntry,
  GLBValidationIssue,
} from "../../core/liveheal/LiveHealTypes.js";

function ensureDir(dirPath: string): void {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch {
    // best effort
  }
}

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
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // best effort
  }
}

function computeFileHash(filePath: string): string | undefined {
  try {
    const crypto = require("node:crypto") as typeof import("node:crypto");
    const buf = fs.readFileSync(filePath);
    return crypto.createHash("sha1").update(buf).digest("hex");
  } catch {
    return undefined;
  }
}

export class AssetQuarantineService {
  private readonly quarantineDir: string;
  private readonly manifestPath: string;
  private readonly manifest: QuarantineEntry[] = [];

  constructor(quarantineDir: string) {
    this.quarantineDir = quarantineDir;
    this.manifestPath = path.join(quarantineDir, "quarantine-manifest.json");
    ensureDir(quarantineDir);
    this.loadManifest();
  }

  private loadManifest(): void {
    this.manifest = safeReadJson<QuarantineEntry[]>(this.manifestPath, []);
  }

  private saveManifest(): void {
    safeWriteJson(this.manifestPath, this.manifest);
  }

  /**
   * Quarantine a file with hard failure evidence.
   * Returns the quarantine entry, or null if the file should not be quarantined.
   *
   * IMPORTANT: Only quarantines on hardFailure. Warnings are never quarantined.
   */
  quarantine(result: GLBValidationResult): QuarantineEntry | null {
    if (result.severity !== "hardFailure") {
      return null;
    }

    const sourcePath = result.filePath;
    if (!fs.existsSync(sourcePath)) {
      return null;
    }

    // Generate a unique quarantine name preserving the original name
    const basename = path.basename(sourcePath);
    const timestamp = Date.now().toString(36);
    const quarantineName = `${timestamp}_${basename}`;
    const quarantinePath = path.join(this.quarantineDir, quarantineName);

    try {
      // Move file to quarantine (copy + unlink for cross-device safety)
      fs.copyFileSync(sourcePath, quarantinePath);
      fs.unlinkSync(sourcePath);
    } catch {
      // If move fails, don't quarantine
      return null;
    }

    const entry: QuarantineEntry = {
      filePath: quarantinePath,
      originalPath: sourcePath,
      quarantinePath,
      reason: result.issues
        .filter((i) => i.severity === "hardFailure")
        .map((i) => `${i.code}: ${i.message}`)
        .join("; "),
      issues: result.issues,
      quarantinedAt: Date.now(),
      fileSize: result.fileSize,
      hash: computeFileHash(quarantinePath),
    };

    this.manifest.push(entry);
    this.saveManifest();

    return entry;
  }

  /**
   * Check if a file path has been quarantined.
   */
  isQuarantined(originalPath: string): boolean {
    return this.manifest.some((e) => e.originalPath === originalPath);
  }

  /**
   * Restore a quarantined file to its original path.
   * Returns true if restore succeeded.
   */
  restore(originalPath: string): boolean {
    const entry = this.manifest.find((e) => e.originalPath === originalPath);
    if (!entry) return false;

    try {
      if (!fs.existsSync(entry.quarantinePath)) {
        return false;
      }
      // Ensure target directory exists
      ensureDir(path.dirname(originalPath));
      fs.copyFileSync(entry.quarantinePath, originalPath);
      fs.unlinkSync(entry.quarantinePath);

      // Remove from manifest
      const idx = this.manifest.indexOf(entry);
      if (idx >= 0) this.manifest.splice(idx, 1);
      this.saveManifest();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all quarantine entries.
   */
  getEntries(): QuarantineEntry[] {
    return [...this.manifest];
  }

  /**
   * Get quarantine entry by original path.
   */
  getEntry(originalPath: string): QuarantineEntry | null {
    return this.manifest.find((e) => e.originalPath === originalPath) ?? null;
  }

  /**
   * Get count of quarantined files.
   */
  get count(): number {
    return this.manifest.length;
  }
}
