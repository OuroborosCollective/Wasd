/** Pluggable persistence for players + optional world objects (file, Postgres). */

export type PersistenceDriverName = "auto" | "file" | "postgres";

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
  if (raw === "file" || raw === "postgres") {
    return raw;
  }
  return "auto";
}
