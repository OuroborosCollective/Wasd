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
   * Masks sensitive information in connection strings or config for logging
   */
  private getSanitizedConfig(): string {
    if (this.config.connectionString) {
      return this.config.connectionString.replace(/:([^:@]+)@/, ':****@');
    }
    return `host=${this.config.host}, user=${this.config.user}, database=${this.config.database}`;
  }

  /**
   * Connects to the database using an exponential backoff strategy.
   * Designed to prevent process crashes even if connection fails completely.
   * 
   * @param options Retry configuration
   * @returns The connected PG Client or null if connection failed
   */
  public async connect(options: RetryOptions = {}): Promise<Client | null> {
    const { 
      maxRetries = 5, 
      initialDelay = 1000, 
      factor = 2 
    } = options;

    let currentDelay = initialDelay;

    console.log(`[Database] Attempting to connect to: ${this.getSanitizedConfig()}`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Ensure clean state for each connection attempt
        if (this.client) {
          try {
            await this.client.end();
          } catch (e) {
            // Ignore errors during cleanup
          }
        }

        // Validate config presence
        if (!this.config.connectionString && !this.config.host) {
          throw new Error('Database configuration is missing connectionString or host.');
        }

        this.client = new Client(this.config);
        
        // Prevent process crash on idle errors
        this.client.on('error', (err) => {
          console.error('[Database] Unexpected error on idle client:', err.message);
          this.handleDisconnect();
        });

        // Set a connection timeout to prevent hanging in CI
        const connectionPromise = this.client.connect();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 10000)
        );

        await Promise.race([connectionPromise, timeoutPromise]);
        
        console.log(`[Database] Successfully connected on attempt ${attempt}`);
        return this.client;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isLastAttempt = attempt === maxRetries;
        
        console.warn(
          `[Database] Connection attempt ${attempt}/${maxRetries} failed: ${errorMessage}`
        );

        if (isLastAttempt) {
          console.error('[Database] Maximum retry attempts reached. Database is unavailable.');
          // Instead of throwing and crashing the process, we log and return null
          // This allows the calling application to decide how to proceed (e.g., degraded mode)
          this.client = null;
          return null;
        }

        console.log(`[Database] Retrying in ${currentDelay}ms...`);
        await this.wait(currentDelay);
        currentDelay *= factor;
      }
    }

    return null;
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
  ): Promise<QueryResult<T> | null> {
    if (!this.client) {
      console.error('[Database] Query failed: Client not initialized. Call connect() first.');
      return null;
    }
    
    try {
      return await this.client.query<T>(text, params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Database] Query execution error: ${errorMessage}`);
      // Check if the error is a connection loss
      if (errorMessage.includes('terminated') || errorMessage.includes('connection')) {
        this.handleDisconnect();
      }
      return null;
    }
  }

  /**
   * Closes the database connection gracefully.
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.end();
        console.log('[Database] Connection closed gracefully.');
      } catch (err) {
        console.error('[Database] Error during disconnect:', err instanceof Error ? err.message : err);
      } finally {
        this.client = null;
      }
    }
  }

  /**
   * Checks if the database is currently reachable.
   */
  public async isHealthy(): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.query('SELECT 1');
      return true;
    } catch {
      return false;
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
 * Caught errors are logged, and the function returns null if exhausted.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T | null> {
  const { maxRetries = 5, initialDelay = 500, factor = 2 } = options;
  let delay = initialDelay;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.warn(`[Retry] Attempt ${i + 1} failed: ${errorMessage}`);
      
      if (i === maxRetries - 1) {
        console.error('[Retry] All attempts failed.');
        return null;
      }
      
      await new Promise((r) => setTimeout(r, delay));
      delay *= factor;
    }
  }
  return null;
}