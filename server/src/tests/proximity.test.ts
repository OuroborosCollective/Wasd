import { describe, it, expect } from 'vitest';
import { NPCSystem } from '../modules/npc/NPCSystem.js';

describe('Proximity Optimization', () => {
  it('correctly handles npc proximity states', () => {
    const npcSystem = new NPCSystem();
    const npc = npcSystem.createNPC('test_npc', 'Test NPC', 0, 0);
    // phaseShift is derived from npc id; for this fixture use 0 so base threshold stays 225.
    npc.phaseShift = 0;

    const players = [
      { id: 'p1', position: { x: 10, y: 10 } }, // distSq = 200 <= 225 at base threshold
    ];

    npcSystem.tick(players, 0);
    // Proximity owns target acquisition; the thermal runtime may subsequently
    // select a higher-priority NPC state.
    expect(npc.targetId).toBe('p1');

    const farPlayers = [{ id: 'p1', position: { x: 100, y: 100 } }];
    npcSystem.tick(farPlayers, 0);
    expect(npc.targetId).toBeNull();

    npcSystem.tick([], 0);
    expect(npc.targetId).toBeNull();
  });

  it('tick handles multiple players without id and positions missing z (no throw, finite perception)', () => {
    const npcSystem = new NPCSystem();
    npcSystem.createNPC('edge_npc', 'Edge', 0, 0);
    const anon = [
      { position: { x: 5, y: 5 } },
      { position: { x: 6, y: 6 } },
    ];
    expect(() => npcSystem.tick(anon, 1200)).not.toThrow();
  });
});
