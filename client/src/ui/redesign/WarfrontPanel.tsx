import React, { useMemo, useState, useEffect } from "react";
import { claimWarfrontRewards, requestWarfrontStatus } from "../../networking/websocketClient";
import type { any } from "../useGameHudState";

type WarfrontPanelProps = {
  warfront: any | null;
};

/**
 * Formatiert die verbleibende Zeit in ein lesbares Format (H:M:S).
 */
function formatRemaining(targetAt: number, now: number): string {
  const left = Math.max(0, targetAt - now);
  const totalSeconds = Math.floor(left / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export const WarfrontPanel: React.FC<WarfrontPanelProps> = ({ warfront }) => {
  const [now, setNow] = useState(Date.now());

  // Timer für die Echtzeit-Aktualisierung der verbleibenden Zeit
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const phaseLabel = useMemo(() => {
    if (!warfront) return "Lädt...";
    switch (warfront.phase) {
      case "boss_ready":
        return "Frontboss bereit";
      case "boss_active":
        return "Frontboss aktiv";
      case "cooldown":
        return "Cooldown / Wiederaufbau";
      default:
        return "Aufbauphase";
    }
  }, [warfront]);

  if (!warfront) {
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
        <p className="warfront-empty">Warte auf Frontdaten...</p>
      </div>
    );
  }

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

      <div className="warfront-meta">
        <span className="phase-indicator">{phaseLabel}</span>
        <span className="timer-text">{formatRemaining(warfront.endsAt, now)}</span>
      </div>

      <div className="warfront-progress-shell">
        <div 
          className="warfront-progress-fill" 
          style={{ width: `${Math.min(100, warfront.progressPct)}%` }} 
        />
        <span className="progress-label">{warfront.progressPct}% Gesamtfortschritt</span>
      </div>

      <div className="warfront-personal">
        <div className="personal-stat">
          <label>Cycle:</label>
          <span>{warfront.personal.cyclePoints}</span>
        </div>
        <div className="personal-stat">
          <label>Season:</label>
          <span>{warfront.personal.seasonPoints}</span>
        </div>
      </div>

      {warfront.personal.nextTierPoints !== undefined ? (
        <div className="warfront-tier-hint">
          <span>Nächster Rang: {warfront.personal.nextTierPoints} Pkt.</span>
          <small>({warfront.personal.nextTierLabel ?? "Aufstieg"})</small>
        </div>
      ) : (
        <p className="warfront-tier-hint max-tier">Maximale Belohnungsstufe erreicht.</p>
      )}

      <div className="warfront-sectors">
        {warfront.sectors.map((sector) => (
          <div key={sector.id} className="warfront-sector">
            <div className="warfront-sector-top">
              <span className="sector-name">{sector.label}</span>
              <span className="sector-pct">{sector.progressPct}%</span>
            </div>
            <div className="warfront-sector-bar">
              <div 
                className="sector-fill" 
                style={{ width: `${Math.min(100, sector.progressPct)}%` }} 
              />
            </div>
            <div className="warfront-sector-meta">
              <span>{sector.currentPoints} / {sector.targetPoints}</span>
              <span className="your-contrib">Eigene: {sector.yourPoints}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="warfront-actions">
        <button 
          className="warfront-claim btn-gold" 
          onClick={claimWarfrontRewards}
          disabled={warfront.personal.seasonPoints === 0}
        >
          Season-Rewards beanspruchen
        </button>
        {warfront.frontBoss.active && (
          <div className="warfront-boss-flag animate-pulse">
            Boss aktiv: <span className="mutator-text">{warfront.frontBoss.mutator ?? "Keine Mutatoren"}</span>
          </div>
        )}
      </div>
    </div>
  );
};