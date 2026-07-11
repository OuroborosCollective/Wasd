import { getWalletService } from "../economy/economyRuntime.js";
import type { WalletState } from "../economy/WalletTypes.js";
import { runtimeHistoryLog } from "../history/RuntimeHistoryLog.js";
import { npcMemoryService } from "../npc/NpcMemoryService.js";
import { getSkillProgressionService } from "../skills/skillRuntime.js";
import type { PlayerSkillState } from "../skills/SkillTypes.js";
import { JsonNpcQuestPersistenceAdapter } from "./JsonNpcQuestPersistenceAdapter.js";
import type {
  NpcQuestPersistenceAdapter,
  PersistedNpcQuestPlayerState,
  PersistedNpcQuestSourceMutation,
} from "./NpcQuestPersistence.js";
import { npcQuestService, type NpcQuestService } from "./NpcQuestService.js";
import type { ActionResult, QuestProgressSnapshot } from "./NpcQuestTypes.js";

export interface NpcQuestMutationEvidence {
  readonly intentHash: string;
  readonly tick: number;
  readonly chunkKey: string;
}

export interface NpcQuestSourceMutationEvidence extends NpcQuestMutationEvidence {
  readonly eventType: "gather" | "craft" | "sell";
  readonly targetId: string;
  readonly quantity: number;
}

export interface NpcQuestProgressCommitResult {
  readonly progress: readonly QuestProgressSnapshot[];
  readonly intentHash: string;
  readonly historyHash: string;
  readonly tick: number;
  readonly replayed: boolean;
}

export interface NpcQuestCompletionResult {
  readonly questProgress: QuestProgressSnapshot;
  readonly reward: {
    readonly coins: number;
    readonly gatheringXp: number;
    readonly craftingXp: number;
    readonly reputation: number;
  };
  readonly wallet: WalletState;
  readonly skills: PlayerSkillState;
  readonly reputation: number;
  readonly intentHash: string;
  readonly historyHash: string;
  readonly tick: number;
}

function stableState(value: PersistedNpcQuestPlayerState): string {
  return JSON.stringify(value);
}

function sameSourceMutation(a: PersistedNpcQuestSourceMutation, b: NpcQuestSourceMutationEvidence): boolean {
  return a.intentHash === b.intentHash &&
    a.eventType === b.eventType &&
    a.targetId === b.targetId &&
    a.quantity === b.quantity &&
    a.tick === b.tick &&
    a.chunkKey === b.chunkKey;
}

export class NpcQuestRuntime {
  private readonly hydratedPlayers = new Set<string>();
  private readonly locks = new Map<string, Promise<void>>();
  private readonly sourceMutationsByPlayer = new Map<string, Map<string, PersistedNpcQuestSourceMutation>>();

  public constructor(
    private readonly service: NpcQuestService = npcQuestService,
    private readonly persistence: NpcQuestPersistenceAdapter = new JsonNpcQuestPersistenceAdapter(),
  ) {}

  public async hydratePlayer(playerId: string): Promise<void> {
    if (this.hydratedPlayers.has(playerId)) return;
    const persisted = await this.persistence.loadPlayerState(playerId);
    if (persisted) {
      this.service.restorePlayerState(persisted);
      this.sourceMutationsByPlayer.set(
        playerId,
        new Map((persisted.appliedSourceMutations ?? []).map((entry) => [entry.intentHash, entry])),
      );
    }
    this.hydratedPlayers.add(playerId);
  }

  public async acceptQuest(
    playerId: string,
    questId: string,
    evidence: NpcQuestMutationEvidence,
  ): Promise<ActionResult<QuestProgressSnapshot & { intentHash: string; historyHash: string; tick: number }>> {
    return this.runExclusive(playerId, async () => {
      await this.hydratePlayer(playerId);
      const before = this.service.clonePlayerState(playerId);
      const historyLength = runtimeHistoryLog.captureLength();
      const result = this.service.acceptQuest(playerId, questId);
      if (!result.ok) return result;
      try {
        const history = runtimeHistoryLog.write({
          tick: evidence.tick,
          source: "quest_delta",
          actorId: playerId,
          subjectId: questId,
          chunkKey: evidence.chunkKey,
          payload: { kind: "quest_accept", intentHash: evidence.intentHash, progress: result.result },
        });
        await this.persist(playerId);
        const npcId = this.service.getQuestDefinition(questId)?.npcId;
        if (npcId) {
          void npcMemoryService.recordQuestAccepted(playerId, npcId, questId)
            .catch((error) => console.warn("[npc-quest-runtime] Accept memory side-channel failed:", error));
        }
        return {
          ok: true,
          result: Object.freeze({
            ...result.result,
            intentHash: evidence.intentHash,
            historyHash: history.entryHash,
            tick: evidence.tick,
          }),
        };
      } catch {
        this.service.restorePlayerState(before);
        runtimeHistoryLog.truncate(historyLength);
        return { ok: false, reason: "persistence_failed" };
      }
    });
  }

