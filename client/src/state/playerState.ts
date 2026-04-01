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
let health = 100;
let stamina = 100;
let quests: ClientQuestEntry[] = [];
let inventory: any[] = [];
let equipment: Record<string, unknown> = {};

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
  health?: number;
  stamina?: number;
  quests?: ClientQuestEntry[];
  inventory?: any[];
  equipment?: Record<string, unknown>;
}) {
  if (typeof data.gold === "number") gold = data.gold;
  if (typeof data.xp === "number") xp = data.xp;
  if (typeof data.health === "number") health = data.health;
  if (typeof data.stamina === "number") stamina = data.stamina;
  if (Array.isArray(data.quests)) quests = data.quests;
  if (Array.isArray(data.inventory)) inventory = data.inventory;
  if (data.equipment && typeof data.equipment === "object") equipment = data.equipment;
  emit();
}

export function getPlayerGold() {
  return gold;
}
export function getPlayerXp() {
  return xp;
}
export function getPlayerQuests() {
  return quests;
}
export function getPlayerInventory() {
  return inventory;
}
