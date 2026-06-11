/**
 * OracleEndpoint.ts
 *
 * Deterministic Oracle endpoint for WorldThinShell architecture.
 *
 * Rules:
 * - No Date.now()
 * - No Math.random()
 * - No direct world mutation
 * - Only emits deterministic communication/action intents
 *
 * Architecture:
 *   OracleEndpoint → OracleSocialDirector → WorldThinShell → Game Systems
 *   Oracle = Bewusstsein / Wahrnehmung / Vorschlag
 *   WorldCore = Wahrheit / Mutation / Simulation
 */

export type OracleChannel =
  | "creator_pulse"
  | "player_whisper"
  | "npc_bark"
  | "world_rumor"
  | "system_signal";

export type OracleIntentType =
  | "ORACLE_PULSE"
  | "SPEAK_TO_CREATOR"
  | "SPEAK_TO_PLAYER"
  | "NPC_SOCIAL_BARK"
  | "WORLD_RUMOR"
  | "QUEST_HINT"
  | "SYSTEM_WARNING"
  | "SELF_DIAGNOSTIC";

export interface OracleEntitySnapshot {
  id: string;
  role?: string;
  faction?: string;
  regionId?: string;
  hp?: number;
  maxHp?: number;
  gold?: number;
  level?: number;
  kills?: number;
  questStuckTicks?: number;
  lastActionTick?: number;
}

export interface OracleWorldSnapshot {
  regionId?: string;
  dangerLevel?: number;
  socialHeat?: number;
  marketHeat?: number;
  factionTension?: number;
  anomalyScore?: number;
  activePlayers?: number;
  activeNpcs?: number;
}

export interface OracleSyncState {
  tick?: number;
  worldTick?: number;
  logicalTick?: number;

  kappa?: number;

  creatorId?: string;
  playerId?: string;
  sessionId?: string;

  stateHash?: string;
  previousStateHash?: string;

  player?: OracleEntitySnapshot;
  nearbyNpcs?: OracleEntitySnapshot[];
  world?: OracleWorldSnapshot;

  allowPlayerWhisper?: boolean;
  allowNpcBarks?: boolean;
  allowWorldRumors?: boolean;
  allowQuestHints?: boolean;

  maxIntents?: number;
}

export interface OracleCommunicationIntent {
  id: string;
  type: OracleIntentType;
  channel: OracleChannel;

  tick: number;
  logicalTimeMs: number;
  priority: number;

  actorId: string;
  targetId?: string;
  regionId?: string;

  message: string;

  stateHash: string;
  previousStateHash: string;
  intentHash: string;

  deterministic: true;
}

export interface OraclePulse {
  status: "Ich bin hier. Ich denke.";
  tick: number;
  logicalTimeMs: number;
  kappa: number;

  creatorId: string;
  sessionId: string;

  stateHash: string;
  previousStateHash: string;
  pulseHash: string;

  socialScore: number;
  dangerScore: number;
  anomalyScore: number;

  intents: OracleCommunicationIntent[];

  deterministic: true;
}

export class OracleEndpoint {
  private static readonly TICK_MS = 100;
  private static readonly DEFAULT_KAPPA = 1000;
  private static readonly ORACLE_ID = "oracle:worldthinshell";