  public async updateQuestProgress(
    playerId: string,
    evidence: NpcQuestSourceMutationEvidence,
  ): Promise<ActionResult<NpcQuestProgressCommitResult>> {
    return this.runExclusive(playerId, async () => {
      await this.hydratePlayer(playerId);
      const playerReceipts = this.getSourceMutationMap(playerId);
      const existing = playerReceipts.get(evidence.intentHash);
      if (existing) {
        if (!sameSourceMutation(existing, evidence)) {
          return { ok: false, reason: "source_intent_conflict" };
        }
        return {
          ok: true,
          result: Object.freeze({
            progress: this.service.getActiveQuests(playerId),
            intentHash: existing.intentHash,
            historyHash: existing.historyHash,
            tick: existing.tick,
            replayed: true,
          }),
        };
      }

      const before = this.service.clonePlayerState(playerId);
      const historyLength = runtimeHistoryLog.captureLength();
      const result = this.service.updateQuestProgress(
        playerId,
        evidence.eventType,
        evidence.targetId,
        evidence.quantity,
      );
      if (!result.ok) return result;

      try {
        const history = runtimeHistoryLog.write({
          tick: evidence.tick,
          source: "quest_delta",
          actorId: playerId,
          subjectId: evidence.targetId,
          chunkKey: evidence.chunkKey,
          payload: {
            kind: "quest_progress",
            intentHash: evidence.intentHash,
            eventType: evidence.eventType,
            quantity: evidence.quantity,
            progress: result.result,
          },
        });
        const receipt: PersistedNpcQuestSourceMutation = Object.freeze({
          intentHash: evidence.intentHash,
          eventType: evidence.eventType,
          targetId: evidence.targetId,
          quantity: evidence.quantity,
          tick: evidence.tick,
          chunkKey: evidence.chunkKey,
          historyHash: history.entryHash,
        });
        playerReceipts.set(receipt.intentHash, receipt);
        await this.persist(playerId);
        return {
          ok: true,
          result: Object.freeze({
            progress: result.result,
            intentHash: receipt.intentHash,
            historyHash: receipt.historyHash,
            tick: receipt.tick,
            replayed: false,
          }),
        };
      } catch {
        this.service.restorePlayerState(before);
        playerReceipts.delete(evidence.intentHash);
        runtimeHistoryLog.truncate(historyLength);
        return { ok: false, reason: "persistence_failed" };
      }
    });
  }

  public async updateTalkObjective(
    playerId: string,
    npcId: string,
    evidence: NpcQuestMutationEvidence,
  ): Promise<ActionResult<readonly QuestProgressSnapshot[]>> {
    return this.runExclusive(playerId, async () => {
      await this.hydratePlayer(playerId);
      const before = this.service.clonePlayerState(playerId);
      const historyLength = runtimeHistoryLog.captureLength();
      const result = this.service.updateTalkObjective(playerId, npcId);
      if (!result.ok) return result;
      try {
        runtimeHistoryLog.write({
          tick: evidence.tick,
          source: "quest_delta",
          actorId: playerId,
          subjectId: npcId,
          chunkKey: evidence.chunkKey,
          payload: { kind: "npc_talk", intentHash: evidence.intentHash, updated: result.result },
        });
        await this.persist(playerId);
        return result;
      } catch {
        this.service.restorePlayerState(before);
        runtimeHistoryLog.truncate(historyLength);
        return { ok: false, reason: "persistence_failed" };
      }
    });
  }

