/**
 * Oracle Package - Public API
 *
 * Das Oracle-Paket implementiert das "autonome soziale Nervensystem" für Areloria.
 *
 * Architektur:
 *
 *   OracleEndpoint ──deterministische Pulse──→ OracleSocialDirector ──Intents──→ WorldThinShell
 *   OracleVisionEngine ───prophetische Visionen──→ WorldThinShell
 *   OracleOuroborosConnector ←→ OuroborosEngine (NPC-Zivilisation)
 *   LivingWorldErdosOuroborosSystem ←──REKURSIVER KREISLAUF──→ 13-Layer-System
 *                                                                                   ↓
 *   Game Systems (Chat, NPCBrain, Quest, Faction, Economy, UI) ←──validiert/gefiltert──┘
 *
 * WICHTIGE REGELN:
 * - Oracle = Bewusstsein / Wahrnehmung / Vorschlag
 * - WorldCore = Wahrheit / Mutation / Simulation
 * - Oracle mutiert NIEMALS direkt die Welt
 * - VisionEngine = Geschichte → Prophetische Muster → Zukünftige Möglichkeiten
 * - OuroborosConnector = Verbindung zur autonomen NPC-Intelligenz
 * - LivingWorld = Unendlicher Kreislauf: Leben → Tod → Zerfall → Wiedergeburt
 */

// OracleEndpoint - Deterministischer Oracle-Endpunkt
export {
  OracleEndpoint,
  type OracleChannel,
  type OracleIntentType,
  type OracleEntitySnapshot,
  type OracleWorldSnapshot,
  type OracleSyncState,
  type OracleCommunicationIntent,
  type OraclePulse,
} from "./OracleEndpoint.js";

// OracleSocialDirector - Routing und Koordination
export {
  OracleSocialDirector,
  type IntentRouter,
  type OracleDirectorStats,
} from "./OracleSocialDirector.js";

// OracleVisionEngine - Prophetische Analyse von Geschichte und Warfront
export {
  OracleVisionEngine,
  type FallenEntity,
  type GhostTown,
  type BloodOffering,
  type WarfrontMemory,
  type OracleVision,
  type DungeonEmergenceProphecy,
} from "./OracleVisionEngine.js";

// OracleOuroborosConnector - Bidirektionale Verbindung zu Ouroboros NPC-System
export {
  OracleOuroborosConnector,
  createOracleObserver,
  type OuroborosObservation,
  type NPCVision,
} from "./OracleOuroborosConnector.js";

// LivingWorldErdosOuroborosSystem - Der unendliche rekursive Welten-Kreislauf
export {
  LivingWorldErdosOuroborosSystem,
  getLivingWorldSystem,
  type WorldOrgan,
  type AttractorType,
  type WorldEvent,
  type EventType,
  type CycleState,
  type BrainInformationFlow,
  type SystemRecommendation,
  type CivilizationalMood,
  type TradeRegion,
  type WorldEventTemplate,
} from "./LivingWorldErdosOuroborosSystem.js";