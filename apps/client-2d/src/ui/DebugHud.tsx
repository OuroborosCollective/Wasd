/**
 * Phase 5/7: DebugHud - Legacy/Development Component
 * 
 * ⚠️ IMPORTANT: This component is NOT used in the production/live render path.
 * 
 * LIVE RENDER PATH (what's actually rendered on VPS):
 *   main.tsx → DeterministicWorldIsoApp.tsx → ArelorianStitchHud.tsx
 *   (ArelorianStitchHud has its own debug panel, NOT this DebugHud)
 * 
 * UNUSED/LEGACY:
 *   - DebugHud.tsx: NOT IMPORTED anywhere in production code
 *   - The actual debug panel in live client is inside ArelorianStitchHud.tsx
 *     (className="stitch-debug" section)
 * 
 * Purpose: This was a development/debug overlay that used to be shown
 * alongside GameBoot. It is NOT rendered in the live production build.
 * 
 * To add debug features to production, modify:
 *   - ArelorianStitchHud.tsx (debug panel section around line 232)
 * 
 * Last used by: Development/testing only
 */

import React from "react";
import type { AreloriaBootConfig } from "../boot/boot.config";
import { CLIENT_VERSION } from "../system/clientVersion";

interface Props {
  config: AreloriaBootConfig;
  bootPhase: string;
  networkStatus: string;
  tickId: number;
  entityCount: number;
  localPlayerId: string;
  lastSnapshotTick: number;
  pendingInputCount: number;
  lastSequenceId: number;
  acknowledgedInputSeq: number;
  rttMs: number;
  networkQuality: string;
  serverOffsetMs: number;
  // Phase 4 Props
  inventoryCount?: number;
  trackedQuestTitle?: string;
  observedChunkCount?: number;
  gameplayEventQueueSize?: number;
  // Phase 5 Props
  dialogueOpen?: boolean;
  combatLogCount?: number;
  chunkSnapshotCount?: number;
  gameplayStateVersion?: number;
  // Phase 7 Props
  onOpenIdentityDebug?: () => void;
  onOpenCharacterSelect?: () => void;
  stableGuestId?: string;
  characterId?: string;
  identityStatus?: string;
  // Phase 7 Debug: Real state values
  heartbeatReceived?: boolean;
  initialized?: boolean;
  playerPos?: { x: number; z: number } | null;
  chunkCoords?: { chunkX: number; chunkZ: number } | null;
  lastServerTick?: number;
  inventorySyncStatus?: string;
  equipmentSyncStatus?: string;
}

function shortId(id: string | undefined | null, len = 8): string {
  if (!id) return "none";
  if (id.length <= len) return id;
  return `${id.slice(0, len - 1)}…`;
}

function fmtPos(pos: { x: number; z: number } | null | undefined): string {
  if (!pos) return "waiting";
  return `${pos.x.toFixed(0)}, ${pos.z.toFixed(0)}`;
}

function fmtChunk(coords: { chunkX: number; chunkZ: number } | null | undefined): string {
  if (!coords) return "waiting";
  return `${coords.chunkX}, ${coords.chunkZ}`;
}

