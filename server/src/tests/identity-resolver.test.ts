import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isDevPlayerIdentityFallbackEnabled, resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";

const KEYS = ["NODE_ENV", "ALLOW_DEV_PLAYER_ID", "ALLOW_GUEST_LOGIN", "ALLOW_DEV_LOGIN"] as const;
let saved: Partial<Record<(typeof KEYS)[number], string | undefined>> = {};

function resetEnv(): void {
  for (const key of KEYS) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe("resolveHttpPlayerIdentity", () => {
  beforeEach(() => {
    saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
    delete process.env.ALLOW_DEV_PLAYER_ID;
    delete process.env.ALLOW_GUEST_LOGIN;
    delete process.env.ALLOW_DEV_LOGIN;
  });

  afterEach(() => {
    resetEnv();
  });

  it("uses auth identity before request supplied ids", () => {
    process.env.NODE_ENV = "production";
    const identity = resolveHttpPlayerIdentity({
      user: { id: "auth_player" },
      headers: { "x-player-id": "header_player" },
      query: { playerId: "query_player" },
      body: { playerId: "body_player" },
    });

    expect(identity.playerId).toBe("auth_player");
    expect(identity.source).toBe("auth");
    expect(identity.authenticated).toBe(true);
  });

  it("keeps request supplied ids disabled in production by default", () => {
    process.env.NODE_ENV = "production";

    expect(isDevPlayerIdentityFallbackEnabled()).toBe(false);
    expect(resolveHttpPlayerIdentity({ headers: { "x-player-id": "guest_player" } })).toEqual({
      playerId: "anonymous",
      source: "anonymous",
      authenticated: false,
    });
  });

  it("accepts request supplied ids in production only with an explicit allow flag", () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_GUEST_LOGIN = "true";

    expect(isDevPlayerIdentityFallbackEnabled()).toBe(true);
    expect(resolveHttpPlayerIdentity({ headers: { "x-player-id": "guest_player" } })).toEqual({
      playerId: "guest_player",
      source: "dev-fallback",
      authenticated: false,
    });
  });

  it("keeps local development fallback available", () => {
    process.env.NODE_ENV = "development";

    expect(isDevPlayerIdentityFallbackEnabled()).toBe(true);
    expect(resolveHttpPlayerIdentity({ query: { playerId: "local_player" } }).playerId).toBe("local_player");
  });
});
