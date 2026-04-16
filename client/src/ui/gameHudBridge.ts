import type { LootNet, QuestStateNet, ServerMsg } from "@shared/protocol";

export type GameHudBridge = {
  onServerMsg: (m: ServerMsg) => void;
};

let bridge: GameHudBridge | null = null;
let overlayMounted = false;
/** Client-side loot bags for HUD proximity (server validates pickup). */
let hudLoot: LootNet[] = [];

export function setGameHudBridge(b: GameHudBridge | null) {
  bridge = b;
  overlayMounted = b !== null;
}

/** When true, skip legacy DOM floating combat text (React HUD shows FX feed). */
export function isReactGameHudActive() {
  return overlayMounted;
}

export function relayProtocolHudMessage(data: Record<string, unknown>) {
  if (!bridge || data.t !== "snapshot") return;
  const snap = data as Extract<ServerMsg, { t: "snapshot" }>;
  hudLoot = Array.isArray(snap.loot) ? [...snap.loot] : [];
  bridge.onServerMsg(snap);
}

export function getHudLootSnapshot(): LootNet[] {
  return hudLoot;
}

function upsertHudLoot(loot: LootNet) {
  hudLoot = [...hudLoot.filter((l) => l.id !== loot.id), loot];
}

function removeHudLoot(lootId: string) {
  hudLoot = hudLoot.filter((l) => l.id !== lootId);
}

function itemStacksFromInventoryRows(rows: unknown): { itemId: string; qty: number; name?: string }[] {
  if (!Array.isArray(rows)) return [];
  const out: { itemId: string; qty: number; name?: string }[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const itemId = typeof r.id === "string" ? r.id : "";
    if (!itemId) continue;
    const qty = Math.max(1, Math.floor(Number(r.quantity) || 1));
    const name = typeof r.name === "string" ? r.name : undefined;
    out.push({ itemId, qty, ...(name ? { name } : {}) });
  }
  return out;
}

function defaultMaxWeight(): number {
  return 200;
}

function estimateWeight(items: { itemId: string; qty: number }[]): number {
  let w = 0;
  for (const it of items) {
    w += Math.max(1, it.qty);
  }
  return w;
}

/** Map live WebSocket payloads to typed `ServerMsg` for the React HUD. */
export function relayGameHudFromWs(data: Record<string, unknown>) {
  if (!bridge) return;
  const t = data.type;
  if (t === "inv" && Array.isArray(data.items)) {
    const gold = typeof data.gold === "number" ? data.gold : 0;
    const maxWeight =
      typeof data.maxWeight === "number" && data.maxWeight > 0 ? data.maxWeight : defaultMaxWeight();
    const weight = typeof data.weight === "number" ? data.weight : estimateWeight(data.items as any[]);
    bridge.onServerMsg({
      t: "inv",
      gold,
      weight,
      maxWeight,
      items: (data.items as { itemId?: string; id?: string; qty?: number; quantity?: number; name?: string }[]).map(
        (row) => ({
          itemId: String(row.itemId ?? row.id ?? ""),
          qty: Math.max(1, Math.floor(Number(row.qty ?? row.quantity) || 1)),
          ...(typeof row.name === "string" ? { name: row.name } : {}),
        })
      ),
    });
    return;
  }
  if (t === "quests" && Array.isArray((data as { active?: unknown }).active)) {
    bridge.onServerMsg({ t: "quests", active: (data as { active: QuestStateNet[] }).active });
    return;
  }
  if (t === "fx") {
    const at = (data.at && typeof data.at === "object" ? data.at : { x: 0, y: 0 }) as { x?: number; y?: number };
    bridge.onServerMsg({
      t: "fx",
      at: { x: Number(at.x) || 0, y: Number(at.y) || 0 },
      kind: (typeof data.kind === "string" ? data.kind : "hit") as any,
      ...(typeof data.n === "number" ? { n: data.n } : {}),
    });
    return;
  }
  if (t === "combat_result") {
    const crit = Boolean(data.crit);
    const hit = Boolean(data.hit);
    const dmg = typeof data.damage === "number" ? data.damage : 0;
    const kind = crit ? "crit" : hit ? "hit" : "miss";
    bridge.onServerMsg({
      t: "fx",
      at: { x: 0, y: 0 },
      kind,
      n: hit ? dmg : undefined,
    });
    return;
  }
  if (t === "loot_spawned" && data.loot && typeof data.loot === "object") {
    const loot = data.loot as LootNet;
    upsertHudLoot(loot);
    bridge.onServerMsg({ t: "loot_spawned", loot });
    return;
  }
  if (t === "loot_despawned" && typeof data.lootId === "string") {
    removeHudLoot(data.lootId);
    bridge.onServerMsg({ t: "loot_despawned", lootId: data.lootId });
    return;
  }
  if (t === "loot_picked" && typeof data.lootId === "string") {
    removeHudLoot(data.lootId);
    return;
  }
  if (t === "stats_sync") {
    const gold = typeof data.gold === "number" ? data.gold : 0;
    const items = itemStacksFromInventoryRows(data.inventory);
    bridge.onServerMsg({
      t: "inv",
      items,
      gold,
      maxWeight: defaultMaxWeight(),
      weight: estimateWeight(items),
    });
    if (Array.isArray(data.quests)) {
      const active: QuestStateNet[] = (data.quests as Record<string, unknown>[]).map((q) => {
        const id = String(q?.id ?? "");
        const title = String(q?.title ?? q?.name ?? id);
        const completed = Boolean(q?.completed);
        const goal = Math.max(1, Number(q?.progressMax ?? q?.requiredCount ?? 1));
        const progressRaw = typeof q?.progress === "number" ? (q.progress as number) : completed ? goal : 0;
        const progress = Math.min(goal, Math.max(0, progressRaw));
        const obj = q?.objectiveType || q?.objective;
        let goalText = "";
        if (obj === "collect" && q?.requiredItemId) {
          goalText = `Sammle ${String(q.requiredItemId)}`;
        } else if (obj === "combat" || q?.objective === "combat") {
          goalText = "Besiege das Ziel";
        }
        return {
          id,
          title,
          step: 0,
          done: completed,
          progress,
          goal,
          goalText: goalText || title,
        };
      });
      bridge.onServerMsg({ t: "quests", active });
    }
  }
}
