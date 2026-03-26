import { describe, it, expect, beforeEach } from "vitest";
import { SessionRegistry } from "../modules/auth/SessionRegistry.js";

describe("SessionRegistry", () => {
  let registry: SessionRegistry;

  beforeEach(() => {
    registry = new SessionRegistry();
  });

  it("should store and retrieve a session", () => {
    const sessionId = "session-1";
    const sessionData = { userId: "user-1", data: "test" };

    registry.set(sessionId, sessionData);
    expect(registry.get(sessionId)).toEqual(sessionData);
  });

  it("should return null for non-existent session", () => {
    expect(registry.get("non-existent")).toBeNull();
  });

  it("should remove a session", () => {
    const sessionId = "session-1";
    registry.set(sessionId, { userId: "user-1" });

    registry.remove(sessionId);
    expect(registry.get(sessionId)).toBeNull();
  });

  it("should overwrite session data when calling set with the same ID", () => {
    const sessionId = "session-1";
    registry.set(sessionId, { version: 1 });
    registry.set(sessionId, { version: 2 });

    expect(registry.get(sessionId)).toEqual({ version: 2 });
  });
});
