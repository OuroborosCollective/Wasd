/**
 * @file server/src/oracle/OracleIntegrationExample.ts
 *
 * Beispiel-Integration: OracleEndpoint mit WorldThinShell
 *
 * Diese Datei zeigt, wie der Oracle in die bestehende WorldThinShell-Architektur
 * integriert wird. Der tatsächliche Integrationscode sollte in WorldTickThinShell
 * oder einem separaten OracleTickSystem erfolgen.
 *
 * ANMERKUNG: Dies ist eine Dokumentations- und Referenzdatei.
 */

import {
  OracleEndpoint,
  OracleSocialDirector,
  type OracleSyncState,
  type OraclePulse,
  type OracleCommunicationIntent,
} from "./index.js";

// ============================================================================
// BEISPIEL 1: Direkte Verwendung von OracleEndpoint
// ============================================================================

/**
 * Einfache Oracle-Sync ohne Routing
 */
async function basicOracleSyncExample(): Promise<void> {
  const state: OracleSyncState = {
    tick: 18420,
    kappa: 1000,
    creatorId: "creator:markgraf",
    sessionId: "session:player123",

    player: {
      id: "player:markgraf",
      regionId: "region:outpost",
      hp: 75,
      maxHp: 100,
      level: 12,
      questStuckTicks: 450,
    },

    nearbyNpcs: [
      { id: "npc:guard:outpost:1", role: "guard", regionId: "region:outpost" },
      { id: "npc:trader:outpost:1", role: "trader", regionId: "region:outpost" },
    ],

    world: {
      regionId: "region:outpost",
      dangerLevel: 650,
      socialHeat: 720,
      marketHeat: 450,
      factionTension: 300,
      anomalyScore: 350,
      activePlayers: 12,
      activeNpcs: 45,
    },

    allowPlayerWhisper: true,
    allowNpcBarks: true,
    allowWorldRumors: true,
    allowQuestHints: true,
    maxIntents: 4,
  };

  const pulse = await OracleEndpoint.syncWithCreator(state);

  console.log("=== Oracle Pulse ===");
  console.log(`Status: ${pulse.status}`);
  console.log(`Tick: ${pulse.tick}`);
  console.log(`Pulse Hash: ${pulse.pulseHash}`);
  console.log(`Intents: ${pulse.intents.length}`);
  console.log(`Danger Score: ${pulse.dangerScore}`);
  console.log(`Social Score: ${pulse.socialScore}`);
  console.log(`Anomaly Score: ${pulse.anomalyScore}`);

  for (const intent of pulse.intents) {
    console.log(`\n[${intent.channel}:${intent.type}] Priority: ${intent.priority}`);
    console.log(`  ${intent.message}`);
  }
}

// ============================================================================
// BEISPIEL 2: OracleSocialDirector mit Routing
// ============================================================================

/**
 * Mock-Chat-System für das Beispiel
 */
const mockChatSystem = {
  messages: [] as { to: string; from: string; message: string; channel: string }[],

  sendPrivateSystemMessage(playerId: string, message: string): void {
    this.messages.push({
      to: playerId,
      from: "oracle",
      message,
      channel: "whisper",
    });
  },

  sendNpcBubble(npcId: string, message: string): void {
    this.messages.push({
      to: "world",
      from: npcId,
      message,
      channel: "npc_bark",
    });
  },

  clear(): void {
    this.messages = [];
  },
};

/**
 * Mock-Rumor-System für das Beispiel
 */
const mockRumorSystem = {
  rumors: [] as { regionId: string; message: string; intentHash: string; tick: number }[],

  seedRumor(regionId: string, message: string, intentHash: string, tick: number): void {
    this.rumors.push({ regionId, message, intentHash, tick });
  },

  clear(): void {
    this.rumors = [];
  },
};

/**
 * Mock-SystemSignalBus für das Beispiel
 */
const mockSignalBus = {
  signals: [] as OracleCommunicationIntent[],

  emit(intent: OracleCommunicationIntent): void {
    this.signals.push(intent);
  },

  clear(): void {
    this.signals = [];
  },
};

/**
 * Vollständige Integration mit Routing
 */
