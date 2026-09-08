/**
 * Live Runtime State - Unified State Management for Real-Time UI
 *
 * This module provides a normalized state layer for the live UI components.
 * It processes network events and produces consistent state values that
 * all UI components can read.
 *
 * LIVE PATH: Consumed by ArelorianStitchHud and UIOverlayLayer
 *
 * Values:
 * - networkStatus: connected/disconnected/waiting
 * - heartbeatStatus: ok/lost/waiting
 * - initialized: boolean
 * - playerPos: { x, z } | null
 * - chunkCoords: { chunkX, chunkZ } | null
 * - visibleChunks: number | null
 * - serverTick: number | null
 * - acknowledgedInputSeq: number | null
 * - stableGuestId: string | null
 * - playerId: string | null
 * - characterId: string | null
 * - characterName: string | null
 * - identityStatus: string
 * - inventorySyncStatus: "server" | "local" | "fallback" | "not_synced"
 * - equipmentSyncStatus: "server" | "local" | "fallback" | "not_synced"
 * - questSyncStatus: "server" | "local" | "fallback" | "not_synced"
 * - persistenceStatus: "online" | "offline" | "degraded"
 * - toasts: ClientToast[]
 * - lootFeed: LootFeedEntry[]
 * - dialogue: DialogueState | null
 * - combatLog: CombatLogEntry[]
 */

import type { ClientToast } from "../ui/ToastStack";
import type { LootFeedEntry } from "../game/loot";
import type { CombatLogEntry } from "../game/combat";
import type { DialogueState } from "../game/dialogue";

export interface LiveRuntimeState {
  // Network
  networkStatus: "connected" | "disconnected" | "waiting";
  heartbeatStatus: "ok" | "lost" | "waiting";
  heartbeatCount: number;

  // Server State
  serverTick: number | null;
  acknowledgedInputSeq: number | null;

  // Player Position
  playerPos: { x: number; z: number } | null;
  chunkCoords: { chunkX: number; chunkZ: number } | null;
  visibleChunks: number | null;

  // Identity
  stableGuestId: string | null;
  playerId: string | null;
  characterId: string | null;
  characterName: string | null;
  identityStatus: "authenticated" | "guest" | "unknown";

  // Sync Status
  inventorySyncStatus: "server" | "local" | "fallback" | "not_synced" | "waiting";
  equipmentSyncStatus: "server" | "local" | "fallback" | "not_synced" | "waiting";
  questSyncStatus: "server" | "local" | "fallback" | "not_synced" | "waiting";
  persistenceStatus: "online" | "offline" | "degraded" | "unknown";

  // UI State
  toasts: ClientToast[];
  lootFeed: LootFeedEntry[];
  dialogue: DialogueState | null;
  combatLog: CombatLogEntry[];

  // Debug
  lastHeartbeatMs: number | null;
  lastWorldSnapshotMs: number | null;
}

type Listener = () => void;

const INITIAL_STATE: LiveRuntimeState = {
  networkStatus: "waiting",
  heartbeatStatus: "waiting",
  heartbeatCount: 0,
  serverTick: null,
  acknowledgedInputSeq: null,
  playerPos: null,
  chunkCoords: null,
  visibleChunks: null,
  stableGuestId: null,
  playerId: null,
  characterId: null,
  characterName: null,
  identityStatus: "unknown",
  inventorySyncStatus: "waiting",
  equipmentSyncStatus: "waiting",
  questSyncStatus: "waiting",
  persistenceStatus: "unknown",
  toasts: [],
  lootFeed: [],
  dialogue: null,
  combatLog: [],
  lastHeartbeatMs: null,
  lastWorldSnapshotMs: null,
};

class LiveRuntimeStateManager {
  private state: LiveRuntimeState = { ...INITIAL_STATE };
  private listeners = new Set<Listener>();

  getState(): LiveRuntimeState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  private setState(updater: (prev: LiveRuntimeState) => Partial<LiveRuntimeState>): void {
    const changes = updater(this.state);
    this.state = { ...this.state, ...changes };
    this.notify();
  }

  // Network events
  setNetworkConnected(connected: boolean): void {
    this.setState(() => ({
      networkStatus: connected ? "connected" : "disconnected",
    }));
  }

