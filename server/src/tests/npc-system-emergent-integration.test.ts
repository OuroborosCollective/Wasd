import { describe, expect, it } from 'vitest';
import { NPCSystem, type NPC } from '../modules/npc/NPCSystem';

describe('NPCSystem emergent thermal integration', () => {
  it('initializes energy state for created NPCs', () => {
    const system = new NPCSystem();
    const npc = system.createNPC('npc:energy-init', 'Energy Init', 0, 0);

    expect(npc.energyState).toEqual({
      currentEnergy: 1000,
      maxEnergy: 1000,
      decayRate: 1,
      lastUpdatedTick: 0,
    });
  });

  it('commits thermal decisions and energy state during tick', () => {
    const system = new NPCSystem();
    const npc = system.createNPC('npc:thermal-commit', 'Thermal Commit', 0, 0);

    system.tick([], 10);

    expect(npc.energyState?.lastUpdatedTick).toBe(10);
    expect(npc.energyState?.currentEnergy).toBeLessThan(1000);
    expect(npc.memory?.lastThermalDecision).toMatchObject({
      tick: 10,
      thermalStatus: expect.any(String),
      risk: expect.any(String),
      collapseRisk: expect.any(Boolean),
      action: expect.any(String),
      reason: expect.any(String),
    });
  });

  it('creates a collapse event when a committed decision reaches decomposition', () => {
    const system = new NPCSystem();
    const npc: NPC = {
      id: 'npc:collapse-event',
      name: 'Collapse Event',
      faction: 'guardians',
      position: { x: 2.5, y: 3.5, z: 0 },
      rotation: 0,
      visionRange: 10,
      visionAngle: 90,
      targetId: null,
      isProcessingAI: false,
      traits: { faith: 0.2, aggression: 1, curiosity: 0.1 },
      energyState: { currentEnergy: 6, maxEnergy: 1000, decayRate: 0, lastUpdatedTick: 1 },
    };

    system.addNPC(npc);
    system.tick([{ id: 'player:threat', position: { x: 0, y: 0, z: 0 }, threat: 1, deltaDrift: 0.2 }], 1);

    const events = system.drainEmergenceEvents();
    expect(npc.state).toBe('decomposition');
    expect(npc.targetId).toBeNull();
    expect(npc.isProcessingAI).toBe(false);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      eventType: 'WORLD_EVENT_EMERGENCE_COLLAPSE',
      npcId: 'npc:collapse-event',
      factionId: 'guardians',
      position: { x: 2500, y: 3500, z: 0 },
      tick: 1,
      energyAfterAction: 0,
    });
  });

  it('drains emergence events exactly once', () => {
    const system = new NPCSystem();
    expect(system.drainEmergenceEvents()).toEqual([]);
    expect(system.drainEmergenceEvents()).toEqual([]);
  });
});
