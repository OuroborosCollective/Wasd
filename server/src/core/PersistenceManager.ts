import { createPersistenceBackend } from "../modules/persistence/createPersistenceBackend.js";
import type { IPersistenceBackend } from "../modules/persistence/persistenceBackend.js";

/**
 * Facade for WorldTick / WorldObjectSystem. Delegates to Firestore, file, or Spacetime (stub + file fallback).
 */
export class PersistenceManager {
  private readonly backend: IPersistenceBackend;

  constructor(backend?: IPersistenceBackend) {
    this.backend = backend ?? createPersistenceBackend();
  }

  getDriverName(): string {
    return this.backend.name;
  }

  async init() {
    await this.backend.init();
  }

  async testConnection(): Promise<boolean> {
    return this.backend.testConnection();
  }

  async save(data: Record<string, any>) {
    await this.backend.save(data);
  }

  async load(): Promise<Record<string, any>> {
    return this.backend.load();
  }

  async saveWorldObjects(objects: any[]) {
    await this.backend.saveWorldObjects(objects);
  }

  async loadWorldObjects(): Promise<any[]> {
    return this.backend.loadWorldObjects();
  }
}
