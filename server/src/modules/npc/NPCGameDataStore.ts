import { existsSync, readFileSync } from "node:fs";
import { resolveContentFile } from "../content/contentDataRoot.js";
import type { NPC, NPCSystem } from "./NPCSystem.js";

const TAG = "NPC_GAME_DATA_STORE_V1";

export interface NpcGameDataLoadReport {
  readonly npcDefinitionsRead: number;
  readonly spawnRowsRead: number;
  readonly npcsLoaded: number;
  readonly missingSpawnDefinitions: readonly string[];
  readonly duplicateSpawnNpcIds: readonly string[];
}

type NpcDefinition = {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly dialogueId?: string;
  readonly questHooks?: readonly string[];
  readonly faction?: string;
  readonly stats?: Record<string, unknown>;
  readonly dropTable?: readonly unknown[];
  readonly tags?: readonly string[];
  readonly shopId?: string;
};

type NpcSpawn = {
  readonly npcId: string;
  readonly regionId: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function finiteNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function positiveWholeNumber(value: unknown, fallback = 1): number {
  const n = finiteNumber(value, fallback);
  if (n < 1) return 1;
  return n - (n % 1);
}

function stringList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return Object.freeze([]);
  return Object.freeze(value.map((entry) => text(entry)).filter(Boolean));
}

function readJson(relative: string): unknown {
  const filePath = resolveContentFile(relative);
  if (!existsSync(filePath)) throw new Error(`[${TAG}] Missing content file: ${relative}`);
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function readNpcDefinitions(): readonly NpcDefinition[] {
  const raw = readJson("npc/npcs.json");
  if (!Array.isArray(raw)) throw new Error(`[${TAG}] npc/npcs.json must be an array`);
  return Object.freeze(raw.map((entry, index) => {
    if (!isRecord(entry)) throw new Error(`[${TAG}] npc/npcs.json[${index}] must be an object`);
    const id = text(entry.id);
    const name = text(entry.name);
    const role = text(entry.role);
    if (!id || !name || !role) throw new Error(`[${TAG}] npc/npcs.json[${index}] requires id, name, and role`);
    return Object.freeze({
      id,
      name,
      role,
      ...(text(entry.dialogueId) ? { dialogueId: text(entry.dialogueId) } : {}),
      ...(stringList(entry.questHooks).length > 0 ? { questHooks: stringList(entry.questHooks) } : {}),
      ...(text(entry.faction) ? { faction: text(entry.faction) } : {}),
      ...(isRecord(entry.stats) ? { stats: Object.freeze({ ...entry.stats }) } : {}),
      ...(Array.isArray(entry.dropTable) ? { dropTable: Object.freeze([...entry.dropTable]) } : {}),
      ...(stringList(entry.tags).length > 0 ? { tags: stringList(entry.tags) } : {}),
      ...(text(entry.shopId) ? { shopId: text(entry.shopId) } : {}),
    });
  }));
}

function readNpcSpawns(): readonly NpcSpawn[] {
  const raw = readJson("spawns/npc-spawns.json");
  if (!Array.isArray(raw)) throw new Error(`[${TAG}] spawns/npc-spawns.json must be an array`);
  const spawns: NpcSpawn[] = [];
  raw.forEach((region, regionIndex) => {
    if (!isRecord(region)) throw new Error(`[${TAG}] spawns/npc-spawns.json[${regionIndex}] must be an object`);
    const regionId = text(region.regionId) || `region_${regionIndex}`;
    if (!Array.isArray(region.spawns)) return;
    region.spawns.forEach((spawn, spawnIndex) => {
      if (!isRecord(spawn)) throw new Error(`[${TAG}] ${regionId}.spawns[${spawnIndex}] must be an object`);
      const npcId = text(spawn.npcId);
      if (!npcId) throw new Error(`[${TAG}] ${regionId}.spawns[${spawnIndex}] requires npcId`);
      const x = finiteNumber(spawn.x);
      const y = finiteNumber(spawn.y);
      const z = finiteNumber(spawn.z, y);
      spawns.push(Object.freeze({ npcId, regionId, x, y, z }));
    });
  });
  return Object.freeze(spawns);
}

function npcFromGameData(def: NpcDefinition, spawn: NpcSpawn): NPC {
  const health = finiteNumber(def.stats?.health, 90);
  const maxHealth = finiteNumber(def.stats?.maxHealth, health);
  const combatLevel = positiveWholeNumber(def.stats?.combatLevel, 1);
  const npc: NPC = {
    id: def.id,
    name: def.name,
    position: { x: spawn.x, y: 0, z: spawn.z },
    rotation: 0,
    visionRange: 10,
    visionAngle: 90,
    targetId: null,
    isProcessingAI: false,
    role: def.role,
    faction: def.faction ?? "Neutral",
    tags: Object.freeze([def.role.toLowerCase().replace(/\s+/g, "_"), spawn.regionId, ...(def.tags ?? [])]),
    health,
    maxHealth,
    skills: { combat: { level: combatLevel } },
    state: "idle",
    memory: Object.freeze({
      dialogueId: def.dialogueId ?? null,
      questHooks: Object.freeze([...(def.questHooks ?? [])]),
      regionId: spawn.regionId,
      source: "game-data/npc",
      spawn: Object.freeze({ x: spawn.x, y: spawn.y, z: spawn.z }),
    }),
  };
  if (def.dropTable && def.dropTable.length > 0) npc.dropTable = Object.freeze([...def.dropTable]);
  if (def.shopId) npc.shopId = def.shopId;
  return npc;
}

export function loadGameDataNpcsIntoSystem(npcSystem: NPCSystem): NpcGameDataLoadReport {
  const definitions = readNpcDefinitions();
  const spawns = readNpcSpawns();
  const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]));
  const spawnedNpcIds = new Set<string>();
  const missingSpawnDefinitions: string[] = [];
  const duplicateSpawnNpcIds: string[] = [];
  let loaded = 0;

  for (const spawn of spawns) {
    const definition = definitionsById.get(spawn.npcId);
    if (!definition) {
      missingSpawnDefinitions.push(spawn.npcId);
      continue;
    }
    if (spawnedNpcIds.has(spawn.npcId)) {
      duplicateSpawnNpcIds.push(spawn.npcId);
      continue;
    }
    npcSystem.addNPC(npcFromGameData(definition, spawn));
    spawnedNpcIds.add(spawn.npcId);
    loaded += 1;
  }

  return Object.freeze({
    npcDefinitionsRead: definitions.length,
    spawnRowsRead: spawns.length,
    npcsLoaded: loaded,
    missingSpawnDefinitions: Object.freeze(missingSpawnDefinitions),
    duplicateSpawnNpcIds: Object.freeze(duplicateSpawnNpcIds),
  });
}
