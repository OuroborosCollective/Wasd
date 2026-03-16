import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NPCSystem } from '../modules/npc/NPCSystem.js';
import { ChatSystem } from '../modules/chat/ChatSystem.js';

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn().mockReturnValue('[]')
  }
}));

describe('NPC Heuristics & Transparency', () => {
  let npcSystem: NPCSystem;
  let chatSystem: ChatSystem;

  beforeEach(() => {
    npcSystem = new NPCSystem();
    chatSystem = new ChatSystem();
    vi.spyOn(chatSystem, 'systemMessage');
  });

  it('evaluates heuristics and posts thoughts to chat when state changes', () => {
    const npc = npcSystem.createNPC('test_npc', 'Test NPC', 0, 0);
    npc.state = 'idle';
    npc.needs = { hunger: true }; // Should trigger 'eat' heuristic

    // Force timer to expire so decision logic runs
    npc.stateTimer = 0;

    npcSystem.tick([], chatSystem);

    expect(npc.state).toBe('eat');
    expect(chatSystem.systemMessage).toHaveBeenCalledWith(
      expect.stringContaining('[Thought] Test NPC: Evaluating local heuristics: Priority [Food]')
    );
  });

  it('evaluates wander heuristic correctly', () => {
    const npc = npcSystem.createNPC('test_npc', 'Test NPC', 0, 0);
    npc.state = 'idle';
    npc.needs = {};

    npc.stateTimer = 0;
    npcSystem.tick([], chatSystem);

    expect(npc.state).toBe('wandering');
    expect(chatSystem.systemMessage).toHaveBeenCalledWith(
      expect.stringContaining('[Thought] Test NPC: Evaluating local heuristics: Priority [Patrol]')
    );
  });
});
