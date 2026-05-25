export type FactionMood = 'celebration' | 'mourning' | 'vengeance';
export type BossQuestEventType = 'QUEST_COMPLETED_BOSS';

export type ResonanceField = {
  eventType: BossQuestEventType;
  sourceId: string;
  factionMood: FactionMood;
  intensity: number;
  createdAtTick: number;
  expiresAtTick: number;
};

export type NPCTraitData = {
  faith: number;
  aggression: number;
  curiosity: number;
};

export type NPCMemoryData = {
  resonanceFields?: ResonanceField[];
  [key: string]: unknown;
};

export type NPCFactionMoodTarget = {
  id: string;
  faction?: string;
  factionId?: string;
  position: { x: number; y: number; z?: number };
  traits?: Partial<NPCTraitData>;
  memory?: NPCMemoryData;
};

export type BossQuestCompletedPayload<TNpc extends NPCFactionMoodTarget = NPCFactionMoodTarget> = {
  npcs: readonly TNpc[];
  bossFaction: string;
  victoriousFaction: string;
  eventPosition: { x: number; y: number; z?: number };
  tick: number;
  sourceId: string;
};

export type NPCFactionMoodBroadcasterOptions = {
  maxResonanceRadius?: number;
  fieldLifetimeTicks?: number;
  maxStoredFields?: number;
};

export type NPCFactionMoodBroadcastResult = {
  affected: number;
  celebration: number;
  mourning: number;
  vengeance: number;
};

const DEFAULT_MAX_RESONANCE_RADIUS = 100;
const DEFAULT_FIELD_LIFETIME_TICKS = 6000;
const DEFAULT_MAX_STORED_FIELDS = 8;

function finite(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function factionOf(npc: NPCFactionMoodTarget): string {
  return String(npc.factionId ?? npc.faction ?? 'neutral');
}

export class NPCFactionMoodBroadcaster {
  private readonly maxResonanceRadiusSq: number;
  private readonly fieldLifetimeTicks: number;
  private readonly maxStoredFields: number;

  constructor(options: NPCFactionMoodBroadcasterOptions = {}) {
    const radius = finite(options.maxResonanceRadius, DEFAULT_MAX_RESONANCE_RADIUS);
    this.maxResonanceRadiusSq = Math.trunc(Math.max(1, radius) * Math.max(1, radius));
    this.fieldLifetimeTicks = Math.max(1, Math.trunc(finite(options.fieldLifetimeTicks, DEFAULT_FIELD_LIFETIME_TICKS)));
    this.maxStoredFields = Math.max(1, Math.trunc(finite(options.maxStoredFields, DEFAULT_MAX_STORED_FIELDS)));
  }

  public applyBossQuestCompleted<TNpc extends NPCFactionMoodTarget>(payload: BossQuestCompletedPayload<TNpc>): NPCFactionMoodBroadcastResult {
    const result: NPCFactionMoodBroadcastResult = { affected: 0, celebration: 0, mourning: 0, vengeance: 0 };
    const tick = Math.max(0, Math.trunc(finite(payload.tick, 0)));
    const sourceId = String(payload.sourceId || 'worldboss:unknown');
    const bossFaction = String(payload.bossFaction || 'neutral');
    const victoriousFaction = String(payload.victoriousFaction || 'neutral');

    for (const npc of payload.npcs ?? []) {
      const distanceSq = this.getSquaredDistance(npc.position, payload.eventPosition);
      if (distanceSq > this.maxResonanceRadiusSq) continue;

      const intensity = clamp(1 - distanceSq / this.maxResonanceRadiusSq);
      const mood = this.resolveMood(factionOf(npc), bossFaction, victoriousFaction);
      if (!mood) continue;

      npc.traits ??= { faith: 0.5, aggression: 0.5, curiosity: 0.5 };
      npc.memory ??= {};

      const shifts = this.traitShiftsFor(mood, intensity);
      npc.traits.faith = clamp(finite(npc.traits.faith, 0.5) + shifts.faith);
      npc.traits.aggression = clamp(finite(npc.traits.aggression, 0.5) + shifts.aggression);
      npc.traits.curiosity = clamp(finite(npc.traits.curiosity, 0.5));

      const fields = Array.isArray(npc.memory.resonanceFields) ? npc.memory.resonanceFields : [];
      const activeFields = fields.filter((field) => finite(field.expiresAtTick, 0) > tick);
      activeFields.push(Object.freeze({
        eventType: 'QUEST_COMPLETED_BOSS' as const,
        sourceId,
        factionMood: mood,
        intensity,
        createdAtTick: tick,
        expiresAtTick: tick + this.fieldLifetimeTicks,
      }));
      npc.memory.resonanceFields = activeFields.slice(-this.maxStoredFields);

      result.affected += 1;
      result[mood] += 1;
    }

    return result;
  }

  private resolveMood(npcFaction: string, bossFaction: string, victoriousFaction: string): FactionMood | null {
    if (npcFaction === victoriousFaction) return 'celebration';
    if (npcFaction === bossFaction) return 'mourning';
    return null;
  }

  private traitShiftsFor(mood: FactionMood, intensity: number): { faith: number; aggression: number } {
    const faithShift = 0.05 + 0.07 * intensity;
    const aggressionShift = 0.03 + 0.07 * intensity;

    if (mood === 'celebration') return { faith: faithShift, aggression: -aggressionShift };
    if (mood === 'mourning') return { faith: -faithShift, aggression: aggressionShift };
    return { faith: -faithShift * 0.5, aggression: aggressionShift };
  }

  private getSquaredDistance(posA: { x: number; y: number }, posB: { x: number; y: number }): number {
    const dx = finite(posA?.x, 0) - finite(posB?.x, 0);
    const dy = finite(posA?.y, 0) - finite(posB?.y, 0);
    return dx * dx + dy * dy;
  }
}
