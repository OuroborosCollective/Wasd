// FactionStandingPanel
// Live snapshot-based faction display for ArelorianStitchHud
// Server-authoritative, display-only

import type { LiveGameplaySnapshot } from "../../game/liveGameplaySnapshot";

interface FactionStandingPanelProps {
  snapshot: LiveGameplaySnapshot;
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
      {snapshot.factions.map((faction) => (
        <article key={faction.id} className="stitch-info">
          <small>{faction.label}</small>
          <b>{faction.name}</b>
          <span>standing {faction.standing}</span>
        </article>
      ))}
    </div>
  );
}