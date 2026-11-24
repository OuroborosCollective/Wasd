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

  it('creates a collapse event when a committed decision reaches terminal state', () => {
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

  it('creates deterministic world resonance, capsule, and shadow records around collapse', () => {
    const system = new NPCSystem();
    const source: NPC = {
      id: 'npc:source-collapse',
      name: 'Source Collapse',
      faction: 'guardians',
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      visionRange: 10,
      visionAngle: 90,
      targetId: null,
      isProcessingAI: false,
      traits: { faith: 0.2, aggression: 1, curiosity: 0.1 },
      energyState: { currentEnergy: 6, maxEnergy: 1000, decayRate: 0, lastUpdatedTick: 1 },
    };
    const friend: NPC = system.createNPC('npc:near-friend', 'Near Friend', 10, 0);
    friend.faction = 'guardians';
    const rival: NPC = system.createNPC('npc:near-rival', 'Near Rival', 20, 0);
    rival.faction = 'raiders';
    const far: NPC = system.createNPC('npc:far-friend', 'Far Friend', 80, 0);
    far.faction = 'guardians';

    system.addNPC(source);
    system.tick([{ id: 'player:threat', position: { x: 0, y: 0, z: 0 }, threat: 1, deltaDrift: 0.2 }], 1);

    const resonance = system.drainWorldResonanceEvents();
    const capsules = system.drainLootCapsules();
    const shadow = system.drainShadowLogs();

    expect(resonance).toHaveLength(1);
    expect(capsules).toHaveLength(1);
    expect(shadow).toHaveLength(1);
    expect(friend.memory?.resonanceFields?.[0]).toMatchObject({ eventType: 'SOCIAL_SHOCK', moodShift: 'GRIEF' });
    expect(rival.memory?.resonanceFields?.[0]).toMatchObject({ eventType: 'SOCIAL_SHOCK', moodShift: 'AGGRESSION' });
    expect(far.memory?.resonanceFields).toBeUndefined();
    expect(capsules[0].sourceNpcId).toBe('npc:source-collapse');
    expect(shadow[0]).toMatchObject({ type: 'NPC_DECOMPOSITION_EVENT', affectedCount: 2 });
  });

  it('does not re-emit collapse resonance on later ticks', () => {
    const system = new NPCSystem();
    const npc: NPC = {
      id: 'npc:single-collapse',
      name: 'Single Collapse',
      faction: 'guardians',
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      visionRange: 10,
      visionAngle: 90,
      targetId: null,
      isProcessingAI: false,
      traits: { faith: 0.2, aggression: 1, curiosity: 0.1 },
      energyState: { currentEnergy: 6, maxEnergy: 1000, decayRate: 0, lastUpdatedTick: 1 },
    };

    system.addNPC(npc);
    system.tick([], 1);
    expect(system.drainWorldResonanceEvents()).toHaveLength(1);

    system.tick([], 2);
    expect(system.drainWorldResonanceEvents()).toEqual([]);
  });

  it('drains emergence events exactly once', () => {
    const system = new NPCSystem();
    expect(system.drainEmergenceEvents()).toEqual([]);
    expect(system.drainEmergenceEvents()).toEqual([]);
  });

  it('correctly aggregates player contexts and metrics across multiple online players', () => {
    const system = new NPCSystem();
    const npc = system.createNPC('npc:multi-player', 'Multi Player NPC', 0, 0);

    const players = [
      { id: 'player:1', position: { x: 5, y: 0, z: 0 }, threat: 0.8, deltaDrift: 0.4 },
      { id: 'player:2', position: { x: 10, y: 0, z: 0 }, threat: 0.2, deltaDrift: 0.1 },
      { id: 'player:3', position: { x: 50, y: 0, z: 0 }, threat: 0.5, deltaDrift: 0.7 },
    ];

    system.tick(players, 5);

    expect(npc.memory?.lastThermalDecision?.tick).toBe(5);
    expect(npc.energyState?.lastUpdatedTick).toBe(5);
  });

  it('benchmarks single-pass player context aggregation vs multi-pass mapping', () => {
    const samplePlayers = Array.from({ length: 200 }, (_, i) => ({
      id: `player:${i}`,
      position: { x: i * 2, y: i * 3, z: 0 },
      threat: (i % 10) / 10,
      deltaDrift: (i % 5) / 5,
      stealthValue: 0,
    }));

    const iterations = 5000;

    let multiResult = { averageDrift: 0, averageThreat: 0, colonyUtility: 0 };
    let singleResult = { averageDrift: 0, averageThreat: 0, colonyUtility: 0 };

    // 1. Benchmarking legacy multi-pass mapping approach
    const startMulti = performance.now();
    for (let iter = 0; iter < iterations; iter++) {
      const playerContexts = samplePlayers.map((player) => ({
        id: player.id != null && String(player.id).length > 0 ? String(player.id) : "unknown_player",
        position: player.position,
        stealthLevel: Number.isFinite(Number(player.stealthValue)) ? Number(player.stealthValue) : 0,
        drift: Math.max(0, Math.min(1, player.deltaDrift)),
        threat: Math.max(0, Math.min(1, player.threat)),
      }));
      const averageDrift = playerContexts.reduce((sum, p) => sum + p.drift, 0) / playerContexts.length;
      const averageThreat = playerContexts.reduce((sum, p) => sum + p.threat, 0) / playerContexts.length;
      const colonyUtility = Math.max(0, Math.min(1, 1 - (playerContexts.reduce((sum, p) => sum + p.threat, 0) / playerContexts.length)));
      multiResult = { averageDrift, averageThreat, colonyUtility };
    }
    const durationMulti = performance.now() - startMulti;

    // 2. Benchmarking optimized single-pass loop approach
    const startSingle = performance.now();
    for (let iter = 0; iter < iterations; iter++) {
      const count = samplePlayers.length;
      const playerContexts = new Array(count);
      let sumDrift = 0;
      let sumThreat = 0;
      for (let i = 0; i < count; i++) {
        const player = samplePlayers[i];
        const drift = Math.max(0, Math.min(1, player.deltaDrift));
        const threat = Math.max(0, Math.min(1, player.threat));
        sumDrift += drift;
        sumThreat += threat;
        playerContexts[i] = {
          id: player.id != null && String(player.id).length > 0 ? String(player.id) : "unknown_player",
          position: player.position,
          stealthLevel: Number.isFinite(Number(player.stealthValue)) ? Number(player.stealthValue) : 0,
          drift,
          threat,
        };
      }
      const averageDrift = count > 0 ? sumDrift / count : 0;
      const averageThreat = count > 0 ? sumThreat / count : 0;
      const colonyUtility = count > 0 ? Math.max(0, Math.min(1, 1 - averageThreat)) : 0.5;
      singleResult = { averageDrift, averageThreat, colonyUtility };
    }
    const durationSingle = performance.now() - startSingle;

    const speedup = durationMulti / durationSingle;
    console.log(`[NPCSystem Player Context Aggregation Benchmark] Multi-pass: ${durationMulti.toFixed(2)}ms, Single-pass: ${durationSingle.toFixed(2)}ms (${speedup.toFixed(2)}x speedup)`);

    // Verify mathematical identity across multi-pass and single-pass approaches
    expect(singleResult.averageDrift).toBeCloseTo(multiResult.averageDrift);
    expect(singleResult.averageThreat).toBeCloseTo(multiResult.averageThreat);
    expect(singleResult.colonyUtility).toBeCloseTo(multiResult.colonyUtility);
  });
});
