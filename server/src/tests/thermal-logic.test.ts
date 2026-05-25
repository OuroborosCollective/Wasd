import { describe, expect, it } from 'vitest';
import { ThermalLogic, type EnergyState } from '../modules/npc/ThermalLogic';

describe('ThermalLogic', () => {
  it('applies deterministic decay from elapsed ticks', () => {
    const thermal = new ThermalLogic({ entropyConstant: 5 });
    const state: EnergyState = { currentEnergy: 1000, maxEnergy: 1000, decayRate: 1, lastUpdatedTick: 10 };

    const result = thermal.applyDecay(state, 20);

    expect(result.ticksPassed).toBe(10);
    expect(result.totalLoss).toBe(90);
    expect(result.energy.currentEnergy).toBe(910);
    expect(result.energy.lastUpdatedTick).toBe(20);
    expect(result.status).toBe('OVERHEATED');
  });

  it('does not decay backwards in time', () => {
    const thermal = new ThermalLogic();
    const state: EnergyState = { currentEnergy: 500, maxEnergy: 1000, decayRate: 2, lastUpdatedTick: 50 };

    const result = thermal.applyDecay(state, 40);

    expect(result.ticksPassed).toBe(0);
    expect(result.totalLoss).toBe(0);
    expect(result.energy.currentEnergy).toBe(500);
    expect(result.energy.lastUpdatedTick).toBe(40);
  });

  it('checks and applies action costs without mutation', () => {
    const thermal = new ThermalLogic();
    const state: EnergyState = { currentEnergy: 100, maxEnergy: 1000, decayRate: 1, lastUpdatedTick: 0 };

    expect(thermal.canAffordAction(state, 80)).toBe(true);
    expect(thermal.canAffordAction(state, 120)).toBe(false);

    const action = thermal.applyActionCost(state, 80);
    expect(action.afforded).toBe(true);
    expect(action.appliedCost).toBe(80);
    expect(action.energy.currentEnergy).toBe(20);
    expect(state.currentEnergy).toBe(100);
  });

  it('normalizes invalid energy state safely', () => {
    const thermal = new ThermalLogic();

    const state = thermal.normalizeState({
      currentEnergy: Number.NaN,
      maxEnergy: Number.NEGATIVE_INFINITY,
      decayRate: Number.POSITIVE_INFINITY,
      lastUpdatedTick: Number.NaN,
    }, 123);

    expect(state).toEqual({
      currentEnergy: 1000,
      maxEnergy: 1000,
      decayRate: 1,
      lastUpdatedTick: 123,
    });
  });

  it('classifies decomposition, critical, stable, and overheated states', () => {
    const thermal = new ThermalLogic();

    expect(thermal.statusOf({ currentEnergy: 0, maxEnergy: 1000, decayRate: 1, lastUpdatedTick: 0 })).toBe('DECOMPOSITION');
    expect(thermal.statusOf({ currentEnergy: 50, maxEnergy: 1000, decayRate: 1, lastUpdatedTick: 0 })).toBe('CRITICAL');
    expect(thermal.statusOf({ currentEnergy: 500, maxEnergy: 1000, decayRate: 1, lastUpdatedTick: 0 })).toBe('STABLE');
    expect(thermal.statusOf({ currentEnergy: 950, maxEnergy: 1000, decayRate: 1, lastUpdatedTick: 0 })).toBe('OVERHEATED');
  });

  it('keeps critical entities autonomous and only blocks decomposition', () => {
    const thermal = new ThermalLogic();
    const actions = ['OBSERVE', 'HARVEST_RESOURCE', 'DEFEND_COLONY'] as const;

    expect(thermal.allowedActionsForCritical('CRITICAL', actions, 'HARVEST_RESOURCE')).toEqual([...actions]);
    expect(thermal.allowedActionsForCritical('DECOMPOSITION', actions, 'HARVEST_RESOURCE')).toEqual([]);
    expect(thermal.allowedActionsForCritical('STABLE', actions, 'HARVEST_RESOURCE')).toEqual([...actions]);
  });
});
