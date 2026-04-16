import { useCallback, useEffect, useRef, useState } from "react";
import type { EntityNet, FxKind, LootNet, QuestStateNet, ServerMsg } from "../../../shared/protocol";
import {
  getCombatTargetNpcId,
  getPlayerGold,
  getPlayerInventory,
  getPlayerInventoryWeight,
  getPlayerMaxCarryWeight,
  getPlayerQuests,
  subscribePlayerState,
  type ClientQuestEntry,
} from "../state/playerState";

function mapEntityKind(type: unknown): EntityNet["kind"] {
  const t = typeof type === "string" ? type : "";
  if (t === "player" || t === "npc" || t === "monster" || t === "loot" || t === "object") {
    return t;
  }
  return "object";
}

function clientQuestToNet(q: ClientQuestEntry): QuestStateNet {
  const goal = Math.max(1, Math.floor(Number(q.progressMax ?? q.requiredCount ?? 1)));
  const rawProgress = typeof q.progress === "number" ? q.progress : q.completed ? goal : 0;
  const progress = Math.min(goal, Math.max(0, Math.floor(rawProgress)));
  const goalText =
    q.objectiveType === "collect" && q.requiredItemId
      ? `Sammle: ${q.requiredItemId} (${progress}/${goal})`
      : q.objectiveType === "combat"
        ? `Besiege Ziele`
        : q.targetNpcId || q.targetId
          ? `Sprich mit / erreiche Ziel`
          : "Quest aktiv";
  return {
    id: q.id,
    title: q.title || q.id,
    step: 0,
    done: Boolean(q.completed),
    progress,
    goal,
    goalText,
  };
}

function wireToServerMsg(data: Record<string, unknown>): ServerMsg | null {
  if (data.type === "fx" && data.at && typeof data === "object") {
    const at = data.at as Record<string, unknown>;
    const kind = data.kind as FxKind;
    if (typeof kind !== "string") return null;
    return {
      t: "fx",
      at: { x: Number(at.x) || 0, y: Number(at.y) || 0 },
      kind: kind as FxKind,
      n: typeof data.n === "number" ? data.n : undefined,
    };
  }
  if (data.type === "combat_result") {
    const crit = Boolean(data.crit);
    const hit = Boolean(data.hit);
    const damage = Math.floor(Number(data.damage ?? 0));
    const kind: FxKind = crit ? "crit" : hit ? "hit" : "miss";
    return { t: "fx", at: { x: 0, y: 0 }, kind, n: damage };
  }
  return null;
}

