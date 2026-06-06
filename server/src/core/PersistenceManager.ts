import { createHash } from "node:crypto";
import { createPersistenceBackend } from "../modules/persistence/createPersistenceBackend.js";
import type { IPersistenceBackend } from "../modules/persistence/persistenceBackend.js";


/**
 * Deterministic Persistence Manager
 *
 * Ziele:
 * - 10Hz WorldTick nicht blockieren
 * - deterministische Reihenfolge
 * - keine direkte Mutation
 * - Backend Health
 * - Save Queue
 * - Snapshot Hash
 * - Versionierung
 * - Retry + Timeout
 * - Dirty-Write-Vermeidung
 * - harte Payload-Validierung
 */


export type JsonPrimitive = string | number | boolean | null;


export type JsonValue =
  | JsonPrimitive
  | JsonObject
  | readonly JsonValue[];


export interface JsonObject {
  readonly [key: string]: JsonValue;
}


export interface WorldObjectSnapshot extends JsonObject {
  readonly id: string;
  readonly logicalIndex?: number;
  readonly type?: string;
  readonly updatedAtTick?: number;
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


  constructor(params: {
    driver: string;
    operation: string;
    message: string;
    cause?: unknown;
  }) {
    super(
      `[PersistenceManager:${params.driver}] ${params.operation} failed: ${params.message}`,
    );


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


  /**
   * Idempotenter Init.
   * Mehrere Systeme dürfen init() parallel aufrufen.
   */
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


      const ok = await this.withTimeout(
        this.backend.testConnection(),
        "testConnection",
      );


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


  /**
   * Generischer Snapshot-Save.
   *
   * logicalIndex ist Pflicht, damit Saves tick-korrekt nachvollziehbar bleiben.
   */
  public async saveSnapshot<T extends JsonObject>(
    logicalIndex: number,
    data: T,
  ): Promise<void> {
    this.assertLogicalIndex(logicalIndex);
    this.assertPlainObject(data, "saveSnapshot.data");


    const payload = this.deepClone(data);
    const canonicalPayload = this.canonicalize(payload);
    const hash = this.hashJson(canonicalPayload);


    if (this.enableHashSkip && hash === this.lastHash) {
      return;
    }


    const envelope: PersistenceEnvelope<T> = Object.freeze({
      schemaVersion: this.schemaVersion,
      logicalIndex,
      savedAtUnixMs: Date.now(),
      driver: this.backend.name,
      hash,
      payload: canonicalPayload as T,
    });


    await this.enqueueWrite("saveSnapshot", async () => {
      await this.ensureInitialized();


      await this.executeWithRetry("save", async () => {
        await this.withTimeout(
          this.backend.save(envelope as unknown as Record<string, unknown>),
          "save",
        );


        this.lastHash = hash;
        this.lastSuccessfulSaveAt = Date.now();
      });
    });
  }


  /**
   * Rückwärtskompatibel zu deinem alten save().
   * Besser: saveSnapshot(logicalIndex, data) benutzen.
   */
  public async save<T extends JsonObject>(data: T): Promise<void> {
    await this.saveSnapshot(0, data);
  }


  /**
   * Lädt generischen Zustand.
   * Erkennt Envelope automatisch und gibt payload zurück.
   */
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


      const cloned = this.deepClone(payload as T);
      const canonical = this.canonicalize(cloned) as T;


      return this.freezeMaybe(canonical);
    });


    return result;
  }


  /**
   * Deterministischer WorldObject-Save.
   *
   * Sortierung:
   * 1. logicalIndex
   * 2. type
   * 3. id
   */
  public async saveWorldObjects<T extends WorldObjectSnapshot>(
    objects: readonly T[],
    logicalIndex = 0,
  ): Promise<void> {
    this.assertLogicalIndex(logicalIndex);


    if (!Array.isArray(objects)) {
      throw this.error("saveWorldObjects", "objects must be an array");
    }


    const snapshot = objects.map((object, index) => {
      this.assertPlainObject(object, `objects[${index}]`);


      if (typeof object.id !== "string" || object.id.trim().length === 0) {
        throw this.error(
          "saveWorldObjects",
          `objects[${index}].id must be a non-empty string`,
        );
      }


      return this.canonicalize(this.deepClone(object)) as T;
    });


    const sorted = snapshot.sort(PersistenceManager.compareWorldObjects);
    const hash = this.hashJson(sorted);


    if (this.enableHashSkip && hash === this.lastHash) {
      return;
    }


    await this.enqueueWrite("saveWorldObjects", async () => {
      await this.ensureInitialized();


      await this.executeWithRetry("saveWorldObjects", async () => {
        await this.withTimeout(
          this.backend.saveWorldObjects(sorted),
          "saveWorldObjects",
        );


        this.lastHash = hash;
        this.lastSuccessfulSaveAt = Date.now();
      });
    });
  }


  public async loadWorldObjects<
    T extends WorldObjectSnapshot = WorldObjectSnapshot,
  >(): Promise<readonly Readonly<T>[]> {
    const result = await this.executeWithRetry("loadWorldObjects", async () => {
      await this.ensureInitialized();


      const raw = await this.withTimeout(
        this.backend.loadWorldObjects(),
        "loadWorldObjects",
      );


      if (!Array.isArray(raw)) {
        throw new Error("backend.loadWorldObjects() did not return an array");
      }


      const objects = raw.map((object, index) => {
        this.assertPlainObject(object, `loadWorldObjects.result[${index}]`);


        if (typeof object.id !== "string" || object.id.trim().length === 0) {
          throw new Error(
            `loadWorldObjects.result[${index}].id must be a non-empty string`,
          );
        }


        return this.canonicalize(this.deepClone(object as T)) as T;
      });


      objects.sort(PersistenceManager.compareWorldObjects);


      return this.freezeMaybe(objects);
    });


    return result;
  }


  /**
   * Für WorldTick:
   * Speichere nur alle N Ticks, nicht jeden Tick.
   *
   * Beispiel:
   * if (persistence.shouldPersistTick(logicalIndex, 10)) {
   *   await persistence.saveWorldObjects(objects, logicalIndex);
   * }
   */
  public shouldPersistTick(logicalIndex: number, everyTicks: number): boolean {
    this.assertLogicalIndex(logicalIndex);


    if (!Number.isInteger(everyTicks) || everyTicks <= 0) {
      throw this.error("shouldPersistTick", "everyTicks must be a positive integer");
    }


    return logicalIndex % everyTicks === 0;
  }


  /**
   * Fire-and-forget Save für Tick-Systeme.
   * Der Tick wartet nicht auf Disk/Postgres.
   *
   * Wichtig:
   * Fehler werden intern gespeichert und über getHealth() sichtbar.
   */
  public persistWorldObjectsAsync<T extends WorldObjectSnapshot>(
    objects: readonly T[],
    logicalIndex: number,
  ): void {
    void this.saveWorldObjects(objects, logicalIndex).catch((error) => {
      this.lastError = this.stringifyError(error);
    });
  }


  /**
   * Test-only Reset.
   */
  public unsafeResetForTestOnly(): void {
    if (process.env.NODE_ENV !== "test") {
      throw new Error("unsafeResetForTestOnly is only allowed in test");
    }


    this.initialized = false;
    this.initPromise = null;
    this.writeBarrier = Promise.resolve();
    this.queueDepth = 0;
    this.lastError = null;
    this.lastHash = null;
    this.lastSuccessfulSaveAt = null;
  }


  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }


  private async enqueueWrite(
    operation: string,
    fn: () => Promise<void>,
  ): Promise<void> {
    if (this.queueDepth >= this.maxQueueDepth) {
      throw this.error(
        operation,
        `write queue overflow: ${this.queueDepth}/${this.maxQueueDepth}`,
      );
    }


    this.queueDepth++;


    const next = this.writeBarrier.then(fn, fn);


    this.writeBarrier = next.catch(() => {
      // Write barrier darf nach einem Fehler nicht permanent vergiftet bleiben.
    });


    try {
      await next;
    } finally {
      this.queueDepth = Math.max(0, this.queueDepth - 1);
    }
  }


  private async executeWithRetry<T>(
    operation: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    let lastCaught: unknown;


    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await fn();
        this.lastError = null;
        return result;
      } catch (error) {
        lastCaught = error;
        this.lastError = this.stringifyError(error);


        if (attempt < this.maxRetries) {
          await this.sleep(PersistenceManager.retryDelayMs(attempt));
        }
      }
    }


    throw this.error(operation, this.stringifyError(lastCaught), lastCaught);
  }


  private async withTimeout<T>(
    promise: Promise<T>,
    operation: string,
  ): Promise<T> {
    let timeout: NodeJS.Timeout | undefined;


    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        reject(
          this.error(
            operation,
            `operation timed out after ${this.operationTimeoutMs}ms`,
          ),
        );
      }, this.operationTimeoutMs);
    });


    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }


  private assertLogicalIndex(value: number): void {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw this.error(
        "validation",
        `logicalIndex must be a non-negative safe integer, got ${value}`,
      );
    }
  }


  private assertPlainObject(
    value: unknown,
    label: string,
  ): asserts value is JsonObject {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw this.error("validation", `${label} must be a plain object`);
    }


    const prototype = Object.getPrototypeOf(value);


    if (prototype !== Object.prototype && prototype !== null) {
      throw this.error("validation", `${label} must not be a class instance`);
    }
  }


  /**
   * Canonical JSON:
   * - Objekt-Keys werden sortiert
   * - Arrays bleiben in Reihenfolge
   * - undefined wird entfernt
   * - Number muss endlich sein
   *
   * Das ist wichtig für deterministische Hashes.
   */
  private canonicalize<T>(value: T): T {
    if (value === null) return value;


    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        throw this.error("canonicalize", `invalid number: ${value}`);
      }


      return value;
    }


    if (
      typeof value === "string" ||
      typeof value === "boolean"
    ) {
      return value;
    }


    if (Array.isArray(value)) {
      return value.map((entry) => this.canonicalize(entry)) as T;
    }


    if (typeof value === "object") {
      const input = value as Record<string, unknown>;
      const output: Record<string, unknown> = {};


      for (const key of Object.keys(input).sort()) {
        const child = input[key];


        if (typeof child === "undefined") {
          continue;
        }


        if (typeof child === "function") {
          throw this.error("canonicalize", `function is not serializable at key ${key}`);
        }


        if (typeof child === "symbol") {
          throw this.error("canonicalize", `symbol is not serializable at key ${key}`);
        }


        if (typeof child === "bigint") {
          output[key] = child.toString();
          continue;
        }


        output[key] = this.canonicalize(child);
      }


      return output as T;
    }


    throw this.error(
      "canonicalize",
      `unsupported value type: ${typeof value}`,
    );
  }


  private deepClone<T>(value: T): T {
    try {
      return structuredClone(value);
    } catch {
      return JSON.parse(JSON.stringify(value)) as T;
    }
  }


  private freezeMaybe<T>(value: T): Readonly<T> {
    if (!this.enableDeepFreeze) {
      return value as Readonly<T>;
    }


    return this.deepFreeze(value);
  }


  private deepFreeze<T>(value: T): Readonly<T> {
    if (typeof value !== "object" || value === null) {
      return value as Readonly<T>;
    }


    if (Object.isFrozen(value)) {
      return value as Readonly<T>;
    }


    Object.freeze(value);


    if (Array.isArray(value)) {
      for (const item of value) {
        this.deepFreeze(item);
      }


      return value as Readonly<T>;
    }


    for (const key of Object.keys(value as Record<string, unknown>)) {
      const child = (value as Record<string, unknown>)[key];


      if (typeof child === "object" && child !== null) {
        this.deepFreeze(child);
      }
    }


    return value as Readonly<T>;
  }


  private hashJson(value: unknown): string {
    const json = JSON.stringify(value);


    return createHash("sha256")
      .update(json)
      .digest("hex");
  }


  private stringifyError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }


    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }


  private error(
    operation: string,
    message: string,
    cause?: unknown,
  ): PersistenceError {
    return new PersistenceError({
      driver: this.backend.name,
      operation,
      message,
      cause,
    });
  }


  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }


  private static retryDelayMs(attempt: number): number {
    return Math.min(1_000, 50 * 2 ** attempt);
  }


  private static compareWorldObjects(
    a: WorldObjectSnapshot,
    b: WorldObjectSnapshot,
  ): number {
    const ai = PersistenceManager.safeSortNumber(a.logicalIndex);
    const bi = PersistenceManager.safeSortNumber(b.logicalIndex);


    if (ai !== bi) return ai - bi;


    const at = typeof a.type === "string" ? a.type : "";
    const bt = typeof b.type === "string" ? b.type : "";


    if (at !== bt) return at.localeCompare(bt, "en");


    return a.id.localeCompare(b.id, "en");
  }


  private static safeSortNumber(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }


    return Number.MAX_SAFE_INTEGER;
  }
}
