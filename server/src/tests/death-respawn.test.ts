// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handlePlayerDeath,
  respawnPlayer,
  getNearestRespawnPoint,
  RESPAWN_DELAY_MS,
  type DeathCapablePlayer,
  type RespawnableWorld,
} from "../modules/combat/deathRespawnSystem.js";

function makePlayer(overrides: Partial<DeathCapablePlayer> = {}): DeathCapablePlayer {
  return {
    id: "player_1",
    dead: false,
    deathAt: 0,
    health: 100,
    maxHealth: 100,
    mana: 25,
    maxMana: 25,
    position: { x: 10, y: 20 },
    combatTargetNpcId: "npc_1",
    totalDeaths: 0,
    currentZone: "didis_hub",
    ...overrides,
  };
}

function makeWorld(points?: RespawnableWorld["respawnPoints"]): RespawnableWorld {
  return {
    respawnPoints: points ?? [
      { id: "rp_hub", zoneId: "didis_hub", x: 0, z: 0, label: "Hub Center" },
      { id: "rp_outpost", zoneId: "didis_hub", x: 50, z: 50, label: "Outpost" },
      { id: "rp_other", zoneId: "other_zone", x: 100, z: 100, label: "Other Zone" },
    ],
  };
}

describe("Death & Respawn System", () => {
  describe("handlePlayerDeath", () => {
    it("marks player as dead with zero health", () => {
      const player = makePlayer();
      const send = vi.fn();
      handlePlayerDeath(player, makeWorld(), send, false);

      expect(player.dead).toBe(true);
      expect(player.health).toBe(0);
      expect(player.deathAt).toBeGreaterThan(0);
      expect(player.combatTargetNpcId).toBeUndefined();
    });

    it("increments totalDeaths", () => {
      const player = makePlayer({ totalDeaths: 3 });
      handlePlayerDeath(player, makeWorld(), vi.fn(), false);
      expect(player.totalDeaths).toBe(4);
    });

    it("sends player_died message with respawn delay", () => {
      const send = vi.fn();
      handlePlayerDeath(makePlayer(), makeWorld(), send, false);

      expect(send).toHaveBeenCalledWith("player_died", {
        respawnInMs: RESPAWN_DELAY_MS,
        message: "Du wurdest besiegt...",
      });
    });

    it("does nothing if already dead", () => {
      const player = makePlayer({ dead: true });
      const send = vi.fn();
      handlePlayerDeath(player, makeWorld(), send, false);
      expect(send).not.toHaveBeenCalled();
    });

    it("returns a respawn timer when scheduleRespawn is true", () => {
      const player = makePlayer();
      const result = handlePlayerDeath(player, makeWorld(), vi.fn(), true);
      expect(result.respawnTimer).toBeDefined();
      clearTimeout(result.respawnTimer!);
    });
  });

  describe("respawnPlayer", () => {
    it("revives player at 30% HP/mana", () => {
      const player = makePlayer({ dead: true, health: 0, mana: 0 });
      respawnPlayer(player, makeWorld(), vi.fn());

      expect(player.dead).toBe(false);
      expect(player.health).toBe(30); // 30% of 100
      expect(player.mana).toBe(7); // floor(30% of 25)
      expect(player.deathAt).toBe(0);
    });

    it("sends player_respawned with coordinates", () => {
      const player = makePlayer({ dead: true, health: 0, position: { x: 5, y: 5 } });
      const send = vi.fn();
      respawnPlayer(player, makeWorld(), send);

      expect(send).toHaveBeenCalledWith("player_respawned", expect.objectContaining({
        health: expect.any(Number),
        mana: expect.any(Number),
      }));
    });

    it("moves player to the respawn point position", () => {
      const player = makePlayer({ dead: true, health: 0, position: { x: 5, y: 5 } });
      const world = makeWorld([{ id: "rp", zoneId: "didis_hub", x: 42, z: 99, label: "Test" }]);
      respawnPlayer(player, world, vi.fn());

      expect(player.position.x).toBe(42);
      expect(player.position.y).toBe(99);
    });
  });

  describe("getNearestRespawnPoint", () => {
    it("returns default when no points defined", () => {
      const result = getNearestRespawnPoint(
        { position: { x: 10, y: 20 }, currentZone: "any" },
        { respawnPoints: [] },
      );
      expect(result.id).toBe("default");
    });

    it("prefers same-zone points", () => {
      const world = makeWorld();
      const result = getNearestRespawnPoint(
        { position: { x: 45, y: 45 }, currentZone: "didis_hub" },
        world,
      );
      expect(result.zoneId).toBe("didis_hub");
      expect(result.id).toBe("rp_outpost");
    });

    it("falls back to all points if no zone match", () => {
      const world = makeWorld();
      const result = getNearestRespawnPoint(
        { position: { x: 95, y: 95 }, currentZone: "unknown_zone" },
        world,
      );
      expect(result).toBeDefined();
      expect(result.id).toBe("rp_other");
    });
  });
});
