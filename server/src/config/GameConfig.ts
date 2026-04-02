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
  /** Hostile NPCs acquire a chase target within this radius */
  npcAggroRadius: 14,
  /** Chase leash — NPC drops aggro if target is farther than this from NPC home */
  npcAggroLeash: 42,
  /** Units per tick hostile NPC moves toward target (100ms tick) */
  npcChaseSpeed: 0.55,
  playerSpeed: 3,
  lootDespawnMs: 300000,
  /** Ms before server allows respawn after death (mobile-friendly tap cooldown) */
  playerRespawnDelayMs: 2500,
  /** Mana restored per second while alive (out of combat regen baseline) */
  playerManaRegenPerSecond: 2.5,
  /** Max WebSocket JSON message size (bytes) */
  wsMaxMessageBytes: 65536,
  /** Max WebSocket messages accepted per socket per rolling second */
  wsMaxMessagesPerSecond: 48,
} as const;
