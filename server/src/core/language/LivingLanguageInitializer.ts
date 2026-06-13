/**
 * @file server/src/core/language/LivingLanguageInitializer.ts
 * @description Living Language System Initialization
 * 
 * Initializes all components of the Living Language System during server startup:
 * - DialogueBridge (loads dialogues.json and integrates with DialogueDirector)
 * - ArelorianLinguisticKernel (NPC speech generation)
 * 
 * HARD CONSTRAINTS:
 * - NO Date.now(), new Date(), Math.random(), crypto.randomUUID()
 * - All decisions derive from stable hashes
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { resolveContentFile } from "../../modules/content/contentDataRoot.js";
import { initializeDialogueBridge, type DialogueEntry } from "./DialogueBridge.js";
import { initializeLinguisticKernel, isLinguisticKernelInitialized } from "./ArelorianLinguisticKernel.js";

const INITIALIZATION_TAG = "LIVING_LANGUAGE_INITIALIZER_V1";

let initialized = false;

/**
 * Load dialogues.json from content root.
 */
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

/**
 * Initialize the Living Language System.
 * Call this during server startup, after content is loaded.
 */
export async function initializeLivingLanguageSystem(): Promise<void> {
  if (initialized) {
    console.log(`[${INITIALIZATION_TAG}] Already initialized, skipping...`);
    return;
  }

  console.log(`[${INITIALIZATION_TAG}] Initializing Living Language System...`);

  // Load dialogues from game-data
  const dialogues = loadDialoguesJson();
  console.log(`[${INITIALIZATION_TAG}] Loaded ${dialogues.length} dialogue entries from dialogues.json`);

  // Initialize DialogueBridge with dialogue data
  initializeDialogueBridge(dialogues);

  // Initialize the Linguistic Kernel
  await initializeLinguisticKernel();

  initialized = true;
  console.log(`[${INITIALIZATION_TAG}] Living Language System initialized successfully`);
}

/**
 * Check if the Living Language System is initialized.
 */
export function isLivingLanguageSystemInitialized(): boolean {
  return initialized && isLinguisticKernelInitialized();
}