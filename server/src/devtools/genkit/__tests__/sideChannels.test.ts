import { afterEach, describe, expect, it, vi } from "vitest";
import { CanonicalIntentIntake } from "../../../intents/CanonicalIntentIntake.js";
import { canonicalizeActorMoveIntent } from "../../../intents/ServerCanonicalIntent.js";
import { AmplitudeTelemetry } from "../../../services/amplitudeTelemetry.js";
import { QuicknodeReadOnlyObserver } from "../../../services/quicknodeReadOnly.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("external side-channel boundaries", () => {
  it("records canonical truth before a failing observer and preserves the accepted intent", async () => {
    const intake = new CanonicalIntentIntake();
    let observed: unknown = null;
    intake.subscribe((value) => {
      observed = value;
      throw new Error("telemetry exploded");
    });

    const intent = canonicalizeActorMoveIntent({
      actorId: "player:side-channel-proof",
      fromPosition: { x: 1, y: 2 },
      delta: { dx: 1, dy: 0 },
      tickId: 42,
      logicalIndex: 42,
      receivedOrder: 0,
    });

    expect(() => intake.record(intent)).not.toThrow();
    expect(intake.getForTick(42)).toEqual([intent]);

    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(observed).toEqual({
      action: "move",
      actorId: "player:side-channel-proof",
      tickId: 42,
      chunkKey: String(intent.chunkKey),
      intentHash: intent.intentHash,
    });
    expect(Object.isFrozen(observed)).toBe(true);
    expect(intake.getForTick(42)).toEqual([intent]);
  });

  it("keeps Amplitude disabled until both real API key and identity salt are configured", () => {
    vi.stubEnv("AMPLITUDE_ENABLED", "true");
    vi.stubEnv("AMPLITUDE_API_KEY", "");
    vi.stubEnv("AMPLITUDE_ID_SALT", "");
    const telemetry = new AmplitudeTelemetry();
    expect(telemetry.getStatus()).toMatchObject({
      truthClass: "SIDE_CHANNEL_TELEMETRY",
      configured: false,
      enabled: false,
      sentEvents: 0,
      failedEvents: 0,
    });
  });

  it("keeps Quicknode disabled without a real HTTPS endpoint and exposes no write RPC API", () => {
    vi.stubEnv("QUICKNODE_ENABLED", "true");
    vi.stubEnv("QUICKNODE_RPC_URL", "");
    const observer = new QuicknodeReadOnlyObserver();
    expect(observer.getStatus()).toMatchObject({
      truthClass: "SIDE_CHANNEL_EXTERNAL_ATTESTATION",
      configured: false,
      enabled: false,
      observedChainId: null,
      observedBlockNumber: null,
    });
    expect("sendTransaction" in observer).toBe(false);
    expect("sign" in observer).toBe(false);
  });

  it("degrades malformed Quicknode config instead of throwing during process bootstrap", () => {
    vi.stubEnv("QUICKNODE_ENABLED", "true");
    vi.stubEnv("QUICKNODE_RPC_URL", "http://not-https.invalid/rpc");
    vi.stubEnv("QUICKNODE_EXPECTED_CHAIN_ID", "not-a-chain-id");

    expect(() => new QuicknodeReadOnlyObserver()).not.toThrow();
    const observer = new QuicknodeReadOnlyObserver();
    expect(observer.getStatus().enabled).toBe(false);
    expect(observer.getStatus().configured).toBe(false);
    expect(observer.getStatus().configurationError).toMatch(/HTTPS/);
    expect(observer.getStatus().configurationError).toMatch(/chain/i);
  });
});
