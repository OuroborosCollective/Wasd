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
  serverOffsetMs
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
      <strong style={{ color: "#00e5ff" }}>ARELORIA DEBUG</strong>
      <div>boot: {bootPhase}</div>
      <div>net: {networkStatus}</div>
      <div>tick: {tickId}</div>
      <div>entities: {entityCount}</div>
      <div>player: {localPlayerId}</div>
      <div>snapshot: {lastSnapshotTick}</div>
      <div>pending: {pendingInputCount}</div>
      <div>seq: {lastSequenceId}</div>
      <div>ack: {acknowledgedInputSeq}</div>
      <div>rtt: {rttMs}ms</div>
      <div>quality: {networkQuality}</div>
      <div>offset: {serverOffsetMs}ms</div>
      <div>mode: {config.mode}</div>
      <div>ws: {config.network.wsUrl}</div>
    </div>
  );
}