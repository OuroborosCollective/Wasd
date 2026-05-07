import React, { useMemo, useState, useEffect } from "react";
import { claimWarfrontRewards, requestWarfrontStatus } from "../../networking/websocketClient";
import type { WarfrontHudState } from "../useGameHudState";

type WarfrontPanelProps = {
  state: WarfrontHudState;
};

export const WarfrontPanel: React.FC<WarfrontPanelProps> = ({ state: warfront }) => {
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
  };

  if (!warfront) return null;

  return (
    <div className="warfront-panel-container">
      <div className="warfront-header">
        <h3>Warfront: {warfront.currentZoneName}</h3>
        <div className="warfront-timer">{formatTime(warfront.matchTimer)}</div>
      </div>

      <div className="warfront-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${warfront.factionProgress}%` }}
          />
        </div>
        <span className="progress-label">{warfront.progressPct ?? 0}% Gesamtfortschritt</span>
      </div>

      <div className="warfront-personal">
        <div className="personal-stat">
          <label>Cycle:</label>
          <span>{warfront.personal?.cyclePoints ?? 0}</span>
        </div>
        <div className="personal-stat">
          <label>Season:</label>
          <span>{warfront.personal?.seasonPoints ?? 0}</span>
        </div>
      </div>

      <div className="warfront-sectors">
        {warfront.sectors?.map((sector) => (
          <div key={sector.id} className="warfront-sector">
            <div className="warfront-sector-top">
              <span className="sector-name">{sector.label}</span>
              <span className="sector-pct">{sector.progressPct}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="warfront-actions">
        <button 
          className="warfront-claim btn-gold" 
          onClick={claimWarfrontRewards}
          disabled={warfront.personal?.seasonPoints === 0}
        >
          Season-Rewards beanspruchen
        </button>
      </div>
    </div>
  );
};