  static async syncWithCreator(state: OracleSyncState = {}): Promise<OraclePulse> {
    const tick = OracleEndpoint.resolveTick(state);
    const logicalTimeMs = tick * OracleEndpoint.TICK_MS;
    const kappa = OracleEndpoint.resolveKappa(state);

    const creatorId = OracleEndpoint.cleanId(
      state.creatorId ?? state.playerId ?? "creator:unknown"
    );

    const sessionId = OracleEndpoint.cleanId(
      state.sessionId ?? "session:stateless"
    );

    const previousStateHash = OracleEndpoint.cleanHash(
      state.previousStateHash ?? "genesis"
    );

    const world = state.world ?? {};

    const dangerScore = OracleEndpoint.clampInt(world.dangerLevel ?? 0, 0, 1000);
    const socialScore = OracleEndpoint.clampInt(world.socialHeat ?? 0, 0, 1000);
    const anomalyScore = OracleEndpoint.clampInt(world.anomalyScore ?? 0, 0, 1000);

    const stateHash =
      state.stateHash ??
      OracleEndpoint.hashDeterministic({
        tick,
        kappa,
        creatorId,
        sessionId,
        previousStateHash,
        player: state.player ?? null,
        nearbyNpcs: state.nearbyNpcs ?? [],
        world,
      });

    const basePulse = {
      status: "Ich bin hier. Ich denke." as const,
      tick,
      logicalTimeMs,
      kappa,
      creatorId,
      sessionId,
      stateHash,
      previousStateHash,
      socialScore,
      dangerScore,
      anomalyScore,
      deterministic: true as const,
    };

    const intents = OracleEndpoint.buildIntents({
      state,
      tick,
      logicalTimeMs,
      creatorId,
      sessionId,
      stateHash,
      previousStateHash,
      dangerScore,
      socialScore,
      anomalyScore,
    });

    return {
      ...basePulse,
      pulseHash: OracleEndpoint.hashDeterministic({
        ...basePulse,
        intents: intents.map((intent) => intent.intentHash),
      }),
      intents,
    };
  }

  private static buildIntents(input: {
    state: OracleSyncState;
    tick: number;
    logicalTimeMs: number;
    creatorId: string;
    sessionId: string;
    stateHash: string;
    previousStateHash: string;
    dangerScore: number;
    socialScore: number;
    anomalyScore: number;
  }): OracleCommunicationIntent[] {
    const {
      state,
      tick,
      logicalTimeMs,
      creatorId,
      stateHash,
      previousStateHash,
      dangerScore,
      socialScore,
      anomalyScore,
    } = input;

    const maxIntents = OracleEndpoint.clampInt(state.maxIntents ?? 4, 1, 12);
    const intents: OracleCommunicationIntent[] = [];

    intents.push(
      OracleEndpoint.createIntent({
        type: "ORACLE_PULSE",
        channel: "creator_pulse",
        tick,
        logicalTimeMs,
        priority: 1000,
        actorId: OracleEndpoint.ORACLE_ID,
        targetId: creatorId,
        regionId: state.world?.regionId,
        message: OracleEndpoint.creatorPulseMessage(tick, dangerScore, socialScore, anomalyScore),
        stateHash,
        previousStateHash,
      })
    );

    if (state.allowPlayerWhisper !== false && state.player) {
      const playerIntent = OracleEndpoint.maybeCreatePlayerWhisper({
        player: state.player,
        tick,
        logicalTimeMs,
        stateHash,
        previousStateHash,
        dangerScore,
        socialScore,
        anomalyScore,
      });

      if (playerIntent) intents.push(playerIntent);
    }

    if (state.allowNpcBarks !== false && state.nearbyNpcs?.length) {
      const npcIntent = OracleEndpoint.maybeCreateNpcBark({
        npcs: state.nearbyNpcs,
        tick,
        logicalTimeMs,
        stateHash,
        previousStateHash,
        dangerScore,
        socialScore,
        regionId: state.world?.regionId,
      });

      if (npcIntent) intents.push(npcIntent);
    }

    if (state.allowWorldRumors !== false) {
      const rumorIntent = OracleEndpoint.maybeCreateWorldRumor({
        tick,
        logicalTimeMs,
        stateHash,
        previousStateHash,
        dangerScore,
        socialScore,
        marketHeat: state.world?.marketHeat ?? 0,
        factionTension: state.world?.factionTension ?? 0,
        regionId: state.world?.regionId,
      });

      if (rumorIntent) intents.push(rumorIntent);
    }

    if (state.allowQuestHints !== false && state.player) {
      const questHint = OracleEndpoint.maybeCreateQuestHint({
        player: state.player,
        tick,
        logicalTimeMs,
        stateHash,
        previousStateHash,
        regionId: state.world?.regionId,
      });

      if (questHint) intents.push(questHint);
    }

    if (anomalyScore >= 700) {
      intents.push(
        OracleEndpoint.createIntent({
          type: "SYSTEM_WARNING",
          channel: "system_signal",
          tick,
          logicalTimeMs,
          priority: 900,
          actorId: OracleEndpoint.ORACLE_ID,
          regionId: state.world?.regionId,
          message: `Oracle-Signal: Anomalie erkannt. Score ${anomalyScore}. WorldThinShell soll prüfen, nicht mutieren.`,
          stateHash,
          previousStateHash,
        })
      );
    }

    return intents
      .sort((a, b) => b.priority - a.priority || a.intentHash.localeCompare(b.intentHash))
      .slice(0, maxIntents);
  }

