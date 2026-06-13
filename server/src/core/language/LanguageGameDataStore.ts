import { existsSync, readFileSync } from "node:fs";
import { resolveContentFile } from "../../modules/content/contentDataRoot.js";
import { loadSeedData, type LexemeBlueprint } from "./LivingDudenArchive.js";

type BlueprintSocial = NonNullable<LexemeBlueprint["social"]>;
type BlueprintGrammar = NonNullable<LexemeBlueprint["grammar"]>;

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

function numericRecord(value: unknown): Record<string, number> | undefined {
  if (!isRecord(value)) return undefined;
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    const n = Number(raw);
    if (Number.isFinite(n)) out[key] = n;
  }
  return Object.keys(out).length > 0 ? Object.freeze(out) : undefined;
}

function stringArrayRecord(value: unknown): Record<string, readonly string[]> | undefined {
  if (!isRecord(value)) return undefined;
  const out: Record<string, readonly string[]> = {};
  for (const [key, raw] of Object.entries(value)) {
    const list = textList(raw);
    if (list.length > 0) out[key] = list;
  }
  return Object.keys(out).length > 0 ? Object.freeze(out) : undefined;
}

function normalizeBlueprint(raw: unknown, source: string, index: number): LexemeBlueprint {
  if (!isRecord(raw)) throw new Error(`[${TAG}] ${source}.lexemes[${index}] must be an object`);
  const id = text(raw.id);
  const lemma = text(raw.lemma);
  const language = text(raw.language);
  if (!id || !lemma || !language) throw new Error(`[${TAG}] ${source}.lexemes[${index}] requires id, lemma, and language`);

  const grammarInput = isRecord(raw.grammar) ? raw.grammar : undefined;
  const socialInput = isRecord(raw.social) ? raw.social : undefined;
  const emotion = numericRecord(raw.emotion) as LexemeBlueprint["emotion"] | undefined;
  const worldBindings = stringArrayRecord(raw.worldBindings) as LexemeBlueprint["worldBindings"] | undefined;
  const social = socialInput && text(socialInput.register) ? {
    register: text(socialInput.register) as BlueprintSocial["register"],
    ...(numericRecord(socialInput.overrides) ? { overrides: numericRecord(socialInput.overrides) as BlueprintSocial["overrides"] } : {}),
  } : undefined;
  const grammar = grammarInput && text(grammarInput.partOfSpeech) ? {
    partOfSpeech: text(grammarInput.partOfSpeech) as BlueprintGrammar["partOfSpeech"],
    ...(text(grammarInput.gender) ? { gender: text(grammarInput.gender) as BlueprintGrammar["gender"] } : {}),
    ...(text(grammarInput.plural) ? { plural: text(grammarInput.plural) } : {}),
    ...(text(grammarInput.conjugationClass) ? { conjugationClass: text(grammarInput.conjugationClass) } : {}),
    allowedPositions: textList(grammarInput.allowedPositions) as BlueprintGrammar["allowedPositions"],
  } : undefined;
  const baseWeight = Number(raw.baseWeight);

  return Object.freeze({
    id,
    lemma,
    language,
    invented: Boolean(raw.invented),
    morphemes: textList(raw.morphemes, [lemma.toLowerCase()]),
    concepts: textList(raw.concepts),
    ...(emotion ? { emotion } : {}),
    ...(social ? { social } : {}),
    ...(worldBindings ? { worldBindings } : {}),
    ...(grammar ? { grammar } : {}),
    ...(Number.isFinite(baseWeight) ? { baseWeight } : {}),
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
