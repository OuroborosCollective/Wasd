/**
 * NPC Brain Module — Autonomous Learning NPC System
 * 
 * Exports all brain components for easy imports.
 * 
 * Usage:
 *   import { NPCBrainRunner, globalObservationBus } from "./brain/index.js";
 */

export * from "./NPCMemoryV3.js";
export * from "./NPCObservationBus.js";
export * from "./NPCMemoryScoring.js";
export * from "./NPCDecisionEngine.js";
export * from "./NPCBrainScheduler.js";
export * from "./NPCMemoryCompression.js";
export * from "./NPCBrainDebugSnapshot.js";
export * from "./NPCBrainRunner.js";