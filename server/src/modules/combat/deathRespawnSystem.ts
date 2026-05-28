export const WORLD_TICK_MS = 100;
export const RESPAWN_DELAY_TICKS = 80;
export const RESPAWN_DELAY_MS = RESPAWN_DELAY_TICKS * WORLD_TICK_MS;

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
  deathTick?: number;
  respawnTick?: number;
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
  players?: Iterable<DeathCapablePlayer>;
  respawnPoints?: RespawnPoint[];
}

export function handlePlayerDeath(
  player: DeathCapablePlayer,
  world: RespawnableWorld,
  sendToPlayer: (type: string, payload: unknown) => void,
  currentTick: number,
): { respawnTick?: number } {
  void world;
  if (player.dead) return {};
  const tick = Math.trunc(currentTick);
  player.dead = true;
  player.health = 0;
  player.deathTick = tick;
  player.deathAt = tick * WORLD_TICK_MS;
  player.respawnTick = tick + RESPAWN_DELAY_TICKS;
  player.totalDeaths = (player.totalDeaths ?? 0) + 1;
  player.combatTargetNpcId = undefined;
  sendToPlayer("player_died", {
    respawnInMs: RESPAWN_DELAY_MS,
    respawnTick: player.respawnTick,
    message: "Du wurdest besiegt...",
  });
  return { respawnTick: player.respawnTick };
}

export function processRespawns(
  world: RespawnableWorld,
  currentTick: number,
  sendToPlayerById: (playerId: string, type: string, payload: unknown) => void,
): number {
  const tick = Math.trunc(currentTick);
  let count = 0;
  for (const player of world.players ?? []) {
    if (!player.dead || player.respawnTick === undefined || tick < player.respawnTick) continue;
    respawnPlayer(player, world, (type, payload) => sendToPlayerById(player.id, type, payload));
    count += 1;
  }
  return count;
}

export function respawnPlayer(
  player: DeathCapablePlayer,
  world: RespawnableWorld,
  sendToPlayer: (type: string, payload: unknown) => void,
): void {
  const spawnPoint = getNearestRespawnPoint(player, world);
  player.dead = false;
  player.health = Math.floor(((player.maxHealth ?? 100) * 300) / 1000);
  player.mana = Math.floor(((player.maxMana ?? 25) * 300) / 1000);
  player.position.x = spawnPoint.x;
  player.position.y = spawnPoint.z;
  player.deathAt = 0;
  player.deathTick = undefined;
  player.respawnTick = undefined;
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
  if (!points.length) return { id: "default", zoneId: "didis_hub", x: 0, z: 0, label: "Hub" };
  const zonePoints = player.currentZone ? points.filter((p) => p.zoneId === player.currentZone) : [];
  const pool = zonePoints.length ? zonePoints : points;
  return pool.reduce((best, p) => {
    const dxBest = Math.trunc(best.x) - Math.trunc(player.position.x);
    const dzBest = Math.trunc(best.z) - Math.trunc(player.position.y);
    const dxThis = Math.trunc(p.x) - Math.trunc(player.position.x);
    const dzThis = Math.trunc(p.z) - Math.trunc(player.position.y);
    const bestDistanceSq = dxBest * dxBest + dzBest * dzBest;
    const thisDistanceSq = dxThis * dxThis + dzThis * dzThis;
    return thisDistanceSq < bestDistanceSq ? p : best;
  });
}
