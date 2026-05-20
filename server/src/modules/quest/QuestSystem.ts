// @ARE-GUARD-EXEMPT: non-sim module
export interface BountyQuestData {
  targetId: string;
  issuerFactionId: string;
  reward: number;
  difficulty: number;
  type: string;
  description: string;
}

/**
 * Minimal bounty registration hook (extend with persistence).
 */
export class QuestSystem {
  private static instance: QuestSystem;

  static getInstance(): QuestSystem {
    if (!QuestSystem.instance) {
      QuestSystem.instance = new QuestSystem();
    }
    return QuestSystem.instance;
  }

  registerBountyQuest(_data: BountyQuestData): void {
    // no-op stub
  }
}
