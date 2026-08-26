import type {
  LiveGameplaySnapshot,
  NpcQuestProgressSnapshot,
} from "../../game/liveGameplaySnapshot";

interface NpcDialoguePanelProps {
  snapshot: LiveGameplaySnapshot;
  onAcceptQuest?: (questId: string) => void;
  onCompleteQuest?: (questId: string) => void;
  onTalkToNpc?: (npcId: string) => void;
}

interface RewardEvidence {
  readonly coins: number;
  readonly gatheringXp: number;
  readonly craftingXp: number;
  readonly reputation: number;
}

type QuestWithReward = NpcQuestProgressSnapshot & {
  readonly reward?: Partial<RewardEvidence>;
};

function rewardEvidence(quest: NpcQuestProgressSnapshot | undefined): RewardEvidence | null {
  const reward = (quest as QuestWithReward | undefined)?.reward;
  if (!reward) return null;
  const values = [reward.coins, reward.gatheringXp, reward.craftingXp, reward.reputation];
  if (!values.every((value) => Number.isFinite(value))) return null;
  return {
    coins: Math.trunc(reward.coins as number),
    gatheringXp: Math.trunc(reward.gatheringXp as number),
    craftingXp: Math.trunc(reward.craftingXp as number),
    reputation: Math.trunc(reward.reputation as number),
  };
}

function trustTier(reputation: number): { cssClass: string; label: string } {
  if (reputation >= 5) return { cssClass: "trust-tier--honored", label: "HONORED" };
  if (reputation >= 3) return { cssClass: "trust-tier--trusted", label: "TRUSTED" };
  if (reputation >= 1) return { cssClass: "trust-tier--neutral", label: "NEUTRAL" };
  if (reputation <= -3) return { cssClass: "trust-tier--hostile", label: "HOSTILE" };
  if (reputation <= -1) return { cssClass: "trust-tier--cold", label: "COLD" };
  return { cssClass: "trust-tier--neutral", label: "UNPROVEN" };
}

function memoryNote(dialogueState: string, completedQuestIds: readonly string[]): string {
  if (completedQuestIds.includes("village_supply_order_001")) return "VALUED SUPPLIER // COMPLETED ORDER";
  switch (dialogueState) {
    case "quest_ready_to_complete": return "ALL OBJECTIVES CONFIRMED // REWARD READY";
    case "quest_active_ready_to_sell": return "ORDER ACTIVE // SALE OR RETURN PENDING";
    case "quest_active_ready_to_process": return "GATHERING CONFIRMED // PROCESSING NEEDED";
    case "quest_active_missing_wood": return "ORDER ACTIVE // WOOD NEEDED";
    case "quest_available": return "ORDER AVAILABLE // NOT ACCEPTED";
    case "quest_completed": return "COMPLETION RECORDED";
    default: return "SERVER STATE UNAVAILABLE";
  }
}

