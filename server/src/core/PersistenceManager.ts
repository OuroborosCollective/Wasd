import { createHash } from "node:crypto";
import { deterministicNow } from "./determinism/AREDeterminism.js";
import { createPersistenceBackend } from "../modules/persistence/createPersistenceBackend.js";
import type { IPersistenceBackend } from "../modules/persistence/persistenceBackend.js";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export interface WorldObjectSnapshot {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  readonly position: { x: number; y: number };
  readonly rotation?: number;
  readonly scale?: number;
  readonly glbPath?: string;
  readonly logicalIndex?: number;
  readonly updatedAtTick?: number;
  readonly [key: string]: unknown;
}

export interface PersistenceEnvelope<T extends JsonValue> extends JsonObject {
  readonly schemaVersion: number;
  readonly logicalIndex: number;
  readonly savedAtUnixMs: number;
  readonly driver: string;
  readonly hash: string;
  readonly payload: T;
}

export interface PersistenceHealth {
  readonly driver: string;
  readonly initialized: boolean;
  readonly connected: boolean;
  readonly queueDepth: number;
  readonly lastSuccessfulSaveAt: number | null;
  readonly lastError: string | null;
  readonly lastHash: string | null;
}

export interface PersistenceManagerOptions {
  readonly schemaVersion?: number;
  readonly maxRetries?: number;
  readonly operationTimeoutMs?: number;
  readonly enableDeepFreeze?: boolean;
  readonly enableHashSkip?: boolean;
  readonly maxQueueDepth?: number;
}

export class PersistenceError extends Error {
  public readonly driver: string;
  public readonly operation: string;
  public readonly cause?: unknown;

  constructor(params: { driver: string; operation: string; message: string; cause?: unknown }) {
    super(`[PersistenceManager:${params.driver}] ${params.operation} failed: ${params.message}`);
    this.name = "PersistenceError";
    this.driver = params.driver;
    this.operation = params.operation;
    this.cause = params.cause;
  }
}

export class PersistenceManager {
  private readonly backend: IPersistenceBackend;
  private readonly schemaVersion: number;
  private readonly maxRetries: number;
  private readonly operationTimeoutMs: number;
  private readonly enableDeepFreeze: boolean;
  private readonly enableHashSkip: boolean;
  private readonly maxQueueDepth: number;

  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private writeBarrier: Promise<void> = Promise.resolve();
  private queueDepth = 0;
  private auditSequence = 0;
  private lastError: string | null = null;
  private lastHash: string | null = null;
  private lastSuccessfulSaveAt: number | null = null;

  constructor(
    backend: IPersistenceBackend = createPersistenceBackend(),
    options: PersistenceManagerOptions = {},
  ) {
    if (!backend || typeof backend.name !== "string" || backend.name.length === 0) {
      throw new Error("Invalid persistence backend: missing backend.name");
    }

    this.backend = backend;
    this.schemaVersion = options.schemaVersion ?? 1;
    this.maxRetries = options.maxRetries ?? 2;
    this.operationTimeoutMs = options.operationTimeoutMs ?? 5_000;
    this.enableDeepFreeze = options.enableDeepFreeze ?? true;
    this.enableHashSkip = options.enableHashSkip ?? true;
    this.maxQueueDepth = options.maxQueueDepth ?? 64;
  }

