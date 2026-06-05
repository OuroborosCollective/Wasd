/**
 * PLAYER IDENTITY RESOLVER TEST
 *
 * Verifies server-authoritative player identity resolution.
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver";

describe("resolveHttpPlayerIdentity", () => {
  describe("prefers authenticated user id", () => {
    it("extracts playerId from user.id", () => {
      const identity = resolveHttpPlayerIdentity({
        user: { id: "user-123" },
        query: { playerId: "evil-override" },
      } as any);

      expect(identity.playerId).toBe("user-123");
      expect(identity.authenticated).toBe(true);
      expect(identity.source).toBe("auth");
    });

    it("extracts playerId from user.sub", () => {
      const identity = resolveHttpPlayerIdentity({
        user: { sub: "user-sub-456" },
      } as any);

      expect(identity.playerId).toBe("user-sub-456");
      expect(identity.authenticated).toBe(true);
      expect(identity.source).toBe("auth");
    });

    it("ignores query playerId when auth is present", () => {
      const identity = resolveHttpPlayerIdentity({
        user: { id: "auth-player" },
        query: { playerId: "query-player" },
      } as any);

      expect(identity.playerId).toBe("auth-player");
      expect(identity.source).toBe("auth");
    });
  });

  describe("session fallback", () => {
    it("extracts playerId from session.playerId", () => {
      const identity = resolveHttpPlayerIdentity({
        session: { playerId: "session-player" },
      } as any);

      expect(identity.playerId).toBe("session-player");
      expect(identity.authenticated).toBe(true);
      expect(identity.source).toBe("session");
    });

    it("ignores query when session is present", () => {
      const identity = resolveHttpPlayerIdentity({
        session: { playerId: "session-player" },
        query: { playerId: "query-player" },
      } as any);

      expect(identity.playerId).toBe("session-player");
      expect(identity.source).toBe("session");
    });
  });

  describe("dev/test fallback", () => {
    it("allows query playerId in non-production", () => {
      const identity = resolveHttpPlayerIdentity({
        query: { playerId: "test-player" },
      } as any);

      expect(identity.playerId).toBe("test-player");
      expect(identity.source).toBe("dev-fallback");
      expect(identity.authenticated).toBe(false);
    });

    it("normalizes playerId to valid format", () => {
      const identity = resolveHttpPlayerIdentity({
        query: { playerId: "valid_player.123" },
      } as any);

      expect(identity.playerId).toBe("valid_player.123");
    });
  });

  describe("rejects malformed ids", () => {
    it("rejects path traversal attempts", () => {
      const identity = resolveHttpPlayerIdentity({
        query: { playerId: "../../bad" },
      } as any);

      expect(identity.playerId).not.toBe("../../bad");
    });

    it("rejects ids with invalid characters", () => {
      const identity = resolveHttpPlayerIdentity({
        query: { playerId: "bad<script>alert" },
      } as any);

      expect(identity.playerId).not.toBe("bad<script>alert");
    });

    it("rejects empty playerId", () => {
      const identity = resolveHttpPlayerIdentity({
        query: { playerId: "   " },
      } as any);

      expect(identity.playerId).not.toBe("   ");
    });
  });

  describe("anonymous fallback", () => {
    it("returns anonymous when no identity found", () => {
      const identity = resolveHttpPlayerIdentity({} as any);

      expect(identity.playerId).toBe("anonymous");
      expect(identity.source).toBe("anonymous");
      expect(identity.authenticated).toBe(false);
    });
  });
});