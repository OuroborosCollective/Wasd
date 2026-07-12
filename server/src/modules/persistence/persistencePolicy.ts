export type ScopedPersistenceDriver = "json" | "postgres";

function envTrim(key: string): string {
  const value = process.env[key];
  return typeof value === "string" ? value.trim() : "";
}

function envFlag(key: string): boolean | null {
  const raw = envTrim(key).toLowerCase();
  if (!raw) return null;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return null;
}

export function resolveScopedPersistenceDriver(keys: readonly string[]): ScopedPersistenceDriver {
  for (const key of [...keys, "PERSISTENCE_DRIVER"]) {
    const raw = envTrim(key).toLowerCase();
    if (raw === "postgres") return "postgres";
    if (raw === "json" || raw === "file") return "json";
    if (raw === "auto") {
      return envTrim("DATABASE_URL") || envTrim("SUPABASE_DB_URL") ? "postgres" : "json";
    }
  }
  return "json";
}

export function isPersistenceFailClosed(): boolean {
  const explicit = envFlag("PERSISTENCE_FAIL_CLOSED");
  if (explicit !== null) return explicit;
  return process.env.NODE_ENV === "production";
}

export function requirePostgresDatabaseUrl(scope: string): string {
  const databaseUrl = envTrim("DATABASE_URL") || envTrim("SUPABASE_DB_URL");
  if (!databaseUrl) {
    throw new Error(`[${scope}] PostgreSQL persistence selected but DATABASE_URL/SUPABASE_DB_URL is missing.`);
  }
  return databaseUrl;
}

export function handlePostgresInitializationFailure(scope: string, error: unknown): void {
  if (isPersistenceFailClosed()) {
    throw new Error(`[${scope}] PostgreSQL initialization failed in fail-closed mode.`, { cause: error });
  }
  console.error(`[${scope}] PostgreSQL initialization failed; development fallback to JSON is active.`, error);
}