  public getDriverName(): string {
    return this.backend.name;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    if (!this.initPromise) {
      this.initPromise = this.executeWithRetry("init", async () => {
        await this.withTimeout(this.backend.init(), "init");
        this.initialized = true;
      });
    }
    await this.initPromise;
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.ensureInitialized();
      const ok = await this.withTimeout(this.backend.testConnection(), "testConnection");
      this.lastError = ok ? null : "Connection test returned false";
      return ok;
    } catch (error) {
      this.lastError = this.stringifyError(error);
      return false;
    }
  }

  public async getHealth(): Promise<PersistenceHealth> {
    const connected = await this.testConnection();
    return Object.freeze({
      driver: this.backend.name,
      initialized: this.initialized,
      connected,
      queueDepth: this.queueDepth,
      lastSuccessfulSaveAt: this.lastSuccessfulSaveAt,
      lastError: this.lastError,
      lastHash: this.lastHash,
    });
  }

  public async saveSnapshot<T extends JsonObject>(logicalIndex: number, data: T): Promise<void> {
    this.assertLogicalIndex(logicalIndex);
    this.assertPlainObject(data, "saveSnapshot.data");

    const canonicalPayload = this.cloneAndCanonicalize(data);
    const hash = this.hashJson(canonicalPayload);
    if (this.enableHashSkip && hash === this.lastHash) return;

    const savedAtUnixMs = this.auditTimeMs("saveSnapshot", logicalIndex, hash);
    const envelope: PersistenceEnvelope<T> = Object.freeze({
      schemaVersion: this.schemaVersion,
      logicalIndex,
      savedAtUnixMs,
      driver: this.backend.name,
      hash,
      payload: canonicalPayload as T,
    });

    await this.enqueueWrite("saveSnapshot", async () => {
      await this.ensureInitialized();
      await this.executeWithRetry("save", async () => {
        await this.withTimeout(this.backend.save(envelope as unknown as Record<string, unknown>), "save");
        this.lastHash = hash;
        this.lastSuccessfulSaveAt = savedAtUnixMs;
      });
    });
  }

  public async save<T extends JsonObject>(data: T): Promise<void> {
    this.assertPlainObject(data, "save.data");
    const canonicalPayload = this.cloneAndCanonicalize(data);
    const hash = this.hashJson(canonicalPayload);
    const savedAtUnixMs = this.auditTimeMs("save", this.auditSequence + 1, hash);

    await this.enqueueWrite("save", async () => {
      await this.ensureInitialized();
      await this.executeWithRetry("save", async () => {
        await this.withTimeout(this.backend.save(canonicalPayload as Readonly<Record<string, unknown>>), "save");
        this.lastHash = hash;
        this.lastSuccessfulSaveAt = savedAtUnixMs;
      });
    });
  }

  public async load<T extends JsonObject = JsonObject>(): Promise<Readonly<T>> {
    const result = await this.executeWithRetry("load", async () => {
      await this.ensureInitialized();
      const raw = await this.withTimeout(this.backend.load(), "load");
      this.assertPlainObject(raw, "load.result");

      const maybeEnvelope = raw as Partial<PersistenceEnvelope<JsonObject>>;
      const payload =
        typeof maybeEnvelope.schemaVersion === "number" &&
        typeof maybeEnvelope.hash === "string" &&
        typeof maybeEnvelope.payload === "object" &&
        maybeEnvelope.payload !== null
          ? maybeEnvelope.payload
          : raw;

      this.assertPlainObject(payload, "load.payload");
      const canonical = this.cloneAndCanonicalize(payload as T);
      return this.freezeMaybe(canonical);
    });
    return result;
  }

  public async saveWorldObjects<T extends Record<string, unknown>>(
    objects: readonly T[],
    logicalIndex = 0,
  ): Promise<void> {
    this.assertLogicalIndex(logicalIndex);
    if (!Array.isArray(objects)) throw this.error("saveWorldObjects", "objects must be an array");

    const snapshot = objects.map((object, index) => {
      this.assertPlainObject(object, `objects[${index}]`);
      if (typeof object.id !== "string" || object.id.trim().length === 0) {
        throw this.error("saveWorldObjects", `objects[${index}].id must be a non-empty string`);
      }
      return this.cloneAndCanonicalize(object);
    });

    const sorted = snapshot.sort(PersistenceManager.compareWorldObjects);
    const hash = this.hashJson(sorted);
    if (this.enableHashSkip && hash === this.lastHash) return;
    const savedAtUnixMs = this.auditTimeMs("saveWorldObjects", logicalIndex, hash);

    await this.enqueueWrite("saveWorldObjects", async () => {
      await this.ensureInitialized();
      await this.executeWithRetry("saveWorldObjects", async () => {
        await this.withTimeout(this.backend.saveWorldObjects(sorted), "saveWorldObjects");
        this.lastHash = hash;
        this.lastSuccessfulSaveAt = savedAtUnixMs;
      });
    });
  }

  public async loadWorldObjects<T extends Record<string, unknown> = WorldObjectSnapshot>(): Promise<readonly Readonly<T>[]> {
    const result = await this.executeWithRetry("loadWorldObjects", async () => {
      await this.ensureInitialized();
      const raw = await this.withTimeout(this.backend.loadWorldObjects(), "loadWorldObjects");
      if (!Array.isArray(raw)) throw new Error("backend.loadWorldObjects() did not return an array");

      const objects = raw.map((object, index) => {
        this.assertPlainObject(object, `loadWorldObjects.result[${index}]`);
        if (typeof object.id !== "string" || object.id.trim().length === 0) {
          throw new Error(`loadWorldObjects.result[${index}].id must be a non-empty string`);
        }
        return this.cloneAndCanonicalize(object as T);
      });

      objects.sort(PersistenceManager.compareWorldObjects);
      return this.freezeMaybe(objects);
    });
    return result;
  }

  public shouldPersistTick(logicalIndex: number, everyTicks: number): boolean {
    this.assertLogicalIndex(logicalIndex);
    if (!Number.isInteger(everyTicks) || everyTicks <= 0) {
      throw this.error("shouldPersistTick", "everyTicks must be a positive integer");
    }
    return logicalIndex % everyTicks === 0;
  }

  public persistWorldObjectsAsync<T extends Record<string, unknown>>(objects: readonly T[], logicalIndex: number): void {
    void this.saveWorldObjects(objects, logicalIndex).catch((error) => {
      this.lastError = this.stringifyError(error);
    });
  }

  public unsafeResetForTestOnly(): void {
    if (process.env.NODE_ENV !== "test") {
      throw new Error("unsafeResetForTestOnly is only allowed in test");
    }
    this.initialized = false;
    this.initPromise = null;
    this.writeBarrier = Promise.resolve();
    this.queueDepth = 0;
    this.auditSequence = 0;
    this.lastError = null;
    this.lastHash = null;
    this.lastSuccessfulSaveAt = null;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) await this.init();
  }

  private async enqueueWrite(operation: string, fn: () => Promise<void>): Promise<void> {
    if (this.queueDepth >= this.maxQueueDepth) {
      throw this.error(operation, `write queue overflow: ${this.queueDepth}/${this.maxQueueDepth}`);
    }
    this.queueDepth++;
    const next = this.writeBarrier.then(fn, fn);
    this.writeBarrier = next.catch(() => {});
    try {
      await next;
    } finally {
      this.queueDepth = Math.max(0, this.queueDepth - 1);
    }
  }

  private async executeWithRetry<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    let lastCaught: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await fn();
        this.lastError = null;
        return result;
      } catch (error) {
        lastCaught = error;
        this.lastError = this.stringifyError(error);
        if (attempt < this.maxRetries) await this.sleep(PersistenceManager.retryDelayMs(attempt));
      }
    }
    throw this.error(operation, this.stringifyError(lastCaught), lastCaught);
  }

  private async withTimeout<T>(promise: Promise<T>, operation: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.operationTimeoutMs);
    const wrappedPromise = Promise.race([
      promise.then((result) => {
        clearTimeout(timeout);
        return result;
      }),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener("abort", () => {
          reject(this.error(operation, `operation timed out after ${this.operationTimeoutMs}ms`));
        });
      }),
    ]);
    return wrappedPromise;
  }

  private assertLogicalIndex(value: number): void {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw this.error("validation", `logicalIndex must be a non-negative safe integer, got ${value}`);
    }
  }

  private assertPlainObject(value: unknown, label: string): asserts value is Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw this.error("validation", `${label} must be a plain object`);
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw this.error("validation", `${label} must not be a class instance`);
    }
  }

  /**
   * Performs deep cloning and canonicalization (key sorting) in a single recursive pass.
   * This is significantly faster than performing two separate recursive passes.
   * It also ensures that non-serializable types (functions, symbols) are detected correctly.
   */
  private cloneAndCanonicalize<T>(value: T): T {
    if (value === null) return value as T;
    const type = typeof value;

    if (type === "string" || type === "boolean") return value as T;

    if (type === "number") {
      if (!Number.isFinite(value)) {
        throw this.error("canonicalize", `invalid number: ${value}`);
      }
      return value as T;
    }

    if (type === "bigint") {
      return (value as bigint).toString() as T;
    }

    if (value instanceof Date) {
      return value.toISOString() as T;
    }

    if (Array.isArray(value)) {
      const res = new Array(value.length);
      for (let i = 0; i < value.length; i++) {
        res[i] = this.cloneAndCanonicalize(value[i]);
      }
      return res as T;
    }

    if (type === "object") {
      const input = value as Record<string, unknown>;
      const output: Record<string, unknown> = {};
      const keys = Object.keys(input).sort();

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const child = input[key];

        if (child === undefined) continue;

        const childType = typeof child;
        if (childType === "function") {
          throw this.error("canonicalize", `function is not serializable at key ${key}`);
        }
        if (childType === "symbol") {
          throw this.error("canonicalize", `symbol is not serializable at key ${key}`);
        }

        output[key] = this.cloneAndCanonicalize(child);
      }
      return output as T;
    }

    if (type === "function") throw this.error("canonicalize", "function is not serializable");
    if (type === "symbol") throw this.error("canonicalize", "symbol is not serializable");

    throw this.error("canonicalize", `unsupported value type: ${type}`);
  }

  private freezeMaybe<T>(value: T): Readonly<T> {
    return this.enableDeepFreeze ? this.deepFreeze(value) : value as Readonly<T>;
  }

  private deepFreeze<T>(value: T): Readonly<T> {
    if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value as Readonly<T>;
    Object.freeze(value);
    if (Array.isArray(value)) {
      for (const item of value) this.deepFreeze(item);
      return value as Readonly<T>;
    }
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const child = (value as Record<string, unknown>)[key];
      if (typeof child === "object" && child !== null) this.deepFreeze(child);
    }
    return value as Readonly<T>;
  }

  private hashJson(value: unknown): string {
    return createHash("sha256").update(JSON.stringify(value)).digest("hex");
  }

  private auditTimeMs(operation: string, logicalIndex: number, hash: string): number {
    this.auditSequence += 1;
    return deterministicNow(`${this.backend.name}:${operation}:${logicalIndex}:${this.auditSequence}:${hash.slice(0, 16)}`);
  }

  private stringifyError(error: unknown): string {
    if (error instanceof Error) return error.message;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  private error(operation: string, message: string, cause?: unknown): PersistenceError {
    return new PersistenceError({ driver: this.backend.name, operation, message, cause });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private static retryDelayMs(attempt: number): number {
    return Math.min(1_000, 50 * 2 ** attempt);
  }

  private static compareWorldObjects(a: Record<string, unknown>, b: Record<string, unknown>): number {
    const ai = PersistenceManager.safeSortNumber(a.logicalIndex);
    const bi = PersistenceManager.safeSortNumber(b.logicalIndex);
    if (ai !== bi) return ai - bi;
    const at = String(a.type ?? "");
    const bt = String(b.type ?? "");
    if (at !== bt) return at.localeCompare(bt);
    const aid = a.id;
    const bid = b.id;
    if (typeof aid === "string" && typeof bid === "string") return aid.localeCompare(bid);
    return 0;
  }

  private static safeSortNumber(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
  }
}
