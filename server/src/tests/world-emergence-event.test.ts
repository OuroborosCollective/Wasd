import { describe, expect, it } from 'vitest';
import { createEmergenceCollapsePayload, toKappaCoordinate } from '../modules/world/WorldEmergenceEvent';

describe('WorldEmergenceEvent', () => {
  it('normalizes world positions into deterministic kappa coordinates', () => {
    expect(toKappaCoordinate({ x: 1.25, y: -2.5, z: 0.125 })).toEqual({
      x: 1250,
      y: -2500,
      z: 125,
    });
  });

  it('creates deterministic emergence collapse payloads', () => {
    const input = {
      npcId: 'npc:heroic-guard',
      factionId: 'heroes',
      position: { x: 4.2, y: 8.1, z: 0 },
      tick: 1234,
      reason: 'defend_colony:thermal_risk',
      risk: 'COLLAPSE_IMMINENT',
      sourceAction: 'DEFEND_COLONY',
      energyBefore: 12,
      energyAfterDecay: 10,
      energyAfterAction: 0,
    };

    const first = createEmergenceCollapsePayload(input);
    const second = createEmergenceCollapsePayload(input);

    expect(second).toEqual(first);
    expect(first).toMatchObject({
      eventType: 'WORLD_EVENT_EMERGENCE_COLLAPSE',
      npcId: 'npc:heroic-guard',
      factionId: 'heroes',
      position: { x: 4200, y: 8100, z: 0 },
      tick: 1234,
      reason: 'defend_colony:thermal_risk',
      risk: 'COLLAPSE_IMMINENT',
      sourceAction: 'DEFEND_COLONY',
      energyBefore: 12,
      energyAfterDecay: 10,
      energyAfterAction: 0,
    });
    expect(first.kappaHash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('uses provided kappa hash when available', () => {
    const payload = createEmergenceCollapsePayload({
      npcId: 'npc:known-hash',
      factionId: 'heroes',
      position: { x: 0, y: 0, z: 0 },
      tick: 1,
      reason: 'known',
      risk: 'CRITICAL',
      sourceAction: 'OBSERVE',
      energyBefore: 1,
      energyAfterDecay: 1,
      energyAfterAction: 1,
      kappaHash: 'abc123',
    });

    expect(payload.kappaHash).toBe('abc123');
  });

  it('normalizes invalid values without NaN propagation', () => {
    const payload = createEmergenceCollapsePayload({
      npcId: '',
      factionId: null,
      position: { x: Number.NaN, y: Number.POSITIVE_INFINITY, z: undefined },
      tick: Number.NaN,
      reason: '',
      risk: '',
      sourceAction: '',
      energyBefore: Number.NaN,
      energyAfterDecay: Number.POSITIVE_INFINITY,
      energyAfterAction: Number.NEGATIVE_INFINITY,
    });

    expect(payload).toMatchObject({
      npcId: 'npc:unknown',
      factionId: 'neutral',
      position: { x: 0, y: 0, z: 0 },
      tick: 0,
      reason: 'emergence_collapse',
      risk: 'COLLAPSE_IMMINENT',
      sourceAction: 'UNKNOWN',
      energyBefore: 0,
      energyAfterDecay: 0,
      energyAfterAction: 0,
    });
    expect(Object.values(payload.position).every(Number.isFinite)).toBe(true);
  });
});
