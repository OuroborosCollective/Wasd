/**
 * Server-authoritative completion path for deterministic camp daily quests.
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import type { InventoryService } from "../inventory/InventoryService.js";
import type { WalletService } from "../economy/WalletService.js";
import type { RuntimeHistoryLog } from "../history/RuntimeHistoryLog.js";
import { runtimeHistoryLog } from "../history/RuntimeHistoryLog.js";
import type { WorldDiscoveryService } from "../world/WorldDiscoveryService.js";
import { worldDiscoveryService } from "../world/WorldDiscoveryService.js";
import { CHUNK_POI_CONSTANTS, deriveChunkBiome, generateChunkPois } from "../world/WorldPoiGenerator.js";
import type { WorldPoiSnapshot } from "../world/WorldPoiTypes.js";
import {
  getCampQuestCycle,
  isGatheringCampPoiType,
  resolveCampQuestRequirement,
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

export interface CampQuestCompletionPersistence {
  loadCompletedQuestIds(playerId: string): Promise<readonly string[]>;
  saveCompletedQuestIds(playerId: string, questIds: readonly string[]): Promise<void>;
}

interface CampQuestCompletionFilePayload {
  readonly schemaVersion: 1;
  readonly playerId: string;
  readonly completedQuestIds: readonly string[];
  readonly stateHash: string;
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

function completionHash(input: { playerId: string; questId: string; itemId: string; quantity: number; coins: number; tick: number }): string {
  return stableHash32(["CAMP_QUEST_COMPLETE_V1", input.playerId, input.questId, input.itemId, input.quantity, input.coins, input.tick].join("|")).toString(16);
}

function normalizeQuestIds(questIds: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(questIds.filter((questId) => /^camp_daily:[a-zA-Z0-9_:-]{1,144}:[0-9]{1,12}$/.test(questId)))].sort());
}

function completionStateHash(playerId: string, questIds: readonly string[]): string {
  return stableHash32(["CAMP_QUEST_COMPLETION_STATE_V1", playerId, ...questIds].join("|")).toString(16);
}

function sanitizePlayerFileName(playerId: string): string {
  const normalized = playerId.trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 96);
  return normalized.length > 0 ? normalized : "anonymous";
}

export class JsonCampQuestCompletionPersistence implements CampQuestCompletionPersistence {
  constructor(private readonly rootDir: string = process.env.CAMP_QUEST_COMPLETION_DIR ?? join(process.cwd(), ".runtime", "camp-quest-completions")) {}

  async loadCompletedQuestIds(playerId: string): Promise<readonly string[]> {
    try {
      const raw = await readFile(this.filePath(playerId), "utf8");
      const parsed = JSON.parse(raw) as Partial<CampQuestCompletionFilePayload>;
      if (parsed.schemaVersion !== 1 || parsed.playerId !== playerId || !Array.isArray(parsed.completedQuestIds)) return Object.freeze([]);
      const completedQuestIds = normalizeQuestIds(parsed.completedQuestIds.map(String));
      const expectedHash = completionStateHash(playerId, completedQuestIds);
      if (parsed.stateHash !== expectedHash) return Object.freeze([]);
      return completedQuestIds;
    } catch (error) {
      const code = (error as { readonly code?: string }).code;
      if (code === "ENOENT") return Object.freeze([]);
      throw error;
    }
  }

  async saveCompletedQuestIds(playerId: string, questIds: readonly string[]): Promise<void> {
    const completedQuestIds = normalizeQuestIds(questIds);
    const payload: CampQuestCompletionFilePayload = Object.freeze({
      schemaVersion: 1,
      playerId,
      completedQuestIds,
      stateHash: completionStateHash(playerId, completedQuestIds),
    });
    const target = this.filePath(playerId);
    const temp = `${target}.${payload.stateHash}.tmp`;
    await mkdir(dirname(target), { recursive: true });
    await writeFile(temp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    await rename(temp, target);
  }

  private filePath(playerId: string): string {
    return join(this.rootDir, `${sanitizePlayerFileName(playerId)}.json`);
  }
}

export class CampQuestService {
  private readonly completedQuestIdsByPlayer = new Map<string, Set<string>>();
  private readonly hydratedPlayers = new Set<string>();
  private readonly completionTailsByKey = new Map<string, Promise<void>>();

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly walletService: WalletService,
    private readonly discoveryService: WorldDiscoveryService = worldDiscoveryService,
    private readonly history: RuntimeHistoryLog = runtimeHistoryLog,
    private readonly completionPersistence: CampQuestCompletionPersistence = new JsonCampQuestCompletionPersistence(),
  ) {}

  async getCompletedQuestIds(playerId: string): Promise<readonly string[]> {
    const safePlayerId = playerId.trim();
    if (!safePlayerId || safePlayerId === "anonymous") return Object.freeze([]);
    await this.hydrateCompletedQuestIds(safePlayerId);
    return Object.freeze([...(this.completedQuestIdsByPlayer.get(safePlayerId) ?? new Set<string>())].sort());
  }

  async completeCampQuest(input: CompleteCampQuestInput): Promise<CompleteCampQuestResult> {
    const playerId = input.playerId.trim();
    const parsedQuest = parseCampQuestId(input.questId);
    const lockKey = parsedQuest ? `${playerId}:${input.questId}` : `${playerId}:invalid`;
    const previousTail = this.completionTailsByKey.get(lockKey) ?? Promise.resolve();
    let releaseTail: () => void = () => undefined;
    const nextTail = new Promise<void>((resolve) => { releaseTail = resolve; });
    const currentTail = previousTail.then(() => nextTail, () => nextTail);
    this.completionTailsByKey.set(lockKey, currentTail);

    await previousTail;
    try {
      return await this.completeCampQuestLocked(input, playerId, parsedQuest);
    } finally {
      releaseTail();
      if (this.completionTailsByKey.get(lockKey) === currentTail) this.completionTailsByKey.delete(lockKey);
    }
  }

  clearForTests(): void {
    this.completedQuestIdsByPlayer.clear();
    this.hydratedPlayers.clear();
    this.completionTailsByKey.clear();
  }

  private async completeCampQuestLocked(input: CompleteCampQuestInput, playerId: string, parsedQuest: ParsedCampQuestId | null): Promise<CompleteCampQuestResult> {
    const tick = safeTick(input.currentTick);

    if (!playerId || playerId === "anonymous") return this.failure(input.questId, "", "", 0, "invalid_player");
    if (!parsedQuest) return this.failure(input.questId, "", "", 0, "invalid_quest_id");
    if (parsedQuest.cycle !== getCampQuestCycle(tick)) return this.failure(input.questId, parsedQuest.poiId, "", 0, "invalid_cycle");

    await this.hydrateCompletedQuestIds(playerId);
    await this.discoveryService.hydratePlayer(playerId);

    const completed = this.completedQuestIdsByPlayer.get(playerId) ?? new Set<string>();
    if (completed.has(input.questId)) return this.failure(input.questId, parsedQuest.poiId, "", 0, "quest_already_completed");
    if (!this.discoveryService.isPoiDiscovered(playerId, parsedQuest.poiId)) return this.failure(input.questId, parsedQuest.poiId, "", 0, "poi_not_discovered");

    const camp = resolveAuthoritativeGeneratedCampPoi(parsedQuest.poiId);
    if (!camp) return this.failure(input.questId, parsedQuest.poiId, "", 0, "poi_not_authoritative");
    if (!input.playerPosition) return this.failure(input.questId, parsedQuest.poiId, "", 0, "missing_player_position");
    if (!Number.isFinite(input.playerPosition.x) || !Number.isFinite(input.playerPosition.y)) return this.failure(input.questId, parsedQuest.poiId, "", 0, "invalid_player_position");

    const radius = Math.max(1, Number(camp.poi.interactionRadius ?? 32));
    if (distance(input.playerPosition, camp.poi.position) > radius) return this.failure(input.questId, parsedQuest.poiId, "", 0, "camp_too_far");

    const requirement = resolveCampQuestRequirement({ playerId, poiId: parsedQuest.poiId, poiType: camp.poiType, logicalIndex: tick });
    const hasItems = await this.inventoryService.hasItems({ playerId, items: [{ itemId: requirement.itemId, quantity: requirement.quantity }] });
    if (!hasItems) return this.failure(input.questId, parsedQuest.poiId, requirement.itemId, requirement.quantity, "insufficient_items");

    const removeResult = await this.inventoryService.removeItem({ playerId, itemId: requirement.itemId, quantity: requirement.quantity });
    if (!removeResult.ok) return this.failure(input.questId, parsedQuest.poiId, requirement.itemId, requirement.quantity, "inventory_remove_failed");

    const rewardCoins = camp.poiType === "logging_camp" ? 18 : camp.poiType === "mining_camp" ? 22 : 20;
    const wallet = await this.walletService.addCoins({ playerId, amount: rewardCoins });
    completed.add(input.questId);
    this.completedQuestIdsByPlayer.set(playerId, completed);
    await this.completionPersistence.saveCompletedQuestIds(playerId, [...completed]);

    const sourceHash = completionHash({ playerId, questId: input.questId, itemId: requirement.itemId, quantity: requirement.quantity, coins: rewardCoins, tick });
    const history = this.history.write({
      tick,
      source: "quest_delta",
      actorId: playerId,
      subjectId: input.questId,
      payload: { poiId: parsedQuest.poiId, itemId: requirement.itemId, quantity: requirement.quantity, coinsGranted: rewardCoins, sourceHash },
    });

    return Object.freeze({
      ok: true,
      questId: input.questId,
      poiId: parsedQuest.poiId,
      itemId: requirement.itemId,
      quantity: requirement.quantity,
      coinsGranted: rewardCoins,
      newCoinBalance: wallet.balances.coin,
      historyHash: history.entryHash,
      reason: "completed" as const,
    });
  }

  private async hydrateCompletedQuestIds(playerId: string): Promise<void> {
    if (this.hydratedPlayers.has(playerId)) return;
    const persisted = await this.completionPersistence.loadCompletedQuestIds(playerId);
    this.completedQuestIdsByPlayer.set(playerId, new Set(persisted));
    this.hydratedPlayers.add(playerId);
  }

  private failure(questId: string, poiId: string, itemId: string, quantity: number, reason: Exclude<CampQuestCompleteReason, "completed">): CompleteCampQuestResult {
    return Object.freeze({ ok: false, questId, poiId, itemId, quantity, coinsGranted: 0, newCoinBalance: 0, reason });
  }
}
