import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { findRepoRootWithGameData } from "../../modules/content/repoRoot.js";
import { validateContentRoot } from "../../modules/content/validateContentCore.js";

const READONLY_TRUTH_FILES = new Set([
  "processing-truth-index.json",
  "resource-truth-index.json",
]);

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeRelativePath(relativePath: string): string {
  const normalized = String(relativePath ?? "")
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .trim();
  if (!normalized || normalized.includes("\0")) throw new Error("STUDIO_PATH_REQUIRED");
  return normalized;
}

function stableJson(value: unknown): string {
  const normalize = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(normalize);
    if (entry && typeof entry === "object") {
      return Object.fromEntries(
        Object.keys(entry as Record<string, unknown>)
          .sort()
          .map((key) => [key, normalize((entry as Record<string, unknown>)[key])])
      );
    }
    return entry;
  };
  return `${JSON.stringify(normalize(value), null, 2)}\n`;
}

export interface StudioWriteReceipt {
  schemaVersion: "areloria.studio-write-receipt.v1";
  truthClass: "AUTHORED_CONFIGURATION";
  path: string;
  beforeSha256: string | null;
  afterSha256: string;
  readbackSha256: string;
  bytes: number;
  validation: { ok: boolean; errors: string[] };
  authoritativeGameplayMutation: false;
  requiresRuntimeReadback: true;
}

export class StudioGameDataStore {
  readonly repoRoot: string;
  readonly gameDataRoot: string;

  constructor() {
    this.repoRoot = findRepoRootWithGameData() ?? path.resolve(process.cwd(), "..");
    this.gameDataRoot = path.join(this.repoRoot, "game-data");
  }

  private resolve(relativePath: string): { relative: string; absolute: string } {
    const relative = normalizeRelativePath(relativePath);
    const absolute = path.resolve(this.gameDataRoot, relative);
    const rel = path.relative(this.gameDataRoot, absolute);
    if (rel.startsWith("..") || path.isAbsolute(rel)) throw new Error("STUDIO_PATH_TRAVERSAL_BLOCKED");
    return { relative: rel.replaceAll(path.sep, "/"), absolute };
  }

  private assertWritable(relativePath: string): void {
    const normalized = normalizeRelativePath(relativePath);
    if (READONLY_TRUTH_FILES.has(normalized)) {
      throw new Error(`STUDIO_TRUTH_FILE_WRITE_BLOCKED:${normalized}`);
    }
  }

  async listDomains(): Promise<Array<{ domain: string; kind: "directory" | "json" }>> {
    const entries = await fs.readdir(this.gameDataRoot, { withFileTypes: true });
    return entries
      .filter((entry) => !entry.name.startsWith("."))
      .map((entry) => ({
        domain: entry.name,
        kind: entry.isDirectory() ? "directory" as const : "json" as const,
      }))
      .sort((a, b) => a.domain.localeCompare(b.domain));
  }

