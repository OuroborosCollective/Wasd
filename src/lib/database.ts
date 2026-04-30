import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

/**
 * Configuration for database connection and retry logic
 */
const DB_CONFIG = {
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  maxRetries: 5,
  retryDelay: 2000, // ms
};

class DatabaseManager {
  private pool: Pool;
  private isConnecting: boolean = false;

  constructor() {
    this.pool = new Pool(DB_CONFIG);

    // Handle errors on idle clients
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle database client:', err.message);
      this.handleConnectionLoss();
    });
  }

  /**
   * Initializes the connection pool with retry logic
   */
  public async connect(retries = DB_CONFIG.maxRetries): Promise<void> {
    if (this.isConnecting) return;
    this.isConnecting = true;

    let currentAttempt = 0;

    while (currentAttempt < retries) {
      try {
        const client = await this.pool.connect();
        console.log('Database connection established successfully.');
        client.release();
        this.isConnecting = false;
        return;
      } catch (error) {
        currentAttempt++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Database connection attempt ${currentAttempt} failed: ${errorMessage}`);

        if (currentAttempt < retries) {
          const delay = DB_CONFIG.retryDelay * Math.pow(2, currentAttempt - 1); // Exponential backoff
          console.info(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          this.isConnecting = false;
          throw new Error(`Failed to connect to database after ${retries} attempts.`);
        }
      }
    }
  }

  /**
   * Handles unexpected connection loss
   */
  private async handleConnectionLoss(): Promise<void> {
    console.warn('Handling database connection loss, attempting to re-establish...');
    try {
      await this.connect();
    } catch (err) {
      console.error('Reconnection failed. Critical database error.');
    }
  }

  /**
   * Executes a query with automatic error handling
   */
  public async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    try {
      return await this.pool.query<T>(text, params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Query execution error: ${errorMessage}`, { text, params });
      
      // Check if error is related to connection loss
      if (this.isConnectionError(error)) {
        await this.handleConnectionLoss();
      }
      
      throw error;
    }
  }

  /**
   * Helper to identify if an error is connection-related
   */
  private isConnectionError(error: any): boolean {
    const code = error?.code;
    // Common Postgres connection error codes
    return ['08001', '08003', '08004', '08006', '08P01', '57P01'].includes(code);
  }

  /**
   * Get a client from the pool for transactions
   */
  public async getClient(): Promise<PoolClient> {
    try {
      return await this.pool.connect();
    } catch (error) {
      console.error('Error acquiring client from pool:', error);
      throw error;
    }
  }

  /**
   * Gracefully shuts down the database pool
   */
  public async disconnect(): Promise<void> {
    console.log('Closing database pool...');
    await this.pool.end();
  }
}

// Export a singleton instance
export const db = new DatabaseManager();

// Automatically attempt initial connection
db.connect().catch((err) => {
  console.error('Initial database connection failed:', err.message);
});