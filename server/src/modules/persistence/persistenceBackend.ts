// @ts-nocheck
/** Pluggable persistence for players + optional world objects (file, Postgres, Redis). */

export type PersistenceDriverName = "auto" | "file" | "postgres" | "redis";

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
  if (raw === "file" || raw === "postgres" || raw === "redis") {
    return raw as PersistenceDriverName;
  }
  return "auto";
}
