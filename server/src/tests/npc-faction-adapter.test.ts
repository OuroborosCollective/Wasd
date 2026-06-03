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
});
