import type { IPersistenceBackend } from "./persistenceBackend.js";
import { FilePersistenceBackend } from "./filePersistenceBackend.js";

/**
 * Preparation hook for SpacetimeDB: until reducers/SDK are wired, optionally delegates
 * player save/load to the same JSON file as the file backend so the VPS can set
 * PERSISTENCE_DRIVER=spacetime without losing data.
 *
 * Env:
 * - SPACETIME_PERSIST_FILE_FALLBACK=0 — no file I/O (returns {} on load); for pure testing
 * - SPACETIME_DB_URL — logged at init (module name / connection TBD on VPS)
 */
export class SpacetimePersistenceBackend implements IPersistenceBackend {
  readonly name = "spacetime";
  private readonly fallback: FilePersistenceBackend | null;

  constructor() {
    const noFallback = process.env.SPACETIME_PERSIST_FILE_FALLBACK?.trim() === "0";
    this.fallback = noFallback ? null : new FilePersistenceBackend();
  }

  async init(): Promise<void> {
    const url = process.env.SPACETIME_DB_URL?.trim();
    const mod = process.env.SPACETIME_MODULE_NAME?.trim();
    console.log(
      "[Persistence] SpacetimeDB driver (preparation): real sync not implemented in repo yet." +
        (url ? ` SPACETIME_DB_URL=${url}` : "") +
        (mod ? ` SPACETIME_MODULE_NAME=${mod}` : "")
    );
    if (this.fallback) {
      console.log("[Persistence] Spacetime driver using file fallback for players until Spacetime reducers land.");
      await this.fallback.init();
    } else {
      console.warn("[Persistence] Spacetime driver: SPACETIME_PERSIST_FILE_FALLBACK=0 — load/save players is a no-op.");
    }
  }

  async testConnection(): Promise<boolean> {
    if (this.fallback) {
      return this.fallback.testConnection();
    }
    return true;
  }

  async save(data: Record<string, any>): Promise<void> {
    if (this.fallback) {
      await this.fallback.save(data);
      return;
    }
    console.warn("[Persistence] Spacetime stub: save ignored (no fallback).");
  }

  async load(): Promise<Record<string, any>> {
    if (this.fallback) {
      return this.fallback.load();
    }
    return {};
  }

  async saveWorldObjects(objects: any[]): Promise<void> {
    console.warn(
      "[Persistence] Spacetime stub: world objects not persisted yet (" + objects.length + " in memory only)."
    );
  }

  async loadWorldObjects(): Promise<any[]> {
    return [];
  }
}