export function DebugHud({
  config,
  bootPhase,
  networkStatus,
  tickId,
  entityCount,
  localPlayerId,
  lastSnapshotTick,
  pendingInputCount,
  lastSequenceId,
  acknowledgedInputSeq,
  rttMs,
  networkQuality,
  serverOffsetMs,
  inventoryCount = 0,
  trackedQuestTitle,
  observedChunkCount = 0,
  gameplayEventQueueSize = 0,
  dialogueOpen = false,
  combatLogCount = 0,
  chunkSnapshotCount = 0,
  gameplayStateVersion = 0,
  onOpenIdentityDebug,
  onOpenCharacterSelect,
  stableGuestId,
  characterId,
  identityStatus,
  heartbeatReceived = false,
  initialized = false,
  playerPos,
  chunkCoords,
  lastServerTick = 0,
  inventorySyncStatus,
  equipmentSyncStatus
}: Props) {
  if (!config.design.showDebugHud) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 10,
        top: 10,
        zIndex: 9,
        width: 260,
        padding: 12,
        borderRadius: 16,
        border: "1px solid rgba(0,229,255,.25)",
        background: "rgba(0,0,0,.38)",
        color: "rgba(245,247,255,.82)",
        font: "12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace",
        pointerEvents: "none",
        backdropFilter: "blur(10px)"
      }}
    >
      <strong style={{ color: "#00e5ff" }}>ARELORIA DEBUG [P7]</strong>
      {/* Core State */}
      <div>boot: {bootPhase}</div>
      <div>net: {networkStatus}</div>
      <div>tick: {tickId}</div>
      <div>entities: {entityCount}</div>
      <div>player: {shortId(localPlayerId, 12)}</div>
      <div>snapshot: {lastSnapshotTick}</div>
      <div>pending: {pendingInputCount}</div>
      <div>seq: {lastSequenceId}</div>
      <div>ack: {acknowledgedInputSeq}</div>
      <div>rtt: {rttMs}ms</div>
      <div>quality: {networkQuality}</div>
      <div>offset: {serverOffsetMs}ms</div>
      {/* Phase 7: Real State Values */}
      <div style={{ marginTop: 8, borderTop: "1px solid rgba(0,229,255,.15)", paddingTop: 6 }}>
        <strong style={{ color: "#00e5ff" }}>REAL STATE</strong>
      </div>
      <div>heartbeat: {heartbeatReceived ? "✓" : "waiting"}</div>
      <div>init: {initialized ? "✓" : "waiting"}</div>
      <div>player: {fmtPos(playerPos)}</div>
      <div>chunk: {fmtChunk(chunkCoords)}</div>
      <div>visible: {observedChunkCount || "waiting"}</div>
      <div>serverTick: {lastServerTick || "waiting"}</div>
      {/* Phase 4 Display */}
      <div style={{ marginTop: 8, borderTop: "1px solid rgba(0,229,255,.15)", paddingTop: 6 }}>
        <strong style={{ color: "#00e5ff" }}>GAMEPLAY</strong>
      </div>
      <div>inventory: {inventoryCount} items</div>
      <div>quest: {trackedQuestTitle ?? "none"}</div>
      <div>chunks: {observedChunkCount}</div>
      <div>events: {gameplayEventQueueSize}</div>
      {/* Phase 5 Display */}
      <div style={{ marginTop: 8, borderTop: "1px solid rgba(0,229,255,.15)", paddingTop: 6 }}>
        <strong style={{ color: "#00e5ff" }}>CONTRACT</strong>
      </div>
      <div>dialogue: {dialogueOpen ? "open" : "closed"}</div>
      <div>combatLog: {combatLogCount}</div>
      <div>chunkSnap: {chunkSnapshotCount}</div>
      <div>stateVer: {gameplayStateVersion}</div>
      {/* Phase 7 Identity Display */}
      <div style={{ marginTop: 8, borderTop: "1px solid rgba(0,229,255,.15)", paddingTop: 6 }}>
        <strong style={{ color: "#00e5ff" }}>IDENTITY</strong>
      </div>
      <div>status: {identityStatus ?? "initializing"}</div>
      <div>stableGuest: {shortId(stableGuestId, 10)}</div>
      <div>character: {shortId(characterId, 10)}</div>
      <div>invSync: {inventorySyncStatus ?? "fallback"}</div>
      <div>equipSync: {equipmentSyncStatus ?? "fallback"}</div>
      {/* Phase 7 Build Info */}
      <div style={{ marginTop: 8, borderTop: "1px solid rgba(0,229,255,.15)", paddingTop: 6 }}>
        <strong style={{ color: "#00e5ff" }}>BUILD</strong>
      </div>
      <div>phase: {CLIENT_VERSION.phase}</div>
      <div>mode: {config.mode}</div>
      {/* Phase 7 Debug Actions */}
      <div style={{ marginTop: 8, borderTop: "1px solid rgba(0,229,255,.15)", paddingTop: 6, pointerEvents: "auto" }}>
        <button type="button" onClick={onOpenCharacterSelect} style={{ marginRight: 6, padding: "2px 6px", fontSize: 10, cursor: "pointer" }}>Characters</button>
        <button type="button" onClick={onOpenIdentityDebug} style={{ padding: "2px 6px", fontSize: 10, cursor: "pointer" }}>Identity</button>
      </div>
      <div style={{ opacity: 0.6 }}>ws: {config.network.wsUrl}</div>
    </div>
  );
}