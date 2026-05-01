import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Mocking the Database Client interface to simulate connection behavior.
 * This prevents real network calls during testing and allows error injection.
 */
const mockDbClient = {
  connect: vi.fn(),
  end: vi.fn(),
};

/**
 * The Database connection wrapper logic being tested.
 * This represents the internal database service implementation.
 */
async function connectDatabase(client: typeof mockDbClient) {
  try {
    await client.connect();
    return { success: true };
  } catch (error) {
    // In a real application, this would log to a service like Sentry or Winston
    // and then re-throw a structured error for the application to handle.
    throw new Error('DATABASE_CONNECTION_ERROR');
  }
}

describe('Database Connection Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resolve successfully when the database is reachable', async () => {
    mockDbClient.connect.mockResolvedValueOnce(undefined);

    const result = await connectDatabase(mockDbClient);

    expect(result.success).toBe(true);
    expect(mockDbClient.connect).toHaveBeenCalledTimes(1);
  });

  /**
   * This test specifically addresses the 'exit code 1' issue in CI.
   * By using 'expect(...).rejects.toThrow()', we ensure that the asynchronous
   * error is properly caught by the test runner (Vitest/Jest) rather than 
   * resulting in an 'unhandledRejection' which causes the process to crash.
   */
  it('should properly catch and assert connection errors to prevent CI failure', async () => {
    // Simulate a hard connection failure (e.g., wrong credentials or host unreachable)
    mockDbClient.connect.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    // Assert that the promise rejects and matches our internal error mapping
    await expect(connectDatabase(mockDbClient)).rejects.toThrow('DATABASE_CONNECTION_ERROR');
    
    expect(mockDbClient.connect).toHaveBeenCalledTimes(1);
  });

  it('should verify that an error does not leak an unhandled rejection', async () => {
    mockDbClient.connect.mockRejectedValueOnce(new Error('Authentication Failed'));

    try {
      await connectDatabase(mockDbClient);
      // If the line above does not throw, force the test to fail
      throw new Error('Test failed: connectDatabase did not throw');
    } catch (error: any) {
      // Asserting the caught error to ensure the catch block in the implementation works
      expect(error.message).toBe('DATABASE_CONNECTION_ERROR');
    }
  });

  it('should ensure the database client is called correctly', async () => {
    mockDbClient.connect.mockResolvedValueOnce(undefined);
    
    await connectDatabase(mockDbClient);
    
    expect(mockDbClient.connect).toHaveBeenCalled();
  });
});