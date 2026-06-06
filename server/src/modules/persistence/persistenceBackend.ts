/** Pluggable persistence for players + optional world objects (file, Postgres, Redis). */

export type PersistenceDriverName = "auto" | "file" | "postgres" | "redis";

/**
 * Backend interface for deterministic persistence.
 * 
 * Wichtig:
 * - Alle Parameter sind readonly, um Mutation zu verhindern
 * - save() empfängt ein envelope mit schemaVersion, logicalIndex, hash, driver
 * - saveWorldObjects() sortiert deterministisch vor dem Speichern
 * - load() gibt envelope oder payload zurück (PersistenceManager erkennt es)
 */
export interface IPersistenceBackend {
  readonly name: string;
  init(): Promise<void>;
  testConnection(): Promise<boolean>;

  /** 
   * Speichert einen generischen Snapshot.
   * Payload kann envelope oder plain object sein.
   */
  save(data: Readonly<Record<string, unknown>>): Promise<void>;
  load(): Promise<Record<string, unknown>>;

  /** 
   * Speichert WorldObjects determistisch sortiert.
   * Sortierung: logicalIndex → type → id
   */
  saveWorldObjects(
    objects: readonly Readonly<Record<string, unknown>>[],
  ): Promise<void>;

  loadWorldObjects(): Promise<Record<string, unknown>[]>;
}

export function resolvePersistenceDriver(): PersistenceDriverName {
  const raw = process.env.PERSISTENCE_DRIVER?.trim().toLowerCase();
  if (raw === "file" || raw === "postgres" || raw === "redis") {
    return raw as PersistenceDriverName;
  }
  return "auto";
}
