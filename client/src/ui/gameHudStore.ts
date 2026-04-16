import type { EntityNet, FxKind, LootNet, QuestStateNet } from "@shared/protocol";
import {
  getPlayerGold,
  getPlayerInventory,
  getPlayerQuests,
  subscribePlayerState,
  type ClientQuestEntry,
} from "../state/playerState";

export type FxFeedEntry = {
  id: string;
  kind: FxKind;
  n?: number;
  x: number;
  y: number;
  t: number;
};

type Listener = () => void;

const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeGameHud(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

let connected = false;
let youId: string | undefined;
let entities: EntityNet[] = [];
const lootById = new Map<string, LootNet>();
let targetNpcId: string | undefined;
let invWeight = 0;
let invMaxWeight = 200;
let fxSeq = 0;
const fxFeed: FxFeedEntry[] = [];
const fxTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function mapQuest(q: ClientQuestEntry): QuestStateNet {
  const goal = Math.max(1, Number(q.progressMax ?? q.requiredCount ?? 1));
  const progress = Math.min(goal, Math.max(0, Number(q.progress ?? 0)));
  const goalText =
    q.objectiveType === "collect" && q.requiredItemId
      ? `Sammle ${q.requiredItemId} (${progress}/${goal})`
      : q.objectiveType === "combat"
        ? "Besiege das Ziel"
        : "Questziel";
  return {
    id: q.id,
    title: q.title,
    step: 0,
    done: !!q.completed,
    progress,
    goal,
    goalText,
  };
}

function buildInvFromPlayerState() {
  const gold = getPlayerGold();
  const rows = getPlayerInventory();
  return {
    gold,
    weight: invWeight,
    maxWeight: Math.max(1, invMaxWeight),
    items: Array.isArray(rows)
      ? rows
          .filter((r): r is { id: string; quantity?: number; name?: string } => Boolean(r && typeof r.id === "string"))
          .map((r) => ({
            itemId: r.id,
            qty: Math.max(1, Math.floor(Number(r.quantity) || 1)),
            name: typeof r.name === "string" ? r.name : undefined,
          }))
      : [],
  };
}

let storeInited = false;

export function initGameHudStore() {
  if (storeInited) return;
  storeInited = true;
  subscribePlayerState(() => emit());
}

export function setGameHudConnected(value: boolean) {
  connected = value;
  emit();
}

export function setGameHudYouId(id: string | undefined) {
  youId = id;
  emit();
}

function entityToNet(e: Record<string, unknown>): EntityNet | null {
  if (!e || typeof e.id !== "string") return null;
  const pos = e.position as { x?: number; y?: number; z?: number } | undefined;
  const x = Number(pos?.x ?? 0);
  const z = Number(pos?.z ?? 0);
  const hp = Number(e.health ?? 0);
  const hpMax = Math.max(1, Number(e.maxHealth ?? 1));
  const levelRaw = Number(e.level ?? 1);
  const level = Number.isFinite(levelRaw) && levelRaw > 0 ? levelRaw : 1;
  const typeRaw = typeof e.type === "string" ? e.type : "object";
  const kind: EntityNet["kind"] =
    typeRaw === "player" || typeRaw === "npc" || typeRaw === "monster" || typeRaw === "loot" || typeRaw === "object"
      ? typeRaw
      : "object";
  const name = typeof e.name === "string" && e.name.length > 0 ? e.name : e.id;
  return {
    id: e.id,
    name,
    x,
    y: z,
    hp,
    hpMax,
    level,
    kind,
  };
}

export function applyEntitySyncPayload(data: { entities?: unknown[] }) {
  if (!Array.isArray(data.entities)) return;
  const next: EntityNet[] = [];
  for (const raw of data.entities) {
    const n = entityToNet(raw as Record<string, unknown>);
    if (n) next.push(n);
  }
  entities = next;

  lootById.clear();
  for (const raw of data.entities) {
    const o = raw as Record<string, unknown>;
    if (o.type !== "loot" || typeof o.id !== "string") continue;
    const pos = o.position as { x?: number; z?: number } | undefined;
    const itemsRaw = Array.isArray(o.items) ? o.items : [];
    const items = itemsRaw
      .map((it: unknown) => {
        const row = it as { itemId?: string; id?: string; qty?: number; quantity?: number; name?: string };
        const itemId = typeof row.itemId === "string" ? row.itemId : typeof row.id === "string" ? row.id : "";
        if (!itemId) return null;
        const qty = Math.max(1, Math.floor(Number(row.qty ?? row.quantity) || 1));
        return {
          itemId,
          qty,
          name: typeof row.name === "string" ? row.name : undefined,
        };
      })
      .filter((x): x is { itemId: string; qty: number; name?: string } => x !== null);
    const gold = Math.max(0, Math.floor(Number(o.gold) || 0));
    const despawnAt = Math.floor(Number(o.despawnAt) || 0);
    const ownerId = typeof o.ownerId === "string" ? o.ownerId : undefined;
    lootById.set(o.id, {
      id: o.id,
      x: Number(pos?.x ?? 0),
      y: Number(pos?.z ?? 0),
      items,
      gold,
      ownerId,
      despawnAt,
    });
  }
  emit();
}

export function applyStatsSyncHudFields(data: Record<string, unknown>) {
  if (typeof data.combatTargetNpcId === "string" && data.combatTargetNpcId.length > 0) {
    targetNpcId = data.combatTargetNpcId;
  } else if (data.combatTargetNpcId === null || data.combatTargetNpcId === "") {
    targetNpcId = undefined;
  }
  if (typeof data.inventoryWeight === "number") invWeight = data.inventoryWeight;
  if (typeof data.inventoryMaxWeight === "number" && data.inventoryMaxWeight > 0) {
    invMaxWeight = data.inventoryMaxWeight;
  }
  emit();
}

export function pushFx(at: { x?: number; y?: number } | undefined, kind: FxKind, n?: number) {
  const id = `fx_${++fxSeq}`;
  const x = Number(at?.x ?? 0);
  const y = Number(at?.y ?? 0);
  fxFeed.push({ id, kind, n, x, y, t: Date.now() });
  while (fxFeed.length > 25) fxFeed.shift();
  const prev = fxTimeouts.get(id);
  if (prev) clearTimeout(prev);
  const t = setTimeout(() => {
    const i = fxFeed.findIndex((e) => e.id === id);
    if (i >= 0) fxFeed.splice(i, 1);
    fxTimeouts.delete(id);
    emit();
  }, 900);
  fxTimeouts.set(id, t);
  emit();
}

export function removeLootFromHud(lootId: string) {
  lootById.delete(lootId);
  emit();
}

export function mergeLootSpawned(loot: LootNet) {
  lootById.set(loot.id, loot);
  emit();
}

export function getGameHudSnapshot() {
  const quests = getPlayerQuests()
    .filter((q) => !q.completed)
    .map(mapQuest);
  return {
    connected,
    youId,
    entities,
    loot: Array.from(lootById.values()),
    quests,
    inv: buildInvFromPlayerState(),
    targetId: targetNpcId,
    fxFeed: [...fxFeed],
  };
}
