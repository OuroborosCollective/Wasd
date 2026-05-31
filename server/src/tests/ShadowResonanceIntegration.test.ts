import { describe, it, expect, vi } from 'vitest';
import { AREShadowGateAdapter } from '../core/are/AREShadowGateAdapter';
import { ResonanceBrain } from '../modules/brain/ResonanceBrain';
import { ShadowResonanceBridge } from '../../../packages/core-logic/src/are/ShadowResonanceBridge';
import { areTopologyNetwork } from '../are/ARETopologyNetwork';

describe('Shadow Resonance Feature Integration', () => {
  it('should detect, evaluate and record a resonance echo', async () => {
    // 1. Setup Topology Spike
    const tick = 100;
    areTopologyNetwork.seedCore('npc:core', tick);
    for (let i = 0; i < 10; i++) {
      areTopologyNetwork.observeInteraction('npc:core', `npc:follower_${i}`, tick);
    }

    // 2. Mock Memory Recording
    const recordMemory = vi.fn().mockResolvedValue(undefined);

    // 3. Orchestrate through Bridge
    await ShadowResonanceBridge.orchestrate(
      tick,
      (t) => AREShadowGateAdapter.detectShadowGates(t),
      (gates) => ResonanceBrain.evaluateResonance(gates, { magicAffinity: 1.0 }),
      recordMemory
    );

    // 4. Verify
    expect(recordMemory).toHaveBeenCalled();
    const [gateId, intensity, insight] = recordMemory.mock.calls[0];
    expect(gateId).toContain('gate:npc:core');
    expect(intensity).toBeGreaterThan(0.9);
    expect(insight).toBeGreaterThan(0.4);
  });

  it('should not record if intensity is too low for NPC affinity', async () => {
    const tick = 200;
    // Low interaction (only 2 NPCs)
    areTopologyNetwork.seedCore('npc:lonely', tick);
    areTopologyNetwork.observeInteraction('npc:lonely', 'npc:other', tick);

    const recordMemory = vi.fn().mockResolvedValue(undefined);

    await ShadowResonanceBridge.orchestrate(
      tick,
      (t) => AREShadowGateAdapter.detectShadowGates(t),
      (gates) => ResonanceBrain.evaluateResonance(gates, { magicAffinity: 0.1 }), // Low affinity
      recordMemory
    );

    // High chance of being below threshold if we don't have enough density
    // (In our adapter, DENSITY_THRESHOLD is 5)
    expect(recordMemory).not.toHaveBeenCalled();
  });
});
