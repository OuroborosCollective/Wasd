import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GameConfig } from "../config/GameConfig.js";
import { resolveWsMaxMessageBytes } from "../config/resolveWsMaxMessageBytes.js";

describe("resolveWsMaxMessageBytes", () => {
  beforeEach(() => {
    delete process.env.WS_MAX_MESSAGE_BYTES;
  });
  afterEach(() => {
    delete process.env.WS_MAX_MESSAGE_BYTES;
  });

  it("defaults to GameConfig", () => {
    expect(resolveWsMaxMessageBytes()).toBe(GameConfig.wsMaxMessageBytes);
  });

  it("honors WS_MAX_MESSAGE_BYTES when valid", () => {
    process.env.WS_MAX_MESSAGE_BYTES = "4096";
    expect(resolveWsMaxMessageBytes()).toBe(4096);
  });

  it("falls back when env is invalid", () => {
    process.env.WS_MAX_MESSAGE_BYTES = "0";
    expect(resolveWsMaxMessageBytes()).toBe(GameConfig.wsMaxMessageBytes);
    process.env.WS_MAX_MESSAGE_BYTES = "nope";
    expect(resolveWsMaxMessageBytes()).toBe(GameConfig.wsMaxMessageBytes);
  });
});
