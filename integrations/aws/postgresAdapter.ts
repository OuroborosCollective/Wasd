import pg from 'pg';

const { Pool } = pg;

const SLOW_QUERY_THRESHOLD_MS = 100; // Log queries taking longer than 100ms

export class PostgresAdapter {
  private primaryPool: pg.Pool | null = null;
  private replicaPool: pg.Pool | null = null;

  constructor() {
    // Initialize Primary (Write) Pool
    const primaryUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_GCP;
    if (primaryUrl) {
      this.primaryPool = new Pool({
        connectionString: primaryUrl,
        max: 20, // Max connections for writes
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection could not be established
      });
      
      this.primaryPool.on('error', (err) => {
        console.error('Unexpected error on idle primary client', err);
      });
      
      console.log('PostgreSQL Primary Pool initialized.');
    } else {
      console.warn('No DATABASE_URL provided. Primary DB disabled.');
    }

    // Initialize Replica (Read) Pool
    const replicaUrl = process.env.DATABASE_URL_READ || process.env.DATABASE_URL_GCP_READ;
    if (replicaUrl) {
      this.replicaPool = new Pool({
        connectionString: replicaUrl,
        max: 50, // Higher max connections for reads
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
      
      this.replicaPool.on('error', (err) => {
        console.error('Unexpected error on idle replica client', err);
      });
      
      console.log('PostgreSQL Read Replica Pool initialized.');
    } else {
      console.warn('No DATABASE_URL_READ provided. Read queries will fall back to Primary.');
      // Fallback to primary if no replica is configured
      this.replicaPool = this.primaryPool;
    }
  }

  /**
   * Helper method to execute and profile a query
   */
  private async profileQuery(pool: pg.Pool, text: string, params?: any[], type: 'READ' | 'WRITE' = 'READ') {
    const start = Date.now();
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      
      // Analyze and log slow queries
      if (duration > SLOW_QUERY_THRESHOLD_MS) {
        console.warn(`[SLOW QUERY - ${type}] ${duration}ms: ${text}`);
      }
      
      return result;
    } catch (error) {
      console.error(`[DB ERROR - ${type}] Query failed: ${text}`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a write query (INSERT, UPDATE, DELETE) against the primary database.
   */
  async queryWrite(text: string, params?: any[]) {
    if (!this.primaryPool) throw new Error('Primary database not connected.');
    return this.profileQuery(this.primaryPool, text, params, 'WRITE');
  }

  /**
   * Execute a read query (SELECT) against the read replica database.
   * Falls back to primary if no replica is configured.
   */
  async queryRead(text: string, params?: any[]) {
    if (!this.replicaPool) throw new Error('Read replica (or primary fallback) not connected.');
    return this.profileQuery(this.replicaPool, text, params, 'READ');
  }

  /**
   * Get a dedicated client from the primary pool for transactions.
   */
  async getTransactionClient() {
    if (!this.primaryPool) throw new Error('Primary database not connected.');
    return await this.primaryPool.connect();
  }

  async close() {
    if (this.primaryPool) await this.primaryPool.end();
    if (this.replicaPool && this.replicaPool !== this.primaryPool) {
      await this.replicaPool.end();
    }
  }
}

// Singleton instance
export const db = new PostgresAdapter();

export function initPostgres() {
  return {
    status: "postgres-adapter-initialized",
    primaryConnected: !!db['primaryPool'],
    replicaConnected: !!db['replicaPool']
  };
}