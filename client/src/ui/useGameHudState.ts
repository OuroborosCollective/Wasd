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
  inv: any; // Added for redesign compatibility
  onWirePayload: (payload: any) => void;
  onEntitySync: (entities: any) => void;
  onLootSpawned: (loot: any) => void;
  onLootDespawned: (lootId: string) => void;
}

export const useGameHudState = (): GameHudState => {
  const [inventoryOpen, setInventoryOpen] = useState(false);

  const [state, setState] = useState({
    gold: 0,
    inventory: [] as LootNet[],
    weight: 0,
    maxWeight: 0,
    quests: [] as ClientQuestEntry[],
    targetNpcId: null as string | null,
    warfront: {
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
    youId: null as string | null,
    entities: [] as EntityNet[],
    loot: [] as LootNet[],
    fxFeed: [] as any[],
    inv: {} as any,
  });

  const syncState = useCallback(() => {
    try {
      setState((prev) => ({
        ...prev,
        gold: getPlayerGold?.() ?? 0,
        inventory: getPlayerInventory?.() ?? [],
        weight: getPlayerInventoryWeight?.() ?? 0,
        maxWeight: getPlayerMaxCarryWeight?.() ?? 0,
        quests: getPlayerQuests?.() ?? [],
        targetNpcId: getCombatTargetNpcId?.() ?? null,
      }));
    } catch (e) {
      console.warn("Failed to sync player state in HUD", e);
    }
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribePlayerState?.(syncState);
      syncState();
    } catch (e) {
      console.error("HUD failed to subscribe to player state", e);
    }
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
