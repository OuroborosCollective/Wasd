import pg from 'pg';

const { Pool } = pg;

function envTrim(key: string): string {
  const value = process.env[key];
  return typeof value === "string" ? value.trim() : "";
}

export function resolveConnectionString(): string | undefined {
  const direct = envTrim("DATABASE_URL") || envTrim("SUPABASE_DB_URL");
  if (direct) return direct;

  const host = envTrim("PGHOST") || envTrim("POSTGRES_HOST");
  const poolerTxnPort = envTrim("POOLER_PROXY_PORT_TRANSACTION");
  const explicitPort = envTrim("PGPORT") || envTrim("POSTGRES_PORT");
  const looksLikeDockerDb = host === "db" || host === "localhost" || host === "127.0.0.1";
  const port =
    explicitPort ||
    (!looksLikeDockerDb && poolerTxnPort ? poolerTxnPort : "") ||
    "5432";
  const database = envTrim("PGDATABASE") || envTrim("POSTGRES_DB") || "postgres";
  const user = envTrim("PGUSER") || envTrim("POSTGRES_USER") || "postgres";
  const password = envTrim("PGPASSWORD") || envTrim("POSTGRES_PASSWORD");

  if (!host || !password) {
    return undefined;
  }
  const userEnc = encodeURIComponent(user);
  const passEnc = encodeURIComponent(password);
  return `postgresql://${userEnc}:${passEnc}@${host}:${port}/${database}`;
}

export function isDockerInternalPostgresHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "db" ||
    normalized === "postgres" ||
    normalized === "supabase-db" ||
    normalized.endsWith(".internal")
  );
}

export function resolveSslMode(connectionString?: string): false | { rejectUnauthorized: boolean } {
  const sslEnv = envTrim("PGSSL").toLowerCase();
  const disableSsl =
    envTrim("DATABASE_SSL_DISABLED") === "1" ||
    envTrim("PGSSLMODE")?.toLowerCase() === "disable" ||
    envTrim("PGSSLMODE")?.toLowerCase() === "allow";
  if (disableSsl) {
    return false;
  }
  if (sslEnv === "1" || sslEnv === "true" || sslEnv === "yes" || sslEnv === "require") {
    return { rejectUnauthorized: false };
  }
  if (sslEnv === "0" || sslEnv === "false" || sslEnv === "no" || sslEnv === "disable") {
    return false;
  }
  /** Remote Postgres (for example a Supabase pooler) usually needs TLS; Docker-internal Postgres does not. */
  let host = envTrim("PGHOST") || envTrim("POSTGRES_HOST");
  if (!host && connectionString) {
    try {
      host = new URL(connectionString).hostname;
    } catch {
      // The pg client will report malformed connection strings when it connects.
    }
  }
  if (!host || isDockerInternalPostgresHost(host)) {
    return false;
  }
  return { rejectUnauthorized: false };
}

const connectionString = resolveConnectionString();

const pool = new Pool({
  connectionString,
  ssl: resolveSslMode(connectionString)
});

export class Database {
  pool = pool;
  query(text: string, params?: any[]) {
    return pool.query(text, params);
  }
  getClient() {
    return pool.connect();
  }
  async connect() {
    const client = await pool.connect();
    client.release();
  }
  async disconnect() {
    await pool.end();
  }
}

export const db = new Database();

export class DatabaseService extends Database {}

export const dbService = new DatabaseService();

export type DatabaseHealth = {
  configured: boolean;
  ok: boolean;
  error?: string;
};

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  if (!connectionString) {
    return { configured: false, ok: false, error: "database_not_configured" };
  }
  try {
    await pool.query("SELECT 1 AS ok");
    return { configured: true, ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Database health check failed:", message);
    return { configured: true, ok: false, error: "database_query_failed" };
  }
}

export async function testConnection(): Promise<boolean> {
  return (await checkDatabaseHealth()).ok;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(connectionString);
}
