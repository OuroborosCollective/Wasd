import fs from "fs";
import path from "path";

type PoolEntry = string | string[];

type AssetPoolDocument = {
  version?: number;
  defaults?: Record<string, PoolEntry>;
  pools?: Record<string, Record<string, PoolEntry>>;
};

const DEFAULT_POOLS_PATH = path.resolve(process.cwd(), "game-data/world/asset-pools.json");
const DEFAULT_SNAPSHOT_DIR = path.resolve(process.cwd(), "game-data/world/asset-pool-snapshots");

export type AssetPoolSnapshotMeta = {
  id: string;
  fileName: string;
  createdAtIso: string;
  createdAtMs: number;
  bytes: number;
};

export class AssetPoolResolver {
  private poolsPath: string;
  private snapshotDir: string;
  private document: AssetPoolDocument = { defaults: {}, pools: {} };

  constructor(poolsPath: string = DEFAULT_POOLS_PATH, snapshotDir: string = DEFAULT_SNAPSHOT_DIR) {
    this.poolsPath = poolsPath;
    this.snapshotDir = snapshotDir;
    this.reload();
  }

  public reload() {
    if (!fs.existsSync(this.poolsPath)) {
      this.document = { defaults: {}, pools: {} };
      return;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(this.poolsPath, "utf-8")) as AssetPoolDocument;
      this.document = {
        version: parsed.version ?? 1,
        defaults: parsed.defaults ?? {},
        pools: parsed.pools ?? {},
      };
    } catch (error) {
      console.error("Failed to parse asset-pools.json", error);
      this.document = { defaults: {}, pools: {} };
    }
  }

  public getDocument(): AssetPoolDocument {
    return JSON.parse(JSON.stringify(this.document));
  }

  public createSnapshot(label?: string): AssetPoolSnapshotMeta | null {
    try {
      fs.mkdirSync(this.snapshotDir, { recursive: true });
      const now = Date.now();
      const stamp = new Date(now).toISOString().replace(/[:.]/g, "-");
      const cleanedLabel = this.sanitizeSnapshotLabel(label);
      const fileName = cleanedLabel
        ? `asset-pools.${stamp}.${cleanedLabel}.json`
        : `asset-pools.${stamp}.json`;
      const target = path.join(this.snapshotDir, fileName);
      fs.writeFileSync(target, JSON.stringify(this.document, null, 2));
      return this.buildSnapshotMeta(target);
    } catch (error) {
      console.error("Failed to create asset-pool snapshot", error);
      return null;
    }
  }

  public listSnapshots(limit: number = 20): AssetPoolSnapshotMeta[] {
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(200, Math.floor(limit))) : 20;
    if (!fs.existsSync(this.snapshotDir)) {
      return [];
    }
    try {
      const files = fs
        .readdirSync(this.snapshotDir)
        .filter((name) => name.startsWith("asset-pools.") && name.toLowerCase().endsWith(".json"))
        .map((name) => path.join(this.snapshotDir, name))
        .map((absPath) => this.buildSnapshotMeta(absPath))
        .sort((a, b) => b.createdAtMs - a.createdAtMs);
      return files.slice(0, safeLimit);
    } catch (error) {
      console.error("Failed to list asset-pool snapshots", error);
      return [];
    }
  }

  public restoreSnapshot(snapshotId: string): { ok: boolean; error?: string; snapshot?: AssetPoolSnapshotMeta } {
    const candidate = String(snapshotId || "").trim();
    if (!candidate) {
      return { ok: false, error: "snapshotId is required." };
    }
    if (candidate.includes("/") || candidate.includes("\\") || candidate.includes("..")) {
      return { ok: false, error: "Invalid snapshotId." };
    }
    if (!/^asset-pools\.[a-z0-9_.-]+\.json$/i.test(candidate)) {
      return { ok: false, error: "Invalid snapshotId." };
    }
    const snapshotPath = path.join(this.snapshotDir, candidate);
    const resolvedSnapshotPath = path.resolve(snapshotPath);
    const resolvedSnapshotDir = path.resolve(this.snapshotDir);
    if (!resolvedSnapshotPath.startsWith(`${resolvedSnapshotDir}${path.sep}`)) {
      return { ok: false, error: "Invalid snapshotId." };
    }
    if (!fs.existsSync(resolvedSnapshotPath)) {
      return { ok: false, error: `Snapshot not found: ${candidate}` };
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(resolvedSnapshotPath, "utf-8")) as AssetPoolDocument;
      this.document = {
        version: parsed.version ?? 1,
        defaults: parsed.defaults ?? {},
        pools: parsed.pools ?? {},
      };
      this.save();
      return {
        ok: true,
        snapshot: this.buildSnapshotMeta(resolvedSnapshotPath),
      };
    } catch (error) {
      console.error("Failed to restore asset-pool snapshot", error);
      return { ok: false, error: "Snapshot parse failed." };
    }
  }

  public setEntry(category: string, key: string, entry: PoolEntry): boolean {
    const normalizedCategory = this.normalizeCategory(category);
    const normalizedKey = this.normalizeToken(key);
    const normalizedEntry = this.normalizeEntry(entry);
    if (!normalizedCategory || !normalizedKey || !normalizedEntry) {
      return false;
    }
    if (!this.document.pools) {
      this.document.pools = {};
    }
    if (!this.document.pools[normalizedCategory]) {
      this.document.pools[normalizedCategory] = {};
    }
    this.document.pools[normalizedCategory][normalizedKey] = normalizedEntry;
    this.save();
    return true;
  }

  public removeEntry(category: string, key: string): boolean {
    const normalizedCategory = this.normalizeCategory(category);
    const normalizedKey = this.normalizeToken(key);
    if (!normalizedCategory || !normalizedKey || !this.document.pools?.[normalizedCategory]) {
      return false;
    }
    const before = Object.prototype.hasOwnProperty.call(this.document.pools[normalizedCategory], normalizedKey);
    if (!before) {
      return false;
    }
    delete this.document.pools[normalizedCategory][normalizedKey];
    if (Object.keys(this.document.pools[normalizedCategory]).length === 0) {
      delete this.document.pools[normalizedCategory];
    }
    this.save();
    return true;
  }

  public setDefault(category: string, entry: PoolEntry): boolean {
    const normalizedCategory = this.normalizeCategory(category);
    const normalizedEntry = this.normalizeEntry(entry);
    if (!normalizedCategory || !normalizedEntry) {
      return false;
    }
    if (!this.document.defaults) {
      this.document.defaults = {};
    }
    this.document.defaults[normalizedCategory] = normalizedEntry;
    this.save();
    return true;
  }

  public removeDefault(category: string): boolean {
    const normalizedCategory = this.normalizeCategory(category);
    if (!normalizedCategory || !this.document.defaults) {
      return false;
    }
    const before = Object.prototype.hasOwnProperty.call(this.document.defaults, normalizedCategory);
    if (!before) {
      return false;
    }
    delete this.document.defaults[normalizedCategory];
    this.save();
    return true;
  }

  public resolvePath(category: string | undefined, key: string | undefined, seed?: string): string | undefined {
    const normalizedCategory = this.normalizeCategory(category);
    const normalizedKey = this.normalizeToken(key);

    const categoryPool = this.document.pools?.[normalizedCategory];
    if (categoryPool) {
      const entry =
        this.pickEntryByKey(categoryPool, normalizedKey) ??
        this.pickEntryByKey(categoryPool, "default");
      if (entry) {
        return this.pickVariant(entry, seed ?? `${normalizedCategory}:${normalizedKey}`);
      }
    }

    const fallbackEntry =
      this.pickEntryByKey(this.document.defaults ?? {}, normalizedCategory) ??
      this.pickEntryByKey(this.document.defaults ?? {}, "object");
    if (fallbackEntry) {
      return this.pickVariant(fallbackEntry, seed ?? normalizedCategory);
    }

    return undefined;
  }

  private pickEntryByKey(collection: Record<string, PoolEntry>, key: string): PoolEntry | undefined {
    if (!key) {
      return undefined;
    }
    if (collection[key]) {
      return collection[key];
    }
    const compact = key.replace(/_/g, "");
    const aliasKey = Object.keys(collection).find((candidate) => candidate.replace(/_/g, "") === compact);
    return aliasKey ? collection[aliasKey] : undefined;
  }

  private pickVariant(entry: PoolEntry, seed: string): string | undefined {
    if (typeof entry === "string") {
      return entry;
    }
    if (!Array.isArray(entry) || entry.length === 0) {
      return undefined;
    }
    const hash = this.hash(seed);
    const index = Math.abs(hash) % entry.length;
    return entry[index];
  }

  private normalizeEntry(entry: PoolEntry): PoolEntry | null {
    if (typeof entry === "string") {
      const cleaned = entry.trim();
      return cleaned.length > 0 ? cleaned : null;
    }
    if (!Array.isArray(entry)) {
      return null;
    }
    const cleaned = entry.map((value) => String(value).trim()).filter((value) => value.length > 0);
    if (cleaned.length === 0) {
      return null;
    }
    return cleaned.length === 1 ? cleaned[0] : cleaned;
  }

  private normalizeCategory(category: string | undefined): string {
    const normalized = this.normalizeToken(category);
    if (!normalized) {
      return "world_objects";
    }
    if (normalized === "npc") return "npcs";
    if (normalized === "monster") return "monsters";
    if (normalized === "object" || normalized === "world" || normalized === "worldobject") return "world_objects";
    if (normalized === "resource") return "resources";
    if (normalized === "player") return "players";
    return normalized;
  }

  private normalizeToken(value: string | undefined): string {
    if (!value) return "";
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  private hash(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  private sanitizeSnapshotLabel(label: string | undefined): string {
    if (!label) return "";
    return String(label)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40);
  }

  private buildSnapshotMeta(absolutePath: string): AssetPoolSnapshotMeta {
    const stat = fs.statSync(absolutePath);
    const fileName = path.basename(absolutePath);
    return {
      id: fileName,
      fileName,
      createdAtIso: new Date(stat.mtimeMs).toISOString(),
      createdAtMs: stat.mtimeMs,
      bytes: stat.size,
    };
  }

  private save() {
    try {
      fs.mkdirSync(path.dirname(this.poolsPath), { recursive: true });
      fs.writeFileSync(this.poolsPath, JSON.stringify(this.document, null, 2));
    } catch (error) {
      console.error("Failed to save asset-pools.json", error);
    }
  }
}
