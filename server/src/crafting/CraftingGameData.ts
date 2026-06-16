import fs from "node:fs";
import { resolveContentFile } from "../modules/content/contentDataRoot.js";
import { isInventoryItemId, type InventoryItemId } from "../inventory/InventoryTypes.js";
import type { CraftingRecipe, RecipeId, RecipeIngredient, RecipeOutput } from "./CraftingTypes.js";
import type { ProcessingStationType } from "./ProcessingStations.js";

const STATION_TYPES: readonly ProcessingStationType[] = ["campfire", "furnace", "workbench"];

function fail(file: string, message: string): never {
  throw new Error(`[CraftingGameData] ${file}: ${message}`);
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

function normalizeStationType(value: unknown, file: string): ProcessingStationType | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !STATION_TYPES.includes(value as ProcessingStationType)) {
    fail(file, `stationType must be one of ${STATION_TYPES.join(", ")}`);
  }
  return value as ProcessingStationType;
}

function normalizeIngredient(raw: unknown, file: string, label: string): RecipeIngredient {
  const record = asRecord(raw, file, label);
  return Object.freeze({
    itemId: normalizeItemId(record.itemId, file, label),
    quantity: readInteger(record, "quantity", file, 1),
  });
}

function normalizeOutput(raw: unknown, file: string, label: string): RecipeOutput {
  const record = asRecord(raw, file, label);
  return Object.freeze({
    itemId: normalizeItemId(record.itemId, file, label),
    quantity: readInteger(record, "quantity", file, 1),
  });
}

function normalizeRecipe(raw: unknown, file: string, index: number): CraftingRecipe {
  const record = asRecord(raw, file, `recipes[${index}]`);
  const ingredients = record.ingredients;
  const outputs = record.outputs;

  if (!Array.isArray(ingredients) || ingredients.length === 0) fail(file, `recipes[${index}].ingredients must be a non-empty array`);
  if (!Array.isArray(outputs) || outputs.length === 0) fail(file, `recipes[${index}].outputs must be a non-empty array`);

  return Object.freeze({
    id: readString(record, "id", file) as RecipeId,
    title: readString(record, "title", file),
    requiredLevel: readInteger(record, "requiredLevel", file, 1),
    craftingXpReward: readInteger(record, "craftingXpReward", file, 0),
    craftTicks: readInteger(record, "craftTicks", file, 1),
    stationType: normalizeStationType(record.stationType, file),
    ingredients: Object.freeze(ingredients.map((entry, ingredientIndex) => normalizeIngredient(entry, file, `recipes[${index}].ingredients[${ingredientIndex}]`)).sort((a, b) => a.itemId.localeCompare(b.itemId))),
    outputs: Object.freeze(outputs.map((entry, outputIndex) => normalizeOutput(entry, file, `recipes[${index}].outputs[${outputIndex}]`)).sort((a, b) => a.itemId.localeCompare(b.itemId))),
  });
}

export function loadCraftingRecipesFromGameData(): readonly CraftingRecipe[] {
  const file = resolveContentFile("recipes/recipes.json");
  const root = asRecord(readJsonFile(file), file, "recipe root");
  if (readInteger(root, "schemaVersion", file, 1) !== 1) fail(file, "schemaVersion must be 1");

  const recipesRaw = root.recipes;
  if (!Array.isArray(recipesRaw) || recipesRaw.length === 0) fail(file, "recipes must be a non-empty array");

  const seen = new Set<string>();
  const recipes = recipesRaw.map((entry, index) => {
    const recipe = normalizeRecipe(entry, file, index);
    if (seen.has(recipe.id)) fail(file, `duplicate recipe id ${recipe.id}`);
    seen.add(recipe.id);
    return recipe;
  });

  return Object.freeze(recipes.sort((a, b) => a.id.localeCompare(b.id)));
}
