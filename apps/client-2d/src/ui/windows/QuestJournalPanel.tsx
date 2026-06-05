// QuestJournalPanel
// Live snapshot-based quest display for ArelorianStitchHud
// Server-authoritative, display-only

import type { LiveGameplaySnapshot } from "../../game/liveGameplaySnapshot";

interface QuestJournalPanelProps {
  snapshot: LiveGameplaySnapshot;
}

export function QuestJournalPanel({ snapshot }: QuestJournalPanelProps) {
  if (snapshot.status === "waiting") {
    return (
      <div className="stitch-grid-panel" data-testid="quest-panel-waiting">
        <article className="stitch-info">
          <small>Quest Sync</small>
          <b>waiting for server snapshot</b>
        </article>
      </div>
    );
  }

  if (snapshot.quests.length === 0) {
    return (
      <div className="stitch-grid-panel" data-testid="quest-panel-empty">
        <article className="stitch-info">
          <small>Quest Journal</small>
          <b>no active quests</b>
        </article>
      </div>
    );
  }

  return (
    <div className="stitch-grid-panel" data-testid="quest-panel-live">
      {snapshot.quests.map((quest) => (
        <article key={quest.id} className="stitch-info">
          <small>{quest.status}</small>
          <b>{quest.title}</b>
          <span>{quest.description}</span>
          {quest.objectives.map((objective) => (
            <span key={objective.id}>
              {objective.label}: {objective.current}/{objective.required}
              {objective.completed && " ✓"}
            </span>
          ))}
        </article>
      ))}
    </div>
  );
}