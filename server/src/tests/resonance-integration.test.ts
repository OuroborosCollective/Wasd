import { describe, it, expect, vi } from 'vitest';
import { HeuristicWorldBrain } from '../modules/brain/HeuristicWorldBrain';
import { NPCMemoryCache } from '../modules/npc/NPCMemoryCache';
import { ResonanceInitializer } from '../modules/resonance/ResonanceInitializer';
import { AREShadowGateAdapter } from '../core/are/AREShadowGateAdapter';
import { AREShadowAdapter, AREShadowTickInput } from '../core/are/AREShadowAdapter';
import { AREReplayBuffer } from '../core/are/AREReplayBuffer';

describe('Shadow-Echo Resonance Integration', () => {
  it('should propagate entropy spikes from ARE to Brain and NPC Memory', () => {
    // 1. Setup
    const brain = new HeuristicWorldBrain();
    const memory = new NPCMemoryCache();
    ResonanceInitializer.bootstrap(brain, memory);

    const initialFlux = brain.getNodeValue('magic_flux');
    const npcId = 'npc:test-villager';

    // 2. Simulate a high-drift tick in ARE
    const buffer = new AREReplayBuffer(10);
    const input: AREShadowTickInput = {
      entityId: npcId,
      position: { x: 10, y: 20, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      tick: 100,
      buffer,
      additionalState: {
        // High drift: legacy at 0,0,0 vs kappa at 10,20,0
        legacyPosition: { x: 0, y: 0, z: 0 }
      }
    };

    // Trigger tick
    AREShadowAdapter.executeShadowTick(input);

    // 3. Verify Brain modulation
    const updatedFlux = brain.getNodeValue('magic_flux');
    expect(updatedFlux).toBeGreaterThan(initialFlux);

    // 4. Verify NPC Memory injection
    const npcMemories = memory.get(npcId);
    const ghostMemories = npcMemories.filter(m => m.tags.includes('shadow-echo'));

    expect(ghostMemories.length).toBeGreaterThan(0);
    expect(ghostMemories[0].content).toContain('[GHOST ECHO]');
  });
});
