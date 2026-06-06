// QuestJournalPanel
// Live snapshot-based quest display for ArelorianStitchHud
// Server-authoritative, display-only

import type { LiveGameplaySnapshot, QuestObjectiveSnapshot } from "../../game/liveGameplaySnapshot";

interface QuestJournalPanelProps {
  snapshot: LiveGameplaySnapshot;
}

function objectiveProgressPercent(objective: QuestObjectiveSnapshot): number {
  return Math.max(0, Math.min(100, Math.round((objective.current / objective.required) * 100)));
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
    <div className="quest-journal-panel" data-testid="quest-panel-live">
      {snapshot.quests.map((quest) => (
        <article key={quest.id} className={`quest-journal-card quest-journal-card--${quest.status}`}>
          <header>
            <small>{quest.status}</small>
            <b>{quest.title}</b>
          </header>

          {quest.description && <p>{quest.description}</p>}

          <div className="quest-journal-objectives">
            {quest.objectives.map((objective) => {
              const progress = objectiveProgressPercent(objective);
              return (
                <div key={objective.id} className="quest-journal-objective">
                  <span>{objective.label}</span>
                  <b>{objective.current}/{objective.required}{objective.completed ? " ✓" : ""}</b>
                  <i aria-hidden="true"><em style={{ width: `${progress}%` }} /></i>
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}
