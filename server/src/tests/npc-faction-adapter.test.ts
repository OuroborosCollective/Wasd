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

  it('runs efficiently with 50 NPCs over 100 adapter ticks', () => {
    const npcSystem = new NPCSystem();
    const factions = ['town', 'raiders', 'outlaws', 'merchants', 'cultists'];
    const roles = ['guard', 'merchant', 'farmer', 'mage', 'Enemy'];

    for (let i = 0; i < 50; i++) {
      const id = `npc_${String(i).padStart(3, '0')}`;
      npcSystem.createNPC(id, `NPC ${i}`, (i * 17) % 500, (i * 23) % 500);
      const npc = npcSystem.getNPC(id)!;
      npc.faction = factions[i % factions.length];
      npc.role = roles[i % roles.length];
    }

    const adapter = new NPCFactionAdapter();
    const start = performance.now();

    let snapshot;
    for (let tick = 10; tick <= 1000; tick += 10) {
      snapshot = adapter.tick({ tickCount: tick, npcSystem, worldSeed: 'benchmark-seed' });
    }

    const duration = performance.now() - start;
    expect(snapshot).toBeDefined();
    expect(snapshot!.decisions.length).toBe(50);
    // Benchmark check: 100 ticks of 50 NPCs should execute rapidly (< 1000ms under parallel test runner load)
    expect(duration).toBeLessThan(1000);
  });
});
