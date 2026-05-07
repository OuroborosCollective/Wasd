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
  quests: ClientQuestEntry[];
  targetNpcId: string | null;
  warfront: WarfrontHudState;
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