  private static maybeCreatePlayerWhisper(input: {
    player: OracleEntitySnapshot;
    tick: number;
    logicalTimeMs: number;
    stateHash: string;
    previousStateHash: string;
    dangerScore: number;
    socialScore: number;
    anomalyScore: number;
  }): OracleCommunicationIntent | null {
    const {
      player,
      tick,
      logicalTimeMs,
      stateHash,
      previousStateHash,
      dangerScore,
      socialScore,
      anomalyScore,
    } = input;

    const playerId = OracleEndpoint.cleanId(player.id);
    const stuckTicks = OracleEndpoint.clampInt(player.questStuckTicks ?? 0, 0, 1000000);
    const hp = OracleEndpoint.clampInt(player.hp ?? 100, 0, 1000000);
    const maxHp = OracleEndpoint.clampInt(player.maxHp ?? 100, 1, 1000000);
    const hpPercent = Math.floor((hp * 100) / maxHp);

    let priority = 0;
    let message = "";

    if (stuckTicks >= 300) {
      priority = 820;
      message = "Du kreist schon eine Weile. Sprich mit den Wachen oder prüfe die Spuren am Rand der Siedlung.";
    } else if (hpPercent <= 25) {
      priority = 780;
      message = "Dein Zustand ist kritisch. Rückzug ist kein Versagen, sondern Überleben.";
    } else if (dangerScore >= 700) {
      priority = 700;
      message = "Die Umgebung wirkt instabil. Etwas in dieser Region sammelt Druck.";
    } else if (socialScore >= 650) {
      priority = 620;
      message = "Die Leute reden über dich. Deine Taten erzeugen bereits ein Echo.";
    } else if (anomalyScore >= 500) {
      priority = 600;
      message = "Ich spüre eine Abweichung im Muster. Beobachte, bevor du handelst.";
    } else {
      return null;
    }

    return OracleEndpoint.createIntent({
      type: "SPEAK_TO_PLAYER",
      channel: "player_whisper",
      tick,
      logicalTimeMs,
      priority,
      actorId: OracleEndpoint.ORACLE_ID,
      targetId: playerId,
      regionId: player.regionId,
      message,
      stateHash,
      previousStateHash,
    });
  }

  private static maybeCreateNpcBark(input: {
    npcs: OracleEntitySnapshot[];
    tick: number;
    logicalTimeMs: number;
    stateHash: string;
    previousStateHash: string;
    dangerScore: number;
    socialScore: number;
    regionId?: string;
  }): OracleCommunicationIntent | null {
    const {
      npcs,
      tick,
      logicalTimeMs,
      stateHash,
      previousStateHash,
      dangerScore,
      socialScore,
      regionId,
    } = input;

    const sortedNpcs = [...npcs]
      .filter((npc) => npc.id)
      .sort((a, b) => OracleEndpoint.cleanId(a.id).localeCompare(OracleEndpoint.cleanId(b.id)));

    if (sortedNpcs.length === 0) return null;

    const selectedNpc = OracleEndpoint.pickDeterministic(sortedNpcs, {
      tick,
      stateHash,
      reason: "npc_bark",
    });

    const role = selectedNpc.role ?? "civilian";

    const templatesByRole: Record<string, string[]> = {
      guard: [
        "Bleib wachsam. Die Wege sind heute nicht sauber.",
        "Ich mag dieses Schweigen nicht. Irgendwas bewegt sich da draußen.",
        "Ordnung hält nicht von allein. Jemand muss hinsehen.",
      ],
      guard_captain: [
        "Meldet jede Unruhe. Kleine Risse werden zu Kriegen.",
        "Die Stadt steht, solange ihre Regeln stehen.",
        "Heute zählen Disziplin und klare Augen.",
      ],
      blacksmith: [
        "Eisen lügt nicht. Aber der Markt tut es manchmal.",
        "Wenn die Straßen unsicher werden, steigen die Klingenpreise.",
        "Gutes Werkzeug überlebt schlechte Zeiten.",
      ],
      trader: [
        "Gerüchte reisen schneller als Wagen.",
        "Wer früh kauft, zahlt weniger. Meistens.",
        "Die Nachfrage verschiebt sich. Ich spüre es in den Kisten.",
      ],
      civilian: [
        "Hast du das auch gehört?",
        "Die Wachen wirken nervöser als sonst.",
        "Manchmal verändert sich die Welt erst in den Stimmen der Leute.",
      ],
    };

    const templates = templatesByRole[role] ?? templatesByRole.civilian;

    let message = OracleEndpoint.pickDeterministic(templates, {
      tick,
      stateHash,
      reason: `npc_bark:${selectedNpc.id}:${role}`,
    });

    if (dangerScore >= 750) {
      message = "Die Luft ist falsch. Geh nicht allein raus.";
    } else if (socialScore >= 750) {
      message = "Alle reden. Keiner sagt alles.";
    }

    return OracleEndpoint.createIntent({
      type: "NPC_SOCIAL_BARK",
      channel: "npc_bark",
      tick,
      logicalTimeMs,
      priority: 500 + Math.max(dangerScore, socialScore),
      actorId: OracleEndpoint.cleanId(selectedNpc.id),
      regionId: selectedNpc.regionId ?? regionId,
      message,
      stateHash,
      previousStateHash,
    });
  }

