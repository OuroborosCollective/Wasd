/**
 * NPC Dialogue Panel
 *
 * Displays NPC dialogue, quest interactions, memory/reputation, and rumors for the resource economy loop.
 * Cyber-Zen styled panel using Arelorian Stitch design system.
 * Server-authoritative, display-only.
 * Uses test IDs for E2E testing.
 */

import type {
  LiveGameplaySnapshot,
  NpcDialogueSnapshot,
  NpcQuestProgressSnapshot,
  NpcReputationSnapshot,
  NpcMemorySnapshot,
  NpcRumorSnapshot,
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

/**
 * Trust tier based on reputation value.
 * Maps reputation number to visual trust state.
 */
function getTrustTier(reputation: number): { tier: string; cssClass: string; label: string } {
  if (reputation >= 5) return { tier: "honored", cssClass: "trust-tier--honored", label: "HONORED" };
  if (reputation >= 3) return { tier: "trusted", cssClass: "trust-tier--trusted", label: "TRUSTED" };
  if (reputation >= 1) return { tier: "neutral", cssClass: "trust-tier--neutral", label: "NEUTRAL" };
  if (reputation <= -1) return { tier: "cold", cssClass: "trust-tier--cold", label: "COLD" };
  if (reputation <= -3) return { tier: "hostile", cssClass: "trust-tier--hostile", label: "HOSTILE" };
  return { tier: "unknown", cssClass: "trust-tier--neutral", label: "UNKNOWN" };
}

/**
 * Get rumor badge class based on rumor kind.
 * Cyber-Zen visual mapping for rumor types.
 */
function getRumorBadgeClass(kind: string): string {
  switch (kind) {
    case "helped_village":
      return "rumor-badge--positive";
    case "reliable_supplier":
      return "rumor-badge--green";
    case "trusted_worker":
      return "rumor-badge--violet";
    case "troublemaker":
      return "rumor-badge--warning";
    case "hostile_actor":
      return "rumor-badge--danger";
    default:
      return "rumor-badge--neutral";
  }
}

/**
 * Get rumor label for display.
 */
function getRumorLabel(kind: string): string {
  switch (kind) {
    case "helped_village":
      return "HELPED VILLAGE";
    case "reliable_supplier":
      return "RELIABLE SUPPLIER";
    case "trusted_worker":
      return "TRUSTED WORKER";
    case "troublemaker":
      return "TROUBLEMAKER";
    case "hostile_actor":
      return "HOSTILE ACTOR";
    default:
      return "UNKNOWN";
  }
}

/**
 * Get memory note based on dialogue state.
 * Deterministic: no random text, uses server state.
 */
function getMemoryNote(dialogueState: string, completedQuestIds: readonly string[]): string {
  if (completedQuestIds.includes("village_supply_order_001")) {
    return "VALUED SUPPLIER // COMPLETED ORDER";
  }
  switch (dialogueState) {
    case "quest_ready_to_complete":
      return "AWAITING COMPLETION // SUPPLY READY";
    case "quest_active_ready_to_sell":
      return "PROCESSING ACTIVE // PLANK PENDING";
    case "quest_active_ready_to_process":
      return "GATHERING COMPLETE // PROCESSING NEEDED";
    case "quest_active_missing_wood":
      return "ORDER PENDING // WOOD NEEDED";
    case "quest_available":
      return "TRADE ACTIVE // OPEN TO BUSINESS";
    case "quest_completed":
      return "VERIFIED TRUSTWORTHY // MEMORY LOCKED";
    default:
      return "STANDBY // STATE SYNC";
  }
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
  const memories = (snapshot as any).npcMemories ?? [];
  const rumors = (snapshot as any).npcRumors ?? [];

  // Find Mira's dialogue if available
  const miraDialogue = dialogues.find((d) => d.npcId === "village_trader_001");
  const miraReputation = reputations.find((r) => r.npcId === "village_trader_001");
  const miraMemory = memories.find((m: any) => m.npcId === "village_trader_001");
  const miraRumors = rumors.filter((r: any) => r.npcId === "village_trader_001");

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

  // Get trust tier for visual state - use memory trust tier if available
  const memoryTrustTier = miraMemory?.trustTier ?? "neutral";
  const trustInfo = getTrustTier(miraReputation?.reputation ?? 0);
  const memoryNote = getMemoryNote(miraDialogue?.dialogueState ?? "quest_available", completedQuestIds);

  return (
    <div className="cz-npc-panel" data-testid="npc-dialogue-village_trader_001">
      {/* NPC Memory Block - Cyber-Zen styled */}
      <div className="cz-npc-memory" data-testid={`npc-memory-village_trader_001`}>
        <div className="cz-npc-memory-header">
          <span className="cz-npc-sigil">◈</span>
          <span className="cz-npc-label">MEMORY</span>
        </div>
        <div className="cz-npc-memory-content">
          <div className="cz-npc-identity">
            <span className="cz-npc-name" data-testid="npc-name-village_trader_001">
              {miraDialogue?.displayName ?? "MIRA THE QUARTERMASTER"}
            </span>
            <span className={`cz-trust-badge ${trustInfo.cssClass}`} data-testid={`npc-trust-tier-village_trader_001`}>
              {trustInfo.label}
            </span>
          </div>
          <div className="cz-npc-rep-row">
            <span className="cz-npc-rep-label">REP</span>
            <span className="cz-npc-rep-value" data-testid={`npc-reputation-village_trader_001`}>
              {miraReputation?.reputation ?? 0}
            </span>
            {miraReputation && miraReputation.completedQuestIds.length > 0 && (
              <span className="cz-npc-quest-count">
                [{miraReputation.completedQuestIds.length}]
              </span>
            )}
          </div>
          <div className="cz-npc-memory-note" data-testid={`npc-memory-note-village_trader_001`}>
            {memoryNote}
          </div>
        </div>
      </div>

      {/* Dialogue State Indicator */}
      {miraDialogue && (
        <div className="cz-npc-dialogue-state" data-testid={`npc-dialogue-memory-state-village_trader_001`}>
          <span className="cz-npc-dialogue-label">DIALOGUE</span>
          <span className="cz-npc-dialogue-value">{miraDialogue.dialogueState}</span>
        </div>
      )}

      {/* NPC Dialogue Line */}
      {miraDialogue && (
        <div className="cz-npc-line" data-testid={`npc-dialogue-line-village_trader_001`}>
          <p>{miraDialogue.line}</p>
        </div>
      )}

      {/* Direct Memory Section - Cyber-Zen styled */}
      {miraMemory && (
        <div className="cz-npc-direct-memory" data-testid={`npc-memory-village_trader_001`}>
          <div className="cz-npc-memory-section-header">
            <span className="cz-npc-sigil">◇</span>
            <span className="cz-npc-label">DIRECT MEMORY</span>
            <span className="cz-memory-count" data-testid={`npc-memory-persisted-village_trader_001`}>
              [{miraMemory.memoryEventCount}]
            </span>
          </div>
          <div className="cz-npc-memory-events">
            {miraMemory.recentMemoryNotes.length > 0 ? (
              miraMemory.recentMemoryNotes.slice(0, 3).map((note: string, idx: number) => (
                <div key={idx} className="cz-npc-memory-event-note">
                  {note}
                </div>
              ))
            ) : (
              <div className="cz-npc-memory-event-note cz-npc-memory-empty">
                NO DIRECT MEMORY
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rumors Heard Section - Cyber-Zen styled */}
      {miraRumors.length > 0 && (
        <div className="cz-npc-rumors-section" data-testid={`npc-rumors-village_trader_001`}>
          <div className="cz-npc-rumors-header">
            <span className="cz-npc-sigil">◎</span>
            <span className="cz-npc-label">RUMORS HEARD</span>
            <span className="cz-rumor-count" data-testid={`npc-rumor-count-village_trader_001`}>
              [{miraRumors.length}]
            </span>
          </div>
          <div className="cz-npc-rumors-list">
            {miraRumors.map((rumor: any) => (
              <div
                key={rumor.rumorId}
                className={`cz-npc-rumor-item ${getRumorBadgeClass(rumor.kind)}`}
                data-testid={`npc-rumor-${rumor.kind}`}
              >
                <span className="cz-rumor-badge">{getRumorLabel(rumor.kind)}</span>
                <span className="cz-rumor-note">{rumor.note}</span>
                <span className="cz-rumor-weight">[{rumor.weight > 0 ? "+" : ""}{rumor.weight}]</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Effective Trust Section - Cyber-Zen styled */}
      {miraMemory && (
        <div className="cz-npc-effective-trust" data-testid={`npc-effective-trust-village_trader_001`}>
          <div className="cz-npc-trust-header">
            <span className="cz-npc-sigil">◆</span>
            <span className="cz-npc-label">EFFECTIVE TRUST</span>
          </div>
          <div className="cz-npc-trust-row">
            <span className="cz-npc-trust-label">DIRECT</span>
            <span className="cz-npc-trust-value">{miraMemory.reputation}</span>
          </div>
          <div className="cz-npc-trust-row">
            <span className="cz-npc-trust-label">RUMOR BONUS</span>
            <span className="cz-npc-trust-value">
              +{Math.trunc(miraRumors.reduce((sum: number, r: any) => sum + r.weight, 0) / 2)}
            </span>
          </div>
          <div className="cz-npc-trust-row cz-npc-trust-total">
            <span className="cz-npc-trust-label">EFFECTIVE</span>
            <span className="cz-npc-trust-value">
              {miraMemory.reputation + Math.trunc(miraRumors.reduce((sum: number, r: any) => sum + r.weight, 0) / 2)}
            </span>
          </div>
        </div>
      )}

      {/* Quest Tracker - Cyber-Zen styled */}
      {showQuestTracker && miraActiveQuest && (
        <div className="cz-quest-tracker" data-testid={`quest-tracker-village_supply_order_001`}>
          <div className="cz-quest-header">
            <span className="cz-quest-label">QUEST</span>
            <span className="cz-quest-title">
              {miraActiveQuest.questId.replace(/_/g, "_").replace(/\b\w/g, (l) => l.toUpperCase())}
            </span>
          </div>

          <ul className="cz-quest-objectives">
            {miraActiveQuest.objectives.map((obj) => (
              <li
                key={obj.objectiveId}
                className={`cz-quest-objective ${obj.completed ? "completed" : ""}`}
                data-testid={`quest-objective-${obj.objectiveId}`}
              >
                <span className="cz-quest-check">{obj.completed ? "◉" : "○"}</span>
                <span className="cz-quest-objective-title">{obj.title}</span>
                <span className="cz-quest-progress">
                  {obj.current}/{obj.required}
                </span>
              </li>
            ))}
          </ul>

          {/* Reward Preview - Cyber-Zen styled */}
          <div className="cz-quest-reward" data-testid={`quest-reward-village_supply_order_001`}>
            <span className="cz-reward-label">REWARD</span>
            <span className="cz-reward-item">+10 COINS</span>
            <span className="cz-reward-item">+25 GATH XP</span>
            <span className="cz-reward-item">+25 CRFT XP</span>
            <span className="cz-reward-item cz-reward-rep">+1 REP</span>
          </div>
        </div>
      )}

      {/* Action Buttons - Cyber-Zen styled */}
      <div className="cz-npc-actions">
        {/* Accept Quest Button */}
        {showAcceptButton && miraAvailableQuest && (
          <button
            type="button"
            className="cz-action-btn cz-action-btn--accept"
            data-testid={`accept-quest-village_supply_order_001`}
            onClick={() => onAcceptQuest?.("village_supply_order_001")}
          >
            ACCEPT ORDER
          </button>
        )}

        {/* Complete Quest Button */}
        {showCompleteButton && (
          <button
            type="button"
            className="cz-action-btn cz-action-btn--complete"
            data-testid={`complete-quest-village_supply_order_001`}
            onClick={() => onCompleteQuest?.("village_supply_order_001")}
          >
            COMPLETE ORDER
          </button>
        )}

        {/* Talk Button (for completing talk objective) */}
        {miraActiveQuest && (
          <button
            type="button"
            className="cz-action-btn cz-action-btn--talk"
            onClick={() => onTalkToNpc?.("village_trader_001")}
          >
            TALK TO MIRA
          </button>
        )}
      </div>
    </div>
  );
}