  // Heartbeat events
  onHeartbeat(tick: number, playerX: number, playerZ: number, selfId?: string): void {
    this.setState((prev) => ({
      heartbeatStatus: "ok",
      heartbeatCount: prev.heartbeatCount + 1,
      serverTick: tick,
      playerPos: { x: playerX, z: playerZ },
      chunkCoords: {
        chunkX: Math.floor(playerX / (16 * 1000)),
        chunkZ: Math.floor(playerZ / (16 * 1000)),
      },
      lastHeartbeatMs: Date.now(),
      characterId: selfId ?? prev.characterId,
    }));
  }

  onHeartbeatLost(): void {
    this.setState(() => ({
      heartbeatStatus: "lost",
    }));
  }

  // World snapshot events
  onWorldSnapshot(acknowledgedInputSeq: number, visibleChunkCount: number): void {
    this.setState(() => ({
      acknowledgedInputSeq,
      visibleChunks: visibleChunkCount,
      lastWorldSnapshotMs: Date.now(),
    }));
  }

  // Identity events
  setIdentity(guestId: string, playerId: string, characterName: string): void {
    this.setState(() => ({
      stableGuestId: guestId,
      playerId,
      characterName,
      identityStatus: "authenticated",
    }));
  }

  setGuestIdentity(guestId: string): void {
    this.setState(() => ({
      stableGuestId: guestId,
      identityStatus: "guest",
    }));
  }

  // Sync status events
  setInventorySyncStatus(status: LiveRuntimeState["inventorySyncStatus"]): void {
    this.setState(() => ({ inventorySyncStatus: status }));
  }

  setEquipmentSyncStatus(status: LiveRuntimeState["equipmentSyncStatus"]): void {
    this.setState(() => ({ equipmentSyncStatus: status }));
  }

  setQuestSyncStatus(status: LiveRuntimeState["questSyncStatus"]): void {
    this.setState(() => ({ questSyncStatus: status }));
  }

  setPersistenceStatus(status: LiveRuntimeState["persistenceStatus"]): void {
    this.setState(() => ({ persistenceStatus: status }));
  }

  // Inventory/Equipment/Quest snapshots
  onInventorySnapshot(): void {
    this.setState(() => ({ inventorySyncStatus: "server" }));
  }

  onEquipmentSnapshot(): void {
    this.setState(() => ({ equipmentSyncStatus: "server" }));
  }

  onQuestSnapshot(): void {
    this.setState(() => ({ questSyncStatus: "server" }));
  }

  // UI events
  addToast(toast: ClientToast): void {
    this.setState((prev) => ({
      toasts: [...prev.toasts.slice(-4), toast],
    }));
  }

  addLootFeedEntry(entry: LootFeedEntry): void {
    this.setState((prev) => ({
      lootFeed: [...prev.lootFeed.slice(-5), entry],
    }));
  }

  setDialogue(dialogue: DialogueState | null): void {
    this.setState(() => ({ dialogue }));
  }

  addCombatLogEntry(entry: CombatLogEntry): void {
    this.setState((prev) => ({
      combatLog: [...prev.combatLog.slice(-49), entry],
    }));
  }

  // Reset on disconnect
  reset(): void {
    this.state = {
      ...INITIAL_STATE,
      stableGuestId: this.state.stableGuestId,
      identityStatus: this.state.identityStatus,
    };
    this.notify();
  }
}

export const liveRuntimeState = new LiveRuntimeStateManager();

// React hook for consuming live runtime state
import { useSyncExternalStore } from "react";

export function useLiveRuntimeState(): LiveRuntimeState {
  return useSyncExternalStore(
    (cb) => liveRuntimeState.subscribe(cb),
    () => liveRuntimeState.getState(),
    () => liveRuntimeState.getState(),
  );
}

// Helper function to extract player position from heartbeat payload
export function extractPlayerPosFromHeartbeat(payload: any): { x: number; z: number } | null {
  if (!payload) return null;
  const self = payload.self ?? payload.player ?? payload;
  const x = self?.kappa?.x ?? self?.pos?.x ?? self?.x ?? payload.kappa?.x ?? payload.pos?.x ?? null;
  const z = self?.kappa?.z ?? self?.pos?.z ?? self?.z ?? payload.kappa?.z ?? payload.pos?.z ?? null;
  if (x !== null && z !== null) {
    return { x: Number(x), z: Number(z) };
  }
  return null;
}