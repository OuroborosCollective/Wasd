import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { findRepoRootWithGameData } from "../../modules/content/repoRoot.js";

const ALLOWED_PREFIXES = [
  "apps/client-2d/",
  "client/",
  "game-data/",
  "packages/",
  "server/",
  "scripts/",
  "docs/",
  ".github/workflows/",
] as const;

const BLOCKED_NAMES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  "id_rsa",
  "id_ed25519",
]);

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeRelativePath(value: string): string {
  const normalized = String(value ?? "").replaceAll("\\", "/").replace(/^\/+/, "").trim();
  if (!normalized || normalized.includes("\0")) throw new Error("STUDIO_REPO_PATH_REQUIRED");
  return normalized;
}

export interface StudioRepoRead {
  path: string;
  sha256: string;
  content: string;
  bytes: number;
}

export interface StudioRepoWriteReceipt {
  schemaVersion: "areloria.studio-repo-write-receipt.v1";
  path: string;
  beforeSha256: string | null;
  afterSha256: string;
  readbackSha256: string;
  bytes: number;
  requiresBuild: true;
  requiresRuntimeReadback: true;
  authoritativeGameplayMutation: false;
}

export class StudioRepositoryStore {
  readonly repoRoot: string;

  constructor() {
    this.repoRoot = findRepoRootWithGameData() ?? path.resolve(process.cwd(), "..");
  }

  private resolve(relativePath: string): { relative: string; absolute: string } {
    const relative = normalizeRelativePath(relativePath);
    if (!ALLOWED_PREFIXES.some((prefix) => relative.startsWith(prefix))) {
      throw new Error(`STUDIO_REPO_PREFIX_BLOCKED:${relative}`);
    }
    if (relative.split("/").some((segment) => BLOCKED_NAMES.has(segment))) {
      throw new Error(`STUDIO_REPO_SECRET_FILE_BLOCKED:${relative}`);
    }
    const absolute = path.resolve(this.repoRoot, relative);
    const rel = path.relative(this.repoRoot, absolute);
    if (rel.startsWith("..") || path.isAbsolute(rel)) throw new Error("STUDIO_REPO_PATH_TRAVERSAL_BLOCKED");
    return { relative: rel.replaceAll(path.sep, "/"), absolute };
  }

  async read(relativePath: string): Promise<StudioRepoRead> {
    const { relative, absolute } = this.resolve(relativePath);
    const content = await fs.readFile(absolute, "utf8");
    return { path: relative, sha256: sha256(content), content, bytes: Buffer.byteLength(content) };
  }

  async write(args: {
    relativePath: string;
    content: string;
    expectedSha256?: string | null;
    create?: boolean;
  }): Promise<StudioRepoWriteReceipt> {
    const { relative, absolute } = this.resolve(args.relativePath);
    let before: string | null = null;
    try {
      before = await fs.readFile(absolute, "utf8");
    } catch (error: any) {
      if (error?.code !== "ENOENT") throw error;
    }
    if (before === null && !args.create) throw new Error(`STUDIO_REPO_FILE_NOT_FOUND:${relative}`);
    const beforeSha256 = before === null ? null : sha256(before);
    if (args.expectedSha256 && beforeSha256 !== args.expectedSha256.toLowerCase()) {
      throw new Error(`STUDIO_REPO_OPTIMISTIC_LOCK_FAILED:${relative}:${beforeSha256 ?? "missing"}`);
    }
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    const temp = `${absolute}.studio-${process.pid}.tmp`;
    await fs.writeFile(temp, args.content, { encoding: "utf8", mode: 0o600 });
    await fs.rename(temp, absolute);
    const readback = await fs.readFile(absolute, "utf8");
    const afterSha256 = sha256(args.content);
    const readbackSha256 = sha256(readback);
    if (afterSha256 !== readbackSha256) throw new Error("STUDIO_REPO_WRITE_READBACK_HASH_MISMATCH");
    return {
      schemaVersion: "areloria.studio-repo-write-receipt.v1",
      path: relative,
      beforeSha256,
      afterSha256,
      readbackSha256,
      bytes: Buffer.byteLength(readback),
      requiresBuild: true,
      requiresRuntimeReadback: true,
      authoritativeGameplayMutation: false,
    };
  }

  async replace(args: {
    relativePath: string;
    oldText: string;
    newText: string;
    expectedSha256?: string | null;
    expectedOccurrences?: number;
  }): Promise<StudioRepoWriteReceipt & { replacedOccurrences: number }> {
    if (!args.oldText) throw new Error("STUDIO_REPO_REPLACE_OLD_TEXT_REQUIRED");
    const current = await this.read(args.relativePath);
    if (args.expectedSha256 && current.sha256 !== args.expectedSha256.toLowerCase()) {
      throw new Error(`STUDIO_REPO_OPTIMISTIC_LOCK_FAILED:${current.path}:${current.sha256}`);
    }
    const occurrences = current.content.split(args.oldText).length - 1;
    const expected = args.expectedOccurrences ?? 1;
    if (occurrences !== expected) {
      throw new Error(`STUDIO_REPO_REPLACE_OCCURRENCE_MISMATCH:expected=${expected}:observed=${occurrences}`);
    }
    const receipt = await this.write({
      relativePath: args.relativePath,
      content: current.content.split(args.oldText).join(args.newText),
      expectedSha256: current.sha256,
    });
    return { ...receipt, replacedOccurrences: occurrences };
  }

  async list(relativeDirectory: string, maxDepth = 3): Promise<string[]> {
    const { absolute } = this.resolve(`${normalizeRelativePath(relativeDirectory).replace(/\/+$/, "")}/`);
    const output: string[] = [];
    const walk = async (dir: string, depth: number): Promise<void> => {
      if (depth > maxDepth) return;
      const entries = (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === ".git" || entry.name.startsWith(".env")) continue;
        const full = path.join(dir, entry.name);
        const rel = path.relative(this.repoRoot, full).replaceAll(path.sep, "/");
        if (entry.isDirectory()) await walk(full, depth + 1);
        else output.push(rel);
      }
    };
    await walk(absolute, 0);
    return output;
  }
}
