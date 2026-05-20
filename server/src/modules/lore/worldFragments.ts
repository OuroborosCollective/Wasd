// @ARE-GUARD-EXEMPT: non-sim module
import fs from "node:fs";
import path from "node:path";
import { resolveContentFile } from "../content/contentDataRoot.js";

const REL = "lore/world-fragments.json";

export type WorldFragmentTitle = { de: string; en: string };
export type WorldFragmentRecord = {
  id: string;
  title: WorldFragmentTitle;
  text: WorldFragmentTitle;
  tags?: string[];
  mood?: string;
  sceneId?: string;
};

export type WorldFragmentsFile = {
  version: number;
  fragments: WorldFragmentRecord[];
};

type Cache = { mtimeMs: number; data: WorldFragmentsFile };

let cache: Cache | null = null;

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function isTitle(x: unknown): x is WorldFragmentTitle {
  if (!isRecord(x)) return false;
  return typeof x.de === "string" && typeof x.en === "string";
}

function parseFragments(raw: unknown): WorldFragmentsFile | null {
  if (!isRecord(raw)) return null;
  const version = Number(raw.version);
  if (!Number.isFinite(version) || version < 1) return null;
  const fr = raw.fragments;
  if (!Array.isArray(fr)) return null;
  const out: WorldFragmentRecord[] = [];
  for (const row of fr) {
    if (!isRecord(row)) continue;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    if (!id) continue;
    if (!isTitle(row.title) || !isTitle(row.text)) continue;
    const tags = Array.isArray(row.tags)
      ? row.tags.filter((t): t is string => typeof t === "string" && t.trim().length > 0).map((t) => t.trim())
      : undefined;
    const mood = typeof row.mood === "string" ? row.mood.trim() : undefined;
    const sceneId = typeof row.sceneId === "string" ? row.sceneId.trim() : undefined;
    out.push({ id, title: row.title, text: row.text, tags, mood, sceneId });
  }
  return { version, fragments: out };
}

export function loadWorldFragmentsFile(): WorldFragmentsFile {
  const filePath = resolveContentFile(REL);
  try {
    const st = fs.statSync(filePath);
    if (cache && cache.mtimeMs === st.mtimeMs) {
      return cache.data;
    }
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
    const parsed = parseFragments(raw);
    const data = parsed ?? { version: 1, fragments: [] };
    cache = { mtimeMs: st.mtimeMs, data };
    return data;
  } catch {
    return { version: 1, fragments: [] };
  }
}

export function getWorldFragmentById(id: string): WorldFragmentRecord | undefined {
  const want = id.trim();
  if (!want) return undefined;
  return loadWorldFragmentsFile().fragments.find((f) => f.id === want);
}

export function listWorldFragmentSummaries(): Array<{
  id: string;
  title: WorldFragmentTitle;
  tags?: string[];
  mood?: string;
  sceneId?: string;
}> {
  return loadWorldFragmentsFile().fragments.map(({ id, title, tags, mood, sceneId }) => ({
    id,
    title,
    tags,
    mood,
    sceneId,
  }));
}

export function worldFragmentsJsonPath(): string {
  return resolveContentFile(REL);
}

/** For tests: reset in-memory cache after mutating the file on disk. */
export function clearWorldFragmentsCache(): void {
  cache = null;
}
