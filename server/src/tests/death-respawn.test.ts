import { describe, it, expect, vi } from "vitest";
import {
  handlePlayerDeath,
  processRespawns,
  respawnPlayer,
  getNearestRespawnPoint,
  RESPAWN_DELAY_MS,
  RESPAWN_DELAY_TICKS,
  WORLD_TICK_MS,
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

function makeWorld(points?: RespawnableWorld["respawnPoints"], players?: DeathCapablePlayer[]): RespawnableWorld {
  return {
    players,
    respawnPoints: points ?? [
      { id: "rp_hub", zoneId: "didis_hub", x: 0, z: 0, label: "Hub Center" },
      { id: "rp_outpost", zoneId: "didis_hub", x: 50, z: 50, label: "Outpost" },
      { id: "rp_other", zoneId: "other_zone", x: 100, z: 100, label: "Other Zone" },
    ],
  };
}

describe("Death & Respawn System", () => {
  describe("handlePlayerDeath", () => {
    it("marks player as dead with zero health and deterministic ticks", () => {
      const player = makePlayer();
      const send = vi.fn();
      const currentTick = 123;
      handlePlayerDeath(player, makeWorld(), send, currentTick);
      expect(player.dead).toBe(true);
      expect(player.health).toBe(0);
      expect(player.deathTick).toBe(currentTick);
      expect(player.deathAt).toBe(currentTick * WORLD_TICK_MS);
      expect(player.respawnTick).toBe(currentTick + RESPAWN_DELAY_TICKS);
      expect(player.combatTargetNpcId).toBeUndefined();
    });

    it("increments totalDeaths", () => {
      const player = makePlayer({ totalDeaths: 3 });
      handlePlayerDeath(player, makeWorld(), vi.fn(), 10);
      expect(player.totalDeaths).toBe(4);
    });

    it("sends player_died message with respawn delay and tick", () => {
      const send = vi.fn();
      const currentTick = 50;
      handlePlayerDeath(makePlayer(), makeWorld(), send, currentTick);
      expect(send).toHaveBeenCalledWith("player_died", {
        respawnInMs: RESPAWN_DELAY_MS,
        respawnTick: currentTick + RESPAWN_DELAY_TICKS,
        message: "Du wurdest besiegt...",
      });
    });

    it("does nothing if already dead", () => {
      const player = makePlayer({ dead: true });
      const send = vi.fn();
      handlePlayerDeath(player, makeWorld(), send, 10);
      expect(send).not.toHaveBeenCalled();
    });

    it("returns a respawn tick", () => {
      const player = makePlayer();
      const result = handlePlayerDeath(player, makeWorld(), vi.fn(), 20);
      expect(result.respawnTick).toBe(20 + RESPAWN_DELAY_TICKS);
    });
  });

  describe("processRespawns", () => {
    it("respawns only players whose respawnTick has arrived", () => {
      const ready = makePlayer({ id: "ready", dead: true, health: 0, mana: 0, deathTick: 10, deathAt: 10 * WORLD_TICK_MS, respawnTick: 90 });
      const waiting = makePlayer({ id: "waiting", dead: true, health: 0, mana: 0, deathTick: 20, deathAt: 20 * WORLD_TICK_MS, respawnTick: 120 });
      const sendById = vi.fn();
      const count = processRespawns(makeWorld(undefined, [ready, waiting]), 90, sendById);
      expect(count).toBe(1);
      expect(ready.dead).toBe(false);
      expect(ready.deathTick).toBeUndefined();
      expect(ready.respawnTick).toBeUndefined();
      expect(waiting.dead).toBe(true);
      expect(waiting.respawnTick).toBe(120);
      expect(sendById).toHaveBeenCalledWith("ready", "player_respawned", expect.objectContaining({ health: 30, mana: 7 }));
    });
  });

  describe("respawnPlayer", () => {
    it("revives player at 30% HP/mana and clears death ticks", () => {
      const player = makePlayer({ dead: true, health: 0, mana: 0, deathTick: 10, respawnTick: 90 });
      respawnPlayer(player, makeWorld(), vi.fn());
      expect(player.dead).toBe(false);
      expect(player.health).toBe(30);
      expect(player.mana).toBe(7);
      expect(player.deathAt).toBe(0);
      expect(player.deathTick).toBeUndefined();
      expect(player.respawnTick).toBeUndefined();
    });

    it("sends player_respawned with coordinates", () => {
      const player = makePlayer({ dead: true, health: 0, position: { x: 5, y: 5 } });
      const send = vi.fn();
      respawnPlayer(player, makeWorld(), send);
      expect(send).toHaveBeenCalledWith("player_respawned", expect.objectContaining({ health: expect.any(Number), mana: expect.any(Number) }));
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
      const result = getNearestRespawnPoint({ position: { x: 10, y: 20 }, currentZone: "any" }, { respawnPoints: [] });
      expect(result.id).toBe("default");
    });

    it("prefers same-zone points", () => {
      const world = makeWorld();
      const result = getNearestRespawnPoint({ position: { x: 45, y: 45 }, currentZone: "didis_hub" }, world);
      expect(result.zoneId).toBe("didis_hub");
      expect(result.id).toBe("rp_outpost");
    });

    it("falls back to all points if no zone match", () => {
      const world = makeWorld();
      const result = getNearestRespawnPoint({ position: { x: 95, y: 95 }, currentZone: "unknown_zone" }, world);
      expect(result).toBeDefined();
      expect(result.id).toBe("rp_other");
    });
  });
});
