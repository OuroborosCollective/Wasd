// FactionStandingPanel
// Live snapshot-based faction display for ArelorianStitchHud
// Server-authoritative, display-only

import React from "react";
import type { LiveGameplaySnapshot } from "../../game/liveGameplaySnapshot";

interface FactionStandingPanelProps {
  snapshot: LiveGameplaySnapshot;
}

const STANDING_COLORS: Record<string, string> = {
  hostile: "var(--st-ruby)",
  neutral: "var(--st-gold)",
  trusted: "var(--st-aether)",
  allied: "var(--st-emerald)",
};

function getStandingProgress(standing: number, label: string): { percent: number; min: number; max: number } {
  if (label === "hostile") {
    const min = -50, max = -10;
    const percent = Math.round(((Math.max(min, Math.min(max, standing)) - min) / (max - min)) * 100);
    return { percent, min, max };
  } else if (label === "neutral") {
    const min = -10, max = 10;
    const percent = Math.round(((Math.max(min, Math.min(max, standing)) - min) / (max - min)) * 100);
    return { percent, min, max };
  } else if (label === "trusted") {
    const min = 10, max = 25;
    const percent = Math.round(((Math.max(min, Math.min(max, standing)) - min) / (max - min)) * 100);
    return { percent, min, max };
  } else {
    const min = 25, max = 50;
    const percent = Math.round(((Math.max(min, Math.min(max, standing)) - min) / (max - min)) * 100);
    return { percent, min, max };
  }
}

export function FactionStandingPanel({ snapshot }: FactionStandingPanelProps) {
  if (snapshot.status === "waiting") {
    return (
      <div className="stitch-grid-panel" data-testid="faction-panel-waiting">
        <article className="stitch-info">
          <small>Faction Sync</small>
          <b>waiting for server snapshot</b>
        </article>
      </div>
    );
  }

  if (snapshot.factions.length === 0) {
    return (
      <div className="stitch-grid-panel" data-testid="faction-panel-empty">
        <article className="stitch-info">
          <small>Factions</small>
          <b>no standings yet</b>
        </article>
      </div>
    );
  }

  return (
    <div className="stitch-grid-panel" data-testid="faction-panel-live">
      {snapshot.factions.map((faction) => {
        const { percent, min, max } = getStandingProgress(faction.standing, faction.label);
        const color = STANDING_COLORS[faction.label] || "var(--st-gold)";
        return (
          <article key={faction.id} className="stitch-info">
            <small style={{ color, textTransform: "uppercase", fontWeight: "bold", letterSpacing: "0.05em" }}>
              {faction.label}
            </small>
            <b>{faction.name}</b>
            <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>
              Standing: {faction.standing > 0 ? `+${faction.standing}` : faction.standing}
            </span>
            <div
              role="progressbar"
              aria-label={`${faction.name} standing progress`}
              aria-valuenow={faction.standing}
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuetext={`${faction.label} reputation, standing ${faction.standing}`}
              style={{
                position: "relative",
                height: "12px",
                background: "rgba(0, 0, 0, 0.35)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "6px",
                overflow: "hidden",
                marginTop: "8px",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${percent}%`,
                  background: color,
                  boxShadow: `0 0 10px ${color}`,
                  borderRadius: "inherit",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}
