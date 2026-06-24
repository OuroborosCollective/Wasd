/**
 * Server-authoritative completion path for deterministic camp daily quests.
 */

import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import type { WalletService } from "../economy/WalletService.js";
import type { RuntimeHistoryLog } from "../history/RuntimeHistoryLog.js";
import { runtimeHistoryLog } from "../history/RuntimeHistoryLog.js";
import type { InventoryService } from "../inventory/InventoryService.js";
import { getSkillProgressionService } from "../skills/skillRuntime.js";
import type { SkillId } from "../skills/SkillTypes.js";
import type { WorldDiscoveryService } from "../world/WorldDiscoveryService.js";
import { worldDiscoveryService } from "../world/WorldDiscoveryService.js";
import { CHUNK_POI_CONSTANTS, deriveChunkBiome, generateChunkPois } from "../world/WorldPoiGenerator.js";
import type { WorldPoiSnapshot } from "../world/WorldPoiTypes.js";
import {
  getCampQuestCycle,
  isGatheringCampPoiType,
  resolveCampQuestRequirement,
  resolveCampQuestReward,
  type GatheringCampPoiType,
} from "./CampQuestDirector.js";

export type CampQuestCompleteReason =
  | "completed"
  | "invalid_player"
  | "invalid_quest_id"
  | "invalid_cycle"
  | "quest_already_completed"
  | "poi_not_discovered"
  | "poi_not_authoritative"
  | "missing_player_position"
  | "invalid_player_position"
  | "camp_too_far"
  | "insufficient_items"
  | "inventory_remove_failed";

export interface CampQuestSkillXpGrant {
  readonly skillId: SkillId;
  readonly amount: number;
}

export interface CampQuestServiceDeps {
  readonly getSkillProgressionService?: typeof getSkillProgressionService;
}

export interface CompleteCampQuestInput {
  readonly playerId: string;
  readonly questId: string;
  readonly playerPosition?: { readonly x: number; readonly y: number };
  readonly currentTick: number;
}

export interface CompleteCampQuestResult {
  readonly ok: boolean;
  readonly questId: string;
  readonly poiId: string;
  readonly itemId: string;
  readonly quantity: number;
  readonly coinsGranted: number;
  readonly newCoinBalance: number;
  readonly skillXpGranted: readonly CampQuestSkillXpGrant[];
  readonly historyHash?: string;
  readonly reason: CampQuestCompleteReason;
}

interface ParsedCampQuestId {
  readonly poiId: string;
  readonly cycle: number;
}

interface ParsedGeneratedCampPoi {
  readonly poi: WorldPoiSnapshot;
  readonly poiType: GatheringCampPoiType;
}