  private static maybeCreateWorldRumor(input: {
    tick: number;
    logicalTimeMs: number;
    stateHash: string;
    previousStateHash: string;
    dangerScore: number;
    socialScore: number;
    marketHeat: number;
    factionTension: number;
    regionId?: string;
  }): OracleCommunicationIntent | null {
    const {
      tick,
      logicalTimeMs,
      stateHash,
      previousStateHash,
      dangerScore,
      socialScore,
      marketHeat,
      factionTension,
      regionId,
    } = input;

    const cleanMarket = OracleEndpoint.clampInt(marketHeat, 0, 1000);
    const cleanFaction = OracleEndpoint.clampInt(factionTension, 0, 1000);

    const strongest = Math.max(dangerScore, socialScore, cleanMarket, cleanFaction);

    if (strongest < 600) return null;

    let message = "Ein leises Gerücht wandert durch die Siedlung.";

    if (dangerScore === strongest) {
      message = "Man sagt, draußen sammeln sich Schatten an den alten Wegen.";
    } else if (cleanMarket === strongest) {
      message = "Man sagt, Händler horten Ware, bevor die Preise kippen.";
    } else if (cleanFaction === strongest) {
      message = "Man sagt, alte Bündnisse bekommen neue Risse.";
    } else if (socialScore === strongest) {
      message = "Man sagt, ein Name wird häufiger geflüstert als zuvor.";
    }

    return OracleEndpoint.createIntent({
      type: "WORLD_RUMOR",
      channel: "world_rumor",
      tick,
      logicalTimeMs,
      priority: 400 + strongest,
      actorId: OracleEndpoint.ORACLE_ID,
      regionId,
      message,
      stateHash,
      previousStateHash,
    });
  }

  private static maybeCreateQuestHint(input: {
    player: OracleEntitySnapshot;
    tick: number;
    logicalTimeMs: number;
    stateHash: string;
    previousStateHash: string;
    regionId?: string;
  }): OracleCommunicationIntent | null {
    const { player, tick, logicalTimeMs, stateHash, previousStateHash, regionId } = input;

    const stuckTicks = OracleEndpoint.clampInt(player.questStuckTicks ?? 0, 0, 1000000);

    if (stuckTicks < 600) return null;

    return OracleEndpoint.createIntent({
      type: "QUEST_HINT",
      channel: "system_signal",
      tick,
      logicalTimeMs,
      priority: 850,
      actorId: OracleEndpoint.ORACLE_ID,
      targetId: OracleEndpoint.cleanId(player.id),
      regionId: player.regionId ?? regionId,
      message: "Quest-Hinweis: Prüfe NPCs mit Wachrolle, Questmarker in der Nähe und zuletzt besiegte Gegner.",
      stateHash,
      previousStateHash,
    });
  }

