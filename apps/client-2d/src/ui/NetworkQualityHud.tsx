import React from "react";

interface Props {
  rttMs: number;
  quality: "offline" | "poor" | "ok" | "good";
  pendingInputs: number;
  lastSequenceId: number;
  acknowledgedInputSeq: number;
  serverTick: number;
  serverOffsetMs: number;
}

function qualityColor(quality: Props["quality"]): string {
  switch (quality) {
    case "good":
      return "#39ff14";
    case "ok":
      return "#ffd166";
    case "poor":
      return "#ff7a00";
    case "offline":
    default:
      return "#ff416c";
  }
}

export function NetworkQualityHud({
  rttMs,
  quality,
  pendingInputs,
  lastSequenceId,
  acknowledgedInputSeq,
  serverTick,
  serverOffsetMs
}: Props) {
  return (
    <div
      role="region"
      aria-label="Network Performance Monitor"
      aria-live="polite"
      aria-atomic="true"
      title={`Network Status: ${quality.toUpperCase()} (${rttMs}ms RTT)`}
      style={{
        position: "fixed",
        right: 10,
        top: 10,
        zIndex: 11,
        padding: 10,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,.12)",
        background: "rgba(0,0,0,.34)",
        color: "rgba(245,247,255,.82)",
        font: "11px/1.45 ui-monospace, monospace",
        pointerEvents: "none",
        backdropFilter: "blur(10px)"
      }}
    >
      <div style={{ color: qualityColor(quality), fontWeight: 800 }}>
        NET {quality.toUpperCase()}
      </div>
      <div>rtt: {rttMs}ms</div>
      <div>pending: {pendingInputs}</div>
      <div>seq: {lastSequenceId}</div>
      <div>ack: {acknowledgedInputSeq}</div>
      <div>serverTick: {serverTick}</div>
      <div>offset: {serverOffsetMs}ms</div>
    </div>
  );
}