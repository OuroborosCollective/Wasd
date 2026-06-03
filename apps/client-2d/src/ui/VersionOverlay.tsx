import React from "react";
import type { AreloriaBootConfig } from "../boot/boot.config";
import { CLIENT_VERSION } from "../system/clientVersion";

interface Props {
  config: AreloriaBootConfig;
}

export function VersionOverlay({ config }: Props) {
  return (
    <div
      style={{
        position: "fixed",
        right: 10,
        bottom: 10,
        zIndex: 8,
        padding: "8px 10px",
        borderRadius: 12,
        background: "rgba(0,0,0,.35)",
        color: "rgba(245,247,255,.62)",
        font: "11px/1.35 system-ui, sans-serif",
        pointerEvents: "none",
        backdropFilter: "blur(8px)"
      }}
    >
      <div>{CLIENT_VERSION.client}</div>
      <div>
        {CLIENT_VERSION.phase} · {config.logicHz}Hz
      </div>
      <div>{CLIENT_VERSION.buildMode}</div>
    </div>
  );
}