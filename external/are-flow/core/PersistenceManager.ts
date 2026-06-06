import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

export interface StateEnvelope<T> {
  readonly version: 1;
  readonly id: string;
  readonly timestamp: number;
  readonly checksum: string;
  readonly payload: T;
}

export interface PersistenceOptions {
  storagePath?: string;
  driver?: "file";
  pretty?: boolean;
  quarantineCorruptFiles?: boolean;
}

export class PersistenceManager {
  private readonly storagePath: string;
  private readonly driver: "file";
  private readonly pretty: boolean;
  private readonly quarantineCorruptFiles: boolean;

  constructor(options: PersistenceOptions = {}) {
    this.driver = options.driver ?? (process.env.PERSISTENCE_DRIVER as "file") ?? "file";
    this.storagePath = path.resolve(options.storagePath ?? "./persistence_store");
    this.pretty = options.pretty ?? false;
    this.quarantineCorruptFiles = options.quarantineCorruptFiles ?? true;

    this.initializeStorage();
  }

  private initializeStorage(): void {
    if (this.driver !== "file") {
      throw new Error(`Persistence driver '${this.driver}' is not supported.`);
    }

    fs.mkdirSync(this.storagePath, { recursive: true });
    fs.mkdirSync(path.join(this.storagePath, "_tmp"), { recursive: true });
    fs.mkdirSync(path.join(this.storagePath, "_corrupt"), { recursive: true });
  }

  public async saveState<T>(id: string, state: T): Promise<void> {
    const safeId = this.toSafeId(id);
    const filePath = this.resolveStatePath(safeId);
    const tmpPath = path.join(
      this.storagePath,
      "_tmp",
      `${safeId}.${process.pid}.${Date.now()}.tmp`
    );

    const payloadJson = this.stableStringify(state);
    const envelope: StateEnvelope<T> = {
      version: 1,
      id,
      timestamp: Date.now(),
      checksum: this.sha256(payloadJson),
      payload: state,
    };

    const data = this.stableStringify(envelope, this.pretty ? 2 : 0);

    try {
      await fs.promises.writeFile(tmpPath, data, "utf-8");

      // Atomic replace on same filesystem.
      await fs.promises.rename(tmpPath, filePath);
    } catch (error) {
      await this.safeUnlink(tmpPath);
      throw new Error(`Failed to save state for '${id}': ${this.errorMessage(error)}`);
    }
  }

  public async loadState<T>(id: string): Promise<T | null> {
    const safeId = this.toSafeId(id);
    const filePath = this.resolveStatePath(safeId);

    try {
      const data = await fs.promises.readFile(filePath, "utf-8");
      const envelope = JSON.parse(data) as StateEnvelope<T>;

      this.assertValidEnvelope(id, envelope);

      const payloadJson = this.stableStringify(envelope.payload);
      const checksum = this.sha256(payloadJson);

      if (checksum !== envelope.checksum) {
        throw new Error(
          `Checksum mismatch. expected=${envelope.checksum} actual=${checksum}`
        );
      }

      return envelope.payload;
    } catch (error: any) {
      if (error?.code === "ENOENT") {
        return null;
      }

      if (this.quarantineCorruptFiles) {
        await this.quarantineFile(filePath, safeId);
      }

      throw new Error(`Failed to load state for '${id}': ${this.errorMessage(error)}`);
    }
  }

  public async deleteState(id: string): Promise<void> {
    const safeId = this.toSafeId(id);
    const filePath = this.resolveStatePath(safeId);

    try {
      await fs.promises.unlink(filePath);
    } catch (error: any) {
      if (error?.code !== "ENOENT") {
        throw new Error(`Failed to delete state for '${id}': ${this.errorMessage(error)}`);
      }
    }
  }

  public async hasState(id: string): Promise<boolean> {
    const safeId = this.toSafeId(id);
    const filePath = this.resolveStatePath(safeId);

    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  public async listStoredIds(): Promise<string[]> {
    const files = await fs.promises.readdir(this.storagePath, {
      withFileTypes: true,
    });

    return files
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.slice(0, -".json".length))
      .sort((a, b) => a.localeCompare(b));
  }

  private resolveStatePath(safeId: string): string {
    const filePath = path.resolve(this.storagePath, `${safeId}.json`);

    if (!filePath.startsWith(this.storagePath + path.sep)) {
      throw new Error(`Unsafe persistence path generated for id '${safeId}'`);
    }

    return filePath;
  }

  /**
   * Macht IDs filesystem-sicher und verhindert path traversal.
   * Beispiel:
   * "npc/../../world" wird NICHT als Pfad benutzt.
   */
  private toSafeId(id: string): string {
    if (!id || typeof id !== "string") {
      throw new Error("State id must be a non-empty string.");
    }

    const clean = id.trim();

    if (clean.length > 180) {
      return this.sha256(clean);
    }

    const safe = clean.replace(/[^a-zA-Z0-9._-]/g, "_");

    if (!safe || safe === "." || safe === "..") {
      return this.sha256(clean);
    }

    return safe;
  }

  private assertValidEnvelope<T>(expectedId: string, envelope: StateEnvelope<T>): void {
    if (!envelope || typeof envelope !== "object") {
      throw new Error("Invalid envelope: not an object.");
    }

    if (envelope.version !== 1) {
      throw new Error(`Unsupported envelope version: ${String(envelope.version)}`);
    }

    if (envelope.id !== expectedId) {
      throw new Error(`Envelope id mismatch. expected='${expectedId}' actual='${envelope.id}'`);
    }

    if (typeof envelope.timestamp !== "number" || !Number.isFinite(envelope.timestamp)) {
      throw new Error("Invalid envelope timestamp.");
    }

    if (typeof envelope.checksum !== "string" || envelope.checksum.length !== 64) {
      throw new Error("Invalid envelope checksum.");
    }

    if (!("payload" in envelope)) {
      throw new Error("Envelope payload missing.");
    }
  }

  /**
   * Deterministische JSON-Serialisierung:
   * Object-Keys werden sortiert, damit Checksums stabil bleiben.
   */
  private stableStringify(value: unknown, space = 0): string {
    return JSON.stringify(this.sortValue(value), null, space);
  }

  private sortValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sortValue(item));
    }

    if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;

      return Object.keys(obj)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = this.sortValue(obj[key]);
          return acc;
        }, {});
    }

    return value;
  }

  private sha256(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  private async quarantineFile(filePath: string, safeId: string): Promise<void> {
    try {
      const quarantinePath = path.join(
        this.storagePath,
        "_corrupt",
        `${safeId}.${Date.now()}.json`
      );

      await fs.promises.rename(filePath, quarantinePath);
    } catch {
      // Quarantine darf nie den eigentlichen Fehler verschlucken oder ersetzen.
    }
  }

  private async safeUnlink(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch {
      // Ignore cleanup failure.
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
          }
