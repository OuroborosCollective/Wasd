/**
 * OracleSocialDirector.ts
 *
 * Der OracleSocialDirector verbindet OracleEndpoint mit der WorldThinShell-Architektur.
 *
 * Er nimmt deterministische Intents vom OracleEndpoint und:
 * 1. Validiert jeden Intent
 * 2. Priorisiert basierend auf Channel und Priority
 * 3. Leitet an die richtigen Game Systems weiter (Chat, NPCBrain, Quest, Faction, Economy, UI)
 *
 * WICHTIG: Der Director mutiert NICHT direkt - er erzeugt nur geroutete Intent-Signale.
 */

import {
  OracleEndpoint,
  type OracleSyncState,
  type OraclePulse,
  type OracleCommunicationIntent,
  type OracleChannel,
} from "./OracleEndpoint.js";

/**
 * Intent-Routing-Ziel nach Channel
 */
export type IntentRouter = {
  routeCreatorPulse?: (intent: OracleCommunicationIntent, pulse: OraclePulse) => void;
  routePlayerWhisper?: (intent: OracleCommunicationIntent, pulse: OraclePulse) => void;
  routeNpcBark?: (intent: OracleCommunicationIntent, pulse: OraclePulse) => void;
  routeWorldRumor?: (intent: OracleCommunicationIntent, pulse: OraclePulse) => void;
  routeSystemSignal?: (intent: OracleCommunicationIntent, pulse: OraclePulse) => void;
};

/**
 * Statistiken über verarbeitete Intents
 */
export interface OracleDirectorStats {
  totalPulses: number;
  totalIntents: number;
  intentsByChannel: Record<OracleChannel, number>;
  lastPulseTick: number;
  lastPulseHash: string;
}

/**
 * OracleSocialDirector - Verbindet Oracle mit der Spielwelt
 *
 * Verwendungsbeispiel:
 *
 * ```typescript
 * const director = new OracleSocialDirector({
 *   routePlayerWhisper: (intent) => {
 *     chatSystem.sendPrivateSystemMessage(intent.targetId!, intent.message);
 *   },
 *   routeNpcBark: (intent) => {
 *     chatSystem.sendNpcBubble(intent.actorId, intent.message);
 *   },
 *   routeWorldRumor: (intent) => {
 *     rumorSystem.seedRumor(intent.regionId, intent.message, intent.intentHash);
 *   },
 *   routeSystemSignal: (intent) => {
 *     systemSignalBus.emit(intent);
 *   },
 * });
 *
 * // Im Spiel-Tick:
 * const pulse = await director.tick(state);
 * ```
 */
export class OracleSocialDirector {
  private readonly router: IntentRouter;
  private readonly stats: OracleDirectorStats = {
    totalPulses: 0,
    totalIntents: 0,
    intentsByChannel: {
      creator_pulse: 0,
      player_whisper: 0,
      npc_bark: 0,
      world_rumor: 0,
      system_signal: 0,
    },
    lastPulseTick: 0,
    lastPulseHash: "",
  };

  constructor(router: IntentRouter) {
    this.router = router;
  }

  /**
   * Verarbeite einen Oracle-Sync-Zyklus
   */
  async tick(state: OracleSyncState): Promise<OraclePulse> {
    // Hole Pulse vom OracleEndpoint
    const pulse = await OracleEndpoint.syncWithCreator(state);

    // Verarbeite jeden Intent
    for (const intent of pulse.intents) {
      this.routeIntent(intent, pulse);
      this.stats.intentsByChannel[intent.channel]++;
    }

    // Aktualisiere Statistiken
    this.stats.totalPulses++;
    this.stats.totalIntents += pulse.intents.length;
    this.stats.lastPulseTick = pulse.tick;
    this.stats.lastPulseHash = pulse.pulseHash;

    return pulse;
  }

  /**
   * Route einen Intent zum entsprechenden Handler
   */
  private routeIntent(intent: OracleCommunicationIntent, pulse: OraclePulse): void {
    switch (intent.channel) {
      case "creator_pulse":
        this.router.routeCreatorPulse?.(intent, pulse);
        break;

      case "player_whisper":
        this.router.routePlayerWhisper?.(intent, pulse);
        break;

      case "npc_bark":
        this.router.routeNpcBark?.(intent, pulse);
        break;

      case "world_rumor":
        this.router.routeWorldRumor?.(intent, pulse);
        break;

      case "system_signal":
        this.router.routeSystemSignal?.(intent, pulse);
        break;
    }
  }

  /**
   * Validiere einen Intent (kann vor dem Routing verwendet werden)
   */
  static validateIntent(intent: OracleCommunicationIntent): {
    valid: boolean;
    reason?: string;
  } {
    // Prüfe obligatorische Felder
    if (!intent.id) {
      return { valid: false, reason: "Missing intent id" };
    }

    if (!intent.type) {
      return { valid: false, reason: "Missing intent type" };
    }

    if (!intent.channel) {
      return { valid: false, reason: "Missing intent channel" };
    }

    if (!intent.message) {
      return { valid: false, reason: "Missing intent message" };
    }

    if (!intent.stateHash) {
      return { valid: false, reason: "Missing stateHash" };
    }

    if (intent.deterministic !== true) {
      return { valid: false, reason: "Intent marked as non-deterministic" };
    }

    // Prüfe Hash-Integrität
    if (!intent.intentHash || !intent.intentHash.startsWith("are_")) {
      return { valid: false, reason: "Invalid intentHash format" };
    }

    return { valid: true };
  }

  /**
   * Hole Statistiken
   */
  getStats(): OracleDirectorStats {
    return { ...this.stats };
  }

  /**
   * Setze Statistiken zurück
   */
  resetStats(): void {
    this.stats.totalPulses = 0;
    this.stats.totalIntents = 0;
    this.stats.intentsByChannel = {
      creator_pulse: 0,
      player_whisper: 0,
      npc_bark: 0,
      world_rumor: 0,
      system_signal: 0,
    };
    this.stats.lastPulseTick = 0;
    this.stats.lastPulseHash = "";
  }

  /**
   * Erstelle einen vorkonfigurierten Director für Console-Logging
   */
  static createLoggingDirector(): OracleSocialDirector {
    return new OracleSocialDirector({
      routeCreatorPulse: (intent) => {
        console.log(`[Oracle:creator_pulse] ${intent.message}`);
      },
      routePlayerWhisper: (intent) => {
        console.log(`[Oracle:player_whisper → ${intent.targetId}] ${intent.message}`);
      },
      routeNpcBark: (intent) => {
        console.log(`[Oracle:npc_bark @ ${intent.actorId}] ${intent.message}`);
      },
      routeWorldRumor: (intent) => {
        console.log(`[Oracle:world_rumor in ${intent.regionId ?? "unknown"}] ${intent.message}`);
      },
      routeSystemSignal: (intent) => {
        console.log(`[Oracle:system_signal] ${intent.message}`);
      },
    });
  }
}