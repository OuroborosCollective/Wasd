/**
 * NPC Dialogue Panel
 *
 * Displays NPC dialogue and quest interactions for the resource economy loop.
 * Server-authoritative, display-only.
 * Uses test IDs for E2E testing.
 */

import type {
  LiveGameplaySnapshot,
  NpcDialogueSnapshot,
  NpcQuestProgressSnapshot,
  NpcReputationSnapshot,
} from "../../game/liveGameplaySnapshot";

interface NpcDialoguePanelProps {
  snapshot: LiveGameplaySnapshot;
  /** Called when player wants to accept a quest */
  onAcceptQuest?: (questId: string) => void;
  /** Called when player wants to complete a quest */
  onCompleteQuest?: (questId: string) => void;
  /** Called when player wants to talk to NPC */
  onTalkToNpc?: (npcId: string) => void;
}

export function NpcDialoguePanel({
  snapshot,
  onAcceptQuest,
  onCompleteQuest,
  onTalkToNpc,
}: NpcDialoguePanelProps) {
  const dialogues = snapshot.npcDialogues ?? [];
  const activeQuests = snapshot.activeQuests ?? [];
  const availableQuests = snapshot.availableQuests ?? [];
  const completedQuestIds = snapshot.completedQuestIds ?? [];
  const reputations = snapshot.npcReputations ?? [];

  // Find Mira's dialogue if available
  const miraDialogue = dialogues.find((d) => d.npcId === "village_trader_001");
  const miraReputation = reputations.find((r) => r.npcId === "village_trader_001");

  // Find Mira's quests
  const miraActiveQuest = activeQuests.find(
    (q) => q.questId === "village_supply_order_001",
  );
  const miraAvailableQuest = availableQuests.find(
    (q) => q.questId === "village_supply_order_001",
  );

  // Determine what to show
  const showQuestTracker = miraActiveQuest !== undefined;
  const showAcceptButton = miraAvailableQuest !== undefined;
  const showCompleteButton = miraActiveQuest?.state === "ready_to_complete";

  return (
    <div className="npc-dialogue-panel" data-testid="npc-dialogue-village_trader_001">
      {/* NPC Name and Reputation */}
      <header className="npc-dialogue-header">
        <h3 data-testid="npc-name-village_trader_001">
          {miraDialogue?.displayName ?? "Mira the Quartermaster"}
        </h3>
        {miraReputation && (
          <span
            className="npc-reputation-badge"
            data-testid={`npc-reputation-village_trader_001`}
            title={`Reputation: ${miraReputation.reputation}`}
          >
            ★ {miraReputation.reputation}
          </span>
        )}
      </header>

      {/* NPC Dialogue Line */}
      {miraDialogue && (
        <div
          className="npc-dialogue-line"
          data-testid={`npc-dialogue-line-village_trader_001`}
        >
          <p>{miraDialogue.line}</p>
        </div>
      )}

      {/* Quest Tracker */}
      {showQuestTracker && miraActiveQuest && (
        <div
          className="quest-tracker"
          data-testid={`quest-tracker-village_supply_order_001`}
        >
          <h4>{miraActiveQuest.questId.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</h4>

          <ul className="quest-objectives">
            {miraActiveQuest.objectives.map((obj) => (
              <li
                key={obj.objectiveId}
                className={`quest-objective ${obj.completed ? "completed" : ""}`}
                data-testid={`quest-objective-${obj.objectiveId}`}
              >
                <span className="objective-check">{obj.completed ? "✓" : "○"}</span>
                <span className="objective-title">{obj.title}</span>
                <span className="objective-progress">
                  {obj.current}/{obj.required}
                </span>
              </li>
            ))}
          </ul>

          {/* Reward Preview */}
          <div
            className="quest-reward-preview"
            data-testid={`quest-reward-village_supply_order_001`}
          >
            <span>Rewards:</span>
            <span>10 coins</span>
            <span>25 gathering XP</span>
            <span>25 crafting XP</span>
            <span>+1 reputation</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="npc-dialogue-actions">
        {/* Accept Quest Button */}
        {showAcceptButton && miraAvailableQuest && (
          <button
            type="button"
            className="accept-quest-button"
            data-testid={`accept-quest-village_supply_order_001`}
            onClick={() => onAcceptQuest?.("village_supply_order_001")}
          >
            Accept Quest
          </button>
        )}

        {/* Complete Quest Button */}
        {showCompleteButton && (
          <button
            type="button"
            className="complete-quest-button"
            data-testid={`complete-quest-village_supply_order_001`}
            onClick={() => onCompleteQuest?.("village_supply_order_001")}
          >
            Complete Quest
          </button>
        )}

        {/* Talk Button (for completing talk objective) */}
        {miraActiveQuest && (
          <button
            type="button"
            className="talk-to-npc-button"
            onClick={() => onTalkToNpc?.("village_trader_001")}
          >
            Talk to Mira
          </button>
        )}
      </div>
    </div>
  );
}