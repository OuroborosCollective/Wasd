/** Server-driven player stats for HUD / quest log (updated via welcome + stats_sync). */

export type ClientQuestEntry = {
  id: string;
  title: string;
  objectiveType?: string;
  completed: boolean;
  targetId?: string;
  targetNpcId?: string;
  requiredItemId?: string;
  requiredCount?: number;
  progress?: number;
  progressMax?: number;
};

let gold = 0;
let xp = 0;
let level = 1;
let health = 100;
let maxHealth = 100;
let stamina = 100;
let maxStamina = 100;
let mana = 25;
let maxMana = 25;
let dead = false;
let deathAt = 0;
let respawnAvailableAt = 0;
let quests: ClientQuestEntry[] = [];
let inventory: any[] = [];
/** Carried weight and cap (from server `stats_sync`). */
let inventoryWeight = 0;
let maxCarryWeight = 200;
let equipment: Record<string, unknown> = {};
/** skillId -> server timestamp (ms) when cooldown ends */
let skillCooldownUntil: Record<string, number> = {};
/** Server combat target NPC id (from `stats_sync` / `welcome.stats`). */
let combatTargetNpcId: string | null = null;

const listeners = new Set<() => void>();

export function subscribePlayerState(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit() {
  listeners.forEach((cb) => cb());
}

export function applyStatsPayload(data: {
  gold?: number;
  xp?: number;
  level?: number;
  health?: number;
  maxHealth?: number;
  stamina?: number;
  maxStamina?: number;
  mana?: number;
  maxMana?: number;
  dead?: boolean;
  deathAt?: number;
  respawnAvailableAt?: number;
  quests?: ClientQuestEntry[];
  inventory?: any[];
  maxWeight?: number;
  inventoryWeight?: number;
  equipment?: Record<string, unknown>;
  skillCooldownUntil?: Record<string, number>;
  combatTargetNpcId?: string | null;
}) {
  if (typeof data.gold === "number") gold = data.gold;
  if (typeof data.xp === "number") xp = data.xp;
  if (typeof data.level === "number") level = data.level;
  if (typeof data.health === "number") health = data.health;
  if (typeof data.maxHealth === "number") maxHealth = data.maxHealth;
  if (typeof data.stamina === "number") stamina = data.stamina;
  if (typeof data.maxStamina === "number") maxStamina = data.maxStamina;
  if (typeof data.mana === "number") mana = data.mana;
  if (typeof data.maxMana === "number") maxMana = data.maxMana;
  if (typeof data.dead === "boolean") dead = data.dead;
  if (typeof data.deathAt === "number") deathAt = data.deathAt;
  if (typeof data.respawnAvailableAt === "number") respawnAvailableAt = data.respawnAvailableAt;
  if (Array.isArray(data.quests)) quests = data.quests;
  if (Array.isArray(data.inventory)) inventory = data.inventory;
  if (typeof data.maxWeight === "number" && data.maxWeight > 0) maxCarryWeight = data.maxWeight;
  if (typeof data.inventoryWeight === "number" && Number.isFinite(data.inventoryWeight)) {
    inventoryWeight = data.inventoryWeight;
  }
  if (data.equipment && typeof data.equipment === "object") equipment = data.equipment;
  if (data.skillCooldownUntil && typeof data.skillCooldownUntil === "object") {
    skillCooldownUntil = { ...data.skillCooldownUntil };
  }
  if (data.combatTargetNpcId === null) {
    combatTargetNpcId = null;
  } else if (typeof data.combatTargetNpcId === "string") {
    const t = data.combatTargetNpcId.trim();
    combatTargetNpcId = t.length > 0 ? t : null;
  }
  emit();
}

export function getPlayerGold() {
  return gold;
}
export function getPlayerXp() {
  return xp;
}
export function getPlayerHealth() {
  return health;
}
export function getPlayerMaxHealth() {
  return maxHealth;
}
export function getPlayerStamina() {
  return stamina;
}
export function getPlayerMaxStamina() {
  return maxStamina;
}
export function getPlayerMana() {
  return mana;
}
export function getPlayerMaxMana() {
  return maxMana;
}
export function getPlayerLevel() {
  return level;
}
export function getPlayerDead() {
  return dead;
}
export function getRespawnAvailableAt() {
  return respawnAvailableAt;
}
export function getPlayerQuests() {
  return quests;
}
export function getPlayerInventory() {
  return inventory;
}

export function getPlayerInventoryWeight() {
  return inventoryWeight;
}

export function getPlayerMaxCarryWeight() {
  return maxCarryWeight;
}

export function getPlayerEquipment(): Record<string, unknown> {
  return equipment;
}

export function getSkillCooldownUntil(): Record<string, number> {
  return { ...skillCooldownUntil };
}

export function getCombatTargetNpcId(): string | null {
  return combatTargetNpcId;
}