export function NpcDialoguePanel({
  snapshot,
  onAcceptQuest,
  onCompleteQuest,
  onTalkToNpc,
}: NpcDialoguePanelProps) {
  if (snapshot.status !== "live") {
    return (
      <div className="cz-npc-panel" data-testid="npc-dialogue-runtime-state" role="status" aria-live="polite">
        <div className="cz-npc-memory-note">
          NPC STATE {snapshot.status.toUpperCase()} // ACTIONS BLOCKED UNTIL SERVER REVISION
        </div>
      </div>
    );
  }

  const dialogue = (snapshot.npcDialogues ?? []).find((entry) => entry.npcId === "village_trader_001");
  if (!dialogue) {
    return (
      <div className="cz-npc-panel" data-testid="npc-dialogue-unavailable" role="status" aria-live="polite">
        <div className="cz-npc-memory-note">NPC ACTOR EVIDENCE UNAVAILABLE</div>
      </div>
    );
  }

  const activeQuest = (snapshot.activeQuests ?? []).find((quest) => quest.questId === "village_supply_order_001");
  const availableQuest = (snapshot.availableQuests ?? []).find((quest) => quest.questId === "village_supply_order_001");
  const reputation = (snapshot.npcReputations ?? []).find((entry) => entry.npcId === dialogue.npcId);
  const memory = (snapshot.npcMemories ?? []).find((entry) => entry.npcId === dialogue.npcId);
  const rumors = (snapshot.npcRumors ?? []).filter((entry) => entry.npcId === dialogue.npcId);
  const completedQuestIds = snapshot.completedQuestIds ?? [];
  const trust = trustTier(reputation?.reputation ?? memory?.reputation ?? 0);
  const reward = rewardEvidence(activeQuest ?? availableQuest);
  const canAccept = Boolean(availableQuest && onAcceptQuest);
  const canComplete = activeQuest?.state === "ready_to_complete" && Boolean(onCompleteQuest);

  return (
    <div className="cz-npc-panel" data-testid="npc-dialogue-village_trader_001" role="region" aria-label="NPC Dialogue">
      <div className="cz-npc-memory" data-testid="npc-memory-village_trader_001">
        <div className="cz-npc-memory-header">
          <span className="cz-npc-sigil" aria-hidden="true">◈</span>
          <span className="cz-npc-label">SERVER MEMORY</span>
        </div>
        <div className="cz-npc-memory-content">
          <div className="cz-npc-identity">
            <span className="cz-npc-name" data-testid="npc-name-village_trader_001">{dialogue.displayName}</span>
            <span className={`cz-trust-badge ${trust.cssClass}`} data-testid="npc-trust-tier-village_trader_001">
              {trust.label}
            </span>
          </div>
          {reputation && (
            <div className="cz-npc-rep-row">
              <span className="cz-npc-rep-label">REP</span>
              <span className="cz-npc-rep-value" data-testid="npc-reputation-village_trader_001">
                {reputation.reputation}
              </span>
            </div>
          )}
          <div className="cz-npc-memory-note" data-testid="npc-memory-note-village_trader_001">
            {memoryNote(dialogue.dialogueState, completedQuestIds)}
          </div>
        </div>
      </div>

      <div className="cz-npc-dialogue-state" data-testid="npc-dialogue-memory-state-village_trader_001">
        <span className="cz-npc-dialogue-label">DIALOGUE</span>
        <span className="cz-npc-dialogue-value">{dialogue.dialogueState}</span>
      </div>
      <div className="cz-npc-line" data-testid="npc-dialogue-line-village_trader_001">
        <p>{dialogue.line}</p>
      </div>

      {memory && (
        <div className="cz-npc-direct-memory" data-testid="npc-direct-memory-village_trader_001">
          <div className="cz-npc-memory-section-header">
            <span className="cz-npc-label">DIRECT MEMORY</span>
            <span className="cz-memory-count" data-testid="npc-memory-persisted-village_trader_001">
              [{memory.memoryEventCount}]
            </span>
          </div>
          {memory.recentMemoryNotes.slice(0, 3).map((note) => (
            <div key={note} className="cz-npc-memory-event-note">{note}</div>
          ))}
        </div>
      )}

      {rumors.length > 0 && (
        <div className="cz-npc-rumors-section" data-testid="npc-rumors-village_trader_001">
          <div className="cz-rumor-count" data-testid="npc-rumor-count-village_trader_001">[{rumors.length}]</div>
          {rumors.map((rumor) => (
            <div key={rumor.rumorId} className="cz-npc-rumor-item" data-testid={`npc-rumor-${rumor.kind}`}>
              <span className="cz-rumor-badge">{rumor.kind.replace(/_/g, " ").toUpperCase()}</span>
              <span className="cz-rumor-note">{rumor.note}</span>
              <span className="cz-rumor-weight">[{rumor.weight >= 0 ? "+" : ""}{rumor.weight}]</span>
            </div>
          ))}
        </div>
      )}

      {activeQuest && (
        <div className="cz-quest-tracker" data-testid="quest-tracker-village_supply_order_001">
          <div className="cz-quest-header">
            <span className="cz-quest-label">QUEST</span>
            <span className="cz-quest-title">{activeQuest.questId.replace(/_/g, " ").toUpperCase()}</span>
          </div>
          <ul className="cz-quest-objectives">
            {activeQuest.objectives.map((objective) => (
              <li
                key={objective.objectiveId}
                className={`cz-quest-objective ${objective.completed ? "completed" : ""}`}
                data-testid={`quest-objective-${objective.objectiveId}`}
                role="progressbar"
                aria-valuenow={objective.current}
                aria-valuemin={0}
                aria-valuemax={objective.required}
                aria-valuetext={`${objective.title}: ${objective.current} of ${objective.required}${objective.completed ? " (Completed)" : ""}`}
              >
                <span className="cz-quest-check" aria-hidden="true">{objective.completed ? "◉" : "○"}</span>
                <span className="cz-quest-objective-title">{objective.title}</span>
                <span className="cz-quest-progress">{objective.current}/{objective.required}</span>
              </li>
            ))}
          </ul>
          {reward && (
            <div className="cz-quest-reward" data-testid="quest-reward-village_supply_order_001">
              <span className="cz-reward-label">SERVER REWARD</span>
              <span className="cz-reward-item">+{reward.coins} COINS</span>
              <span className="cz-reward-item">+{reward.gatheringXp} GATH XP</span>
              <span className="cz-reward-item">+{reward.craftingXp} CRFT XP</span>
              <span className="cz-reward-item cz-reward-rep">+{reward.reputation} REP</span>
            </div>
          )}
        </div>
      )}

      <div className="cz-npc-actions">
        {canAccept && (
          <button
            type="button"
            className="cz-action-btn cz-action-btn--accept"
            data-testid="accept-quest-village_supply_order_001"
            aria-label="Accept Village Supply Order"
            title="Accept Village Supply Order"
            onClick={() => onAcceptQuest?.("village_supply_order_001")}
          >
            ACCEPT ORDER
          </button>
        )}
        {canComplete && (
          <button
            type="button"
            className="cz-action-btn cz-action-btn--complete"
            data-testid="complete-quest-village_supply_order_001"
            aria-label="Complete Village Supply Order"
            title="Complete Village Supply Order"
            onClick={() => onCompleteQuest?.("village_supply_order_001")}
          >
            COMPLETE ORDER
          </button>
        )}
        {activeQuest && onTalkToNpc && (
          <button
            type="button"
            className="cz-action-btn cz-action-btn--talk"
            aria-label={`Talk to ${dialogue.displayName}`}
            title={`Talk to ${dialogue.displayName}`}
            onClick={() => onTalkToNpc(dialogue.npcId)}
          >
            TALK TO {dialogue.displayName.toUpperCase()}
          </button>
        )}
      </div>
    </div>
  );
}
