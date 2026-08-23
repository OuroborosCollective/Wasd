import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveHttpPlayerIdentity } from "../../auth/PlayerIdentityResolver.js";

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  MCP_ADMIN_TOKEN: process.env.MCP_ADMIN_TOKEN,
  ALLOW_DEV_PLAYER_ID: process.env.ALLOW_DEV_PLAYER_ID,
  ALLOW_GUEST_LOGIN: process.env.ALLOW_GUEST_LOGIN,
  ALLOW_DEV_LOGIN: process.env.ALLOW_DEV_LOGIN,
};

function restoreEnv(name: keyof typeof originalEnv): void {
  const value = originalEnv[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

describe("trusted Genkit/MCP loopback player identity", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "production";
    process.env.MCP_ADMIN_TOKEN = "operator-test-secret-with-enough-entropy";
    delete process.env.ALLOW_DEV_PLAYER_ID;
    delete process.env.ALLOW_GUEST_LOGIN;
    delete process.env.ALLOW_DEV_LOGIN;
  });

  afterEach(() => {
    restoreEnv("NODE_ENV");
    restoreEnv("MCP_ADMIN_TOKEN");
    restoreEnv("ALLOW_DEV_PLAYER_ID");
    restoreEnv("ALLOW_GUEST_LOGIN");
    restoreEnv("ALLOW_DEV_LOGIN");
  });

  it("accepts an operator actor only with the owner token over loopback", () => {
    const identity = resolveHttpPlayerIdentity({
      headers: {
        "x-areloria-operator-token": "operator-test-secret-with-enough-entropy",
        "x-areloria-operator-player-id": "client2d:operator",
      },
      socket: { remoteAddress: "127.0.0.1" },
    });

    expect(identity).toEqual({
      playerId: "client2d:operator",
      source: "operator-loopback",
      authenticated: true,
    });
  });

  it("rejects the same operator headers from a non-loopback peer", () => {
    const identity = resolveHttpPlayerIdentity({
      headers: {
        "x-areloria-operator-token": "operator-test-secret-with-enough-entropy",
        "x-areloria-operator-player-id": "client2d:operator",
      },
      socket: { remoteAddress: "203.0.113.8" },
    });

    expect(identity.authenticated).toBe(false);
    expect(identity.source).toBe("anonymous");
  });

  it("rejects a wrong operator token even on loopback", () => {
    const identity = resolveHttpPlayerIdentity({
      headers: {
        "x-areloria-operator-token": "wrong-secret",
        "x-areloria-operator-player-id": "client2d:operator",
      },
      socket: { remoteAddress: "::1" },
    });

    expect(identity.authenticated).toBe(false);
    expect(identity.source).toBe("anonymous");
  });

  it("keeps normal authenticated user identity above operator delegation", () => {
    const identity = resolveHttpPlayerIdentity({
      user: { id: "real-player" },
      headers: {
        "x-areloria-operator-token": "operator-test-secret-with-enough-entropy",
        "x-areloria-operator-player-id": "client2d:operator",
      },
      socket: { remoteAddress: "127.0.0.1" },
    });

    expect(identity).toEqual({
      playerId: "real-player",
      source: "auth",
      authenticated: true,
    });
  });
});
