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

function resolvePostgresDatabaseUrl(): string {
  const direct = envTrim("DATABASE_URL") || envTrim("SUPABASE_DB_URL");
  if (direct) return direct;

  const host = envTrim("PGHOST") || envTrim("POSTGRES_HOST");
  const password = envTrim("PGPASSWORD") || envTrim("POSTGRES_PASSWORD");
  if (!host || !password) return "";

  const port = envTrim("PGPORT") || envTrim("POSTGRES_PORT") || "5432";
  const database = envTrim("PGDATABASE") || envTrim("POSTGRES_DB") || "postgres";
  const user = envTrim("PGUSER") || envTrim("POSTGRES_USER") || "postgres";
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

export function resolveScopedPersistenceDriver(keys: readonly string[]): ScopedPersistenceDriver {
  for (const key of [...keys, "PERSISTENCE_DRIVER"]) {
    const raw = envTrim(key).toLowerCase();
    if (raw === "postgres") return "postgres";
    if (raw === "json" || raw === "file") return "json";
    if (raw === "auto") return resolvePostgresDatabaseUrl() ? "postgres" : "json";
  }
  return "json";
}

export function isPersistenceFailClosed(): boolean {
  const explicit = envFlag("PERSISTENCE_FAIL_CLOSED");
  if (explicit !== null) return explicit;
  return process.env.NODE_ENV === "production";
}

export function requirePostgresDatabaseUrl(scope: string): string {
  const databaseUrl = resolvePostgresDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(
      `[${scope}] PostgreSQL persistence selected but neither DATABASE_URL/SUPABASE_DB_URL nor complete POSTGRES_* connection fields are configured.`,
    );
  }
  return databaseUrl;
}

export function handlePostgresInitializationFailure(scope: string, error: unknown): void {
  if (isPersistenceFailClosed()) {
    throw new Error(`[${scope}] PostgreSQL initialization failed in fail-closed mode.`, { cause: error });
  }
  console.error(`[${scope}] PostgreSQL initialization failed; development fallback to JSON is active.`, error);
}
