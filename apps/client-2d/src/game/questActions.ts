/**
 * Quest Actions - Client-side API for NPC quest system
 *
 * Client sends intent only, server validates and mutates.
 */

export interface ActionResult<T> {
  ok: boolean;
  result?: T;
  reason?: string;
  details?: Record<string, unknown>;
}

export interface NpcDialogueResponse {
  dialogue: {
    npcId: string;
    displayName: string;
    dialogueState: string;
    line: string;
    availableQuestIds: string[];
    activeQuestIds: string[];
    completedQuestIds: string[];
  };
  activeQuests: Array<{
    questId: string;
    state: string;
    objectives: Array<{
      objectiveId: string;
      title: string;
      current: number;
      required: number;
      completed: boolean;
    }>;
  }>;
  talkUpdated: boolean;
}

export interface AcceptQuestResponse {
  questId: string;
  state: string;
  objectives: Array<{
    objectiveId: string;
    title: string;
    current: number;
    required: number;
    completed: boolean;
  }>;
}

export interface CompleteQuestResponse {
  questProgress: {
    questId: string;
    state: string;
    objectives: Array<{
      objectiveId: string;
      title: string;
      current: number;
      required: number;
      completed: boolean;
    }>;
  };
  reward: {
    coins: number;
    gatheringXp: number;
    craftingXp: number;
    reputation: number;
  };
  reputation: {
    npcId: string;
    playerId: string;
    reputation: number;
    completedQuestIds: string[];
  };
}

export type CampQuestSkillRewardStatus = "applied" | "skipped" | "failed";

export interface CompleteCampQuestResponse {
  ok: boolean;
  questId: string;
  poiId: string;
  itemId: string;
  quantity: number;
  coinsGranted: number;
  newCoinBalance: number;
  skillXpGranted: Array<{
    skillId: "woodcutting" | "mining" | "fishing" | "crafting" | "combat";
    amount: number;
  }>;
  skillRewardStatus: CampQuestSkillRewardStatus;
  historyHash?: string;
  reason: string;
}

/**
 * Talk to an NPC - updates quest progress and returns dialogue.
 */
export async function talkToNpc(
  npcId: string,
  playerPosition: { x: number; y: number },
  playerId: string,
): Promise<ActionResult<NpcDialogueResponse>> {
  try {
    const response = await fetch("/api/npc/talk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        npcId,
        playerPosition,
        playerId,
      }),
    });

    const data = await response.json();
    return {
      ok: data.ok,
      result: data.result,
      reason: data.reason,
    };
  } catch (error) {
    return {
      ok: false,
      reason: "network_error",
      details: { message: String(error) },
    };
  }
}

/**
 * Accept a quest from an NPC.
 */
export async function acceptQuest(
  questId: string,
  npcId: string,
  playerPosition: { x: number; y: number },
  playerId: string,
): Promise<ActionResult<AcceptQuestResponse>> {
  try {
    const response = await fetch("/api/quests/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questId,
        npcId,
        playerPosition,
        playerId,
      }),
    });

    const data = await response.json();
    return {
      ok: data.ok,
      result: data.result,
      reason: data.reason,
    };
  } catch (error) {
    return {
      ok: false,
      reason: "network_error",
      details: { message: String(error) },
    };
  }
}

/**
 * Complete a quest and claim rewards.
 */
export async function completeQuest(
  questId: string,
  npcId: string,
  playerPosition: { x: number; y: number },
  playerId: string,
): Promise<ActionResult<CompleteQuestResponse>> {
  try {
    const response = await fetch("/api/quests/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questId,
        npcId,
        playerPosition,
        playerId,
      }),
    });

    const data = await response.json();
    return {
      ok: data.ok,
      result: data.result,
      reason: data.reason,
    };
  } catch (error) {
    return {
      ok: false,
      reason: "network_error",
      details: { message: String(error) },
    };
  }
}

/**
 * Complete a deterministic camp daily quest through the economy runtime route.
 * Client sends only intent; server validates discovery, POI authority, inventory, tick cycle and player position.
 */
export async function completeCampQuest(
  questId: string,
  playerPosition: { x: number; y: number },
  playerId: string,
): Promise<ActionResult<CompleteCampQuestResponse>> {
  try {
    const response = await fetch("/api/economy/complete-camp-quest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-player-id": playerId,
      },
      body: JSON.stringify({
        questId,
        playerPosition,
      }),
    });

    const data = await response.json();
    const result = data.result as CompleteCampQuestResponse | undefined;
    return {
      ok: Boolean(data.ok),
      result,
      reason: result?.reason ?? data.reason ?? data.error,
    };
  } catch (error) {
    return {
      ok: false,
      reason: "network_error",
      details: { message: String(error) },
    };
  }
}

/**
 * Get active quests for a player.
 */
export async function getActiveQuests(playerId: string): Promise<ActionResult<{
  activeQuests: Array<{
    questId: string;
    state: string;
    objectives: Array<{
      objectiveId: string;
      title: string;
      current: number;
      required: number;
      completed: boolean;
    }>;
  }>;
}>> {
  try {
    const response = await fetch(`/api/quests/active?playerId=${encodeURIComponent(playerId)}`);
    const data = await response.json();
    return {
      ok: data.ok,
      result: data.result,
      reason: data.reason,
    };
  } catch (error) {
    return {
      ok: false,
      reason: "network_error",
      details: { message: String(error) },
    };
  }
}

/**
 * Get available quests for a player.
 */
export async function getAvailableQuests(playerId: string): Promise<ActionResult<{
  availableQuests: Array<{
    questId: string;
    state: string;
    objectives: Array<{
      objectiveId: string;
      title: string;
      current: number;
      required: number;
      completed: boolean;
    }>;
  }>;
}>> {
  try {
    const response = await fetch(`/api/quests/available?playerId=${encodeURIComponent(playerId)}`);
    const data = await response.json();
    return {
      ok: data.ok,
      result: data.result,
      reason: data.reason,
    };
  } catch (error) {
    return {
      ok: false,
      reason: "network_error",
      details: { message: String(error) },
    };
  }
}

/**
 * Get NPC dialogue for a player.
 */
export async function getNpcDialogue(
  playerId: string,
  npcId: string,
): Promise<ActionResult<{
  dialogue: {
    npcId: string;
    displayName: string;
    dialogueState: string;
    line: string;
    availableQuestIds: string[];
    activeQuestIds: string[];
    completedQuestIds: string[];
  };
}>> {
  try {
    const response = await fetch(
      `/api/npc/dialogue?playerId=${encodeURIComponent(playerId)}&npcId=${encodeURIComponent(npcId)}`,
    );
    const data = await response.json();
    return {
      ok: data.ok,
      result: data.result,
      reason: data.reason,
    };
  } catch (error) {
    return {
      ok: false,
      reason: "network_error",
      details: { message: String(error) },
    };
  }
}

/**
 * Get NPC reputation for a player.
 */
export async function getNpcReputation(
  playerId: string,
  npcId: string,
): Promise<ActionResult<{
  reputation: {
    npcId: string;
    playerId: string;
    reputation: number;
    completedQuestIds: string[];
  };
}>> {
  try {
    const response = await fetch(
      `/api/npc/reputation?playerId=${encodeURIComponent(playerId)}&npcId=${encodeURIComponent(npcId)}`,
    );
    const data = await response.json();
    return {
      ok: data.ok,
      result: data.result,
      reason: data.reason,
    };
  } catch (error) {
    return {
      ok: false,
      reason: "network_error",
      details: { message: String(error) },
    };
  }
}
