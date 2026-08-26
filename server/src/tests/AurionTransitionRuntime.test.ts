import { afterEach, describe, expect, it } from "vitest";
import {
  AURION_EXPANSE_ENTRY_POINT_ID,
  AURION_EXPANSE_ZONE_ID,
  AURION_TOWER_RETURN_POINT_ID,
  AurionTransitionRuntime,
} from "../aurion/AurionTransitionRuntime.js";
import { AurionTransitionTickSystem } from "../core/are/AurionTransitionTickSystem.js";
import { canonicalIntentIntake } from "../intents/CanonicalIntentIntake.js";

function request(playerId: string, requestId: string, sequenceId: number, acceptedAtTick = 8) {
  return {
    playerId,
    requestId,
    sequenceId,
    acceptedAtTick,
    playerPosition: { x: 128, y: -64 },
  };
}

afterEach(() => {
  canonicalIntentIntake.reset();
});

describe("AurionTransitionRuntime", () => {
  it("queues a server-default tower-to-expanse transition and applies it only on its tick", () => {
    const runtime = new AurionTransitionRuntime();
    const queued = runtime.requestTransition(request("player_a", "aurion_001", 1));

    expect(queued).toMatchObject({ ok: true, code: "queued", duplicate: false });
    expect(queued.snapshot).toMatchObject({
      status: "queued",
      zoneId: "tower",
      entryPointId: AURION_TOWER_RETURN_POINT_ID,
      pendingRequestCount: 1,
      lastReceipt: { status: "queued", appliedAtTick: null },
    });
    expect(canonicalIntentIntake.getForTick(8)).toHaveLength(1);
    expect(runtime.applyReadyTransitions(7)).toBe(0);
    expect(runtime.getSnapshot("player_a").status).toBe("queued");

    expect(runtime.applyReadyTransitions(8)).toBe(1);
    expect(runtime.getSnapshot("player_a")).toMatchObject({
      persistence: "ephemeral",
      status: "active",
      sessionId: "aurion:player_a",
      zoneId: AURION_EXPANSE_ZONE_ID,
      entryPointId: AURION_EXPANSE_ENTRY_POINT_ID,
      returnPointId: AURION_TOWER_RETURN_POINT_ID,
      lastAppliedTick: 8,
      lastAcceptedSequence: 1,
      pendingRequestCount: 0,
      lastReceipt: { requestId: "aurion_001", sequenceId: 1, status: "applied", appliedAtTick: 8 },
    });
  });

  it("returns the same receipt state for a duplicate player-bound request", () => {
    const runtime = new AurionTransitionRuntime();
    const first = runtime.requestTransition(request("player_a", "aurion_duplicate", 3));
    runtime.applyReadyTransitions(8);
    const duplicate = runtime.requestTransition(request("player_a", "aurion_duplicate", 3));

    expect(first.ok).toBe(true);
    expect(duplicate).toMatchObject({ ok: true, code: "duplicate", duplicate: true });
    expect(duplicate.snapshot.transitionHash).toBe(runtime.getSnapshot("player_a").transitionHash);
    expect(runtime.getPendingTransitionCount()).toBe(0);
  });

  it("rejects a stale sequence without changing the existing queued request", () => {
    const runtime = new AurionTransitionRuntime();
    runtime.requestTransition(request("player_a", "aurion_newer", 10));
    const stale = runtime.requestTransition(request("player_a", "aurion_stale", 9));

    expect(stale).toMatchObject({ ok: false, code: "stale_sequence" });
    expect(runtime.getSnapshot("player_a")).toMatchObject({
      status: "queued",
      pendingRequestCount: 1,
      lastReceipt: { requestId: "aurion_newer", sequenceId: 10, status: "queued" },
    });
  });

  it("keeps sessions and receipts isolated by resolved player identity", () => {
    const runtime = new AurionTransitionRuntime();
    runtime.requestTransition(request("player_a", "aurion_user_a", 1));
    runtime.applyReadyTransitions(8);

    expect(runtime.getSnapshot("player_b")).toMatchObject({
      playerId: "player_b",
      status: "idle",
      sessionId: null,
      lastReceipt: null,
      pendingRequestCount: 0,
    });
    expect(runtime.getSnapshot("player_a").sessionId).toBe("aurion:player_a");
  });

  it("derives an identical read model from identical accepted facts", () => {
    const first = new AurionTransitionRuntime();
    const replay = new AurionTransitionRuntime();
    const input = request("player_deterministic", "aurion_replay", 4, 12);

    first.requestTransition(input);
    first.applyReadyTransitions(12);
    replay.requestTransition(input);
    replay.applyReadyTransitions(12);

    expect(replay.getSnapshot("player_deterministic")).toEqual(first.getSnapshot("player_deterministic"));
  });

  it("does not accept client-selected zone, entry or return values as transition truth", () => {
    const runtime = new AurionTransitionRuntime();
    runtime.requestTransition({
      ...request("player_a", "aurion_server_defaults", 5),
      zoneId: "malicious_zone",
      entryPointId: "client_entry",
      returnPointId: "client_return",
    } as unknown as ReturnType<typeof request>);
    runtime.applyReadyTransitions(8);

    expect(runtime.getSnapshot("player_a")).toMatchObject({
      zoneId: AURION_EXPANSE_ZONE_ID,
      entryPointId: AURION_EXPANSE_ENTRY_POINT_ID,
      returnPointId: AURION_TOWER_RETURN_POINT_ID,
    });
  });

  it("applies queued requests through the registered tick-system seam", () => {
    const runtime = new AurionTransitionRuntime();
    runtime.requestTransition(request("player_tick", "aurion_tick", 1, 14));
    const system = new AurionTransitionTickSystem(runtime);

    system.tick({ tickCount: 13 as never, isHighFrequencyTick: true });
    expect(runtime.getSnapshot("player_tick").status).toBe("queued");
    system.tick({ tickCount: 14 as never, isHighFrequencyTick: true });
    expect(runtime.getSnapshot("player_tick").status).toBe("active");
  });
});
