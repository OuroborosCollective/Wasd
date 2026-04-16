import { useCallback, useRef, useState } from "react";
import type { EntityNet, FxKind, LootNet, QuestStateNet, ServerMsg } from "@shared/protocol";

export type FxFeedEntry = {
  id: string;
  kind: FxKind;
  n?: number;
  x: number;
  y: number;
  t: number;
};

export function useGameHudState() {
  const [youId, setYouId] = useState<string | undefined>();
  const [entities, setEntities] = useState<EntityNet[]>([]);
  const [loot, setLoot] = useState<LootNet[]>([]);
  const [quests, setQuests] = useState<QuestStateNet[]>([]);
  const [inv, setInv] = useState<{
    gold: number;
    weight: number;
    maxWeight: number;
    items: { itemId: string; qty: number }[];
  } | null>(null);
  const [fxFeed, setFxFeed] = useState<FxFeedEntry[]>([]);

  const fxId = useRef(0);

  const onServerMsg = useCallback((m: ServerMsg) => {
    if (m.t === "snapshot") {
      setYouId(m.you);
      setEntities(m.entities);
      setLoot(m.loot);
    } else if (m.t === "loot_spawned") {
      setLoot((cur) => {
        const next = cur.filter((x) => x.id !== m.loot.id);
        next.push(m.loot);
        return next;
      });
    } else if (m.t === "loot_despawned") {
      setLoot((cur) => cur.filter((x) => x.id !== m.lootId));
    } else if (m.t === "inv") {
      setInv({ gold: m.gold, weight: m.weight, maxWeight: m.maxWeight, items: m.items });
    } else if (m.t === "quests") {
      setQuests(m.active);
    } else if (m.t === "fx") {
      const id = `fx_${++fxId.current}`;
      setFxFeed((cur) =>
        [...cur, { id, kind: m.kind, n: m.n, x: m.at.x, y: m.at.y, t: Date.now() }].slice(-25)
      );
      window.setTimeout(() => {
        setFxFeed((cur) => cur.filter((x) => x.id !== id));
      }, 900);
    }
  }, []);

  return { youId, entities, loot, quests, inv, fxFeed, onServerMsg };
}
