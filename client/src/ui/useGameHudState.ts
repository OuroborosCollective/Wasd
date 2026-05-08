import { useCallback, useEffect, useState } from "react";
import type { LootNet, EntityNet, QuestStateNet } from "@wasd/shared";
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

export interface WarfrontHudState {
  active: boolean;
  isActive: boolean;
  capturedPoints: number;
  totalPoints: number;
  factionProgress: number;
  currentZoneName: string;
  matchTimer: number;
  contested: boolean;
  phase?: string;
  endsAt?: number;
  progressPct?: number;
  personal?: {
    cyclePoints: number;
    seasonPoints: number;
    nextTierPoints?: number;
    nextTierLabel?: string;
  };
  sectors?: any[];
  frontBoss?: {
    active: boolean;
    mutator?: string;
  };
}

export interface GameHudState {
  gold: number;
  inventory: LootNet[];
  weight: number;
  maxWeight: number;
  quests: ClientQuestEntry[];
  targetNpcId: string | null;
  warfront: WarfrontHudState;
  inventoryOpen: boolean;
  toggleInventory: () => void;
  youId: string | null;
  entities: EntityNet[];
  loot: LootNet[];
  fxFeed: any[];
  inv: any;
  onWirePayload: (payload: any) => void;
  onEntitySync: (entities: any) => void;
  onLootSpawned: (loot: any) => void;
  onLootDespawned: (lootId: string) => void;
}

export const useGameHudState = (): GameHudState => {
  const [inventoryOpen, setInventoryOpen] = useState(false);

  const [state, setState] = useState<Omit<GameHudState, 'inventoryOpen' | 'toggleInventory' | 'onWirePayload' | 'onEntitySync' | 'onLootSpawned' | 'onLootDespawned'>>({
    gold: getPlayerGold(),
    inventory: getPlayerInventory(),
    weight: getPlayerInventoryWeight(),
    maxWeight: getPlayerMaxCarryWeight(),
    quests: getPlayerQuests(),
    targetNpcId: getCombatTargetNpcId(),
    warfront: {
      active: false,
      isActive: false,
      capturedPoints: 0,
      totalPoints: 4,
      factionProgress: 0,
      currentZoneName: "Neutral Territory",
      matchTimer: 0,
      contested: false,
      personal: { cyclePoints: 0, seasonPoints: 0 },
      sectors: [],
      frontBoss: { active: false }
    } as WarfrontHudState,
    youId: null,
    entities: [],
    loot: [],
    fxFeed: [],
    inv: {},
  });

  useEffect(() => {
    // Keep internal state updated with inventoryOpen if needed
  }, [inventoryOpen]);

  const syncState = useCallback(() => {
    setState((prev) => ({
      ...prev,
      gold: typeof getPlayerGold === 'function' ? getPlayerGold() : 0,
      inventory: typeof getPlayerInventory === 'function' ? getPlayerInventory() : [],
      weight: typeof getPlayerInventoryWeight === 'function' ? getPlayerInventoryWeight() : 0,
      maxWeight: typeof getPlayerMaxCarryWeight === 'function' ? getPlayerMaxCarryWeight() : 0,
      quests: typeof getPlayerQuests === 'function' ? getPlayerQuests() : [],
      targetNpcId: typeof getCombatTargetNpcId === 'function' ? getCombatTargetNpcId() : null,
    }));
  }, []);

  useEffect(() => {
    let unsubscribe: any;
    if (typeof subscribePlayerState === 'function') {
        unsubscribe = subscribePlayerState(syncState);
    }
    syncState();
    return () => unsubscribe?.();
  }, [syncState]);

  return {
    ...state,
    inventoryOpen,
    toggleInventory: () => setInventoryOpen(!inventoryOpen),
    onWirePayload: () => {},
    onEntitySync: () => {},
    onLootSpawned: () => {},
    onLootDespawned: () => {},
  };
};
