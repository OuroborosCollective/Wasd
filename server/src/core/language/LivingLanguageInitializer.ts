import { readFileSync, existsSync } from "node:fs";
import { resolveContentFile } from "../../modules/content/contentDataRoot.js";
import { initializeDialogueBridge, type DialogueEntry } from "./DialogueBridge.js";
import { initializeLinguisticKernel, isLinguisticKernelInitialized } from "./ArelorianLinguisticKernel.js";
import { loadLivingDudenGameData } from "./LanguageGameDataStore.js";

const INITIALIZATION_TAG = "LIVING_LANGUAGE_INITIALIZER_V1";

let initialized = false;

function loadDialoguesJson(): DialogueEntry[] {
  const dialoguesPath = resolveContentFile("dialogue/dialogues.json");

  if (!existsSync(dialoguesPath)) {
    console.warn(`[${INITIALIZATION_TAG}] dialogues.json not found at ${dialoguesPath}, using empty array`);
    return [];
  }

  try {
    const content = readFileSync(dialoguesPath, "utf-8");
    const data = JSON.parse(content);

    if (!Array.isArray(data)) {
      console.warn(`[${INITIALIZATION_TAG}] dialogues.json root is not an array, using empty array`);
      return [];
    }

    return data as DialogueEntry[];
  } catch (error) {
    console.error(`[${INITIALIZATION_TAG}] Failed to load dialogues.json:`, error);
    return [];
  }
}

export async function initializeLivingLanguageSystem(): Promise<void> {
  if (initialized) {
    console.log(`[${INITIALIZATION_TAG}] Already initialized, skipping...`);
    return;
  }

  console.log(`[${INITIALIZATION_TAG}] Initializing Living Language System...`);
  const dialogues = loadDialoguesJson();
  console.log(`[${INITIALIZATION_TAG}] Loaded ${dialogues.length} dialogue entries from dialogues.json`);
  initializeDialogueBridge(dialogues);

  const dudenReport = loadLivingDudenGameData();
  console.log(
    `[${INITIALIZATION_TAG}] Loaded ${dudenReport.lexemesLoaded} Living Duden lexeme(s) from ${dudenReport.filesRead} game-data/language file(s)`
  );

  await initializeLinguisticKernel();
  initialized = true;
  console.log(`[${INITIALIZATION_TAG}] Living Language System initialized successfully`);
}

export function isLivingLanguageSystemInitialized(): boolean {
  return initialized && isLinguisticKernelInitialized();
}
