import { Client, ClientConfig, QueryResult, QueryResultRow } from 'pg';

/**
 * Configuration for the retry logic
 */
export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  factor?: number;
}

/**
 * DatabaseManager handles robust database connections with retry logic,
 * specifically designed to handle transient failures in CI/CD environments.
 */
export class DatabaseManager {
  private client: Client | null = null;
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
  }

  /**
   * Helper to introduce delay between retries
   */
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Connects to the database using an exponential backoff strategy.
   * 
   * @param options Retry configuration
   * @returns The connected PG Client
   */
  public async connect(options: RetryOptions = {}): Promise<Client> {
    const { 
      maxRetries = 10, 
      initialDelay = 1000, 
      factor = 2 
    } = options;

    let currentDelay = initialDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Ensure clean state for each connection attempt
        if (this.client) {
          try {
            await this.client.end();
          } catch (e) {
            // Ignore errors during cleanup of previous failed client
          }
        }

        this.client = new Client(this.config);
        
        // Listen for errors on the client to prevent process crashes
        this.client.on('error', (err) => {
          console.error('[Database] Unexpected error on idle client', err);
          this.handleDisconnect();
        });

        await this.client.connect();
        
        console.log(`[Database] Successfully connected on attempt ${attempt}`);
        return this.client;
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;
        
        if (isLastAttempt) {
          console.error(`[Database] Connection failed after ${maxRetries} attempts.`);
          throw error;
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(
          `[Database] Connection attempt ${attempt}/${maxRetries} failed: ${errorMessage}. ` +
          `Retrying in ${currentDelay}ms...`
        );

        await this.wait(currentDelay);
        currentDelay *= factor;
      }
    }

    throw new Error('Database connection failed');
  }

  /**
   * Handles unexpected disconnections by nullifying the client
   */
  private handleDisconnect() {
    this.client = null;
  }

  /**
   * Executes a SQL query with error checking.
   */
  public async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    if (!this.client) {
      throw new Error('[Database] Client not initialized. Call connect() first.');
    }
    
    try {
      return await this.client.query<T>(text, params);
    } catch (error) {
      console.error('[Database] Query execution error:', error);
      throw error;
    }
  }

  /**
   * Closes the database connection gracefully.
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.end();
      } finally {
        this.client = null;
        console.log('[Database] Connection closed.');
      }
    }
  }

  /**
   * Returns the current client instance if available.
   */
  public getClient(): Client | null {
    return this.client;
  }
}

/**
 * Factory function to create a new DatabaseManager instance.
 */
export const createDatabaseManager = (config: ClientConfig): DatabaseManager => {
  return new DatabaseManager(config);
};

/**
 * Utility function to execute a callback with generic retry logic.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 5, initialDelay = 500, factor = 2 } = options;
  let delay = initialDelay;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise((r) => setTimeout(r, delay));
      delay *= factor;
    }
  }
  throw new Error('Retry limit reached');
}