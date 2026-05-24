import { describe, expect, it, vi } from 'vitest';
import { AxiomaticEventBus } from '../axiomatic-event-bus';

describe('AxiomaticEventBus', () => {
  it('should be a singleton', () => {
    const instance1 = AxiomaticEventBus.getInstance();
    const instance2 = AxiomaticEventBus.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should publish events to console', () => {
    const bus = AxiomaticEventBus.getInstance();
    const consoleSpy = vi.spyOn(console, 'log');

    const type = 'TEST_EVENT';
    const payload = { foo: 'bar' };

    bus.publish(type, payload);

    expect(consoleSpy).toHaveBeenCalledWith(`[AxiomaticEventBus] Published ${type}:`, payload);

    consoleSpy.mockRestore();
  });
});
