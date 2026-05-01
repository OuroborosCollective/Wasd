import { Pool, PoolConfig } from 'pg';

/**
 * Configuration for the database connection.
 * Uses environment variables for flexibility in CI/CD and production environments.
 */
const dbConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

/**
 * Robust Database Pool management with retry logic.
 * Essential for CI environments where the DB container might start slower than the application.
 */
class Database {
  private pool: Pool;
  private maxRetries: number = 10;
  private retryDelay: number = 2000; // 2 seconds

  constructor() {
    this.pool = new Pool(dbConfig);

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle database client', err);
      this.reconnect();
    });
  }

  /**
   * Attempts to establish a connection with exponential-like backoff retry logic.
   */
  public async connect(): Promise<Pool> {
    let attempt = 1;

    while (attempt <= this.maxRetries) {
      try {
        const client = await this.pool.connect();
        console.log('Successfully connected to the database.');
        client.release();
        return this.pool;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Database connection attempt ${attempt}/${this.maxRetries} failed: ${message}`);
        
        if (attempt === this.maxRetries) {
          console.error('Could not establish database connection. Exiting process.');
          process.exit(1);
        }

        attempt++;
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        // Increase delay slightly for next attempt
        this.retryDelay = Math.min(this.retryDelay * 1.5, 10000);
      }
    }

    throw new Error('Database connection failed');
  }

  private async reconnect() {
    console.log('Attempting to recover database pool...');
    try {
      await this.pool.end();
      this.pool = new Pool(dbConfig);
      await this.connect();
    } catch (err) {
      console.error('Reconnection failed', err);
    }
  }

  public getPool(): Pool {
    return this.pool;
  }

  /**
   * Graceful shutdown for the database pool.
   */
  public async disconnect(): Promise<void> {
    await this.pool.end();
    console.log('Database pool has been closed.');
  }
}

const dbInstance = new Database();

export const pool = dbInstance.getPool();
export const connectDatabase = () => dbInstance.connect();
export const disconnectDatabase = () => dbInstance.disconnect();

export default dbInstance;