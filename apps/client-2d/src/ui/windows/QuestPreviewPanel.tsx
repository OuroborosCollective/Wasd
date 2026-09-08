// QuestPreviewPanel
// Compact HUD quest preview for the first active classless objective.
// Server-authoritative, display-only.

import type { LiveGameplaySnapshot, QuestObjectiveSnapshot, QuestSnapshot } from "../../game/liveGameplaySnapshot";

interface QuestPreviewPanelProps {
  snapshot: LiveGameplaySnapshot;
  onOpenJournal?: () => void;
}

function pickPreviewQuest(quests: readonly QuestSnapshot[]): QuestSnapshot | null {
  return (
    quests.find((quest) => quest.status === "active" && quest.id.startsWith("start_path_")) ??
    quests.find((quest) => quest.status === "active") ??
    quests.find((quest) => quest.status === "available") ??
    quests.find((quest) => quest.status === "completed") ??
    null
  );
}

function pickPreviewObjective(quest: QuestSnapshot): QuestObjectiveSnapshot | null {
  return (
    quest.objectives.find((objective) => !objective.completed) ??
    quest.objectives[0] ??
    null
  );
}

function objectivePercent(objective: QuestObjectiveSnapshot | null): number {
  if (!objective) return 0;
  return Math.max(0, Math.min(100, Math.round((objective.current / objective.required) * 100)));
}

export function QuestPreviewPanel({ snapshot, onOpenJournal }: QuestPreviewPanelProps) {
  const quest = pickPreviewQuest(snapshot.quests ?? []);
  const objective = quest ? pickPreviewObjective(quest) : null;
  const progress = objectivePercent(objective);

  if (snapshot.status === "waiting") {
    return (
      <aside
        className="quest-preview-panel"
        data-testid="quest-preview-waiting"
        aria-label="Quest preview"
        aria-busy="true"
        aria-live="polite"
      >
        <small>Quest Sync</small>
        <strong>Waiting for server snapshot…</strong>
      </aside>
    );
  }

  if (!quest) {
    return (
      <aside
        className="quest-preview-panel"
        data-testid="quest-preview-empty"
        aria-label="Quest preview"
        aria-busy="false"
      >
        <small>Quest Preview</small>
        <strong>No active quest</strong>
        <button
          type="button"
          onClick={onOpenJournal}
          aria-label="Open Quest Journal [Q]"
          aria-keyshortcuts="q"
          title="Open Quest Journal [Q]"
        >
          <kbd className="cz-kbd" aria-hidden="true">Q</kbd> Quest Journal
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="quest-preview-panel"
      data-testid="quest-preview-live"
      aria-label="Quest preview"
      aria-busy="false"
    >
      <header>
        <small>{quest.status}</small>
        <strong>{quest.title}</strong>
      </header>

      {objective && (
        <div className="quest-preview-objective">
          <span>{objective.label}</span>
          <b>
            {objective.current}/{objective.required}
            {objective.completed ? " ✓" : ""}
          </b>
          <i
            role="progressbar"
            aria-label={`${objective.label} progress`}
            aria-valuenow={objective.current}
            aria-valuemin={0}
            aria-valuemax={objective.required}
            aria-valuetext={`${objective.current} of ${objective.required} ${objective.label}`}
            title={`${objective.label}: ${objective.current}/${objective.required} (${progress}%)`}
          >
            <em style={{ width: `${progress}%` }} aria-hidden="true" />
          </i>
        </div>
      )}

      <button
        type="button"
        onClick={onOpenJournal}
        aria-label="Open Quest Journal [Q]"
        aria-keyshortcuts="q"
        title="Open Quest Journal [Q]"
      >
        <kbd className="cz-kbd" aria-hidden="true">Q</kbd> Quest Journal
      </button>
    </aside>
  );
}
