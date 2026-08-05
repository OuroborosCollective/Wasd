// FactionStandingPanel - Live snapshot-based faction display for ArelorianStitchHud
import type { LiveGameplaySnapshot } from "../../game/liveGameplaySnapshot";

const labelColors: Record<string, string> = {
  hostile: "var(--st-ruby)",
  neutral: "var(--st-gold)",
  trusted: "var(--st-aether)",
  allied: "var(--st-emerald)",
};

export function FactionStandingPanel({ snapshot }: { snapshot: LiveGameplaySnapshot }) {
  if (snapshot.status === "waiting") {
    return (
      <div className="stitch-grid-panel" data-testid="faction-panel-waiting">
        <article className="stitch-info"><small>Faction Sync</small><b>waiting for server snapshot</b></article>
      </div>
    );
  }
  if (snapshot.factions.length === 0) {
    return (
      <div className="stitch-grid-panel" data-testid="faction-panel-empty">
        <article className="stitch-info"><small>Factions</small><b>no standings yet</b></article>
      </div>
    );
  }
  return (
    <div className="stitch-grid-panel" data-testid="faction-panel-live">
      {snapshot.factions.map((faction) => {
        const color = labelColors[faction.label] || "var(--st-gold)";
        const progress = Math.min(100, Math.max(0, faction.standing));
        return (
          <article key={faction.id} className="stitch-info" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <small style={{ color, textTransform: "uppercase", fontWeight: "bold" }}>{faction.label}</small>
              <small style={{ fontFamily: "monospace" }}>{faction.standing}%</small>
            </div>
            <b style={{ textShadow: `0 0 8px ${color}` }}>{faction.name}</b>
            <div
              className="char-bar-track"
              role="progressbar"
              aria-label={`${faction.name} faction standing: ${faction.label}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              style={{ width: "100%", marginTop: "4px" }}
            >
              <div
                className="char-bar-fill"
                style={{ width: `${progress}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}
