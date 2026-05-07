import { useCallback, useEffect, useState } from "react";
import type { LootNet, EntityNet } from "@shared/types/protocol";
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
  phase: string;
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

  // Missing properties used by redesign components
  youId: string | null;
  entities: EntityNet[];
  loot: LootNet[];
  inv: any;
  fxFeed: any[];
  activeQuests: ClientQuestEntry[];
  nearbyLoot: LootNet[];
  inventoryOpen: boolean;
  toggleInventory: () => void;
  onWirePayload: (payload: Record<string, any>) => void;
  onEntitySync: (entities: any[]) => void;
  onLootSpawned: (loot: any) => void;
  onLootDespawned: (lootId: string) => void;
}

export const useGameHudState = (): GameHudState => {
  const [inventoryOpen, setInventoryOpen] = useState(false);

  const [state, setState] = useState<GameHudState>({
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
      phase: "setup",
      endsAt: Date.now() + 3600000,
      progressPct: 0,
      personal: {
        cyclePoints: 0,
        seasonPoints: 0,
      },
      sectors: [],
      frontBoss: {
        active: false,
      },
    },
    youId: null,
    entities: [],
    loot: [],
    inv: {},
    fxFeed: [],
    activeQuests: [],
    nearbyLoot: [],
    inventoryOpen: false,
    toggleInventory: () => setInventoryOpen(prev => !prev),
    onWirePayload: () => {},
    onEntitySync: () => {},
    onLootSpawned: () => {},
    onLootDespawned: () => {},
  });

  useEffect(() => {
    setState(s => ({ ...s, inventoryOpen }));
  }, [inventoryOpen]);

  const syncState = useCallback(() => {
    const quests = getPlayerQuests();
    const inventory = getPlayerInventory();
    setState((prev) => ({
      ...prev,
      gold: getPlayerGold(),
      inventory: inventory,
      weight: getPlayerInventoryWeight(),
      maxWeight: getPlayerMaxCarryWeight(),
      quests: quests,
      activeQuests: quests,
      nearbyLoot: inventory, // Simple mapping for now
      loot: inventory,
      targetNpcId: getCombatTargetNpcId(),
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