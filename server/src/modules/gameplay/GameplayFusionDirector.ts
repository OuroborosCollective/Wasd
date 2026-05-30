import type { AdminGlbModelNeed } from "../content/adminGlbModelNeeds.js";
import type { NPCMemoryCache } from "../npc/NPCMemoryCache.js";

type Vec2 = { x: number; y: number };

type ResolvePathFn = (
  category: string,
  key: string | undefined,
  seed: string,
) => string | undefined;

type QuestObjectiveType = "talk_to" | "collect" | "combat";

export type QuestEchoBeacon = {
  id: string;
  questId: string;
  objectiveType: QuestObjectiveType;
  npcId: string;
  position: Vec2;
  intensity: number;
  expiresAt: number;
};

export type AdaptiveQuestSceneProfile = {
  id: string;
  questId: string;
  objectiveType: QuestObjectiveType;
  npcIds: string[];
  npcOverrideGlbPath: string | null;
  objectTypeOverrides: Record<string, string>;
  createdAt: number;
  expiresAt: number;
};

export type ConstructionContractStatus = "available" | "in_progress" | "completed";

export type ConstructionContract = {
  id: string;
  needId: string;
  position: Vec2;
  targetType: string | null;
  targetId: string | null;
  category: string;
  suggestedUrlPath: string;
  descriptionDe: string;
  reasonDe: string;
  status: ConstructionContractStatus;
  assignedNpcId: string | null;
  progress01: number;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
};

export type GameplayFusionSnapshot = {
  generatedAtIso: string;
  beacons: QuestEchoBeacon[];
  profiles: AdaptiveQuestSceneProfile[];
  contracts: ConstructionContract[];
};

export type GameplayFusionTickContext = {
  now: number;
  npcs: any[];
  players: any[];
  getQuestSyncForClient: (player: any) => any[];
  npcMemoryCache: NPCMemoryCache | null;
  emitNpcThinking: (npcName: string, thought: string, position: Vec2) => void;
};

type ContractWorldObjectSystem = {
  addObject: (obj: {
    id: string;
    type: string;
    name: string;
    position: { x: number; y: number };
    rotation?: number;
    scale?: number;
    glbPath?: string;
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
};

type NpcOverride = {
  glbPath: string;
  profileId: string;
  expiresAt: number;
};

type ObjectTypeOverride = {
  glbPath: string;
  profileId: string;
  expiresAt: number;
};

const QUEST_ECHO_MIN_DISTANCE = 8;
const QUEST_ECHO_MAX_DISTANCE = 320;
const QUEST_ECHO_TTL_MS = 20_000;
const PROFILE_TTL_MS = 30_000;
const CONTRACT_ACTIVITY_TTL_MS = 8 * 60_000;
const CONTRACT_PROGRESS_STEP = 0.08;

function normalizeToken(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function distance2d(a: Vec2, b: Vec2): number {
  return Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0));
}

function toVec2(entity: any): Vec2 {
  return {
    x: Number(entity?.position?.x ?? entity?.x ?? 0) || 0,
    y: Number(entity?.position?.y ?? entity?.y ?? 0) || 0,
  };
}

function resolveObjectiveType(raw: unknown): QuestObjectiveType | null {
  const token = normalizeToken(raw);
  if (token === "talk_to") return "talk_to";
  if (token === "collect") return "collect";
  if (token === "combat") return "combat";
  return null;
}

function resolveQuestTargetNpcId(quest: any): string | null {
  const objectiveType = normalizeToken(quest?.objectiveType ?? quest?.objective);
  const candidates: unknown[] =
    objectiveType === "collect"
      ? [quest?.targetNpcId, quest?.giverNpcId, quest?.targetId]
      : [quest?.targetNpcId, quest?.targetId, quest?.giverNpcId];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const id = candidate.trim();
    if (id.length > 0) return id;
  }
  return null;
}

