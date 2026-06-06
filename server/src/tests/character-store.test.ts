/**
 * CharacterStore Unit Tests
 * Deterministic: No Date.now(), no Math.random().
 */

import { describe, expect, it, beforeEach } from "vitest";
import { CharacterStore } from "../src/character/CharacterStore";

describe("CharacterStore", () => {
  let store: CharacterStore;

  beforeEach(() => {
    store = new CharacterStore();
  });

  it("creates deterministic character profile", () => {
    const result = store.createCharacter({
      playerId: "p1",
      displayName: "Test Hero",
      archetype: "forager",
      currentTick: 100,
    });

    expect(result.ok).toBe(true);
    expect(result.profile).toEqual(
      expect.objectContaining({
        playerId: "p1",
        displayName: "Test Hero",
        archetype: "forager",
        createdAtTick: 100,
        selected: true,
      }),
    );
  });

  it("rejects invalid player ID", () => {
    const result = store.createCharacter({
      playerId: "",
      displayName: "Test",
      archetype: "wanderer",
      currentTick: 0,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("invalid_player");
  });

  it("rejects anonymous player ID", () => {
    const result = store.createCharacter({
      playerId: "anonymous",
      displayName: "Test",
      archetype: "wanderer",
      currentTick: 0,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("invalid_player");
  });

  it("rejects invalid names (too short)", () => {
    const result = store.createCharacter({
      playerId: "p1",
      displayName: "..",
      archetype: "wanderer",
      currentTick: 0,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("invalid_name");
  });

  it("rejects invalid names (special characters)", () => {
    const result = store.createCharacter({
      playerId: "p1",
      displayName: "Test@Hero!",
      archetype: "wanderer",
      currentTick: 0,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("invalid_name");
  });

  it("normalizes valid display names", () => {
    const result = store.createCharacter({
      playerId: "p1",
      displayName: "  Test   Hero  ",
      archetype: "wanderer",
      currentTick: 0,
    });

    expect(result.ok).toBe(true);
    expect(result.profile?.displayName).toBe("Test Hero");
  });

  it("prevents duplicate character creation", () => {
    store.createCharacter({
      playerId: "p1",
      displayName: "First",
      archetype: "wanderer",
      currentTick: 0,
    });

    const second = store.createCharacter({
      playerId: "p1",
      displayName: "Second",
      archetype: "miner",
      currentTick: 1,
    });

    expect(second.ok).toBe(false);
    expect(second.reason).toBe("already_exists");
  });

  it("rejects invalid archetypes", () => {
    const result = store.createCharacter({
      playerId: "p1",
      displayName: "Test",
      archetype: "invalid_archetype" as any,
      currentTick: 0,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("invalid_archetype");
  });

  it("creates default character ID from playerId", () => {
    const result = store.createCharacter({
      playerId: "player_123",
      displayName: "Test",
      archetype: "wanderer",
      currentTick: 0,
    });

    expect(result.ok).toBe(true);
    expect(result.profile?.characterId).toBe("char_player_123");
  });

  it("retrieves character profile", () => {
    store.createCharacter({
      playerId: "p1",
      displayName: "Test Hero",
      archetype: "forager",
      currentTick: 100,
    });

    const profile = store.getCharacterProfile("p1");
    expect(profile).not.toBeNull();
    expect(profile?.displayName).toBe("Test Hero");
    expect(profile?.archetype).toBe("forager");
  });

  it("returns null for non-existent player", () => {
    const profile = store.getCharacterProfile("nonexistent");
    expect(profile).toBeNull();
  });

  it("replaces character profile", () => {
    store.createCharacter({
      playerId: "p1",
      displayName: "Original",
      archetype: "wanderer",
      currentTick: 0,
    });

    store.replaceCharacterProfile("p1", {
      playerId: "p1",
      schemaVersion: 1,
      characterId: "char_p1",
      displayName: "Updated",
      archetype: "miner",
      createdAtTick: 0,
      selected: true,
    });

    const profile = store.getCharacterProfile("p1");
    expect(profile?.displayName).toBe("Updated");
    expect(profile?.archetype).toBe("miner");
  });

  it("clears all profiles for tests", () => {
    store.createCharacter({
      playerId: "p1",
      displayName: "Test",
      archetype: "wanderer",
      currentTick: 0,
    });

    store.clearForTests();

    const profile = store.getCharacterProfile("p1");
    expect(profile).toBeNull();
  });

  it("handles all valid archetypes", () => {
    const archetypes = ["wanderer", "forager", "miner", "angler", "artisan"] as const;

    for (const archetype of archetypes) {
      const testStore = new CharacterStore();
      const result = testStore.createCharacter({
        playerId: `p_${archetype}`,
        displayName: "Test",
        archetype,
        currentTick: 0,
      });

      expect(result.ok).toBe(true);
      expect(result.profile?.archetype).toBe(archetype);
    }
  });
});