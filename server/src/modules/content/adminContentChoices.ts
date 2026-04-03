import fs from "node:fs";
import path from "node:path";
import { getContentDataRoot, resolveContentFile } from "./contentDataRoot.js";

export type NpcChoice = { id: string; name: string; role?: string };
export type WorldObjectChoice = { id: string; name?: string; type?: string };
export type PoolKeyChoice = { category: string; key: string; label: string };
export type QuestChoice = { id: string; title?: string };
export type DialogueChoice = { id: string };

function safeReadJsonArray(fileRel: string): any[] {
  const p = resolveContentFile(fileRel);
  if (!fs.existsSync(p)) return [];
  try {
    const j = JSON.parse(fs.readFileSync(p, "utf-8"));
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

export function loadNpcChoicesForAdmin(): NpcChoice[] {
  const arr = safeReadJsonArray("npc/npcs.json");
  return arr
    .filter((n: any) => n && typeof n.id === "string")
    .map((n: any) => ({
      id: n.id,
      name: typeof n.name === "string" ? n.name : n.id,
      role: typeof n.role === "string" ? n.role : undefined,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function loadWorldObjectChoicesForAdmin(): WorldObjectChoice[] {
  const arr = safeReadJsonArray("world/objects.json");
  return arr
    .filter((o: any) => o && typeof o.id === "string")
    .map((o: any) => ({
      id: o.id,
      name: typeof o.name === "string" ? o.name : undefined,
      type: typeof o.type === "string" ? o.type : undefined,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function loadMonsterGroupKeysForAdmin(): string[] {
  const p = resolveContentFile("world/asset-pools.json");
  if (!fs.existsSync(p)) return [];
  try {
    const doc = JSON.parse(fs.readFileSync(p, "utf-8")) as { pools?: Record<string, Record<string, unknown>> };
    const monsters = doc.pools?.monsters;
    if (!monsters || typeof monsters !== "object") return [];
    return Object.keys(monsters)
      .filter((k) => k !== "default")
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

export function loadNpcRoleChoicesForAdmin(): string[] {
  const npcs = safeReadJsonArray("npc/npcs.json");
  const roles = new Set<string>();
  for (const n of npcs) {
    if (n && typeof n.role === "string" && n.role.trim()) {
      roles.add(n.role.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""));
    }
  }
  return [...roles].sort((a, b) => a.localeCompare(b));
}

export function loadObjectTypeChoicesForAdmin(): string[] {
  const objs = safeReadJsonArray("world/objects.json");
  const types = new Set<string>();
  for (const o of objs) {
    if (o && typeof o.type === "string" && o.type.trim()) {
      types.add(o.type.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""));
    }
  }
  return [...types].sort((a, b) => a.localeCompare(b));
}

export function loadQuestChoicesForAdmin(): QuestChoice[] {
  const arr = safeReadJsonArray("quests/quests.json");
  return arr
    .filter((q: any) => q && typeof q.id === "string")
    .map((q: any) => ({
      id: q.id,
      title: typeof q.title === "string" ? q.title : undefined,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function loadDialogueChoicesForAdmin(): DialogueChoice[] {
  const arr = safeReadJsonArray("dialogue/dialogues.json");
  return arr
    .filter((d: any) => d && typeof d.id === "string")
    .map((d: any) => ({ id: d.id }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

const MAX_PREVIEW_CHARS = 48_000;

function trimPreviewJson(s: string): string {
  if (s.length <= MAX_PREVIEW_CHARS) return s;
  return s.slice(0, MAX_PREVIEW_CHARS) + "\n\n… (gekürzt, max. " + MAX_PREVIEW_CHARS + " Zeichen)";
}

export function loadQuestJsonPreviewById(
  questId: string
): { ok: true; json: string } | { ok: false; errorDe: string } {
  const id = questId.trim();
  if (!id) return { ok: false, errorDe: "Keine Quest-ID." };
  const arr = safeReadJsonArray("quests/quests.json");
  const row = arr.find((q: any) => q && typeof q.id === "string" && q.id === id);
  if (!row) return { ok: false, errorDe: "Quest nicht gefunden: " + id };
  try {
    return { ok: true, json: trimPreviewJson(JSON.stringify(row, null, 2)) };
  } catch {
    return { ok: false, errorDe: "Quest konnte nicht als JSON dargestellt werden." };
  }
}

export function loadDialogueJsonPreviewById(
  dialogueId: string
): { ok: true; json: string } | { ok: false; errorDe: string } {
  const id = dialogueId.trim();
  if (!id) return { ok: false, errorDe: "Keine Dialog-ID." };
  const arr = safeReadJsonArray("dialogue/dialogues.json");
  const row = arr.find((d: any) => d && typeof d.id === "string" && d.id === id);
  if (!row) return { ok: false, errorDe: "Dialog nicht gefunden: " + id };
  try {
    return { ok: true, json: trimPreviewJson(JSON.stringify(row, null, 2)) };
  } catch {
    return { ok: false, errorDe: "Dialog konnte nicht als JSON dargestellt werden." };
  }
}

/** Human-readable content root label for admin UI */
export function getAdminContentRootHint(): string {
  return getContentDataRoot();
}