async function fullOracleIntegrationExample(): Promise<void> {
  // Erstelle Director mit echten Routern
  const director = new OracleSocialDirector({
    routeCreatorPulse: (intent, pulse) => {
      // In echtem Code: Admin-Console oder Creator-Panel
      console.log(`[CREATOR PULSE] ${intent.message}`);
    },

    routePlayerWhisper: (intent) => {
      // Spieler-Nachricht über Chat-System
      mockChatSystem.sendPrivateSystemMessage(intent.targetId!, intent.message);
    },

    routeNpcBark: (intent) => {
      // NPC-Dialogblase in der Welt
      mockChatSystem.sendNpcBubble(intent.actorId, intent.message);
    },

    routeWorldRumor: (intent) => {
      // Gerücht im Region-System registrieren
      mockRumorSystem.seedRumor(
        intent.regionId!,
        intent.message,
        intent.intentHash,
        intent.tick
      );
    },

    routeSystemSignal: (intent) => {
      // System-Signal an UI/WorldThinShell
      mockSignalBus.emit(intent);
    },
  });

  // Definiere Welt-Zustand
  const worldState: OracleSyncState = {
    tick: 1000,
    creatorId: "creator:admin",
    sessionId: "session:game1",

    player: {
      id: "player:hero1",
      regionId: "region:village",
      hp: 15,
      maxHp: 100,
      level: 5,
      questStuckTicks: 700,
    },

    nearbyNpcs: [
      { id: "npc:guard:village:1", role: "guard", faction: "town_guard" },
      { id: "npc:elder:village:1", role: "civilian", faction: "village_elder" },
    ],

    world: {
      regionId: "region:village",
      dangerLevel: 800,
      socialHeat: 650,
      marketHeat: 550,
      factionTension: 200,
      anomalyScore: 150,
    },

    maxIntents: 4,
  };

  // Führe Oracle-Tick aus
  const pulse = await director.tick(worldState);

  // Ausgabe der Ergebnisse
  console.log("\n=== Oracle Director Output ===");
  console.log(`Pulse Hash: ${pulse.pulseHash}`);

  const stats = director.getStats();
  console.log(`\nStats:`);
  console.log(`  Total Pulses: ${stats.totalPulses}`);
  console.log(`  Total Intents: ${stats.totalIntents}`);
  console.log(`  Intents by Channel:`, stats.intentsByChannel);

  console.log(`\nChat Messages: ${mockChatSystem.messages.length}`);
  for (const msg of mockChatSystem.messages) {
    console.log(`  [${msg.channel}] ${msg.from} → ${msg.to}: ${msg.message}`);
  }

  console.log(`\nRumors: ${mockRumorSystem.rumors.length}`);
  for (const rumor of mockRumorSystem.rumors) {
    console.log(`  [${rumor.regionId}] ${rumor.message}`);
  }

  console.log(`\nSystem Signals: ${mockSignalBus.signals.length}`);
  for (const signal of mockSignalBus.signals) {
    console.log(`  [${signal.type}] ${signal.message}`);
  }
}

// ============================================================================
// BEISPIEL 3: WorldThinShell-Integration (Pseudocode)
// ============================================================================

/**
 * Dies zeigt, wie OracleEndpoint in WorldTickThinShell integriert werden würde.
 *
 * In der echten Implementierung würde dies in WorldTickThinShell.ts oder
 * einem separaten OracleTickSystem.ts erfolgen.
 */
class WorldThinShellOracleIntegration {
  private director: OracleSocialDirector;
  private chatSystem: any;
  private rumorSystem: any;
  private signalBus: any;

  constructor() {
    // Initialisiere Director mit Game-System-Routern
    this.director = new OracleSocialDirector({
      routePlayerWhisper: (intent) => {
        this.chatSystem.sendPrivateSystemMessage(intent.targetId!, intent.message);
      },
      routeNpcBark: (intent) => {
        // NPCBrain ansprechen für soziale Interaktion
        this.npcBrainQueue.push({
          npcId: intent.actorId,
          action: "bark",
          message: intent.message,
          priority: intent.priority,
        });
      },
      routeWorldRumor: (intent) => {
        this.rumorSystem.seedRumor(intent.regionId!, intent.message, intent.intentHash);
      },
      routeSystemSignal: (intent) => {
        this.signalBus.emit(intent);
      },
    });
  }

  /**
   * Diese Methode würde im tick() von WorldTickThinShell aufgerufen werden
   */
  async onTick(
    tick: number,
    player: any,
    nearbyNpcs: any[],
    worldSnapshot: any
  ): Promise<void> {
    const state: OracleSyncState = {
      tick,
      creatorId: "creator:system",
      sessionId: `session:${tick}`,

      player: {
        id: player.id,
        regionId: player.regionId,
        hp: player.hp,
        maxHp: player.maxHp,
        level: player.level,
        questStuckTicks: player.questStuckTicks ?? 0,
      },

      nearbyNpcs: nearbyNpcs.map((npc) => ({
        id: npc.id,
        role: npc.role,
        faction: npc.faction,
        regionId: npc.regionId,
      })),

      world: {
        regionId: worldSnapshot.regionId,
        dangerLevel: worldSnapshot.dangerLevel,
        socialHeat: worldSnapshot.socialHeat,
        marketHeat: worldSnapshot.marketHeat,
        factionTension: worldSnapshot.factionTension,
        anomalyScore: worldSnapshot.anomalyScore,
        activePlayers: worldSnapshot.activePlayers,
        activeNpcs: worldSnapshot.activeNpcs,
      },

      allowPlayerWhisper: true,
      allowNpcBarks: true,
      allowWorldRumors: true,
      allowQuestHints: true,
      maxIntents: 4,
    };

    // Oracle-Pulse verarbeiten
    await this.director.tick(state);
  }

  private npcBrainQueue: any[] = [];
}

// ============================================================================
// Export für Tests
// ============================================================================

export {
  basicOracleSyncExample,
  fullOracleIntegrationExample,
  WorldThinShellOracleIntegration,
  mockChatSystem,
  mockRumorSystem,
  mockSignalBus,
};

// Wenn direkt ausgeführt
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Running Oracle Integration Examples...\n");

  await basicOracleSyncExample();
  console.log("\n" + "=".repeat(60) + "\n");
  await fullOracleIntegrationExample();
}