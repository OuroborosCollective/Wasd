import pg from "pg";
const { Pool } = pg;

const requiredEnvVars = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
});

pool.on("connect", () => {
  console.log("Database: Connected to PostgreSQL (Azure).");
});

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
};

// Type alias for dependency injection
export type Database = typeof db;

// Class wrapper for modules that need DI
export class DatabaseService {
  query(text: string, params?: any[]) {
    return pool.query(text, params);
  }
  getClient() {
    return pool.connect();
  }
  get pool() {
    return pool;
  }
  async connect() {
    return testConnection();
  }
}

// Singleton instance
export const dbService = new DatabaseService();

export async function testConnection(): Promise<boolean> {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("Database: Connection verified at", result.rows[0].now);
    return true;
  } catch (err) {
    console.error("Database: Connection failed:", err);
    return false;
  }
}
