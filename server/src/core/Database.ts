// @ts-nocheck
import pg from 'pg';

const { Pool } = pg;

function envTrim(key: string): string {
  const value = process.env[key];
  return typeof value === "string" ? value.trim() : "";
}

function resolveConnectionString(): string | undefined {
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

function resolveSslMode(): false | { rejectUnauthorized: boolean } {
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
  /** Remote Postgres (e.g. Supabase pooler on VPS) usually needs TLS; Docker service `db` does not. */
  const host = envTrim("PGHOST") || envTrim("POSTGRES_HOST");
  const looksLocal =
    !host ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "db" ||
    host.endsWith(".internal");
  if (looksLocal) {
    return false;
  }
  return { rejectUnauthorized: false };
}

const connectionString = resolveConnectionString();

const pool = new Pool({
  connectionString,
  ssl: resolveSslMode()
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

export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    client.release();
    return true;
  } catch (err) {
    console.error("Database connection test failed:", err);
    return false;
  }
}

export function isDatabaseConfigured(): boolean {
  return Boolean(connectionString);
}
