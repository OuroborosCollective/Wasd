import fs from "node:fs";
import { resolveContentFile } from "../modules/content/contentDataRoot.js";
import { isInventoryItemId, type InventoryItemId } from "../inventory/InventoryTypes.js";
import { DEFAULT_SKILLS, type SkillId } from "../skills/SkillTypes.js";
import type {
  RegionalBuildingDefinition,
  RegionalNeedSnapshot,
  RegionalWorkOrderDefinition,
  RegionalWorkOrderGameData,
  RegionalWorkOrderRegion,
} from "./WorkOrderTypes.js";

function fail(file: string, message: string): never {
  throw new Error(`[WorkOrderGameData] ${file}: ${message}`);
}

function readJsonFile(file: string): unknown {
  if (!fs.existsSync(file)) fail(file, "missing required game-data file");
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (error) {
    const suffix = error instanceof Error ? ` (${error.message})` : "";
    fail(file, `invalid JSON${suffix}`);
  }
}

function asRecord(value: unknown, file: string, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(file, `${label} must be an object`);
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string, file: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) fail(file, `${key} must be a non-empty string`);
  return value.trim();
}

function readInteger(record: Record<string, unknown>, key: string, file: string, min: number): number {
  const value = Number(record[key]);
  if (!Number.isSafeInteger(value) || value < min) fail(file, `${key} must be an integer >= ${min}`);
  return value;
}

function normalizeItemId(value: unknown, file: string, label: string): InventoryItemId {
  if (!isInventoryItemId(value)) fail(file, `${label} has invalid itemId ${String(value)}`);
  return value;
}

function normalizeSkillId(value: unknown, file: string, label: string): SkillId {
  if (typeof value !== "string" || !DEFAULT_SKILLS.includes(value as SkillId)) {
    fail(file, `${label} has invalid rewardSkillId ${String(value)}`);
  }
  return value as SkillId;
}

function normalizeUnlocks(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return Object.freeze([]);
  return Object.freeze(value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim()).sort());
}

function normalizeBuilding(raw: unknown, file: string, index: number): RegionalBuildingDefinition {
  const record = asRecord(raw, file, `buildings[${index}]`);
  return Object.freeze({
    buildingId: readString(record, "buildingId", file),
    type: readString(record, "type", file),
    needMultiplierPermille: readInteger(record, "needMultiplierPermille", file, 0),
  });
}

function normalizeWorkOrder(raw: unknown, file: string, regionId: string, index: number): RegionalWorkOrderDefinition {
  const record = asRecord(raw, file, `workOrders[${index}]`);
  return Object.freeze({
    id: readString(record, "id", file),
    title: readString(record, "title", file),
    regionId,
    npcId: readString(record, "npcId", file),
    itemId: normalizeItemId(record.itemId, file, `workOrders[${index}]`),
    requiredCount: readInteger(record, "requiredCount", file, 1),
    rewardGold: readInteger(record, "rewardGold", file, 0),
    rewardXp: readInteger(record, "rewardXp", file, 0),
    rewardSkillId: normalizeSkillId(record.rewardSkillId, file, `workOrders[${index}]`),
    unlocks: normalizeUnlocks(record.unlocks),
  });
}

function computeNeeds(input: {
  readonly regionId: string;
  readonly population: number;
  readonly buildings: readonly RegionalBuildingDefinition[];
  readonly workOrders: readonly RegionalWorkOrderDefinition[];
}): readonly RegionalNeedSnapshot[] {
  const buildingPressurePermille = input.buildings.reduce((sum, building) => sum + building.needMultiplierPermille, 0);
  const byItem = new Map<InventoryItemId, number>();

  for (const order of input.workOrders) {
    const populationPressure = input.population * 10;
    const demand = order.requiredCount * 1000 + populationPressure + buildingPressurePermille;
    byItem.set(order.itemId, (byItem.get(order.itemId) ?? 0) + demand);
  }

  return Object.freeze([...byItem.entries()].map(([itemId, needKappa]) => Object.freeze({
    regionId: input.regionId,
    itemId,
    needKappa,
    population: input.population,
    buildingPressurePermille,
  })).sort((a, b) => a.itemId.localeCompare(b.itemId)));
}

function normalizeRegion(raw: unknown, file: string, index: number): RegionalWorkOrderRegion {
  const record = asRecord(raw, file, `regions[${index}]`);
  const regionId = readString(record, "regionId", file);
  const buildingsRaw = record.buildings;
  const workOrdersRaw = record.workOrders;

  if (!Array.isArray(buildingsRaw) || buildingsRaw.length === 0) fail(file, `${regionId}.buildings must be a non-empty array`);
  if (!Array.isArray(workOrdersRaw) || workOrdersRaw.length === 0) fail(file, `${regionId}.workOrders must be a non-empty array`);

  const buildings = Object.freeze(buildingsRaw.map((entry, buildingIndex) => normalizeBuilding(entry, file, buildingIndex)).sort((a, b) => a.buildingId.localeCompare(b.buildingId)));
  const workOrders = Object.freeze(workOrdersRaw.map((entry, orderIndex) => normalizeWorkOrder(entry, file, regionId, orderIndex)).sort((a, b) => a.id.localeCompare(b.id)));
  const population = readInteger(record, "population", file, 1);

  return Object.freeze({
    regionId,
    title: readString(record, "title", file),
    population,
    buildings,
    workOrders,
    needs: computeNeeds({ regionId, population, buildings, workOrders }),
  });
}

export function loadRegionalWorkOrdersFromGameData(): RegionalWorkOrderGameData {
  const file = resolveContentFile("economy/work-orders.json");
  const root = asRecord(readJsonFile(file), file, "work order root");
  const schemaVersion = readInteger(root, "schemaVersion", file, 1);
  if (schemaVersion !== 1) fail(file, "schemaVersion must be 1");

  const regionsRaw = root.regions;
  if (!Array.isArray(regionsRaw) || regionsRaw.length === 0) fail(file, "regions must be a non-empty array");

  const regionIds = new Set<string>();
  const orderIds = new Set<string>();
  const regions = regionsRaw.map((entry, index) => {
    const region = normalizeRegion(entry, file, index);
    if (regionIds.has(region.regionId)) fail(file, `duplicate regionId ${region.regionId}`);
    regionIds.add(region.regionId);
    for (const order of region.workOrders) {
      if (orderIds.has(order.id)) fail(file, `duplicate workOrder id ${order.id}`);
      orderIds.add(order.id);
    }
    return region;
  }).sort((a, b) => a.regionId.localeCompare(b.regionId));

  const workOrders = regions.flatMap((region) => [...region.workOrders]).sort((a, b) => a.id.localeCompare(b.id));

  return Object.freeze({
    schemaVersion: 1,
    regions: Object.freeze(regions),
    workOrders: Object.freeze(workOrders),
  });
}
