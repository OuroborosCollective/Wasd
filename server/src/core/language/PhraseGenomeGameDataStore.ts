import { existsSync, readFileSync } from "node:fs";
import { resolveContentFile } from "../../modules/content/contentDataRoot.js";
import { registerPhraseGenome } from "./PhraseGenomeRegistry.js";
import { validatePhraseGenome } from "./ProceduralGrammarEngine.js";
import { createKappaInt, type PhraseGenome, type PhraseSlot } from "./LanguageTypes.js";

const TAG = "PHRASE_GENOME_GAME_DATA_STORE_V1";
const FILES = Object.freeze([
  "language/phrase-genomes.seed.json",
  "language/phrase-genomes.promoted.json",
]);

export interface PhraseGenomeGameDataLoadReport {
  readonly filesRead: number;
  readonly filesMissing: readonly string[];
  readonly phraseGenomesLoaded: number;
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

function nonNegativeInteger(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : fallback;
}

function kappaValue(value: unknown, fallback: number) {
  const n = Number(value);
  return createKappaInt(Number.isFinite(n) ? n : fallback);
}

function normalizeSlot(raw: unknown, source: string, genomeIndex: number, slotIndex: number): PhraseSlot {
  if (!isRecord(raw)) {
    throw new Error(`[${TAG}] ${source}.phraseGenomes[${genomeIndex}].slots[${slotIndex}] must be an object`);
  }

  const role = text(raw.role);
  if (!role) {
    throw new Error(`[${TAG}] ${source}.phraseGenomes[${genomeIndex}].slots[${slotIndex}] requires role`);
  }

  const lexemeIds = textList(raw.lexemeIds);
  const semanticRequirements = textList(raw.semanticRequirements);

  if (lexemeIds.length === 0 && semanticRequirements.length === 0) {
    throw new Error(`[${TAG}] ${source}.phraseGenomes[${genomeIndex}].slots[${slotIndex}] requires lexemeIds or semanticRequirements`);
  }

  return Object.freeze({
    role: role as PhraseSlot["role"],
    required: raw.required !== false,
    ...(lexemeIds.length > 0 ? { lexemeIds } : {}),
    ...(semanticRequirements.length > 0 ? { semanticRequirements } : {}),
  });
}

function normalizeGenome(raw: unknown, source: string, index: number): PhraseGenome {
  if (!isRecord(raw)) {
    throw new Error(`[${TAG}] ${source}.phraseGenomes[${index}] must be an object`);
  }

  const id = text(raw.id);
  const intent = text(raw.intent);
  if (!id || !intent) {
    throw new Error(`[${TAG}] ${source}.phraseGenomes[${index}] requires id and intent`);
  }

  const slots = Array.isArray(raw.slots)
    ? raw.slots.map((slot, slotIndex) => normalizeSlot(slot, source, index, slotIndex))
    : [];
  if (slots.length === 0) {
    throw new Error(`[${TAG}] ${source}.phraseGenomes[${index}] requires at least one slot`);
  }

  const outcomeStats: Record<string, unknown> = isRecord(raw.outcomeStats) ? raw.outcomeStats : {};
  const mutation: Record<string, unknown> = isRecord(raw.mutation) ? raw.mutation : {};
  const structure = textList(raw.structure, slots.map((slot) => slot.role));

  const genome: PhraseGenome = Object.freeze({
    id,
    intent: intent as PhraseGenome["intent"],
    languageMode: (text(raw.languageMode) || "arel") as PhraseGenome["languageMode"],
    structure: structure as PhraseGenome["structure"],
    slots: Object.freeze(slots),
    constraints: Object.freeze({}),
    outcomeStats: Object.freeze({
      uses: nonNegativeInteger(outcomeStats.uses, 0),
      successfulUses: nonNegativeInteger(outcomeStats.successfulUses, 0),
      failedUses: nonNegativeInteger(outcomeStats.failedUses, 0),
      averageKappaScore: kappaValue(outcomeStats.averageKappaScore, 1),
    }),
    mutation: Object.freeze({
      parentGenomeIds: textList(mutation.parentGenomeIds),
      generation: nonNegativeInteger(mutation.generation, 0),
      stability: kappaValue(mutation.stability, 1),
      novelty: kappaValue(mutation.novelty, 0),
    }),
    truthMode: (text(raw.truthMode) || "known_fact") as PhraseGenome["truthMode"],
  });

  const validation = validatePhraseGenome(genome);
  if (!validation.valid) {
    throw new Error(`[${TAG}] ${source}.phraseGenomes[${index}] invalid: ${validation.errors.join(", ")}`);
  }

  return genome;
}

function extractPhraseGenomes(data: unknown, source: string): readonly PhraseGenome[] {
  const root = Array.isArray(data) ? { phraseGenomes: data } : data;
  if (!isRecord(root) || !Array.isArray(root.phraseGenomes)) {
    throw new Error(`[${TAG}] ${source} must contain a phraseGenomes array`);
  }
  return Object.freeze(root.phraseGenomes.map((entry, index) => normalizeGenome(entry, source, index)));
}

export function loadPhraseGenomeGameData(): PhraseGenomeGameDataLoadReport {
  const missing: string[] = [];
  const sources: string[] = [];
  let filesRead = 0;
  let phraseGenomesLoaded = 0;

  for (const relative of FILES) {
    const filePath = resolveContentFile(relative);
    if (!existsSync(filePath)) {
      missing.push(relative);
      continue;
    }

    const phraseGenomes = extractPhraseGenomes(JSON.parse(readFileSync(filePath, "utf-8")), relative);
    filesRead += 1;
    sources.push(relative);
    for (const genome of phraseGenomes) {
      registerPhraseGenome(genome);
      phraseGenomesLoaded += 1;
    }
  }

  return Object.freeze({
    filesRead,
    filesMissing: Object.freeze(missing),
    phraseGenomesLoaded,
    sourceFiles: Object.freeze(sources),
  });
}
