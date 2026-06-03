import React from "react";
import type { AreloriaBootConfig } from "../boot/boot.config";

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
  identityStatus
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
      <div>boot: {bootPhase}</div>
      <div>net: {networkStatus}</div>
      <div>tick: {tickId}</div>
      <div>entities: {entityCount}</div>
      <div>player: {localPlayerId.slice(0, 12)}...</div>
      <div>snapshot: {lastSnapshotTick}</div>
      <div>pending: {pendingInputCount}</div>
      <div>seq: {lastSequenceId}</div>
      <div>ack: {acknowledgedInputSeq}</div>
      <div>rtt: {rttMs}ms</div>
      <div>quality: {networkQuality}</div>
      <div>offset: {serverOffsetMs}ms</div>
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
      <div>status: {identityStatus ?? "none"}</div>
      <div>stableGuest: {stableGuestId ? `${stableGuestId.slice(0, 10)}...` : "none"}</div>
      <div>character: {characterId ? `${characterId.slice(0, 10)}...` : "none"}</div>
      {/* Phase 7 Debug Actions */}
      <div style={{ marginTop: 8, borderTop: "1px solid rgba(0,229,255,.15)", paddingTop: 6, pointerEvents: "auto" }}>
        <button type="button" onClick={onOpenCharacterSelect} style={{ marginRight: 6, padding: "2px 6px", fontSize: 10, cursor: "pointer" }}>Characters</button>
        <button type="button" onClick={onOpenIdentityDebug} style={{ padding: "2px 6px", fontSize: 10, cursor: "pointer" }}>Identity</button>
      </div>
      <div style={{ marginTop: 6 }}>mode: {config.mode}</div>
      <div style={{ opacity: 0.6 }}>ws: {config.network.wsUrl}</div>
    </div>
  );
}