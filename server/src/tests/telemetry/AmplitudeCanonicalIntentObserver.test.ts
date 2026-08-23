import { describe, expect, it } from "vitest";
import { CanonicalIntentIntake } from "../../intents/CanonicalIntentIntake.js";
import { canonicalizeClientIntent } from "../../intents/ServerCanonicalIntent.js";
import {
  AmplitudeCanonicalIntentObserver,
  projectCanonicalIntentForAmplitude,
  pseudonymizeAmplitudeActorId,
  type AmplitudeObserverConfig,
} from "../../telemetry/AmplitudeCanonicalIntentObserver.js";

const CONFIG: AmplitudeObserverConfig = Object.freeze({
  apiKey: "test-api-key",
  identitySalt: "private-test-salt",
  region: "us",
  maxQueueSize: 4,
  maxBatchSize: 2,
});

function makeIntent() {
  return canonicalizeClientIntent(
    { action: "move", payload: { target: { x: 12.5, y: -3.25 } }, requestId: "request:test" },
    {
      actorId: "player:real-identity",
      tickId: 42,
      logicalIndex: 3,
      receivedOrder: 1,
      chunkKey: "chunk:0:-1",
    },
  );
}

describe("AmplitudeCanonicalIntentObserver", () => {
  it("projects the same accepted intent to the same privacy-safe event", () => {
    const intent = makeIntent();
    const a = projectCanonicalIntentForAmplitude(intent, CONFIG.identitySalt);
    const b = projectCanonicalIntentForAmplitude(intent, CONFIG.identitySalt);

    expect(a).toEqual(b);
    expect(a.insert_id).toBe(intent.intentHash);
    expect(a.user_id).toBe(pseudonymizeAmplitudeActorId(intent.actorId, CONFIG.identitySalt));
    expect(a.user_id).not.toContain(intent.actorId);
    expect(JSON.stringify(a)).not.toContain("player:real-identity");
    expect(a.event_properties).toEqual({
      action: "move",
      tick_id: "42",
      logical_index: 3,
      received_order: 1,
      chunk_key: "chunk:0:-1",
      intent_hash: intent.intentHash,
    });
  });

  it("sends only the observer projection and records explicit sent status", async () => {
    const requests: Array<{ url: string; payload: any }> = [];
    const observer = new AmplitudeCanonicalIntentObserver(
      () => CONFIG,
      async (url, payload) => {
        requests.push({ url, payload });
        return { ok: true, status: 200 };
      },
      () => {},
    );

    observer.observe(makeIntent());
    await observer.flush();

    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://api2.amplitude.com/2/httpapi");
    expect(requests[0]?.payload.api_key).toBe(CONFIG.apiKey);
    expect(requests[0]?.payload.events).toHaveLength(1);
    expect(observer.getDiagnostics()).toMatchObject({
      enabled: true,
      queueDepth: 0,
      observed: 1,
      sent: 1,
      failed: 0,
      dropped: 0,
      lastHttpStatus: 200,
    });
  });

  it("keeps the queue bounded without inventing telemetry success", () => {
    const boundedConfig = { ...CONFIG, maxQueueSize: 1 };
    const observer = new AmplitudeCanonicalIntentObserver(
      () => boundedConfig,
      async () => ({ ok: true, status: 200 }),
      () => {},
    );

    observer.observe(makeIntent());
    observer.observe(makeIntent());

    expect(observer.getDiagnostics()).toMatchObject({
      observed: 2,
      queueDepth: 1,
      sent: 0,
      dropped: 1,
    });
  });

  it("cannot roll back an accepted canonical intent when the observer throws", () => {
    const intent = makeIntent();
    const intake = new CanonicalIntentIntake(() => {
      throw new Error("observer transport exploded");
    });

    expect(() => intake.record(intent)).not.toThrow();
    expect(intake.countForTick(42)).toBe(1);
    expect(intake.getForTick(42)).toEqual([intent]);
    expect(intake.hashForTick(42)).toBe(intent.intentHash);
  });
});