  async listJsonFiles(relativeDirectory = ".", maxDepth = 4): Promise<string[]> {
    const { absolute } = this.resolve(relativeDirectory === "." ? "./" : relativeDirectory);
    const output: string[] = [];
    const walk = async (dir: string, depth: number): Promise<void> => {
      if (depth > maxDepth) return;
      const entries = (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full, depth + 1);
        } else if (entry.name.toLowerCase().endsWith(".json")) {
          output.push(path.relative(this.gameDataRoot, full).replaceAll(path.sep, "/"));
        }
      }
    };
    await walk(absolute, 0);
    return output;
  }

  async readJson(relativePath: string): Promise<{ path: string; sha256: string; value: unknown }> {
    const { relative, absolute } = this.resolve(relativePath);
    const raw = await fs.readFile(absolute, "utf8");
    return { path: relative, sha256: sha256(raw), value: JSON.parse(raw) };
  }

  async writeJson(
    relativePath: string,
    value: unknown,
    expectedSha256?: string | null
  ): Promise<StudioWriteReceipt> {
    this.assertWritable(relativePath);
    const { relative, absolute } = this.resolve(relativePath);
    let beforeRaw: string | null = null;
    try {
      beforeRaw = await fs.readFile(absolute, "utf8");
    } catch (error: any) {
      if (error?.code !== "ENOENT") throw error;
    }
    const beforeSha256 = beforeRaw === null ? null : sha256(beforeRaw);
    if (expectedSha256 && beforeSha256 !== expectedSha256.toLowerCase()) {
      throw new Error(`STUDIO_OPTIMISTIC_LOCK_FAILED:${relative}:${beforeSha256 ?? "missing"}`);
    }

    const serialized = stableJson(value);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    const tempPath = `${absolute}.studio-${process.pid}.tmp`;
    await fs.writeFile(tempPath, serialized, { encoding: "utf8", mode: 0o600 });
    await fs.rename(tempPath, absolute);

    const readbackRaw = await fs.readFile(absolute, "utf8");
    const afterSha256 = sha256(serialized);
    const readbackSha256 = sha256(readbackRaw);
    if (afterSha256 !== readbackSha256) throw new Error("STUDIO_WRITE_READBACK_HASH_MISMATCH");

    const validation = validateContentRoot(this.gameDataRoot);
    return {
      schemaVersion: "areloria.studio-write-receipt.v1",
      truthClass: "AUTHORED_CONFIGURATION",
      path: relative,
      beforeSha256,
      afterSha256,
      readbackSha256,
      bytes: Buffer.byteLength(serialized),
      validation: { ok: validation.ok, errors: [...validation.errors] },
      authoritativeGameplayMutation: false,
      requiresRuntimeReadback: true,
    };
  }

  async upsertEntry(args: {
    relativePath: string;
    key: string;
    value: unknown;
    keyField?: string;
    expectedSha256?: string | null;
  }): Promise<StudioWriteReceipt> {
    const current = await this.readJson(args.relativePath);
    const keyField = String(args.keyField || "id");
    const key = String(args.key);
    let next: unknown;

    if (Array.isArray(current.value)) {
      const rows = [...current.value];
      const index = rows.findIndex((row) =>
        Boolean(row && typeof row === "object" && String((row as Record<string, unknown>)[keyField] ?? "") === key)
      );
      if (index >= 0) rows[index] = args.value;
      else rows.push(args.value);
      next = rows;
    } else if (current.value && typeof current.value === "object") {
      next = { ...(current.value as Record<string, unknown>), [key]: args.value };
    } else {
      throw new Error("STUDIO_UPSERT_REQUIRES_ARRAY_OR_OBJECT");
    }

    return this.writeJson(args.relativePath, next, args.expectedSha256 ?? current.sha256);
  }

  async deleteEntry(args: {
    relativePath: string;
    key: string;
    keyField?: string;
    expectedSha256?: string | null;
  }): Promise<StudioWriteReceipt> {
    const current = await this.readJson(args.relativePath);
    const keyField = String(args.keyField || "id");
    const key = String(args.key);
    let next: unknown;

    if (Array.isArray(current.value)) {
      next = current.value.filter((row) =>
        !(row && typeof row === "object" && String((row as Record<string, unknown>)[keyField] ?? "") === key)
      );
    } else if (current.value && typeof current.value === "object") {
      const record = { ...(current.value as Record<string, unknown>) };
      delete record[key];
      next = record;
    } else {
      throw new Error("STUDIO_DELETE_REQUIRES_ARRAY_OR_OBJECT");
    }

    return this.writeJson(args.relativePath, next, args.expectedSha256 ?? current.sha256);
  }

  validate(): { ok: boolean; errors: string[]; root: string } {
    const result = validateContentRoot(this.gameDataRoot);
    return { ok: result.ok, errors: [...result.errors], root: this.gameDataRoot };
  }
}

export function studioSha256(value: unknown): string {
  return sha256(stableJson(value));
}
