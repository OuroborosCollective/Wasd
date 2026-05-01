import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DatabaseClient } from '../src/client';
import { DatabaseConnectionError } from '../src/errors';

// Mocking the underlying driver to simulate connection states
vi.mock('../src/driver', () => {
  return {
    createDriver: vi.fn().mockReturnValue({
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue({ rows: [] }),
    }),
  };
});

describe('Database Connection Test Suite', () => {
  let client: DatabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new DatabaseClient({
      host: 'localhost',
      port: 5432,
      user: 'test_user',
      password: 'test_password',
      database: 'test_db',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should establish a connection successfully', async () => {
    await expect(client.connect()).resolves.toBeUndefined();
    expect(client.isConnected()).toBe(true);
  });

  it('should throw DatabaseConnectionError when connection fails', async () => {
    // Accessing internal driver mock to simulate failure
    const driver = (client as any).getDriver();
    vi.spyOn(driver, 'connect').mockRejectedValueOnce(new Error('Network unreachable'));

    try {
      await client.connect();
      // If no error is thrown, the test should fail
      expect(true).toBe(false);
    } catch (error) {
      // Correctly asserting the new Error type
      expect(error).toBeInstanceOf(DatabaseConnectionError);
      expect((error as DatabaseConnectionError).message).toMatch(/failed to establish database connection/i);
      
      // Check if original error is preserved in cause
      if (error instanceof DatabaseConnectionError) {
        expect(error.cause).toBeDefined();
        expect((error.cause as Error).message).toBe('Network unreachable');
      }
    }

    expect(client.isConnected()).toBe(false);
  });

  it('should handle timeout during connection', async () => {
    const driver = (client as any).getDriver();
    
    /**
     * Replaced physical setTimeout with an explicit mock rejection.
     * This prevents unhandled promise rejections that can leak between tests
     * and ensures CI stability by avoiding real-time dependencies.
     */
    vi.spyOn(driver, 'connect').mockRejectedValueOnce(new Error('ETIMEDOUT'));

    await expect(client.connect()).rejects.toThrow(DatabaseConnectionError);
    expect(client.isConnected()).toBe(false);
  });

  it('should release resources on disconnect', async () => {
    await client.connect();
    await client.disconnect();
    expect(client.isConnected()).toBe(false);
  });
});