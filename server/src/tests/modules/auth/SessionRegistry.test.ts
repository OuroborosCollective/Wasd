import { describe, it, expect, beforeEach } from "vitest";
import { SessionRegistry } from "../../../modules/auth/SessionRegistry.js";

describe("SessionRegistry", () => {
  let registry: SessionRegistry;

  beforeEach(() => {
    registry = new SessionRegistry();
  });

  it("should set and get a session", () => {
    const sessionId = "test-session-id";
    const sessionData = { userId: "user-123", username: "testuser" };

    // The current code has `set`, `get`, `remove` methods.
    registry.set(sessionId, sessionData);

    const result = registry.get(sessionId);
    expect(result).toBe(sessionData); // Check reference equality
  });

  it("should return null for an unknown session", () => {
    const result = registry.get("unknown-session-id");
    expect(result).toBeNull();
  });

  it("should remove a session", () => {
    const sessionId = "test-session-id";
    const sessionData = { userId: "user-123" };

    registry.set(sessionId, sessionData);
    registry.remove(sessionId);

    const result = registry.get(sessionId);
    expect(result).toBeNull();
  });

  it("should update an existing session", () => {
    const sessionId = "test-session-id";
    const initialData = { userId: "user-123", state: "initial" };
    const updatedData = { userId: "user-123", state: "updated" };

    registry.set(sessionId, initialData);
    registry.set(sessionId, updatedData);

    const result = registry.get(sessionId);
    expect(result).toBe(updatedData);
  });
});
