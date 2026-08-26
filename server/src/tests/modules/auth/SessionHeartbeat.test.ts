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

  it('should return the correct sessionId and deterministic heartbeatAt tick', () => {
    const sessionId = 'test-session-id';
    const result = sessionHeartbeat.ping(sessionId);

    expect(result).toEqual({
      sessionId,
      heartbeatAt: 0,
    });
  });

  it('keeps the deterministic heartbeat tick on subsequent pings', () => {
    const sessionId = 'test-session-id';
    const result1 = sessionHeartbeat.ping(sessionId);
    const result2 = sessionHeartbeat.ping(sessionId);

    expect(result1.heartbeatAt).toBe(0);
    expect(result2.heartbeatAt).toBe(0);
  });
});
