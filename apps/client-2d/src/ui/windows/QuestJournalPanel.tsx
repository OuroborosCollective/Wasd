// QuestJournalPanel
// Live snapshot-based quest display for ArelorianStitchHud
// Server-authoritative, display-only except explicit reward claim action

import { useState } from "react";
import type { LiveGameplaySnapshot, QuestObjectiveSnapshot, QuestSnapshot } from "../../game/liveGameplaySnapshot";
import {
  fetchGameplaySnapshot,
  getDefaultGameplayPlayerId,
  liveGameplayStore,
} from "../../game/liveGameplayStore";

interface QuestJournalPanelProps {
  snapshot: LiveGameplaySnapshot;
}

function objectiveProgressPercent(objective: QuestObjectiveSnapshot): number {
  return Math.max(0, Math.min(100, Math.round((objective.current / objective.required) * 100)));
}

function hasRewardClaimed(quest: QuestSnapshot): boolean {
  return quest.objectives.some((objective) => objective.id === "reward_claimed" && objective.completed);
}

function canClaimReward(quest: QuestSnapshot): boolean {
  return quest.status === "completed" && !hasRewardClaimed(quest);
}

export function QuestJournalPanel({ snapshot }: QuestJournalPanelProps) {
  const [claimingQuestId, setClaimingQuestId] = useState<string | null>(null);
  const [claimStatus, setClaimStatus] = useState<string>("");

  async function claimReward(questId: string): Promise<void> {
    const playerId = getDefaultGameplayPlayerId();
    setClaimingQuestId(questId);
    setClaimStatus("Claiming reward...");

    try {
      const response = await fetch("/api/quest/claim-reward", {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-player-id": playerId,
        },
        body: JSON.stringify({ questId, playerId }),
      });

      const contentType = response.headers.get("content-type") ?? "";
      const result = contentType.includes("application/json")
        ? await response.json()
        : { ok: false, error: `Server returned non-JSON response (${response.status})` };

      if (!result.ok) {
        setClaimStatus(`Reward failed: ${result.error ?? result.result?.reason ?? "unknown"}`);
        return;
      }

      const nextSnapshot = await fetchGameplaySnapshot(playerId);
      if (nextSnapshot) {
        liveGameplayStore.setSnapshot(nextSnapshot);
      }

      setClaimStatus(result.changed === false ? "Reward already claimed." : "Reward claimed.");

      window.dispatchEvent(new CustomEvent("wasd:toast", {
        detail: {
          type: "success",
          message: result.changed === false ? "Reward already claimed" : "Reward claimed",
        },
      }));
    } catch (error) {
      setClaimStatus(`Reward error: ${error instanceof Error ? error.message : "unknown"}`);
    } finally {
      setClaimingQuestId(null);
    }
  }

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
      {claimStatus && (
        <article className="stitch-info" data-testid="quest-claim-status">
          <small>Reward</small>
          <b>{claimStatus}</b>
        </article>
      )}

      {snapshot.quests.map((quest) => {
        const rewardClaimable = canClaimReward(quest);
        const rewardClaimed = hasRewardClaimed(quest);

        return (
          <article key={quest.id} className={`quest-journal-card quest-journal-card--${quest.status}`}>
            <header>
              <small>{rewardClaimed ? "claimed" : quest.status}</small>
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
                    <i
                      role="progressbar"
                      aria-label={`${objective.label} progress`}
                      aria-valuenow={objective.current}
                      aria-valuemin={0}
                      aria-valuemax={objective.required}
                      aria-valuetext={`${objective.current} out of ${objective.required} ${objective.label}`}
                    >
                      <em style={{ width: `${progress}%` }} aria-hidden="true" />
                    </i>
                  </div>
                );
              })}
            </div>

            {rewardClaimable && (
              <button
                type="button"
                className="quest-journal-claim-button"
                data-testid={`quest-claim-${quest.id}`}
                aria-label={`Claim reward for ${quest.title}`}
                disabled={claimingQuestId === quest.id}
                onClick={() => void claimReward(quest.id)}
              >
                {claimingQuestId === quest.id ? "Claiming…" : "Claim Reward"}
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}
