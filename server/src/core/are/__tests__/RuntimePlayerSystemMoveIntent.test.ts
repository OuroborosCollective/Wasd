import { describe, expect, it } from 'vitest';
import { RuntimePlayerSystem } from '../RuntimeDomainPorts.js';

describe('RuntimePlayerSystem move-intent truth path (AIM-103)', () => {
  it('does not mutate position on enqueue; movement is applied only by the tick', () => {
    const system = new RuntimePlayerSystem();
    const player = system.getOrCreatePlayerFromLogin({ id: 'p1', name: 'A', source: 'test' });
    expect(player.position).toEqual({ x: 0, y: 0, z: 0 });

    const enqueued = system.enqueueMoveIntent({
      playerId: 'p1',
      socketId: 's1',
      dx: 1,
      dy: 0,
      sequenceId: 1,
      acceptedAtTick: 5,
    });

    expect(enqueued).toBe(true);
    // Enqueue must not move the player. Position stays truthful until the tick runs.
    expect(player.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(system.getPendingMoveIntentCount()).toBe(1);
  });

  it('applies queued movement deterministically inside the tick with stable ordering', () => {
    const system = new RuntimePlayerSystem();
    const a = system.getOrCreatePlayerFromLogin({ id: 'pa', name: 'A', source: 'test' });
    const b = system.getOrCreatePlayerFromLogin({ id: 'pb', name: 'B', source: 'test' });
    a.position = { x: 0, y: 0, z: 0 };
    b.position = { x: 10, y: 10, z: 0 };

    system.enqueueMoveIntent({ playerId: 'pb', socketId: 'sb', dx: 0, dy: 1, sequenceId: 2, acceptedAtTick: 3 });
    system.enqueueMoveIntent({ playerId: 'pa', socketId: 'sa', dx: 1, dy: 0, sequenceId: 1, acceptedAtTick: 3 });

    // Tick 2: intents accepted at tick 3 are not ready yet -> deferred, no movement.
    expect(system.applyQueuedMoveIntents(2, 5)).toBe(0);
    expect(a.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(b.position).toEqual({ x: 10, y: 10, z: 0 });

    // Tick 3: both intents ready -> applied deterministically (speed 5).
    const applied = system.applyQueuedMoveIntents(3, 5);
    expect(applied).toBe(2);
    expect(a.position).toEqual({ x: 5, y: 0, z: 0 });
    expect(b.position).toEqual({ x: 10, y: 15, z: 0 });
    expect(a.state).toBe('walking');
    expect(b.state).toBe('walking');
    expect(a.lastMoveTick).toBe(3);
    expect(system.getPendingMoveIntentCount()).toBe(0);
  });

  it('rejects intents for unknown players and zero-magnitude deltas (fail-closed)', () => {
    const system = new RuntimePlayerSystem();
    system.getOrCreatePlayerFromLogin({ id: 'p1', name: 'A', source: 'test' });

    expect(system.enqueueMoveIntent({ playerId: 'ghost', dx: 1, dy: 0, acceptedAtTick: 0 })).toBe(false);
    expect(system.enqueueMoveIntent({ playerId: 'p1', dx: 0, dy: 0, acceptedAtTick: 0 })).toBe(false);
    expect(system.getPendingMoveIntentCount()).toBe(0);
  });

  it('clamps deltas to unit magnitude so speed stays deterministic regardless of input magnitude', () => {
    const system = new RuntimePlayerSystem();
    const player = system.getOrCreatePlayerFromLogin({ id: 'p1', name: 'A', source: 'test' });
    player.position = { x: 0, y: 0, z: 0 };

    // Inputs are clamped to [-1,1] before normalizing (consistent with the WS
    // bridge readMove), so an oversized (3,4) input collapses to (1,1) then to
    // a unit diagonal. Speed stays bounded and deterministic.
    system.enqueueMoveIntent({ playerId: 'p1', dx: 3, dy: 4, sequenceId: 1, acceptedAtTick: 1 });
    system.applyQueuedMoveIntents(1, 5);

    expect(player.position.x).toBeCloseTo(5 / Math.SQRT2, 10);
    expect(player.position.y).toBeCloseTo(5 / Math.SQRT2, 10);
  });
});
