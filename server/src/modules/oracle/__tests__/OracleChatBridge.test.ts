/**
 * OracleChatBridge Tests
 *
 * ARE Determinism Tests:
 * - Tick-based cooldown instead of wall-clock time
 * - No Date.now() in truth path
 * - No Math.random() in truth path
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OracleChatBridge } from '../OracleChatBridge.js';
import { WorldEventBus } from '../../ouroboros/WorldEventBus.js';
import { ChatChannelRouter, type ChatRecipient, type SendToPlayerFn, type BroadcastFn, type ResolveSocketIdFn } from '../../chat/ChatChannelRouter.js';
import { createDeterministicEvent, type DeterministicEventContext } from '../../../core/are/DeterministicEventFactory.js';

describe('OracleChatBridge', () => {
  let eventBus: WorldEventBus;
  let chatRouter: ChatChannelRouter;
  let mockSendToPlayer: ReturnType<typeof vi.fn<SendToPlayerFn>>;
  let mockBroadcast: ReturnType<typeof vi.fn<BroadcastFn>>;
  let mockResolveSocketId: ReturnType<typeof vi.fn<ResolveSocketIdFn>>;
  let recipients: ChatRecipient[];
  let bridge: OracleChatBridge;

  beforeEach(() => {
    eventBus = new WorldEventBus();
    chatRouter = new ChatChannelRouter();
    mockSendToPlayer = vi.fn<SendToPlayerFn>();
    mockBroadcast = vi.fn<BroadcastFn>();
    mockResolveSocketId = vi.fn<ResolveSocketIdFn>();
    recipients = [
      { id: 'player1', position: { x: 0, y: 0 } },
      { id: 'player2', position: { x: 100, y: 100 } },
    ];
    bridge = new OracleChatBridge(eventBus, chatRouter, recipients, mockSendToPlayer, mockBroadcast, mockResolveSocketId, { broadcastCritical: true, broadcastCooldownMs: 10 });
  });

  it('creates bridge with config', () => {
    expect(bridge).toBeDefined();
  });

  it('broadcasts critical prophecies to global chat', () => {
    // Use deterministic event with proper tick context
    const context: DeterministicEventContext = { tick: 100, localIndex: 0 };
    eventBus.createEvent(
      {
        type: 'oracle_critical',
        actorId: 'oracle',
        data: { message: 'AGGRESSION SPIKE in sector 5 in 50 ticks', sector: 5, tick: 100, ticksUntil: 50 },
      },
      context,
      { x: 0, y: 0 },
      'Oracle',
      1,
    );
    expect(mockBroadcast).toHaveBeenCalledTimes(1);
    expect(mockBroadcast.mock.calls[0]?.[0]).toMatchObject({ type: 'chat_message', channel: 'global', senderName: '[ORACLE]', text: 'AGGRESSION SPIKE in sector 5 in 50 ticks' });
  });

  describe('determinism', () => {
    it('uses deterministic tick cooldown instead of wall clock time', () => {
      // First prophecy at tick 100
      eventBus.createEvent(
        {
          type: 'oracle_critical',
          actorId: 'oracle',
          data: { message: 'First prophecy', sector: 1, tick: 100, ticksUntil: 50 },
        },
        { tick: 100, localIndex: 0 },
        { x: 0, y: 0 },
        'Oracle',
        1,
      );

      // Second prophecy at tick 105 (5 ticks later, cooldown is 10)
      eventBus.createEvent(
        {
          type: 'oracle_critical',
          actorId: 'oracle',
          data: { message: 'Second prophecy', sector: 2, tick: 105, ticksUntil: 50 },
        },
        { tick: 105, localIndex: 1 },
        { x: 0, y: 0 },
        'Oracle',
        1,
      );

      // Third prophecy at tick 111 (6 ticks later, cooldown is 10)
      eventBus.createEvent(
        {
          type: 'oracle_critical',
          actorId: 'oracle',
          data: { message: 'Third prophecy', sector: 3, tick: 111, ticksUntil: 50 },
        },
        { tick: 111, localIndex: 2 },
        { x: 0, y: 0 },
        'Oracle',
        1,
      );

      // Should have 2 broadcasts (first and third, second is on cooldown)
      expect(mockBroadcast).toHaveBeenCalledTimes(2);
      expect(mockBroadcast.mock.calls[0]?.[0]).toMatchObject({ text: 'First prophecy' });
      expect(mockBroadcast.mock.calls[1]?.[0]).toMatchObject({ text: 'Third prophecy' });
    });

    it('produces identical event ids for identical tick context and data', () => {
      const input = {
        type: 'oracle_critical' as const,
        actorId: 'oracle',
        data: {
          message: 'AGGRESSION SPIKE in sector 5 in 50 ticks',
          severity: 'critical' as const,
        },
      };

      const context: DeterministicEventContext = { tick: 123, localIndex: 0 };

      // Create two events with identical input and context
      const deterministicEventBus1 = new WorldEventBus();
      const deterministicEventBus2 = new WorldEventBus();

      const event1 = deterministicEventBus1.createEvent(input, context, { x: 0, y: 0 }, 'Oracle', 1);
      const event2 = deterministicEventBus2.createEvent(input, context, { x: 0, y: 0 }, 'Oracle', 1);

      // Event IDs should be identical
      expect(event1.id).toBe(event2.id);

      // logicalTimeMs should be tick * TICK_MS
      expect(event1.ts).toBe(123 * 100); // 12300ms
      expect(event2.ts).toBe(12300);
    });

    it('produces different event ids when data changes', () => {
      const context: DeterministicEventContext = { tick: 100, localIndex: 0 };

      const bus = new WorldEventBus();

      const event1 = bus.createEvent(
        { type: 'oracle_critical', actorId: 'oracle', data: { message: 'Message A' } },
        context,
        { x: 0, y: 0 },
        'Oracle',
        1,
      );

      const event2 = bus.createEvent(
        { type: 'oracle_critical', actorId: 'oracle', data: { message: 'Message B' } },
        context,
        { x: 0, y: 0 },
        'Oracle',
        1,
      );

      expect(event1.id).not.toBe(event2.id);
    });

    it('produces different event ids when tick changes', () => {
      const bus = new WorldEventBus();

      const event1 = bus.createEvent(
        { type: 'oracle_critical', actorId: 'oracle', data: { message: 'Same message' } },
        { tick: 100, localIndex: 0 },
        { x: 0, y: 0 },
        'Oracle',
        1,
      );

      const event2 = bus.createEvent(
        { type: 'oracle_critical', actorId: 'oracle', data: { message: 'Same message' } },
        { tick: 200, localIndex: 0 },
        { x: 0, y: 0 },
        'Oracle',
        1,
      );

      expect(event1.id).not.toBe(event2.id);
      expect(event1.ts).toBe(10000); // 100 * 100
      expect(event2.ts).toBe(20000); // 200 * 100
    });
  });

  it('logs recommendations', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    eventBus.createEvent(
      {
        type: 'oracle_recommendation',
        actorId: 'oracle',
        data: { type: 'route_npc', target: 'sector:5', reason: 'Aggression spike predicted', priority: 3, tick: 100 },
      },
      { tick: 100, localIndex: 0 },
      { x: 0, y: 0 },
      'Oracle',
      1,
    );
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Oracle Recommendation'));
    consoleSpy.mockRestore();
  });

  it('unsubscribes from all events on destroy', () => {
    bridge.destroy();
    eventBus.createEvent(
      {
        type: 'oracle_critical',
        actorId: 'oracle',
        data: { message: 'After destroy', sector: 1, tick: 100, ticksUntil: 50 },
      },
      { tick: 100, localIndex: 0 },
      { x: 0, y: 0 },
      'Oracle',
      1,
    );
    expect(mockBroadcast).not.toHaveBeenCalled();
  });
});
