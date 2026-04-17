import { afterEach, describe, expect, it, vi } from "vitest";

describe("WS_MAX_MESSAGE_BYTES", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults to 65536 when unset", async () => {
    delete process.env.WS_MAX_MESSAGE_BYTES;
    vi.resetModules();
    const { GameConfig } = await import("../config/GameConfig.js");
    expect(GameConfig.wsMaxMessageBytes).toBe(65536);
  });

  it("reads a positive integer from WS_MAX_MESSAGE_BYTES", async () => {
    vi.stubEnv("WS_MAX_MESSAGE_BYTES", "32768");
    vi.resetModules();
    const { GameConfig } = await import("../config/GameConfig.js");
    expect(GameConfig.wsMaxMessageBytes).toBe(32768);
  });

  it("ignores invalid values and falls back", async () => {
    vi.stubEnv("WS_MAX_MESSAGE_BYTES", "not-a-number");
    vi.resetModules();
    const { GameConfig } = await import("../config/GameConfig.js");
    expect(GameConfig.wsMaxMessageBytes).toBe(65536);
  });
});
