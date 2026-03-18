import { describe, it, expect } from 'vitest';
import { NPCSystem } from '../modules/npc/NPCSystem.js';

describe('Proximity Optimization', () => {
  it('correctly handles npc proximity states', () => {
    const npcSystem = new NPCSystem();
    const npc = npcSystem.createNPC('test_npc', 'Test NPC', 0, 0);

    const players = [
      { position: { x: 10, y: 10 } } // distSq = 100 + 100 = 200 < 225
    ];

    // Test 1: NPC should start interacting when player is close
    npcSystem.tick(players);
    expect(npc.state).toBe('interacting');

    // Test 2: NPC should skip proximity check if already interacting
    const farPlayers = [
      { position: { x: 100, y: 100 } } // distSq = 20000 > 225
    ];
    npcSystem.tick(farPlayers);
    expect(npc.state).toBe('interacting');

    // Test 3: NPC should reach target when distSq < 1
    npc.state = 'wandering';
    npc.position = { x: 0.5, y: 0.5, z: 0 };
    npc.targetPosition = { x: 0.6, y: 0.6 }; // distSq = 0.01 + 0.01 = 0.02 < 1
    npc.stateTimer = Date.now() + 10000;

    npcSystem.tick([]);
    expect(npc.targetPosition).toBe(null);
  });
});
