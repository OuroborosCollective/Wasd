import fs from "node:fs";
import path from "node:path";
import {
  getContentDataRoot,
  getContentDataSourceLabel,
} from "../../modules/content/contentDataRoot.js";
import { validateContentRoot } from "../../modules/content/validateContentCore.js";
import { sha256Receipt } from "./contracts.js";

export interface AuthoringNpcSummary {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly faction?: string;
}

export interface AuthoringItemSummary {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly rarity?: string;
}

export interface AuthoringQuestSummary {
  readonly id: string;
  readonly title: string;
  readonly giverNpcId: string;
  readonly objectiveType: string;
}

export interface AuthoringLoreSummary {
  readonly id: string;
  readonly titleDe?: string;
  readonly titleEn?: string;
}

export interface AreloriaAuthoringContext {
  readonly sourceMode: "published" | "pack_dir" | "legacy";
  readonly sourceContentHash: string;
  readonly validation: {
    readonly ok: true;
    readonly errorCount: 0;
  };
  readonly npcs: readonly AuthoringNpcSummary[];
  readonly items: readonly AuthoringItemSummary[];
  readonly quests: readonly AuthoringQuestSummary[];
  readonly lore: readonly AuthoringLoreSummary[];
}

function compareId(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function readJson(root: string, relativePath: string): unknown {
  const filePath = path.join(root, relativePath);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readOptionalJson(root: string, relativePath: string): unknown | null {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function toNpcSummaries(value: unknown): AuthoringNpcSummary[] {
  if (!Array.isArray(value)) throw new Error("Authoring context expected npc/npcs.json to be an array.");
  return value
    .map((row: any) => ({
      id: String(row?.id ?? ""),
      name: String(row?.name ?? ""),
      role: String(row?.role ?? ""),
      ...(typeof row?.faction === "string" && row.faction ? { faction: row.faction } : {}),
    }))
    .filter((row) => row.id && row.name)
    .sort(compareId);
}

function toItemSummaries(value: unknown): AuthoringItemSummary[] {
  if (!Array.isArray(value)) throw new Error("Authoring context expected items/items.json to be an array.");
  return value
    .map((row: any) => ({
      id: String(row?.id ?? ""),
      name: String(row?.name ?? ""),
      type: String(row?.type ?? ""),
      ...(typeof row?.rarity === "string" && row.rarity ? { rarity: row.rarity } : {}),
    }))
    .filter((row) => row.id && row.name)
    .sort(compareId);
}

function toQuestSummaries(value: unknown): AuthoringQuestSummary[] {
  if (!Array.isArray(value)) throw new Error("Authoring context expected quests/quests.json to be an array.");
  return value
    .map((row: any) => ({
      id: String(row?.id ?? ""),
      title: String(row?.title ?? ""),
      giverNpcId: String(row?.giverNpcId ?? ""),
      objectiveType: String(row?.objectiveType ?? ""),
    }))
    .filter((row) => row.id && row.title)
    .sort(compareId);
}

function toLoreSummaries(value: unknown): AuthoringLoreSummary[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const fragments = (value as any).fragments;
  if (!Array.isArray(fragments)) return [];
  return fragments
    .map((row: any) => ({
      id: String(row?.id ?? ""),
      ...(typeof row?.title?.de === "string" ? { titleDe: row.title.de } : {}),
      ...(typeof row?.title?.en === "string" ? { titleEn: row.title.en } : {}),
    }))
    .filter((row) => row.id)
    .sort(compareId);
}

/**
 * Loads the actual selected content source used by the server resolver.
 * The model only receives authored content summaries and a deterministic
 * content receipt; absolute filesystem paths and runtime authority are not
 * part of the prompt context.
 */
export function loadAreloriaAuthoringContext(): AreloriaAuthoringContext {
  const root = getContentDataRoot();
  const source = getContentDataSourceLabel();
  const validation = validateContentRoot(root);
  if (!validation.ok) {
    throw new Error(
      `Cannot author against invalid Areloria content (${validation.errors.length} errors): ${validation.errors
        .slice(0, 8)
        .join("; ")}`
    );
  }

  const npcs = toNpcSummaries(readJson(root, "npc/npcs.json"));
  const items = toItemSummaries(readJson(root, "items/items.json"));
  const quests = toQuestSummaries(readJson(root, "quests/quests.json"));
  const lore = toLoreSummaries(readOptionalJson(root, "lore/world-fragments.json"));

  const hashInput = { npcs, items, quests, lore };
  return Object.freeze({
    sourceMode: source.mode,
    sourceContentHash: sha256Receipt(hashInput),
    validation: Object.freeze({ ok: true as const, errorCount: 0 as const }),
    npcs: Object.freeze(npcs),
    items: Object.freeze(items),
    quests: Object.freeze(quests),
    lore: Object.freeze(lore),
  });
}

export function buildAuthoringPromptContext(context: AreloriaAuthoringContext): string {
  return JSON.stringify(
    {
      sourceMode: context.sourceMode,
      sourceContentHash: context.sourceContentHash,
      npcs: context.npcs,
      items: context.items,
      quests: context.quests,
      lore: context.lore,
    },
    null,
    2
  );
}
