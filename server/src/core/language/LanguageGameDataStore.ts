import { existsSync, readFileSync } from "node:fs";
import { resolveContentFile } from "../../modules/content/contentDataRoot.js";
import { loadSeedData, type LexemeBlueprint } from "./LivingDudenArchive.js";

const TAG = "LANGUAGE_GAME_DATA_STORE_V1";
const FILES = Object.freeze([
  "language/living-duden.seed.json",
  "language/living-duden.promoted.json",
]);

export interface LanguageGameDataLoadReport {
  readonly filesRead: number;
  readonly filesMissing: readonly string[];
  readonly lexemesLoaded: number;
  readonly sourceFiles: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function textList(value: unknown, fallback: readonly string[] = []): readonly string[] {
  if (!Array.isArray(value)) return Object.freeze([...fallback]);
  return Object.freeze(value.map((entry) => text(entry)).filter(Boolean));
}

function normalizeBlueprint(raw: unknown, source: string, index: number): LexemeBlueprint {
  if (!isRecord(raw)) throw new Error(`[${TAG}] ${source}.lexemes[${index}] must be an object`);
  const id = text(raw.id);
  const lemma = text(raw.lemma);
  const language = text(raw.language);
  if (!id || !lemma || !language) throw new Error(`[${TAG}] ${source}.lexemes[${index}] requires id, lemma, and language`);
  const grammar = isRecord(raw.grammar) ? raw.grammar : undefined;
  const social = isRecord(raw.social) ? raw.social : undefined;
  return Object.freeze({
    id,
    lemma,
    language,
    invented: Boolean(raw.invented),
    morphemes: textList(raw.morphemes, [lemma.toLowerCase()]),
    concepts: textList(raw.concepts),
    emotion: isRecord(raw.emotion) ? raw.emotion as any : undefined,
    social: social && text(social.register) ? { register: text(social.register) as any, overrides: isRecord(social.overrides) ? social.overrides as any : undefined } : undefined,
    worldBindings: isRecord(raw.worldBindings) ? raw.worldBindings as any : undefined,
    grammar: grammar && text(grammar.partOfSpeech) ? {
      partOfSpeech: text(grammar.partOfSpeech) as any,
      gender: text(grammar.gender) ? text(grammar.gender) as any : undefined,
      plural: text(grammar.plural) || undefined,
      conjugationClass: text(grammar.conjugationClass) || undefined,
      allowedPositions: textList(grammar.allowedPositions) as any,
    } : undefined,
    baseWeight: Number.isFinite(Number(raw.baseWeight)) ? Number(raw.baseWeight) : undefined,
  });
}

function extractBlueprints(data: unknown, source: string): readonly LexemeBlueprint[] {
  const root = Array.isArray(data) ? { lexemes: data } : data;
  if (!isRecord(root) || !Array.isArray(root.lexemes)) throw new Error(`[${TAG}] ${source} must contain a lexemes array`);
  return Object.freeze(root.lexemes.map((entry, index) => normalizeBlueprint(entry, source, index)));
}

export function loadLivingDudenGameData(): LanguageGameDataLoadReport {
  const missing: string[] = [];
  const sources: string[] = [];
  let filesRead = 0;
  let lexemesLoaded = 0;
  for (const relative of FILES) {
    const filePath = resolveContentFile(relative);
    if (!existsSync(filePath)) {
      missing.push(relative);
      continue;
    }
    const lexemes = extractBlueprints(JSON.parse(readFileSync(filePath, "utf-8")), relative);
    filesRead += 1;
    sources.push(relative);
    lexemesLoaded += loadSeedData(lexemes);
  }
  return Object.freeze({ filesRead, filesMissing: Object.freeze(missing), lexemesLoaded, sourceFiles: Object.freeze(sources) });
}
