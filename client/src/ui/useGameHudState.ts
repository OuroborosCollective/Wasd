import { useCallback, useEffect, useState } from "react";
import type { LootNet } from "@shared/types/protocol";
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
  active?: boolean;
  capturedPoints: number;
  totalPoints: number;
  factionProgress: number;
  currentZoneName: string;
  matchTimer: number;
  contested: boolean;
  phase?: string;
  endsAt: number;
  progressPct: number;
  personal: {
    cyclePoints: number;
    seasonPoints: number;
    nextTierPoints?: number;
    nextTierLabel?: string;
  };
  sectors: Array<{
    id: string;
    label: string;
    progressPct: number;
    currentPoints: number;
    targetPoints: number;
    yourPoints: number;
  }>;
  frontBoss: {
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
  youId: string | null;
  entities: any[];
  loot: any[];
  inv: any;
  fxFeed: any[];
  onWirePayload: (msg: Record<string, unknown>) => void;
  onEntitySync: (msg: any) => void;
  onLootSpawned: (msg: any) => void;
  onLootDespawned: (msg: any) => void;
  activeQuests: any[];
  nearbyLoot: any[];
  inventoryOpen: boolean;
  toggleInventory: () => void;
}

export const useGameHudState = (): GameHudState => {
  const [state, setState] = useState<GameHudState>({
    gold: getPlayerGold(),
    inventory: getPlayerInventory(),
    weight: getPlayerInventoryWeight(),
    maxWeight: getPlayerMaxCarryWeight(),
    quests: getPlayerQuests(),
    targetNpcId: getCombatTargetNpcId(),
    warfront: {
      isActive: false,
      active: false,
      capturedPoints: 0,
      totalPoints: 4,
      factionProgress: 0,
      currentZoneName: "Neutral Territory",
      matchTimer: 0,
      contested: false,
      phase: "loading",
      endsAt: 0,
      progressPct: 0,
      personal: { cyclePoints: 0, seasonPoints: 0 },
      sectors: [],
      frontBoss: { active: false },
    },
    youId: null,
    entities: [],
    loot: [],
    inv: {},
    fxFeed: [],
    onWirePayload: () => {},
    onEntitySync: () => {},
    onLootSpawned: () => {},
    onLootDespawned: () => {},
    activeQuests: [],
    nearbyLoot: [],
    inventoryOpen: false,
    toggleInventory: () => {},
  });

  const syncState = useCallback(() => {
    setState((prev) => ({
      ...prev,
      gold: getPlayerGold(),
      inventory: getPlayerInventory(),
      weight: getPlayerInventoryWeight(),
      maxWeight: getPlayerMaxCarryWeight(),
      quests: getPlayerQuests(),
      targetNpcId: getCombatTargetNpcId(),
      // In a real implementation, warfront data would be pulled from a dedicated WarfrontState module
      // or passed via server messages through the playerState subscription.
    }));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribePlayerState(() => {
      syncState();
    });

    // Initial sync
    syncState();

    return () => {
      unsubscribe();
    };
  }, [syncState]);

  return state;
};