import React, { useMemo } from "react";
import { claimWarfrontRewards, requestWarfrontStatus } from "../../networking/websocketClient";
import type { WarfrontHudState } from "../useGameHudState";

type WarfrontPanelProps = {
  warfront: WarfrontHudState | null;
};

function formatRemaining(targetAt: number): string {
  const left = Math.max(0, targetAt - Date.now());
  const totalSeconds = Math.floor(left / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export const WarfrontPanel: React.FC<WarfrontPanelProps> = ({ warfront }) => {
  const phaseLabel = useMemo(() => {
    if (!warfront) return "Lädt...";
    if (warfront.phase === "boss_ready") return "Frontboss bereit";
    if (warfront.phase === "boss_active") return "Frontboss aktiv";
    if (warfront.phase === "cooldown") return "Cooldown";
    return "Aufbauphase";
  }, [warfront]);

  return (
    <div className="warfront-panel gold-frame">
      <div className="warfront-panel-head">
        <span className="gold-text">Lebende Kriegsfront</span>
        <button
          className="warfront-refresh"
          onClick={requestWarfrontStatus}
          aria-label="Kriegsfront aktualisieren"
        >
          ⟳
        </button>
      </div>
      {!warfront ? (
        <p className="warfront-empty">Warte auf Frontstatus...</p>
      ) : (
        <>
          <div className="warfront-meta">
            <span>{phaseLabel}</span>
            <span>{formatRemaining(warfront.endsAt)}</span>
          </div>
          <div className="warfront-progress-shell">
            <div className="warfront-progress-fill" style={{ width: `${warfront.progressPct}%` }} />
          </div>
          <div className="warfront-personal">
            <span>Cycle: {warfront.personal.cyclePoints}</span>
            <span>Season: {warfront.personal.seasonPoints}</span>
          </div>
          {warfront.personal.nextTierPoints !== undefined ? (
            <p className="warfront-tier-hint">
              Nächster Tier: {warfront.personal.nextTierPoints} ({warfront.personal.nextTierLabel ?? "tier"})
            </p>
          ) : (
            <p className="warfront-tier-hint">Alle aktuellen Tiers beansprucht.</p>
          )}
          <div className="warfront-sectors">
            {warfront.sectors.map((sector) => (
              <div key={sector.id} className="warfront-sector">
                <div className="warfront-sector-top">
                  <span>{sector.label}</span>
                  <span>{sector.progressPct}%</span>
                </div>
                <div className="warfront-sector-bar">
                  <div style={{ width: `${sector.progressPct}%` }} />
                </div>
                <div className="warfront-sector-meta">
                  <span>
                    {sector.currentPoints}/{sector.targetPoints}
                  </span>
                  <span>Du: {sector.yourPoints}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="warfront-actions">
            <button className="warfront-claim" onClick={claimWarfrontRewards}>
              Season-Rewards holen
            </button>
            {warfront.frontBoss.active && (
              <span className="warfront-boss-flag">Boss: {warfront.frontBoss.mutator ?? "normal"}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
};

