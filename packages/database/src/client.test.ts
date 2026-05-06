import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocking the database client module to prevent actual network calls during tests
vi.mock('./client', () => ({
  prisma: {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    user: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// We import the mocked 'prisma' instance as 'db'
import { prisma as db } from './client';

describe('Database Client Error Handling Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should correctly mock and catch connection failures', async () => {
    // Arrange: Mock a connection rejection
    const connectionError = new Error('Connection refused: Target machine actively refused it.');
    vi.mocked(db.$connect).mockRejectedValueOnce(connectionError);

    // Act & Assert: Ensure the error is caught and does not crash the test runner
    try {
      await db.$connect();
    } catch (error: any) {
      expect(error).toBeDefined();
      expect(error.message).toContain('Connection refused');
    }

    // Verify the mock was called
    expect(db.$connect).toHaveBeenCalledTimes(1);
  });

  it('should handle query execution errors gracefully using rejects matcher', async () => {
    // Arrange: Mock a query failure (e.g., syntax error or constraint violation)
    const queryError = new Error('P2002: Unique constraint failed on the fields: (`email`)');
    vi.mocked(db.user.create).mockRejectedValueOnce(queryError);

    // Act & Assert
    await expect(db.user.create({ data: {} } as any)).rejects.toThrow('Unique constraint failed');
  });

  it('should ensure the process remains stable when a query times out', async () => {
    // Arrange: Simulate a timeout via a rejected promise
    const timeoutError = new Error('Query execution timeout');
    vi.mocked(db.user.findMany).mockRejectedValueOnce(timeoutError);

    // Act
    const performQuery = async () => {
      try {
        return await db.user.findMany();
      } catch (e) {
        return 'error_handled';
      }
    };

    const result = await performQuery();

    // Assert
    expect(result).toBe('error_handled');
    expect(db.user.findMany).toHaveBeenCalled();
  });

  it('should allow clean disconnection even after a failed state', async () => {
    // Arrange
    vi.mocked(db.$disconnect).mockResolvedValueOnce(undefined);

    // Act
    await db.$disconnect();

    // Assert
    expect(db.$disconnect).toHaveBeenCalled();
  });

  it('should handle unexpected non-error objects being thrown', async () => {
    // Arrange: Some legacy systems or libraries might throw strings or numbers
    vi.mocked(db.$connect).mockRejectedValueOnce('Unexpected String Error');

    // Act & Assert
    try {
      await db.$connect();
    } catch (error) {
      expect(error).toBe('Unexpected String Error');
    }
  });
});