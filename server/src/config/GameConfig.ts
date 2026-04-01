export const GameConfig = {
  chunkSize: 64,
  tickRateMs: 100,
  /** How often full entity state is broadcast to clients (lower = smoother but heavier on CPU/network). */
  stateBroadcastIntervalMs: 200,
  defaultPort: 3000,
  maxObserverRadius: 6,
  matrixCurrency: "matrix_energy",
  interactDistance: 25,
  attackDistance: 35,
  /** Melee range for hostile NPC counter-attacks */
  npcAttackDistance: 4.5,
  /** Minimum ms between player attack actions (spam guard) */
  playerAttackCooldownMs: 450,
  /** Minimum ms between NPC counter-attacks per NPC */
  npcCounterAttackCooldownMs: 1200,
  playerSpeed: 3,
  lootDespawnMs: 300000
} as const;
