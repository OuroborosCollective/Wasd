import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
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
