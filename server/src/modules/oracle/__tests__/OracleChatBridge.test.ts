import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OracleChatBridge } from '../OracleChatBridge.js';
import { WorldEventBus } from '../../ouroboros/WorldEventBus.js';
import { ChatChannelRouter, type ChatRecipient, type SendToPlayerFn, type BroadcastFn, type ResolveSocketIdFn } from '../../chat/ChatChannelRouter.js';

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
    eventBus.emit({ type: 'oracle_critical', actorId: 'oracle', actorName: 'Oracle', position: { x: 0, y: 0 }, data: { message: 'AGGRESSION SPIKE in sector 5 in 50 ticks', sector: 5, tick: 100, ticksUntil: 50 }, intensity: 1 });
    expect(mockBroadcast).toHaveBeenCalledTimes(1);
    expect(mockBroadcast.mock.calls[0]?.[0]).toMatchObject({ type: 'chat_message', channel: 'global', senderName: '[ORACLE]', text: 'AGGRESSION SPIKE in sector 5 in 50 ticks' });
  });

  it('respects deterministic tick cooldown between broadcasts', () => {
    eventBus.emit({ type: 'oracle_critical', actorId: 'oracle', actorName: 'Oracle', position: { x: 0, y: 0 }, data: { message: 'First prophecy', sector: 1, tick: 100, ticksUntil: 50 }, intensity: 1 });
    eventBus.emit({ type: 'oracle_critical', actorId: 'oracle', actorName: 'Oracle', position: { x: 0, y: 0 }, data: { message: 'Second prophecy', sector: 2, tick: 105, ticksUntil: 50 }, intensity: 1 });
    eventBus.emit({ type: 'oracle_critical', actorId: 'oracle', actorName: 'Oracle', position: { x: 0, y: 0 }, data: { message: 'Third prophecy', sector: 3, tick: 111, ticksUntil: 50 }, intensity: 1 });
    expect(mockBroadcast).toHaveBeenCalledTimes(2);
    expect(mockBroadcast.mock.calls[0]?.[0]).toMatchObject({ text: 'First prophecy' });
    expect(mockBroadcast.mock.calls[1]?.[0]).toMatchObject({ text: 'Third prophecy' });
  });

  it('logs recommendations', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    eventBus.emit({ type: 'oracle_recommendation', actorId: 'oracle', actorName: 'Oracle', position: { x: 0, y: 0 }, data: { type: 'route_npc', target: 'sector:5', reason: 'Aggression spike predicted', priority: 3, tick: 100 }, intensity: 1 });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Oracle Recommendation'));
    consoleSpy.mockRestore();
  });

  it('unsubscribes from all events on destroy', () => {
    bridge.destroy();
    eventBus.emit({ type: 'oracle_critical', actorId: 'oracle', actorName: 'Oracle', position: { x: 0, y: 0 }, data: { message: 'After destroy', sector: 1, tick: 100, ticksUntil: 50 }, intensity: 1 });
    expect(mockBroadcast).not.toHaveBeenCalled();
  });
});