export function useGameHudState() {
  const [youId, setYouId] = useState<string | undefined>();
  const [entities, setEntities] = useState<EntityNet[]>([]);
  const [loot, setLoot] = useState<LootNet[]>([]);
  const lootMapRef = useRef<Map<string, LootNet>>(new Map());
  const [quests, setQuests] = useState<QuestStateNet[]>([]);
  const [inv, setInv] = useState<{
    gold: number;
    weight: number;
    maxWeight: number;
    items: { itemId: string; qty: number }[];
  } | null>(null);
  const [fxFeed, setFxFeed] = useState<
    Array<{ id: string; kind: FxKind; n?: number; x: number; y: number; t: number }>
  >([]);

  const fxId = useRef(0);

  const pushFx = useCallback((kind: FxKind, n: number | undefined, x: number, y: number) => {
    const id = `fx_${++fxId.current}`;
    setFxFeed((cur) =>
      [...cur, { id, kind, n, x, y, t: Date.now() }].slice(-25)
    );
    window.setTimeout(() => {
      setFxFeed((cur) => cur.filter((e) => e.id !== id));
    }, 900);
  }, []);

  const onServerMsg = useCallback(
    (m: ServerMsg) => {
      if (m.t === "snapshot") {
        setYouId(m.you);
        setEntities(m.entities);
        setLoot(m.loot);
        lootMapRef.current = new Map(m.loot.map((l) => [l.id, l]));
        return;
      }
      if (m.t === "inv") {
        setInv({
          gold: m.gold,
          weight: m.weight,
          maxWeight: m.maxWeight,
          items: m.items.map((i) => ({ itemId: i.itemId, qty: i.qty })),
        });
      } else if (m.t === "quests") {
        setQuests(m.active);
      } else if (m.t === "fx") {
        pushFx(m.kind, m.n, m.at.x, m.at.y);
      }
    },
    [pushFx]
  );

  const onWirePayload = useCallback(
    (data: Record<string, unknown>) => {
      const mapped = wireToServerMsg(data);
      if (mapped) {
        onServerMsg(mapped);
      }
    },
    [onServerMsg]
  );

  const syncInventoryFromPlayerState = useCallback(() => {
    const rows = getPlayerInventory();
    const items = rows
      .filter((r) => r && typeof r.id === "string")
      .map((r) => ({
        itemId: String(r.id),
        qty: Math.max(1, Math.floor(Number(r.quantity) || 1)),
      }));
    setInv({
      gold: getPlayerGold(),
      weight: getPlayerInventoryWeight(),
      maxWeight: getPlayerMaxCarryWeight(),
      items,
    });
  }, []);

  const syncQuestsFromPlayerState = useCallback(() => {
    setQuests(getPlayerQuests().filter((q) => !q.completed).map(clientQuestToNet));
  }, []);

  useEffect(() => {
    const unsub = subscribePlayerState(() => {
      syncInventoryFromPlayerState();
      syncQuestsFromPlayerState();
    });
    queueMicrotask(() => {
      syncInventoryFromPlayerState();
      syncQuestsFromPlayerState();
    });
    return unsub;
  }, [syncInventoryFromPlayerState, syncQuestsFromPlayerState]);

  useEffect(() => {
    const onYou = (ev: Event) => {
      const ce = ev as CustomEvent<{ playerId?: string }>;
      const id = typeof ce.detail?.playerId === "string" ? ce.detail.playerId.trim() : "";
      if (id) setYouId(id);
    };
    window.addEventListener("areloria:local-player-id", onYou as EventListener);
    return () => window.removeEventListener("areloria:local-player-id", onYou as EventListener);
  }, []);

  const onEntitySync = useCallback((raw: unknown[]) => {
    const nextEntities: EntityNet[] = [];
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id : "";
      if (!id) continue;
      const pos = (o.position || {}) as Record<string, unknown>;
      const x = Number(pos.x) || 0;
      const y = Number(pos.z) || 0;
      const name = typeof o.name === "string" ? o.name : id;
      const hp = Math.max(0, Number(o.health ?? 0));
      const hpMax = Math.max(1, Number(o.maxHealth ?? 1));
      const level = Math.max(1, Math.floor(Number(o.level ?? 1)));
      nextEntities.push({
        id,
        name,
        x,
        y,
        hp,
        hpMax,
        level,
        kind: mapEntityKind(o.type),
      });
      if (o.type === "loot") {
        const existing = lootMapRef.current.get(id);
        if (existing) {
          lootMapRef.current.set(id, { ...existing, x, y });
        }
      }
    }
    setEntities(nextEntities);
    setLoot(Array.from(lootMapRef.current.values()));
  }, []);

  const onLootSpawned = useCallback((raw: unknown) => {
    if (!raw || typeof raw !== "object") return;
    const bag = raw as LootNet;
    if (typeof bag.id !== "string") return;
    lootMapRef.current.set(bag.id, bag);
    setLoot(Array.from(lootMapRef.current.values()));
  }, []);

  const onLootDespawned = useCallback((lootId: string) => {
    lootMapRef.current.delete(lootId);
    setLoot(Array.from(lootMapRef.current.values()));
  }, []);

  return {
    youId,
    entities,
    loot,
    quests,
    inv,
    fxFeed,
    onServerMsg,
    onWirePayload,
    onEntitySync,
    onLootSpawned,
    onLootDespawned,
  };
}
