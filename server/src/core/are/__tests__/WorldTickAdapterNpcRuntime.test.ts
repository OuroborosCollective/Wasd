import { describe, expect, it } from 'vitest';
import { tickSystemRegistry } from '../TickSystemRegistry.js';
import { worldTickAdapter } from '../WorldTickThinShellAdapter.js';

describe('WorldTickAdapter NPC runtime wiring', () => {
  it('loads game-data NPCs and registers NPCSystem in the tick registry', () => {
    const report = worldTickAdapter.getNpcGameDataLoadReport();
    expect(report.npcsLoaded).toBeGreaterThanOrEqual(10);
    expect(report.missingSpawnDefinitions).toEqual([]);

    const guide = worldTickAdapter.npcSystem.getNPC('npc_guide');
    expect(guide).toBeDefined();
    expect(guide?.memory?.source).toBe('game-data/npc');
    expect(guide?.position).toEqual({ x: 1.5, y: 0, z: 1.5 });

    const npcTickSystem = tickSystemRegistry.get('npc');
    expect(npcTickSystem).toBeDefined();
    expect(npcTickSystem?.enabled).toBe(true);
  });
});
