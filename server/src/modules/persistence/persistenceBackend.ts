/** Pluggable persistence for players + optional world objects (Firestore, file, future SpacetimeDB). */

export type PersistenceDriverName = "auto" | "firestore" | "file" | "spacetime";

export interface IPersistenceBackend {
  readonly name: string;
  init(): Promise<void>;
  testConnection(): Promise<boolean>;
  save(data: Record<string, any>): Promise<void>;
  load(): Promise<Record<string, any>>;
  saveWorldObjects(objects: any[]): Promise<void>;
  loadWorldObjects(): Promise<any[]>;
}

export function resolvePersistenceDriver(): PersistenceDriverName {
  const raw = process.env.PERSISTENCE_DRIVER?.trim().toLowerCase();
  if (raw === "firestore" || raw === "file" || raw === "spacetime") {
    return raw;
  }
  return "auto";
}
