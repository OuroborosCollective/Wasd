import { useCallback, useEffect, useState } from "react";
/**
 * ARELORIAN UI SYSTEM - GameHudState Hook
 * Uses Fixed-Point Math (Kappa=1000) internally where applicable.
 * Subscribes to the WorldStateRegistry through playerState.
 */
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

/**
 * useGameHudState
 * Synchronizes the React UI state with the ARE-Engine state.
 * All values are derived from the Axiom-validated Client State.
 */
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
      personal: { cyclePoints: 0, seasonPoints: 0 },
      sectors: [],
      frontBoss: { active: false }
    } as WarfrontHudState,
    inventoryOpen: false,
    toggleInventory: () => {},
    youId: null,
    entities: [],
    loot: [],
    fxFeed: [],
    inv: {},
    onWirePayload: () => {},
    onEntitySync: () => {},
    onLootSpawned: () => {},
    onLootDespawned: () => {},
  });

  // Sync internal state with inventoryOpen toggle
  useEffect(() => {
    setState(s => ({ ...s, inventoryOpen }));
  }, [inventoryOpen]);

  /**
   * syncState
   * Updates the UI state from the local playerState singleton.
   * Maintains 10Hz tick alignment by reacting to playerState changes.
   */
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
    let unsubscribe: (() => void) | undefined;
    
    // Subscribe to the central player state updates (ARE logic)
    if (typeof subscribePlayerState === 'function') {
        unsubscribe = subscribePlayerState(syncState);
    }
    
    // Initial sync for mounting
    syncState();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [syncState]);

  return {
    ...state,
    inventoryOpen,
    toggleInventory: () => setInventoryOpen(!inventoryOpen),
    // Callbacks for wire processing can be expanded here as needed by the network layer
    onWirePayload: (payload: any) => { /* Axiom Validation hook point */ },
    onEntitySync: (entities: any) => { /* Entity Registry hook point */ },
    onLootSpawned: (loot: any) => { /* Loot Registry hook point */ },
    onLootDespawned: (lootId: string) => { /* Loot Registry removal */ },
  };
};