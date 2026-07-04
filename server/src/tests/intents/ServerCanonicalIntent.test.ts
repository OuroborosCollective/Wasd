import { describe, expect, it } from "vitest";
import type { ClientIntent } from "@wasd/shared";
import {
  canonicalizeClientIntent,
  canonicalizeClientIntentBatch,
  chunkKeyFromWorldPosition,
  sortCanonicalIntents,
} from "../../intents/ServerCanonicalIntent";

function gatherIntent(nodeId = "berry_bush_01"): ClientIntent<"gather"> {
  return {
    action: "gather",
    payload: {
      nodeId,
      playerPosition: { x: 130.1234567, y: -2.25 },
    },
    requestId: "req:gather:1",
  };
}

describe("ServerCanonicalIntent", () => {
  it("derives the same hash for the same client wish and server context", () => {
    const context = {
      actorId: "player:test",
      tickId: 42,
      logicalIndex: 42,
      receivedOrder: 0,
      chunkKey: chunkKeyFromWorldPosition({ x: 130.1234567, y: -2.25 }),
    };

    const first = canonicalizeClientIntent(gatherIntent(), context);
    const second = canonicalizeClientIntent(gatherIntent(), context);

    expect(first).toEqual(second);
    expect(first.intentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.chunkKey).toBe("chunk:2:-1");
  });

  it("server context changes the hash while the client payload stays only a wish", () => {
    const baseContext = {
      actorId: "player:test",
      tickId: 100,
      logicalIndex: 100,
      receivedOrder: 0,
      chunkKey: "chunk:0:0",
    };

    const first = canonicalizeClientIntent(gatherIntent(), baseContext);
    const nextTick = canonicalizeClientIntent(gatherIntent(), {
      ...baseContext,
      tickId: 101,
      logicalIndex: 101,
    });

    expect(first.intentHash).not.toBe(nextTick.intentHash);
    expect(first.actorId).toBe("player:test");
    expect(first.logicalIndex).toBe(100);
  });

  it("assigns deterministic receivedOrder for an arrival batch", () => {
    const batch = canonicalizeClientIntentBatch(
      [gatherIntent("stone_01"), gatherIntent("tree_01"), gatherIntent("ore_01")],
      {
        actorId: "player:test",
        tickId: 7,
        logicalIndex: 7,
        chunkKey: "chunk:0:0",
      },
    );

    expect(batch.map((intent) => intent.receivedOrder)).toEqual([0, 1, 2]);
    expect(batch.map((intent) => intent.intentHash)).toEqual(
      canonicalizeClientIntentBatch(
        [gatherIntent("stone_01"), gatherIntent("tree_01"), gatherIntent("ore_01")],
        {
          actorId: "player:test",
          tickId: 7,
          logicalIndex: 7,
          chunkKey: "chunk:0:0",
        },
      ).map((intent) => intent.intentHash),
    );
  });

  it("sorts canonical intents by server-assigned order, not client payload key order", () => {
    const unordered = canonicalizeClientIntentBatch(
      [gatherIntent("third"), gatherIntent("first"), gatherIntent("second")],
      {
        actorId: "player:test",
        tickId: 9,
        logicalIndex: 9,
        chunkKey: "chunk:0:0",
      },
    ).reverse();

    expect(sortCanonicalIntents(unordered).map((intent) => intent.receivedOrder)).toEqual([0, 1, 2]);
  });

  it("rejects client-supplied server authority fields", () => {
    const unsafeIntent = {
      action: "gather",
      payload: {
        nodeId: "berry_bush_01",
        playerPosition: { x: 0, y: 0 },
        tickId: 999,
      },
    } as unknown as ClientIntent<"gather">;

    expect(() =>
      canonicalizeClientIntent(unsafeIntent, {
        actorId: "player:test",
        tickId: 1,
        logicalIndex: 1,
        receivedOrder: 0,
        chunkKey: "chunk:0:0",
      }),
    ).toThrow(/server-authoritative/);
  });
});
