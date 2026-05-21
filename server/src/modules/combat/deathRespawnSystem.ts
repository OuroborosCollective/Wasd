// @ARE-GUARD-EXEMPT: Infrastructure, Meta, or Telemetry logic; not world-state critical.
/**
 * Death & Respawn system — handles player death state, respawn timers,
 * and zone-based respawn point resolution.
 */

export const RESPAWN_DELAY_MS = 8_000;

export interface RespawnPoint {
  id: string;
  zoneId: string;
  x: number;
  z: number;
  label?: string;
}

export interface DeathCapablePlayer {
  id: string;
  dead: boolean;
  deathAt: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  position: { x: number; y: number };
  combatTargetNpcId?: string | null;
  totalDeaths?: number;
  currentZone?: string;
}

export interface RespawnableWorld {
  respawnPoints?: RespawnPoint[];
}

export function handlePlayerDeath(
  player: DeathCapablePlayer,
  world: RespawnableWorld,
  sendToPlayer: (type: string, payload: unknown) => void,
  scheduleRespawn = true,
): { respawnTimer?: ReturnType<typeof setTimeout> } {
  if (player.dead) return {};

  player.dead = true;
  player.health = 0;
  player.deathAt = Date.now();
  player.totalDeaths = (player.totalDeaths ?? 0) + 1;
  player.combatTargetNpcId = undefined;

  sendToPlayer("player_died", {
    respawnInMs: RESPAWN_DELAY_MS,
    message: "Du wurdest besiegt...",
  });

  if (!scheduleRespawn) return {};

  const timer = setTimeout(() => {
    respawnPlayer(player, world, sendToPlayer);
  }, RESPAWN_DELAY_MS);

  return { respawnTimer: timer };
}

export function respawnPlayer(
  player: DeathCapablePlayer,
  world: RespawnableWorld,
  sendToPlayer: (type: string, payload: unknown) => void,
): void {
  const spawnPoint = getNearestRespawnPoint(player, world);

  player.dead = false;
  player.health = Math.floor((player.maxHealth ?? 100) * 0.3);
  player.mana = Math.floor((player.maxMana ?? 25) * 0.3);
  player.position.x = spawnPoint.x;
  player.position.y = spawnPoint.z;
  player.deathAt = 0;

  sendToPlayer("player_respawned", {
    x: spawnPoint.x,
    z: spawnPoint.z,
    health: player.health,
    mana: player.mana,
    label: spawnPoint.label ?? "Millbrook",
  });
}

export function getNearestRespawnPoint(
  player: Pick<DeathCapablePlayer, "position" | "currentZone">,
  world: RespawnableWorld,
): RespawnPoint {
  const points = world.respawnPoints ?? [];

  if (!points.length) {
    return { id: "default", zoneId: "didis_hub", x: 0, z: 0, label: "Hub" };
  }

  const zonePoints = player.currentZone
    ? points.filter((p) => p.zoneId === player.currentZone)
    : [];
  const pool = zonePoints.length ? zonePoints : points;

  return pool.reduce((best, p) => {
    const dBest = Math.hypot(best.x - player.position.x, best.z - player.position.y);
    const dThis = Math.hypot(p.x - player.position.x, p.z - player.position.y);
    return dThis < dBest ? p : best;
  });
}
