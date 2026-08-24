import React from "react";
import { BOOT_PHASES, type BootPhase } from "../theme/designTokens";

interface Props {
  phase: BootPhase;
  message: string;
  fatal?: string | null;
  progress?: number;
}

export function BootOverlay({ phase, message, fatal, progress }: Props): React.ReactElement {
  const progressWidth = progress ?? calculateProgress(phase);

  return (
    <div
      role="region"
      aria-label="Initialization Boot Overlay"
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        padding: 24,
        background:
          phase === BOOT_PHASES.FATAL
            ? "rgba(7,7,17,.96)"
            : "linear-gradient(180deg, rgba(7,7,17,.92), rgba(7,7,17,.72))",
        color: "#f5f7ff",
        zIndex: 10
      }}
    >
      <div
        style={{
          width: "min(440px, 92vw)",
          borderRadius: 22,
          padding: 22,
          border:
            phase === BOOT_PHASES.FATAL
              ? "1px solid rgba(255,65,108,.55)"
              : "1px solid rgba(0,229,255,.28)",
          background:
            phase === BOOT_PHASES.FATAL
              ? "rgba(255,65,108,.08)"
              : "rgba(10,10,24,.74)",
          backdropFilter: "blur(12px)"
        }}
      >
        <div
          style={{
            fontSize: 13,
            letterSpacing: ".12em",
            textTransform: "uppercase",
            opacity: 0.72
          }}
        >
          {phase}
        </div>

        <h1 style={{ fontSize: 22, marginTop: 8 }}>Areloria</h1>

        <p
          aria-live="polite"
          style={{ marginTop: 10, lineHeight: 1.5, opacity: 0.78 }}
        >
          {fatal ?? message}
        </p>

        <div
          role="progressbar"
          aria-label="Boot initialization progress"
          aria-valuenow={Math.round(progressWidth)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${Math.round(progressWidth)}% - ${phase}`}
          style={{
            marginTop: 18,
            height: 8,
            borderRadius: 999,
            background: "rgba(255,255,255,.08)",
            overflow: "hidden"
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: `${progressWidth}%`,
              height: "100%",
              background:
                phase === BOOT_PHASES.FATAL || phase === BOOT_PHASES.DEGRADED
                  ? "linear-gradient(90deg,#ff416c,#ff7a00)"
                  : "linear-gradient(90deg,#00e5ff,#39ff14,#ff7a00)",
              transition: "width .28s ease"
            }}
          />
        </div>

        <div
          aria-hidden="true"
          style={{
            marginTop: 14,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            opacity: 0.52
          }}
        >
          <span>PIXI</span>
          <span>10Hz</span>
          <span>ARE</span>
          <span>WS</span>
        </div>
      </div>
    </div>
  );
}

function calculateProgress(phase: BootPhase): number {
  switch (phase) {
    case BOOT_PHASES.BOOTING:
      return 10;
    case BOOT_PHASES.CHECKING_DEVICE:
      return 25;
    case BOOT_PHASES.CHECKING_SERVER:
      return 40;
    case BOOT_PHASES.LOADING_ASSETS:
      return 55;
    case BOOT_PHASES.CONNECTING_WORLD:
      return 72;
    case BOOT_PHASES.SYNCING_TICK:
      return 88;
    case BOOT_PHASES.READY:
      return 100;
    case BOOT_PHASES.DEGRADED:
      return 65;
    case BOOT_PHASES.OFFLINE:
      return 40;
    case BOOT_PHASES.FATAL:
      return 100;
    default:
      return 0;
  }
}