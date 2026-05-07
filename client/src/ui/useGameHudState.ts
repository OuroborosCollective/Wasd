import { useCallback, useEffect, useState } from "react";
import type { LootNet, ClientQuestEntry } from "@wasd/shared";
import {
  getCombatTargetNpcId,
  getPlayerGold,
  getPlayerInventory,
  getPlayerInventoryWeight,
  getPlayerMaxCarryWeight,
  getPlayerQuests,
  subscribePlayerState,
} from "../state/playerState";

export interface WarfrontHudState {
  isActive: boolean;
  capturedPoints: number;
  totalPoints: number;
  factionProgress: number;
  currentZoneName: string;
  matchTimer: number;
  contested: boolean;
}

export interface GameHudState {
  gold: number;
  inventory: LootNet[];
  weight: number;
  maxWeight: number;
  quests: any[];
  targetNpcId: string | null;
  warfront: WarfrontHudState;
  inventoryOpen: boolean;
  toggleInventory: () => void;
  // Legacy support for older components
  youId?: string | null;
  entities?: any[];
  loot?: any[];
  fxFeed?: any[];
  onWirePayload?: (p: any) => void;
  onEntitySync?: (e: any) => void;
  onLootSpawned?: (l: any) => void;
  onLootDespawned?: (id: string) => void;
}

export const useGameHudState = (): GameHudState => {
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [state, setState] = useState({
    gold: getPlayerGold(),
    inventory: getPlayerInventory(),
    weight: getPlayerInventoryWeight(),
    maxWeight: getPlayerMaxCarryWeight(),
    quests: getPlayerQuests(),
    targetNpcId: getCombatTargetNpcId(),
    warfront: {
      isActive: false,
      capturedPoints: 0,
      totalPoints: 4,
      factionProgress: 0,
      currentZoneName: "Neutral Territory",
      matchTimer: 0,
      contested: false,
    },
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
    }));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribePlayerState(syncState);
    syncState();
    return () => unsubscribe();
  }, [syncState]);

  return {
    ...state,
    inventoryOpen,
    toggleInventory: () => setInventoryOpen(!inventoryOpen),
    youId: null,
    entities: [],
    loot: [],
    fxFeed: [],
    onWirePayload: () => {},
    onEntitySync: () => {},
    onLootSpawned: () => {},
    onLootDespawned: () => {},
  };
};
