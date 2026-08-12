import { describe, expect, it, beforeEach } from 'vitest';
import { canonicalizeActorMoveIntent, chunkKeyFromWorldPosition, type ServerCanonicalIntent } from '../../intents/ServerCanonicalIntent.js';
import { canonicalIntentIntake } from '../../intents/CanonicalIntentIntake.js';

function isPlayerLike(intent: ServerCanonicalIntent): boolean {
  return !intent.actorId.startsWith('npc:');
}

describe('canonicalizeActorMoveIntent — unified player + NPC move path (AIM-77)', () => {
  it('produces a ServerCanonicalIntent<"move"> with target, hash, and server context', () => {
    const intent = canonicalizeActorMoveIntent({
      actorId: 'player:abc',
      fromPosition: { x: 10, y: 20 },
      delta: { dx: 5, dy: 0 },
      tickId: 7,
      logicalIndex: 7,
      receivedOrder: 1,
    });
    expect(intent.action).toBe('move');
    expect(intent.actorId).toBe('player:abc');
    expect(intent.tickId).toBe(7);
    expect(intent.chunkKey).toBe(chunkKeyFromWorldPosition({ x: 10, y: 20 }));
    expect((intent.payload as { target: { x: number; y: number } }).target).toEqual({ x: 15, y: 20 });
    expect(intent.intentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('treats player and NPC moves through the SAME canonical path (no parallel type)', () => {
    const player = canonicalizeActorMoveIntent({
      actorId: 'player:abc', fromPosition: { x: 0, y: 0 }, delta: { dx: 5, dy: 0 },
      tickId: 1, logicalIndex: 1, receivedOrder: 0,
    });
    const npc = canonicalizeActorMoveIntent({
      actorId: 'npc:guard_01', fromPosition: { x: 0, y: 0 }, delta: { dx: 0.05, dy: 0 },
      tickId: 1, logicalIndex: 1, receivedOrder: 1,
    });
    // Both are the same ServerCanonicalIntent<"move"> shape, differing only by
    // actor id + payload (target) + receivedOrder. No NPC-specific type.
    expect(player.action).toBe('move');
    expect(npc.action).toBe('move');
    expect(isPlayerLike(player)).toBe(true);
    expect(isPlayerLike(npc)).toBe(false);
    expect(player.intentHash).not.toBe(npc.intentHash);
  });

  it('is deterministic: identical input → identical hash', () => {
    const a = canonicalizeActorMoveIntent({ actorId: 'npc:n1', fromPosition: { x: 1.5, y: -2.25 }, delta: { dx: 0.05, dy: -0.05 }, tickId: 100, logicalIndex: 100, receivedOrder: 3 });
    const b = canonicalizeActorMoveIntent({ actorId: 'npc:n1', fromPosition: { x: 1.5, y: -2.25 }, delta: { dx: 0.05, dy: -0.05 }, tickId: 100, logicalIndex: 100, receivedOrder: 3 });
    expect(a).toEqual(b);
  });

  it('rejects non-finite deltas (fail-closed)', () => {
    expect(() => canonicalizeActorMoveIntent({ actorId: 'p', fromPosition: { x: 0, y: 0 }, delta: { dx: NaN, dy: 0 }, tickId: 1, logicalIndex: 1, receivedOrder: 0 })).toThrow();
  });
});

describe('CanonicalIntentIntake — unified intent registry (AIM-77)', () => {
  beforeEach(() => canonicalIntentIntake.reset());

  it('records player and NPC intents under the same tick and returns them deterministically sorted', () => {
    const player = canonicalizeActorMoveIntent({ actorId: 'player:z', fromPosition: { x: 0, y: 0 }, delta: { dx: 5, dy: 0 }, tickId: 5, logicalIndex: 5, receivedOrder: 0 });
    const npc = canonicalizeActorMoveIntent({ actorId: 'npc:a', fromPosition: { x: 0, y: 0 }, delta: { dx: 0.05, dy: 0 }, tickId: 5, logicalIndex: 5, receivedOrder: 1 });
    canonicalIntentIntake.record(player);
    canonicalIntentIntake.record(npc);

    const forTick = canonicalIntentIntake.getForTick(5);
    expect(forTick).toHaveLength(2);
    // sorted by logicalIndex then receivedOrder then actorId
    expect(forTick[0].receivedOrder).toBe(0);
    expect(forTick[1].receivedOrder).toBe(1);
    expect(canonicalIntentIntake.countForTick(5)).toBe(2);
  });

  it('reports diagnostics with both player and NPC action counts', () => {
    canonicalIntentIntake.record(canonicalizeActorMoveIntent({ actorId: 'player:p', fromPosition: { x: 0, y: 0 }, delta: { dx: 5, dy: 0 }, tickId: 1, logicalIndex: 1, receivedOrder: 0 }));
    canonicalIntentIntake.record(canonicalizeActorMoveIntent({ actorId: 'npc:n', fromPosition: { x: 0, y: 0 }, delta: { dx: 0.05, dy: 0 }, tickId: 1, logicalIndex: 1, receivedOrder: 1 }));
    const diag = canonicalIntentIntake.getDiagnostics();
    expect(diag.totalRecorded).toBe(2);
    expect(diag.ticksWithIntents).toBe(1);
    expect(diag.byAction.move).toBe(2);
  });

  it('hashForTick is a stable, content-addressed summary of the tick intents', () => {
    canonicalIntentIntake.record(canonicalizeActorMoveIntent({ actorId: 'player:p', fromPosition: { x: 0, y: 0 }, delta: { dx: 5, dy: 0 }, tickId: 1, logicalIndex: 1, receivedOrder: 0 }));
    const h1 = canonicalIntentIntake.hashForTick(1);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
    // Re-recording identical intent produces the same summary.
    canonicalIntentIntake.reset();
    canonicalIntentIntake.record(canonicalizeActorMoveIntent({ actorId: 'player:p', fromPosition: { x: 0, y: 0 }, delta: { dx: 5, dy: 0 }, tickId: 1, logicalIndex: 1, receivedOrder: 0 }));
    expect(canonicalIntentIntake.hashForTick(1)).toBe(h1);
  });

  it('returns empty for ticks with no recorded intents', () => {
    expect(canonicalIntentIntake.getForTick(999)).toEqual([]);
    expect(canonicalIntentIntake.countForTick(999)).toBe(0);
    expect(canonicalIntentIntake.hashForTick(999)).toBe('');
  });
});