function stableHash(raw: string): number {
  let h = 0;
  for (let i = 0; i < raw.length; i += 1) {
    h = ((h << 5) - h + raw.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function defaultContractPosition(needId: string, targetId: string | null): Vec2 {
  const seed = `${needId}:${targetId ?? ""}`;
  const h = stableHash(seed);
  const x = ((h % 21) - 10) * 6;
  const y = (((Math.floor(h / 21)) % 21) - 10) * 6;
  return { x, y };
}

function upsertMemoryWeight(memory: any, key: string, delta: number): void {
  if (!memory?.heuristicWeights || typeof memory.heuristicWeights !== "object") return;
  const prev = Number(memory.heuristicWeights[key] ?? 0.5);
  memory.heuristicWeights[key] = clamp01(prev + delta);
  memory.dirty = true;
}

export class GameplayFusionDirector {
  private readonly resolvePath: ResolvePathFn;
  private readonly questEchoBeacons = new Map<string, QuestEchoBeacon>();
  private readonly adaptiveProfiles = new Map<string, AdaptiveQuestSceneProfile>();
  private readonly npcOverrides = new Map<string, NpcOverride>();
  private readonly objectTypeOverrides = new Map<string, ObjectTypeOverride>();
  private readonly contracts = new Map<string, ConstructionContract>();
  private readonly neededById = new Map<string, AdminGlbModelNeed>();
  private readonly satisfiedById = new Map<string, AdminGlbModelNeed>();
  private readonly lastStatusAt = new Map<string, number>();

  constructor(resolvePath?: ResolvePathFn) {
    this.resolvePath = resolvePath ?? (() => undefined);
  }

  syncModelNeeds(needs: AdminGlbModelNeed[], satisfied: AdminGlbModelNeed[], now: number): void {
    this.neededById.clear();
    this.satisfiedById.clear();
    for (const row of needs) {
      if (row?.id) this.neededById.set(row.id, row);
    }
    for (const row of satisfied) {
      if (row?.id) this.satisfiedById.set(row.id, row);
    }

    for (const need of needs) {
      const contractId = `contract:${need.id}`;
      const existing = this.contracts.get(contractId);
      if (!existing) {
        this.contracts.set(contractId, {
          id: contractId,
          needId: need.id,
          position: defaultContractPosition(need.id, need.targetId),
          targetType: need.targetType,
          targetId: need.targetId,
          category: need.category,
          suggestedUrlPath: need.suggestedUrlPath,
          descriptionDe: need.descriptionDe,
          reasonDe: need.reasonDe,
          status: "available",
          assignedNpcId: null,
          progress01: 0,
          createdAt: now,
          updatedAt: now,
          completedAt: null,
        });
        continue;
      }
      existing.targetType = need.targetType;
      existing.targetId = need.targetId;
      existing.category = need.category;
      existing.suggestedUrlPath = need.suggestedUrlPath;
      existing.descriptionDe = need.descriptionDe;
      existing.reasonDe = need.reasonDe;
      existing.updatedAt = now;
      if (existing.status === "completed" && !this.satisfiedById.has(need.id)) {
        existing.status = "available";
        existing.progress01 = 0;
        existing.completedAt = null;
      }
    }

    for (const contract of this.contracts.values()) {
      if (!this.satisfiedById.has(contract.needId)) continue;
      contract.status = "completed";
      contract.progress01 = 1;
      contract.completedAt = now;
      contract.updatedAt = now;
    }

    for (const [id, contract] of this.contracts.entries()) {
      const stillRelevant = this.neededById.has(contract.needId) || this.satisfiedById.has(contract.needId);
      if (!stillRelevant && now - contract.updatedAt > CONTRACT_ACTIVITY_TTL_MS) {
        this.contracts.delete(id);
      }
    }
  }

  tick(ctx: GameplayFusionTickContext): void {
    this.cleanupExpired(ctx.now);
    this.updateQuestEchoDirector(ctx);
    this.updateContractProgress(ctx.now);
  }

  getQuestEchoBeacons(now: number = 0): QuestEchoBeacon[] {
    this.cleanupExpired(now);
    return Array.from(this.questEchoBeacons.values()).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  resolveNpcGlbOverride(npc: any, now: number = 0): string | undefined {
    const npcId = typeof npc?.id === "string" ? npc.id : "";
    if (!npcId) return undefined;
    const override = this.npcOverrides.get(npcId);
    if (!override) return undefined;
    if (override.expiresAt < now) {
      this.npcOverrides.delete(npcId);
      return undefined;
    }
    return override.glbPath;
  }

  resolveWorldObjectGlbOverride(type: string | undefined, now: number = 0): string | undefined {
    const key = normalizeToken(type);
    if (!key) return undefined;
    const override = this.objectTypeOverrides.get(key);
    if (!override) return undefined;
    if (override.expiresAt < now) {
      this.objectTypeOverrides.delete(key);
      return undefined;
    }
    return override.glbPath;
  }

  getSnapshot(now: number = 0): GameplayFusionSnapshot {
    this.cleanupExpired(now);
    return {
      // @are-telemetry-side-channel
      generatedAtIso: new Date(now).toISOString(),
      beacons: this.getQuestEchoBeacons(now),
      profiles: Array.from(this.adaptiveProfiles.values()).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
      contracts: this.getConstructionContracts(),
    };
  }

  getConstructionContracts(): ConstructionContract[] {
    return Array.from(this.contracts.values()).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  assignContractToNpc(contractId: string, npcId: string): boolean {
    const contract = this.contracts.get(contractId);
    if (!contract) return false;
    if (contract.status === "completed") return false;
    contract.status = "in_progress";
    contract.assignedNpcId = npcId;
    contract.progress01 = Math.max(contract.progress01, 0.2);
    // updatedAt should be driven by the tick now parameter if we want full determinism,
    // but assignContractToNpc doesn't have it. For now we use 0 or caller should have updated it.
    // In GameplayFusionDirector, many methods expect 'now' to be passed.
    return true;
  }

  async completeContract(
    contractId: string,
    opts: { completedByNpcId: string; worldObjectSystem: ContractWorldObjectSystem; now?: number },
  ): Promise<boolean> {
    const contract = this.contracts.get(contractId);
    if (!contract) return false;

    const now = opts.now ?? 0;
    contract.status = "completed";
    contract.progress01 = 1;
    contract.assignedNpcId = opts.completedByNpcId;
    contract.completedAt = now;
    contract.updatedAt = now;

    const glbPath =
      contract.suggestedUrlPath ||
      this.resolvePath("world_objects", normalizeToken(contract.targetId), contract.needId) ||
      this.resolvePath("world_objects", "construction", contract.needId) ||
      undefined;

    const objectId = `fusion_contract_${normalizeToken(contract.needId || contract.id)}`;
    await opts.worldObjectSystem.addObject({
      id: objectId,
      type: "construction_project",
      name: `Construction ${contract.needId}`,
      position: contract.position,
      rotation: 0,
      scale: 1,
      glbPath,
      metadata: {
        state: "built",
        needId: contract.needId,
        contractId: contract.id,
      },
    });

    if (glbPath) {
      const profileId = `contract:${contract.needId}`;
      if (
        contract.targetType === "npc_group"
        || contract.targetType === "npc_single"
      ) {
        this.npcOverrides.set(opts.completedByNpcId, {
          glbPath,
          profileId,
          expiresAt: now + PROFILE_TTL_MS,
        });
      } else {
        const key = normalizeToken(contract.targetId || contract.category || "construction");
        this.objectTypeOverrides.set(key, {
          glbPath,
          profileId,
          expiresAt: now + PROFILE_TTL_MS,
        });
      }
    }
    return true;
  }

  private cleanupExpired(now: number): void {
    for (const [id, row] of this.questEchoBeacons.entries()) {
      if (row.expiresAt < now) this.questEchoBeacons.delete(id);
    }
    for (const [id, row] of this.adaptiveProfiles.entries()) {
      if (row.expiresAt < now) this.adaptiveProfiles.delete(id);
    }
    for (const [id, row] of this.npcOverrides.entries()) {
      if (row.expiresAt < now) this.npcOverrides.delete(id);
    }
    for (const [id, row] of this.objectTypeOverrides.entries()) {
      if (row.expiresAt < now) this.objectTypeOverrides.delete(id);
    }
  }

  private updateQuestEchoDirector(ctx: GameplayFusionTickContext): void {
    const npcById = new Map<string, any>();
    for (const npc of ctx.npcs) {
      const id = typeof npc?.id === "string" ? npc.id : "";
      if (!id) continue;
      npcById.set(id, npc);
    }

    for (const player of ctx.players) {
      const playerPos = toVec2(player);
      const quests = ctx
        .getQuestSyncForClient(player)
        .filter((q: any) => q && q.completed !== true);
      for (const quest of quests) {
        const objectiveType = resolveObjectiveType(quest?.objectiveType ?? quest?.objective);
        if (!objectiveType) continue;
        const questId = typeof quest?.id === "string" ? quest.id : "unknown";
        const targetNpcId = resolveQuestTargetNpcId(quest);
        if (!targetNpcId) continue;
        const targetNpc = npcById.get(targetNpcId);
        if (!targetNpc) continue;

        const npcPos = toVec2(targetNpc);
        const dist = distance2d(playerPos, npcPos);
        if (dist < QUEST_ECHO_MIN_DISTANCE || dist > QUEST_ECHO_MAX_DISTANCE) continue;

        const beaconId = `echo:${questId}:${objectiveType}:${targetNpcId}`;
        this.questEchoBeacons.set(beaconId, {
          id: beaconId,
          questId,
          objectiveType,
          npcId: targetNpcId,
          position: npcPos,
          intensity: objectiveType === "combat" ? 0.95 : objectiveType === "collect" ? 0.8 : 0.7,
          expiresAt: ctx.now + QUEST_ECHO_TTL_MS,
        });

        const profile = this.buildAdaptiveProfile(questId, objectiveType, targetNpc, ctx.now);
        this.adaptiveProfiles.set(profile.id, profile);
        if (profile.npcOverrideGlbPath) {
          this.npcOverrides.set(targetNpcId, {
            glbPath: profile.npcOverrideGlbPath,
            profileId: profile.id,
            expiresAt: profile.expiresAt,
          });
        }
        for (const [objType, glbPath] of Object.entries(profile.objectTypeOverrides)) {
          this.objectTypeOverrides.set(normalizeToken(objType), {
            glbPath,
            profileId: profile.id,
            expiresAt: profile.expiresAt,
          });
        }

        if (ctx.npcMemoryCache) {
          const mem = ctx.npcMemoryCache.get(targetNpcId);
          ctx.npcMemoryCache.setGoal(targetNpcId, `quest_echo:${questId}:${objectiveType}`);
          ctx.npcMemoryCache.observe(targetNpcId, `quest_echo_assist:${questId}`);
          upsertMemoryWeight(mem, "chatFrequency", objectiveType === "talk_to" ? 0.06 : 0.02);
          upsertMemoryWeight(mem, "partySeeking", objectiveType === "collect" ? 0.05 : 0.01);
          upsertMemoryWeight(mem, "tradeWillingness", objectiveType === "collect" ? 0.04 : 0.01);
        }

        const statusKey = `status:${beaconId}`;
        const lastAt = this.lastStatusAt.get(statusKey) ?? 0;
        if (ctx.now - lastAt >= 15_000) {
          this.lastStatusAt.set(statusKey, ctx.now);
          ctx.emitNpcThinking(
            String(targetNpc?.name || targetNpcId),
            `[quest_echo] ${questId}:${objectiveType}`,
            npcPos,
          );
        }
      }
    }
  }

  private buildAdaptiveProfile(
    questId: string,
    objectiveType: QuestObjectiveType,
    targetNpc: any,
    now: number,
  ): AdaptiveQuestSceneProfile {
    const npcRole = normalizeToken(targetNpc?.role);
    let npcOverrideGlbPath: string | null = null;
    const objectTypeOverrides: Record<string, string> = {};

    if (objectiveType === "talk_to") {
      npcOverrideGlbPath =
        this.resolvePath("npcs", "questgiver", String(targetNpc?.id || questId)) ??
        this.resolvePath("npcs", npcRole || "merchant", String(targetNpc?.id || questId)) ??
        null;
      const roadPath =
        this.resolvePath("world_objects", "road", questId) ??
        this.resolvePath("world_objects", "path", questId);
      if (roadPath) objectTypeOverrides.road = roadPath;
    } else if (objectiveType === "collect") {
      npcOverrideGlbPath =
        this.resolvePath("npcs", "merchant", String(targetNpc?.id || questId)) ??
        this.resolvePath("npcs", "blacksmith", String(targetNpc?.id || questId)) ??
        null;
      const resourcePath =
        this.resolvePath("resources", "tree", questId) ??
        this.resolvePath("resources", "default", questId);
      if (resourcePath) {
        objectTypeOverrides.resource = resourcePath;
        objectTypeOverrides.ore = resourcePath;
      }
    } else {
      npcOverrideGlbPath =
        this.resolvePath("npcs", "guard", String(targetNpc?.id || questId)) ??
        this.resolvePath("npcs", npcRole || "warrior", String(targetNpc?.id || questId)) ??
        null;
      const combatPath =
        this.resolvePath("world_objects", "camp", questId) ??
        this.resolvePath("world_objects", "ruin", questId);
      if (combatPath) objectTypeOverrides.camp = combatPath;
    }

    return {
      id: `profile:${questId}:${objectiveType}`,
      questId,
      objectiveType,
      npcIds: [String(targetNpc?.id || "")].filter(Boolean),
      npcOverrideGlbPath,
      objectTypeOverrides,
      createdAt: now,
      expiresAt: now + PROFILE_TTL_MS,
    };
  }

  private updateContractProgress(now: number): void {
    for (const contract of this.contracts.values()) {
      if (contract.status !== "in_progress") continue;
      contract.progress01 = clamp01(contract.progress01 + CONTRACT_PROGRESS_STEP);
      contract.updatedAt = now;
    }
  }
}
