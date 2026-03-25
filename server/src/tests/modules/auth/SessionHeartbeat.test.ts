import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionHeartbeat } from '../../../modules/auth/SessionHeartbeat.js';

describe('SessionHeartbeat', () => {
  let sessionHeartbeat: SessionHeartbeat;

  beforeEach(() => {
    sessionHeartbeat = new SessionHeartbeat();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return the correct sessionId and heartbeatAt timestamp', () => {
    const mockTimestamp = 1625097600000;
    vi.setSystemTime(mockTimestamp);

    const sessionId = 'test-session-id';
    const result = sessionHeartbeat.ping(sessionId);

    expect(result).toEqual({
      sessionId,
      heartbeatAt: mockTimestamp
    });
  });

  it('should update timestamp on subsequent pings', () => {
    const initialTimestamp = 1625097600000;
    vi.setSystemTime(initialTimestamp);

    const sessionId = 'test-session-id';
    const result1 = sessionHeartbeat.ping(sessionId);
    expect(result1.heartbeatAt).toBe(initialTimestamp);

    const updatedTimestamp = initialTimestamp + 5000;
    vi.setSystemTime(updatedTimestamp);

    const result2 = sessionHeartbeat.ping(sessionId);
    expect(result2.heartbeatAt).toBe(updatedTimestamp);
  });
});
