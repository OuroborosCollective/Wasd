import { createActivityContext, filterVisibleEntities } from "../gameplay/NPCActivitySnapshotGenerator.js";
import type { ActivityResolutionContext, NPCWorkRole } from "../gameplay/NPCActivitySnapshot.js";
import { campNpcService } from "../npc/CampNpcService.js";
import { npcQuestService } from "../quests/NpcQuestService.js";
import { guildSystem } from "../modules/guild/GuildSystem.js";
import type { FactionStandingSnapshot, GuildSnapshot, WorldPoiSnapshot } from "./gameplaySnapshotUtils.js";
import type { WorldPoiSnapshot as RuntimeWorldPoiSnapshot, WorldPoiType } from "../world/WorldPoiTypes.js";

export interface RuntimeTruthProviderInput {
  readonly playerId: string;
  readonly tick: number;
  readonly playerPosition?: { readonly x: number; readonly y: number };
  readonly worldPois: readonly WorldPoiSnapshot[];
  readonly discoveredPoiIds: readonly string[];
}

export function resolveRuntimeGuildSnapshot(playerId: string): GuildSnapshot {
  const guild = guildSystem.getGuildForPlayer(playerId);
  if (!guild) {
    return Object.freeze({
      id: null,
      name: null,
      memberCount: 0,
      rank: null,
      villageEligible: false,
      treasury: null,
    });
  }

  return Object.freeze({
    id: guild.id,
    name: guild.name,
    memberCount: guild.members.length,
    rank: guild.ranks[playerId] ?? null,
    villageEligible: guild.members.length >= 50,
    treasury: Math.max(0, Math.floor(Number(guild.treasury ?? 0))),
  });
}

export function resolveRuntimeFactionStandings(playerId: string): readonly FactionStandingSnapshot[] {
  const reputations = npcQuestService.getAllNpcReputations(playerId);
  const starterVillageStanding = reputations
    .filter((entry) => entry.npcId.startsWith("village_"))
    .reduce((sum, entry) => sum + Math.floor(Number(entry.reputation ?? 0)), 0);

  return Object.freeze([
    Object.freeze({
      id: "starter_village",
      name: "Starter Village",
      standing: starterVillageStanding,
      label: labelForStanding(starterVillageStanding),
    }),
  ]);
}

export function buildRuntimeNpcActivityContexts(input: RuntimeTruthProviderInput): readonly ActivityResolutionContext[] {
  const contexts: ActivityResolutionContext[] = [];
  const playerTarget = input.playerPosition
    ? [{ id: `player:${input.playerId}`, position: { x: input.playerPosition.x, y: input.playerPosition.y }, type: "player" as const }]
    : [];

  const villageTrader = npcQuestService.getNpcDefinition("village_trader_001");
  if (villageTrader) {
    const dialogue = npcQuestService.getNpcDialogue(input.playerId, villageTrader.id);
    const reputation = npcQuestService.getNpcReputation(input.playerId, villageTrader.id)?.reputation ?? 0;
    contexts.push(createActivityContext(
      villageTrader.id,
      villageTrader.displayName,
      { x: villageTrader.x, y: villageTrader.y },
      dialogue.dialogueState,
      1,
      reputation >= 10 ? 1 : 0.75,
      input.tick,
      {
        workRole: "merchant",
        nearbyTargets: playerTarget,
      },
    ));
  }

  const discovered = new Set(input.discoveredPoiIds);
  // Bolt: Optimization - Direct relational operator comparison is ~3-5x faster than localeCompare
  const campPois = input.worldPois
    .filter((poi) => discovered.has(poi.id) && isGatheringCampPoi(poi.type))
    .map(toRuntimePoi)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const campNpcs = campNpcService.generateCampNpcs(campPois, input.tick);
  for (const npc of campNpcs) {
    contexts.push(createActivityContext(
      npc.id,
      npc.name,
      npc.position,
      npc.activity,
      1,
      npc.state === "resting" ? 0.15 : 1,
      input.tick,
      {
        workRole: workRoleForCampRole(npc.role),
        nearbyTargets: playerTarget,
      },
    ));
  }

  // Bolt: Optimization - Direct relational operator comparison is ~3-5x faster than localeCompare
  const sorted = contexts.sort((a, b) => (
    a.chunkKey < b.chunkKey ? -1 : a.chunkKey > b.chunkKey ? 1 : (a.entityId < b.entityId ? -1 : a.entityId > b.entityId ? 1 : 0)
  ));
  if (!input.playerPosition) return Object.freeze(sorted);
  return Object.freeze(filterVisibleEntities(sorted, input.playerPosition, 256000));
}

function labelForStanding(standing: number): FactionStandingSnapshot["label"] {
  if (standing < -10) return "hostile";
  if (standing >= 25) return "allied";
  if (standing >= 10) return "trusted";
  return "neutral";
}

function isGatheringCampPoi(type: string): type is WorldPoiType {
  return type === "logging_camp" || type === "mining_camp" || type === "fishing_camp";
}

function toRuntimePoi(poi: WorldPoiSnapshot): RuntimeWorldPoiSnapshot {
  return Object.freeze({
    id: poi.id,
    type: poi.type,
    title: poi.title,
    position: Object.freeze({ x: poi.position.x, y: poi.position.y }),
    chunk: Object.freeze({ x: poi.chunk.x, z: poi.chunk.z }),
    interactionRadius: poi.interactionRadius,
    tags: Object.freeze([...poi.tags]),
  });
}

function workRoleForCampRole(role: string): NPCWorkRole {
  const normalized = role.toLowerCase();
  if (normalized.includes("wood")) return "woodcutter";
  if (normalized.includes("miner") || normalized.includes("ore")) return "miner";
  if (normalized.includes("fish")) return "fisherman";
  return "citizen";
}
