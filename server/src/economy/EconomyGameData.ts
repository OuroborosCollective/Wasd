import fs from "node:fs";
import { resolveContentFile } from "../modules/content/contentDataRoot.js";
import type { InventoryItemId } from "../inventory/InventoryTypes.js";
import { isInventoryItemId } from "../inventory/InventoryTypes.js";
import type { LocalMarketDefinition, LocalMarketDemandRule, LocalMarketRoute } from "./LocalMarketTypes.js";

export interface EconomyBasePriceEntry {
  readonly itemId: InventoryItemId;
  readonly basePrice: number;
  readonly sellable: boolean;
}

export type EconomyBasePriceTable = Readonly<Record<string, EconomyBasePriceEntry>>;

function fail(file: string, message: string): never {
  throw new Error(`[EconomyGameData] ${file}: ${message}`);
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

function readBoolean(record: Record<string, unknown>, key: string, file: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") fail(file, `${key} must be boolean`);
  return value;
}

function normalizeItemId(raw: unknown, file: string): InventoryItemId {
  if (!isInventoryItemId(raw)) fail(file, `invalid inventory item id ${String(raw)}`);
  return raw;
}

function normalizeDemand(raw: unknown, file: string, index: number): LocalMarketDemandRule {
  const record = asRecord(raw, file, `demand[${index}]`);
  return Object.freeze({
    itemId: normalizeItemId(record.itemId, file),
    demandPressurePerMille: readInteger(record, "demandPressurePerMille", file, 0),
  });
}

function normalizeRoute(raw: unknown, file: string, index: number): LocalMarketRoute {
  const record = asRecord(raw, file, `routes[${index}]`);
  return Object.freeze({
    routeId: readString(record, "routeId", file),
    toMarketId: readString(record, "toMarketId", file),
    distanceKappa: readInteger(record, "distanceKappa", file, 0),
    routeRiskPerMille: readInteger(record, "routeRiskPerMille", file, 0),
    taxPressurePerMille: readInteger(record, "taxPressurePerMille", file, 0),
  });
}

export function loadEconomyBasePricesFromGameData(): EconomyBasePriceTable {
  const file = resolveContentFile("economy/base-prices.json");
  const root = asRecord(readJsonFile(file), file, "base price root");
  if (readInteger(root, "schemaVersion", file, 1) !== 1) fail(file, "schemaVersion must be 1");

  const items = root.items;
  if (!Array.isArray(items) || items.length === 0) fail(file, "items must be a non-empty array");

  const table: Record<string, EconomyBasePriceEntry> = {};
  for (let index = 0; index < items.length; index += 1) {
    const record = asRecord(items[index], file, `items[${index}]`);
    const itemId = normalizeItemId(record.itemId, file);
    if (table[itemId]) fail(file, `duplicate itemId ${itemId}`);
    table[itemId] = Object.freeze({
      itemId,
      basePrice: readInteger(record, "basePrice", file, 1),
      sellable: readBoolean(record, "sellable", file),
    });
  }

  return Object.freeze(Object.fromEntries(Object.entries(table).sort(([a], [b]) => a.localeCompare(b))));
}

export function loadLocalMarketsFromGameData(): readonly LocalMarketDefinition[] {
  const file = resolveContentFile("economy/markets.json");
  const root = asRecord(readJsonFile(file), file, "market root");
  if (readInteger(root, "schemaVersion", file, 1) !== 1) fail(file, "schemaVersion must be 1");

  const marketsRaw = root.markets;
  if (!Array.isArray(marketsRaw) || marketsRaw.length === 0) fail(file, "markets must be a non-empty array");

  const seen = new Set<string>();
  const markets = marketsRaw.map((entry, index) => {
    const record = asRecord(entry, file, `markets[${index}]`);
    const marketId = readString(record, "marketId", file);
    if (seen.has(marketId)) fail(file, `duplicate marketId ${marketId}`);
    seen.add(marketId);

    const position = asRecord(record.position, file, `markets[${index}].position`);
    const demandRaw = record.demand;
    const routesRaw = record.routes ?? [];
    if (!Array.isArray(demandRaw)) fail(file, `${marketId}.demand must be an array`);
    if (!Array.isArray(routesRaw)) fail(file, `${marketId}.routes must be an array`);

    return Object.freeze({
      marketId,
      title: readString(record, "title", file),
      regionId: readString(record, "regionId", file),
      vendorId: readString(record, "vendorId", file),
      chunkKey: readString(record, "chunkKey", file),
      position: Object.freeze({
        x: readInteger(position, "x", file, -9_000_000_000),
        y: readInteger(position, "y", file, -9_000_000_000),
      }),
      demand: Object.freeze(demandRaw.map((raw, demandIndex) => normalizeDemand(raw, file, demandIndex)).sort((a, b) => a.itemId.localeCompare(b.itemId))),
      routes: Object.freeze(routesRaw.map((raw, routeIndex) => normalizeRoute(raw, file, routeIndex)).sort((a, b) => a.routeId.localeCompare(b.routeId))),
    });
  });

  return Object.freeze(markets.sort((a, b) => a.marketId.localeCompare(b.marketId)));
}