  public async completeQuestWithRewards(
    playerId: string,
    questId: string,
    evidence: NpcQuestMutationEvidence,
  ): Promise<ActionResult<NpcQuestCompletionResult>> {
    return this.runExclusive(playerId, async () => {
      await this.hydratePlayer(playerId);
      const definition = this.service.getQuestDefinition(questId);
      if (!definition) return { ok: false, reason: "missing_quest" };
      const progress = this.service.getQuestProgress(playerId, questId);
      if (!progress || progress.state !== "ready_to_complete") {
        return { ok: false, reason: "objective_not_complete" };
      }

      const walletService = await getWalletService();
      const skillService = await getSkillProgressionService();
      const beforeQuest = this.service.clonePlayerState(playerId);
      const beforeWallet = await walletService.getWallet(playerId);
      const beforeSkills = await skillService.getPlayerSkillState(playerId);
      const historyLength = runtimeHistoryLog.captureLength();

      try {
        await walletService.addCoins({ playerId, amount: definition.reward.coins });
        await skillService.applyEvent({
          type: "skill_xp_gain",
          playerId,
          skillId: "woodcutting",
          amount: definition.reward.gatheringXp,
          source: "quest_reward",
        });
        await skillService.applyEvent({
          type: "skill_xp_gain",
          playerId,
          skillId: "crafting",
          amount: definition.reward.craftingXp,
          source: "quest_reward",
        });

        const completed = this.service.completeQuest(playerId, questId);
        if (!completed.ok) throw new Error(completed.reason);
        const wallet = await walletService.getWallet(playerId);
        const skills = await skillService.getPlayerSkillState(playerId);
        const persistedReputation = completed.result.reputation.reputation;
        const history = runtimeHistoryLog.write({
          tick: evidence.tick,
          source: "quest_delta",
          actorId: playerId,
          subjectId: questId,
          chunkKey: evidence.chunkKey,
          payload: {
            kind: "quest_complete",
            intentHash: evidence.intentHash,
            reward: definition.reward,
            wallet: wallet.balances,
            reputation: persistedReputation,
          },
        });
        await this.persist(playerId);

        this.recordCompletionSideChannels(
          playerId,
          definition.npcId,
          questId,
          definition.reward.reputation,
        );

        return {
          ok: true,
          result: Object.freeze({
            questProgress: completed.result.questProgress,
            reward: definition.reward,
            wallet,
            skills,
            reputation: persistedReputation,
            intentHash: evidence.intentHash,
            historyHash: history.entryHash,
            tick: evidence.tick,
          }),
        };
      } catch (error) {
        this.service.restorePlayerState(beforeQuest);
        runtimeHistoryLog.truncate(historyLength);
        const recovery = await Promise.allSettled([
          walletService.restoreWallet(playerId, beforeWallet),
          skillService.restorePlayerSkillState(playerId, beforeSkills),
          this.persistence.savePlayerState(this.withSourceMutations(playerId, beforeQuest)),
        ]);
        return {
          ok: false,
          reason: recovery.every((entry) => entry.status === "fulfilled")
            ? "reward_commit_failed"
            : "reward_recovery_failed",
          details: { message: error instanceof Error ? error.message : "unknown" },
        };
      }
    });
  }

  public async persistPlayer(playerId: string): Promise<void> {
    await this.runExclusive(playerId, async () => {
      await this.hydratePlayer(playerId);
      await this.persist(playerId);
    });
  }

  public resetHydrationForTests(playerId?: string): void {
    if (playerId) {
      this.hydratedPlayers.delete(playerId);
      this.sourceMutationsByPlayer.delete(playerId);
    } else {
      this.hydratedPlayers.clear();
      this.sourceMutationsByPlayer.clear();
    }
  }

  private getSourceMutationMap(playerId: string): Map<string, PersistedNpcQuestSourceMutation> {
    let map = this.sourceMutationsByPlayer.get(playerId);
    if (!map) {
      map = new Map();
      this.sourceMutationsByPlayer.set(playerId, map);
    }
    return map;
  }

  private withSourceMutations(
    playerId: string,
    state: PersistedNpcQuestPlayerState,
  ): PersistedNpcQuestPlayerState {
    return Object.freeze({
      ...state,
      appliedSourceMutations: Object.freeze(
        [...this.getSourceMutationMap(playerId).values()].sort((a, b) => a.intentHash.localeCompare(b.intentHash)),
      ),
    });
  }

  private recordCompletionSideChannels(
    playerId: string,
    npcId: string,
    questId: string,
    reputationDelta: number,
  ): void {
    void npcMemoryService.recordMemoryEvent(
      playerId,
      npcId,
      "quest_completed",
      questId,
      reputationDelta,
      `Completed quest: ${questId}`,
    ).then((memory) => {
      if (!memory.ok) {
        console.warn("[npc-quest-runtime] Completion memory side-channel rejected:", memory.reason);
        return;
      }
      return import("../npc/NpcRumorService.js")
        .then(({ npcRumorService }) => npcRumorService.createRumorFromMemory(
          playerId,
          npcId,
          memory.result.eventId,
          "helped_village",
        ));
    }).catch((error) => console.warn("[npc-quest-runtime] Completion side-channel failed:", error));
  }

  private async persist(playerId: string): Promise<void> {
    await this.persistence.savePlayerState(this.withSourceMutations(playerId, this.service.exportPlayerState(playerId)));
  }

  private async runExclusive<T>(playerId: string, work: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(playerId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const tail = previous.then(() => gate);
    this.locks.set(playerId, tail);
    await previous;
    try {
      return await work();
    } finally {
      release();
      if (this.locks.get(playerId) === tail) this.locks.delete(playerId);
    }
  }
}

export const npcQuestRuntime = new NpcQuestRuntime();
