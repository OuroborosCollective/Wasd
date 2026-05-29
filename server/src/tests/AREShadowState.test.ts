import { describe, expect, it } from 'vitest';
import { AREPayloadFactory } from '../core/are/AREPayload';
import { AREShadowState } from '../core/are/AREShadowState';

function payload(id: string, kind = 'EnergyCapsule') {
  return AREPayloadFactory.createNormalized(
    id,
    { x: 1, y: 2, z: 0 },
    { x: 0, y: 0, z: 0 },
    { kind, energy: 10, health: 20 },
  );
}

describe('ARE-Logic: shadow ecosystem state', () => {
  it('starts in observing status with no phantom state', () => {
    const state = new AREShadowState();
    const telemetry = state.getTelemetry();

    expect(telemetry.status).toBe('observing');
    expect(telemetry.capsules).toBe(0);
    expect(telemetry.apexNpcs).toBe(0);
    expect(telemetry.events).toEqual([]);
  });

  it('records phantom capsules without touching live state', () => {
    const state = new AREShadowState({ maxCapsules: 3, maxEvents: 10, ttlTicks: 10 });
    const capsule = payload('capsule:1');

    state.recordCapsule(1, capsule);

    expect(state.getCapsules()).toEqual([capsule]);
    expect(state.getTelemetry().status).toBe('active');
    expect(state.getTelemetry().latestCapsuleTick).toBe(1);
    expect(Object.isFrozen(state.getTelemetry())).toBe(true);
  });

  it('expires old phantom entries by ttl before hardcap matters', () => {
    const state = new AREShadowState({ maxCapsules: 10, maxEvents: 20, ttlTicks: 2 });
    state.recordCapsule(1, payload('capsule:1'));
    state.recordCapsule(2, payload('capsule:2'));

    state.prune(3);

    expect(state.getCapsules().map((p) => p.entityId)).toEqual(['capsule:2']);
    expect(state.getTelemetry().events.some((entry) => entry.includes('expired:capsule:capsule:1'))).toBe(true);
  });

  it('evicts oldest capsules when hard capacity is exceeded', () => {
    const state = new AREShadowState({ maxCapsules: 2, maxEvents: 20, ttlTicks: 100 });
    state.recordCapsule(1, payload('capsule:1'));
    state.recordCapsule(2, payload('capsule:2'));
    state.recordCapsule(3, payload('capsule:3'));

    expect(state.getCapsules().map((p) => p.entityId)).toEqual(['capsule:2', 'capsule:3']);
    expect(state.getTelemetry().events.some((entry) => entry.includes('evicted:capsule:capsule:1'))).toBe(true);
  });

  it('records apex and fusion telemetry without external side effects', () => {
    const state = new AREShadowState({ maxApexNpcs: 2, maxEvents: 20, ttlTicks: 100 });
    const apex = payload('apex:abc', 'ApexNpc');

    state.recordFusion(5, apex, ['npc:a', 'npc:b']);

    expect(state.getApexNpcs()).toEqual([apex]);
    expect(state.getTelemetry().apexNpcs).toBe(1);
    expect(state.getTelemetry().latestFusionTick).toBe(5);
    expect(state.getTelemetry().events.some((entry) => entry.includes('fusion:npc:a+npc:b=>apex:abc'))).toBe(true);
  });

  it('records scavenger observations only as telemetry', () => {
    const state = new AREShadowState({ maxEvents: 5 });

    state.recordScavenger(7, 'npc:1', 'capsule:1', 500);

    const telemetry = state.getTelemetry();
    expect(telemetry.latestScavengerTick).toBe(7);
    expect(telemetry.events[0]).toContain('scavenger:npc:1->capsule:1:500');
  });

  it('caps event log with FIFO behavior', () => {
    const state = new AREShadowState({ maxCapsules: 10, maxEvents: 2, ttlTicks: 100 });
    state.recordCapsule(1, payload('capsule:1'));
    state.recordCapsule(2, payload('capsule:2'));
    state.recordCapsule(3, payload('capsule:3'));

    const events = state.getTelemetry().events;
    expect(events).toHaveLength(2);
    expect(events[0]).toContain('capsule:capsule:2');
    expect(events[1]).toContain('capsule:capsule:3');
  });

  it('reports saturated when any hard limit is reached', () => {
    const state = new AREShadowState({ maxCapsules: 1, maxEvents: 10, ttlTicks: 100 });
    state.recordCapsule(1, payload('capsule:1'));

    expect(state.getTelemetry().status).toBe('saturated');
  });

  it('rejects invalid configuration and invalid ticks', () => {
    expect(() => new AREShadowState({ maxCapsules: 0 })).toThrow('[ARE-ShadowState]');
    const state = new AREShadowState();
    expect(() => state.recordCapsule(-1, payload('capsule:bad'))).toThrow('[ARE-ShadowState]');
  });
});
