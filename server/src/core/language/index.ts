/**
 * @file server/src/core/language/index.ts
 * @description Living Language System - Public API
 *
 * Arelorian Living Language System for NPC speech generation.
 * NPCs process MEANING, not raw text.
 */

// Core types
export * from './LanguageTypes.js';

// Living Duden Archive - Word database
export {
  registerCanonicalLexeme,
  getLexeme,
  getAllLexemes,
  getLexemesByLanguage,
  getLexemesByConcept,
  getLexemesByPos,
  getLexemesByFaction,
  getInventedLexemes,
  getLexemeCount,
  findLexemeForSlot,
  createMutatedLexeme,
  promoteLexeme,
  isQuarantined,
  wasPromoted,
  recordLexemeUsage,
  loadSeedData,
  clearArchive,
  exportArchiveState,
  type LexemeBlueprint,
  type MutationResult,
} from './LivingDudenArchive.js';

// Procedural Grammar Engine
export {
  buildSentence,
  validatePhraseGenome,
  getPhraseGenomeOrFallback,
  createSentenceSeed,
  type SlotFiller,
  type ConstructionResult,
} from './ProceduralGrammarEngine.js';

// Language Outcome Learner
export {
  recordOutcome,
  getRecentOutcomesForNpc,
  getOutcomesForGenome,
  getSuccessfulOutcomesForConcept,
  getLexemeSuccessRate,
  getGenomeAverageScore,
  getInsightsForConcepts,
  clearOutcomeHistory,
  getOutcomeHistorySize,
} from './LanguageOutcomeLearner.js';

// Dialogue Decision Kernel
export {
  decideUtterance,
  registerPhraseGenome,
  getRegisteredGenome,
  getKernelState,
  clearKernelState,
  clearAllKernelState,
  type DecisionContext,
} from './DialogueDecisionKernel.js';

// Dialect Stores
export {
  // Faction dialects
  registerFactionDialect,
  getFactionDialect,
  getAllFactionDialects,
  getDialectVariant,
  getFactionPreferredRegister,
  getFactionBaseLanguage,
  isTabooWord,
  getFactionRitualPhrase,
  seedDefaultDialects,
  // NPC idiolects
  registerNpcIdiolect,
  getNpcIdiolect,
  createDefaultIdiolect,
  learnLexeme,
  avoidLexeme,
  addWordAssociation,
  getPersonalWord,
  shouldUseLearnedLexeme,
  getSpeechPatternForTrust,
  clearAllIdiolects,
  getIdiolectCount,
  // Combined lookup
  getEffectiveLanguage,
  getEffectiveRegister,
  getGreetingPhrase,
  getFarewellPhrase,
} from './DialectStores.js';

// Morpheme Mutation Engine
export {
  MutationType,
  attemptMutation,
  getMutationStats,
  type MutationContext,
} from './MorphemeMutationEngine.js';

// Safety quarantine
export {
  processUserUtterance,
  getQuarantineLog,
  getQuarantineStats,
  clearQuarantineLog,
  type PlayerUtteranceMeaning,
} from './DialogueSafetyQuarantine.js';

// Rumor bridge
export {
  bridgePlayerSpeech,
  getRumor,
  getRumorsForNpc,
  spreadRumor,
  verifyRumor,
  believeRumor,
  getRumorStats,
  getPlayerLieRecord,
  clearLieRecords,
  clearAllRumors,
  type BridgeResult,
} from './RumorSpeechBridge.js';

// Arelorian Linguistic Kernel
export {
  buildNpcLanguageState,
  processLinguisticUpdate,
  processPlayerSpeech,
  recordSpeechOutcome,
  initializeLinguisticKernel,
  isLinguisticKernelInitialized,
  getLinguisticStats,
  resetLinguisticKernel,
  shutdownLinguisticKernel,
} from './ArelorianLinguisticKernel.js';

// Arelorian Conlang Engine
export {
  generateArelorianWord,
  generateMixedSpeech,
  recordTermUsage,
  getTermsForCanonicalization,
  canonicalizeTerm,
  generateArelorianPhrase,
  getConlangStats,
  clearPropagationTracking,
  type GeneratedWord,
  type MixedSpeechResult,
  type GeneratedPhrase,
} from './ArelorianConlangEngine.js';

// Dialogue Bridge (integrates with game-data/dialogue/dialogues.json)
export {
  initializeDialogueBridge,
  isDialogueBridgeInitialized,
  getDialogueEntry,
  getGreeting,
  getQuestLine,
  getQuestIds,
  hasDialogueNodes,
  getFallbackText,
  resolveDialogue,
  clearDialogueBridge,
  type DialogueEntry,
  type DialogueNode,
  type DialogueChoice,
  type EntryNode,
} from './DialogueBridge.js';