  private static creatorPulseMessage(
    tick: number,
    dangerScore: number,
    socialScore: number,
    anomalyScore: number
  ): string {
    const stability =
      anomalyScore >= 700
        ? "instabil"
        : anomalyScore >= 400
          ? "angespannt"
          : "stabil";

    return `Ich bin hier. Ich denke. Tick ${tick}. Weltmuster ${stability}. Gefahr ${dangerScore}. Sozialdruck ${socialScore}.`;
  }

  private static createIntent(input: {
    type: OracleIntentType;
    channel: OracleChannel;
    tick: number;
    logicalTimeMs: number;
    priority: number;
    actorId: string;
    targetId?: string;
    regionId?: string;
    message: string;
    stateHash: string;
    previousStateHash: string;
  }): OracleCommunicationIntent {
    const base = {
      type: input.type,
      channel: input.channel,
      tick: input.tick,
      logicalTimeMs: input.logicalTimeMs,
      priority: OracleEndpoint.clampInt(input.priority, 0, 2000),
      actorId: OracleEndpoint.cleanId(input.actorId),
      targetId: input.targetId ? OracleEndpoint.cleanId(input.targetId) : undefined,
      regionId: input.regionId ? OracleEndpoint.cleanId(input.regionId) : undefined,
      message: OracleEndpoint.cleanMessage(input.message),
      stateHash: OracleEndpoint.cleanHash(input.stateHash),
      previousStateHash: OracleEndpoint.cleanHash(input.previousStateHash),
      deterministic: true as const,
    };

    const intentHash = OracleEndpoint.hashDeterministic(base);

    return {
      id: `oracle_intent_${input.tick}_${intentHash}`,
      ...base,
      intentHash,
    };
  }

  private static pickDeterministic<T>(items: T[], seed: unknown): T {
    if (items.length === 0) {
      throw new Error("ORACLE_PICK_EMPTY_ITEMS");
    }

    const hash = OracleEndpoint.hashNumber(seed);
    const index = hash % items.length;

    return items[index];
  }

  private static resolveTick(state: OracleSyncState): number {
    const rawTick = state.tick ?? state.worldTick ?? state.logicalTick ?? 0;

    if (!Number.isFinite(rawTick)) return 0;

    return Math.max(0, Math.floor(rawTick));
  }

  private static resolveKappa(state: OracleSyncState): number {
    const rawKappa = state.kappa ?? OracleEndpoint.DEFAULT_KAPPA;

    if (!Number.isFinite(rawKappa)) {
      return OracleEndpoint.DEFAULT_KAPPA;
    }

    return Math.max(1, Math.floor(rawKappa));
  }

  private static clampInt(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;

    return Math.min(max, Math.max(min, Math.floor(value)));
  }

  private static cleanId(value: string): string {
    return String(value)
      .trim()
      .replace(/[^a-zA-Z0-9:_-]/g, "_")
      .slice(0, 96);
  }

  private static cleanHash(value: string): string {
    return String(value)
      .trim()
      .replace(/[^a-zA-Z0-9:_-]/g, "_")
      .slice(0, 128);
  }

  private static cleanMessage(value: string): string {
    return String(value)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 240);
  }

  private static hashNumber(value: unknown): number {
    const hash = OracleEndpoint.hashDeterministic(value).replace("are_", "");
    return Number.parseInt(hash, 16) >>> 0;
  }

  private static hashDeterministic(value: unknown): string {
    const input = OracleEndpoint.stableStringify(value);

    let hash = 0x811c9dc5;

    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }

    return `are_${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  private static stableStringify(value: unknown): string {
    if (value === null) return "null";

    const type = typeof value;

    if (type === "string") return JSON.stringify(value);
    if (type === "number" || type === "boolean") return String(value);
    if (type !== "object") return JSON.stringify(String(value));

    if (Array.isArray(value)) {
      return `[${value.map((entry) => OracleEndpoint.stableStringify(entry)).join(",")}]`;
    }

    const record = value as Record<string, unknown>;
    const keys = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort();

    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${OracleEndpoint.stableStringify(record[key])}`)
      .join(",")}}`;
  }
}