import { describe, expect, it } from 'vitest';
import { EmergentBrainKernel, type AREBrainInput } from '../modules/npc/EmergentBrain';

function baseInput(overrides: Partial<AREBrainInput> = {}): AREBrainInput {
  return {
    npcId: 'npc:guardian',
    factionId: 'heroes',
    traits: { faith: 0.72, aggression: 0.28, curiosity: 0.45 },
    energy: 0.9,
    memoryHash: 'memory:alpha',
    localStateHash: 'state:millbrook',
    playerDeltaDrift: 0.2,
    playerThreat: 0.1,
    colonyUtility: 0.75,
    resourcePressure: 0.1,
    tick: 1200,
    ...overrides,
  };
}

describe('EmergentBrainKernel', () => {
  it('returns deterministic decisions for identical input', () => {
    const kernel = new EmergentBrainKernel();
    const input = baseInput();

    const first = kernel.process(input);
    const second = kernel.process(input);

    expect(second).toEqual(first);
    expect(first.kappaHash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('anchors a high-drift allied player when colony alignment is positive and threat is low', () => {
    const kernel = new EmergentBrainKernel();

    const decision = kernel.process(baseInput({
      traits: { faith: 0.95, aggression: 0.1, curiosity: 0.3 },
      playerDeltaDrift: 0.9,
      playerThreat: 0.05,
      colonyUtility: 0.95,
      energy: 1,
    }));

    expect(decision.action).toBe('ANCHOR_BUFF');
    expect(decision.reason).toBe('player_drift_high_colony_alignment_positive');
    expect(decision.energyCost).toBe(12);
    expect(decision.nextEnergy).toBe(988);
  });

  it('withdraws when player chaos and threat dominate self-preservation', () => {
    const kernel = new EmergentBrainKernel();

    const decision = kernel.process(baseInput({
      traits: { faith: 0.1, aggression: 0.05, curiosity: 0.2 },
      playerDeltaDrift: 1,
      playerThreat: 1,
      colonyUtility: 0.05,
      energy: 0.2,
    }));

    expect(decision.action).toBe('WITHDRAW');
    expect(decision.reason).toBe('self_preservation_drift_or_threat_dominant');
    expect(decision.nextEnergy).toBe(192);
  });

  it('defends the colony when colony utility, threat, and aggression align', () => {
    const kernel = new EmergentBrainKernel();

    const decision = kernel.process(baseInput({
      traits: { faith: 0.5, aggression: 0.95, curiosity: 0.1 },
      playerDeltaDrift: 0.1,
      playerThreat: 0.75,
      colonyUtility: 1,
      energy: 0.8,
    }));

    expect(decision.action).toBe('DEFEND_COLONY');
    expect(decision.reason).toBe('colony_defense_utility_dominant');
  });

  it('harvests resources when resource pressure and energy deficit dominate', () => {
    const kernel = new EmergentBrainKernel();

    const decision = kernel.process(baseInput({
      traits: { faith: 0.1, aggression: 0.1, curiosity: 0.9 },
      playerDeltaDrift: 0.05,
      playerThreat: 0.02,
      colonyUtility: 0.05,
      resourcePressure: 1,
      energy: 0.05,
    }));

    expect(decision.action).toBe('HARVEST_RESOURCE');
    expect(decision.reason).toBe('resource_pressure_or_energy_deficit_dominant');
  });

  it('normalizes invalid inputs without producing NaN scores', () => {
    const kernel = new EmergentBrainKernel();

    const decision = kernel.process(baseInput({
      traits: { faith: Number.NaN, aggression: Number.POSITIVE_INFINITY, curiosity: Number.NEGATIVE_INFINITY },
      energy: Number.NaN,
      playerDeltaDrift: Number.POSITIVE_INFINITY,
      playerThreat: Number.NaN,
      colonyUtility: Number.NEGATIVE_INFINITY,
      resourcePressure: Number.NaN,
      tick: Number.NaN,
    }));

    expect(Number.isFinite(decision.confidence)).toBe(true);
    expect(Number.isFinite(decision.energyCost)).toBe(true);
    expect(Object.values(decision.scores).every(Number.isFinite)).toBe(true);
  });
});
