// GuildStatusPanel
// Live snapshot-based guild display for ArelorianStitchHud
// Server-authoritative, display-only

import type { LiveGameplaySnapshot } from "../../game/liveGameplaySnapshot";

interface GuildStatusPanelProps {
  snapshot: LiveGameplaySnapshot;
}

export function GuildStatusPanel({ snapshot }: GuildStatusPanelProps) {
  const guild = snapshot.guild;

  if (snapshot.status === "waiting") {
    return (
      <div
        role="region"
        aria-label="Guild Status"
        className="stitch-grid-panel"
        data-testid="guild-panel-waiting"
      >
        <article className="stitch-info" role="status" aria-live="polite">
          <small>Guild Sync</small>
          <b>waiting for server snapshot</b>
        </article>
      </div>
    );
  }

  if (!guild.id) {
    return (
      <div
        role="region"
        aria-label="Guild Status"
        className="stitch-grid-panel"
        data-testid="guild-panel-empty"
      >
        <article className="stitch-info">
          <small>Guild</small>
          <b>unclaimed</b>
        </article>
        <article className="stitch-info">
          <small>Village Rights</small>
          <b>requires 50 members</b>
        </article>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Guild Status"
      className="stitch-grid-panel"
      data-testid="guild-panel-live"
    >
      <article className="stitch-info">
        <small>Guild</small>
        <b>{guild.name ?? guild.id}</b>
      </article>
      <article className="stitch-info">
        <small>Members</small>
        <b>{guild.memberCount}</b>
      </article>
      <article className="stitch-info">
        <small>Rank</small>
        <b>{guild.rank ?? "member"}</b>
      </article>
      <article className="stitch-info">
        <small>Village Eligible</small>
        <b>{guild.villageEligible ? "yes" : "no"}</b>
      </article>
    </div>
  );
}