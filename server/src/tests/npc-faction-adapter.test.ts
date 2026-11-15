import { describe, expect, it } from 'vitest';
import { NPCSystem } from '../modules/npc/NPCSystem.js';
import { NPCFactionAdapter } from '../modules/faction/NPCFactionAdapter.js';

describe('NPCFactionAdapter', () => {
  it('builds deterministic faction decisions without replacing NPCSystem internals', () => {
    const npcSystem = new NPCSystem();
    npcSystem.createNPC('guard_alpha', 'Guard Alpha', 16, 16);
    npcSystem.createNPC('raider_beta', 'Raider Beta', 320, 320);

    const guard = npcSystem.getNPC('guard_alpha')!;
    guard.faction = 'town';
    guard.role = 'guard';

    const raider = npcSystem.getNPC('raider_beta')!;
    raider.faction = 'raiders';
    raider.role = 'Enemy';
    raider.traits = { ...(raider.traits ?? { faith: 0.5, curiosity: 0.5 }), aggression: 0.8 };

    const adapterA = new NPCFactionAdapter();
    const adapterB = new NPCFactionAdapter();

    const a = adapterA.tick({ tickCount: 10, npcSystem, worldSeed: 'test-world' });
    const b = adapterB.tick({ tickCount: 10, npcSystem, worldSeed: 'test-world' });

    expect(a.tickHz).toBe(10);
    expect(a.checksum).toBe(b.checksum);
    expect(a.decisions.length).toBe(2);
    expect(guard.memory?.factionInfluence?.npcFaction).toBe('town');
    expect(raider.memory?.factionInfluence?.npcFaction).toBe('raiders');
  });

  it('reuses the last snapshot between 10Hz faction epochs', () => {
    const npcSystem = new NPCSystem();
    npcSystem.createNPC('merchant_a', 'Merchant A', 32, 32);
    const npc = npcSystem.getNPC('merchant_a')!;
    npc.faction = 'market';
    npc.role = 'merchant';

    const adapter = new NPCFactionAdapter();
    const first = adapter.tick({ tickCount: 10, npcSystem, worldSeed: 'test-world' });
    const second = adapter.tick({ tickCount: 11, npcSystem, worldSeed: 'test-world' });

    expect(second).toBe(first);
    expect(second.tick).toBe(10);
  });

  it('preserves deterministic sort ordering identical to standard string comparison across multiple NPCs', () => {
    const npcSystem = new NPCSystem();
    const ids = ['npc_bravo', 'npc_alpha', 'npc_delta', 'npc_charlie', 'guard_01', 'guard_02'];
    for (const id of ids) {
      npcSystem.createNPC(id, `Name ${id}`, 16, 16);
      const npc = npcSystem.getNPC(id)!;
      npc.faction = id.startsWith('guard') ? 'town' : 'wilderness';
    }

    const adapter = new NPCFactionAdapter();
    const snapshot = adapter.tick({ tickCount: 20, npcSystem, worldSeed: 'deterministic-seed' });

    const decisionIds = snapshot.decisions.map(d => d.npcId);
    const expectedSortedIds = [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    expect(decisionIds).toEqual(expectedSortedIds);
  });

  it('benchmarks performance of relational sorting and array initialization in faction tick', () => {
    const npcSystem = new NPCSystem();
    for (let i = 0; i < 100; i++) {
      const id = `npc_${String(i).padStart(3, '0')}`;
      npcSystem.createNPC(id, `NPC ${i}`, (i * 17) % 500, (i * 23) % 500);
      const npc = npcSystem.getNPC(id)!;
      npc.faction = `faction_${i % 4}`;
    }

    const adapter = new NPCFactionAdapter();
    // Warm up
    adapter.tick({ tickCount: 10, npcSystem, worldSeed: 'bench-world' });

    const start = performance.now();
    const iterations = 50;
    for (let t = 1; t <= iterations; t++) {
      adapter.tick({ tickCount: t * 10, npcSystem, worldSeed: 'bench-world' });
    }
    const duration = performance.now() - start;
    expect(duration).toBeGreaterThan(0);
    console.log(`[Bolt Benchmark] 50 faction simulation ticks for 100 NPCs took ${duration.toFixed(2)}ms (${(duration / iterations).toFixed(2)}ms/tick)`);
  });
});