function safeTick(value: number): number {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function distance(a: { readonly x: number; readonly y: number }, b: { readonly x: number; readonly y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function parseCampQuestId(questId: string): ParsedCampQuestId | null {
  if (!questId.startsWith("camp_daily:")) return null;
  const body = questId.slice("camp_daily:".length);
  const separator = body.lastIndexOf(":");
  if (separator <= 0) return null;
  const poiId = body.slice(0, separator);
  const cycle = Number(body.slice(separator + 1));
  if (!poiId || !Number.isSafeInteger(cycle) || cycle < 0) return null;
  return { poiId, cycle };
}

function parseGeneratedCampPoiId(poiId: string): { chunkX: number; chunkZ: number; poiType: GatheringCampPoiType } | null {
  const parts = poiId.split(":");
  if (parts.length !== 5 || parts[0] !== "poi" || parts[4] !== "0") return null;
  const chunkX = Number(parts[1]);
  const chunkZ = Number(parts[2]);
  const poiType = parts[3];
  if (!Number.isSafeInteger(chunkX) || !Number.isSafeInteger(chunkZ) || !isGatheringCampPoiType(poiType)) return null;
  return { chunkX, chunkZ, poiType };
}

function resolveAuthoritativeGeneratedCampPoi(poiId: string): ParsedGeneratedCampPoi | null {
  const parsed = parseGeneratedCampPoiId(poiId);
  if (!parsed) return null;

  const biomeId = deriveChunkBiome(parsed.chunkX, parsed.chunkZ);
  const pois = generateChunkPois({
    chunkX: parsed.chunkX,
    chunkZ: parsed.chunkZ,
    biomeId,
    worldSeed: CHUNK_POI_CONSTANTS.WORLD_SEED,
  });
  const poi = pois.find((candidate) => candidate.id === poiId && candidate.type === parsed.poiType);
  if (!poi || !isGatheringCampPoiType(poi.type)) return null;
  return { poi, poiType: poi.type };
}

function gatheringSkillForCamp(poiType: GatheringCampPoiType): SkillId {
  if (poiType === "logging_camp") return "woodcutting";
  if (poiType === "mining_camp") return "mining";
  return "fishing";
}

function normalizeXpAmount(value: number): number {
  const amount = Math.floor(Number(value));
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function completionHash(input: {
  readonly playerId: string;
  readonly questId: string;
  readonly itemId: string;
  readonly quantity: number;
  readonly coins: number;
  readonly skillXp: string;
  readonly tick: number;
}): string {
  return stableHash32([
    "CAMP_QUEST_COMPLETE_V1",
    input.playerId,
    input.questId,
    input.itemId,
    input.quantity,
    input.coins,
    input.skillXp,
    input.tick,
  ].join("|")).toString(16);
}

export class CampQuestService {
  private readonly completedQuestIdsByPlayer = new Map<string, Set<string>>();

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly walletService: WalletService,
    private readonly discoveryService: WorldDiscoveryService = worldDiscoveryService,
    private readonly history: RuntimeHistoryLog = runtimeHistoryLog,
    private readonly deps: CampQuestServiceDeps = {},
  ) {}

  getCompletedQuestIds(playerId: string): readonly string[] {
    return Object.freeze([...(this.completedQuestIdsByPlayer.get(playerId) ?? new Set<string>())].sort());
  }

  async completeCampQuest(input: CompleteCampQuestInput): Promise<CompleteCampQuestResult> {
    const playerId = input.playerId.trim();
    const tick = safeTick(input.currentTick);
    const parsedQuest = parseCampQuestId(input.questId);

    if (!playerId || playerId === "anonymous") return this.failure(input.questId, "", "", 0, "invalid_player");
    if (!parsedQuest) return this.failure(input.questId, "", "", 0, "invalid_quest_id");
    if (parsedQuest.cycle !== getCampQuestCycle(tick)) return this.failure(input.questId, parsedQuest.poiId, "", 0, "invalid_cycle");

    const completed = this.completedQuestIdsByPlayer.get(playerId) ?? new Set<string>();
    if (completed.has(input.questId)) return this.failure(input.questId, parsedQuest.poiId, "", 0, "quest_already_completed");
    if (!this.discoveryService.isPoiDiscovered(playerId, parsedQuest.poiId)) return this.failure(input.questId, parsedQuest.poiId, "", 0, "poi_not_discovered");

    const camp = resolveAuthoritativeGeneratedCampPoi(parsedQuest.poiId);
    if (!camp) return this.failure(input.questId, parsedQuest.poiId, "", 0, "poi_not_authoritative");
    if (!input.playerPosition) return this.failure(input.questId, parsedQuest.poiId, "", 0, "missing_player_position");
    if (!Number.isFinite(input.playerPosition.x) || !Number.isFinite(input.playerPosition.y)) return this.failure(input.questId, parsedQuest.poiId, "", 0, "invalid_player_position");

    const radius = Math.max(1, Number(camp.poi.interactionRadius ?? 32));
    if (distance(input.playerPosition, camp.poi.position) > radius) return this.failure(input.questId, parsedQuest.poiId, "", 0, "camp_too_far");

    const resolution = { playerId, poiId: parsedQuest.poiId, poiType: camp.poiType, logicalIndex: tick };
    const requirement = resolveCampQuestRequirement(resolution);
    const reward = resolveCampQuestReward(resolution);
    const hasItems = await this.inventoryService.hasItems({ playerId, items: [{ itemId: requirement.itemId, quantity: requirement.quantity }] });
    if (!hasItems) return this.failure(input.questId, parsedQuest.poiId, requirement.itemId, requirement.quantity, "insufficient_items");

    const removeResult = await this.inventoryService.removeItem({ playerId, itemId: requirement.itemId, quantity: requirement.quantity });
    if (!removeResult.ok) return this.failure(input.questId, parsedQuest.poiId, requirement.itemId, requirement.quantity, "inventory_remove_failed");

    const wallet = await this.walletService.addCoins({ playerId, amount: reward.coins });
    const skillXpGranted = await this.applySkillRewards({
      playerId,
      poiType: camp.poiType,
      gatheringXp: reward.gatheringXp,
      craftingXp: reward.craftingXp,
    });
    completed.add(input.questId);
    this.completedQuestIdsByPlayer.set(playerId, completed);

    const skillXpHashSource = skillXpGranted.map((grant) => `${grant.skillId}:${grant.amount}`).join(",");
    const sourceHash = completionHash({
      playerId,
      questId: input.questId,
      itemId: requirement.itemId,
      quantity: requirement.quantity,
      coins: reward.coins,
      skillXp: skillXpHashSource,
      tick,
    });
    const history = this.history.write({
      tick,
      source: "quest_delta",
      actorId: playerId,
      subjectId: input.questId,
      payload: {
        poiId: parsedQuest.poiId,
        itemId: requirement.itemId,
        quantity: requirement.quantity,
        reward,
        skillXpGranted,
        sourceHash,
      },
    });

    return Object.freeze({
      ok: true,
      questId: input.questId,
      poiId: parsedQuest.poiId,
      itemId: requirement.itemId,
      quantity: requirement.quantity,
      coinsGranted: reward.coins,
      newCoinBalance: wallet.balances.coin,
      skillXpGranted,
      historyHash: history.entryHash,
      reason: "completed" as const,
    });
  }

  clearForTests(): void {
    this.completedQuestIdsByPlayer.clear();
  }

  private async applySkillRewards(input: {
    readonly playerId: string;
    readonly poiType: GatheringCampPoiType;
    readonly gatheringXp: number;
    readonly craftingXp: number;
  }): Promise<readonly CampQuestSkillXpGrant[]> {
    const grants: CampQuestSkillXpGrant[] = [];
    const skillService = await (this.deps.getSkillProgressionService ?? getSkillProgressionService)();
    const gatheringAmount = normalizeXpAmount(input.gatheringXp);
    if (gatheringAmount > 0) {
      const skillId = gatheringSkillForCamp(input.poiType);
      await skillService.applyEvent({
        type: "skill_xp_gain",
        playerId: input.playerId,
        skillId,
        amount: gatheringAmount,
        source: "quest_reward",
      });
      grants.push(Object.freeze({ skillId, amount: gatheringAmount }));
    }

    const craftingAmount = normalizeXpAmount(input.craftingXp);
    if (craftingAmount > 0) {
      await skillService.applyEvent({
        type: "skill_xp_gain",
        playerId: input.playerId,
        skillId: "crafting",
        amount: craftingAmount,
        source: "quest_reward",
      });
      grants.push(Object.freeze({ skillId: "crafting", amount: craftingAmount }));
    }

    return Object.freeze(grants.sort((a, b) => a.skillId.localeCompare(b.skillId)));
  }

  private failure(
    questId: string,
    poiId: string,
    itemId: string,
    quantity: number,
    reason: Exclude<CampQuestCompleteReason, "completed">,
  ): CompleteCampQuestResult {
    return Object.freeze({
      ok: false,
      questId,
      poiId,
      itemId,
      quantity,
      coinsGranted: 0,
      newCoinBalance: 0,
      skillXpGranted: Object.freeze([]),
      reason,
    });
  }
}
