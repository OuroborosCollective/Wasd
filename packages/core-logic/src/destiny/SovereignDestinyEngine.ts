import { createHash } from 'node:crypto';

export type DestinyKind =
  | 'cleanse_sector'
  | 'deliver_forge_goods'
  | 'stabilize_anomaly'
  | 'recover_blueprint'
  | 'defend_core_city';

export type DestinyStatus = 'proposed' | 'active' | 'fulfilled' | 'expired';
export type DestinySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SectorState {
  sectorId: string;
  chunkX: number;
  chunkY: number;
  corruption: number;
  scarcity: number;
  threat: number;
  tradePressure: number;
  selfHealingNeed: number;
  population?: number;
  coreCityDistance?: number;
}

export interface DestinyReward {
  blueprintId: string;
  blueprintName: string;
  quality: 'rare' | 'epic' | 'legendary' | 'mythic';
  guaranteeHash: string;
}

export interface DestinyRequirement {
  type: 'kill' | 'deliver' | 'stabilize' | 'recover' | 'defend';
  targetId: string;
  required: number;
  current: number;
  itemId?: string;
}

export interface DestinyPayload {
  id: string;
  kind: DestinyKind;
  status: DestinyStatus;
  title: string;
  summary: string;
  sectorId: string;
  severity: DestinySeverity;
  createdTick: number;
  expiresAtTick: number;
  worldHash: string;
  sectorHash: string;
  destinyHash: string;
  requirements: DestinyRequirement[];
  reward: DestinyReward;
  emilyBriefing: string;
}

export interface DestinyGenerationContext {
  seed: string;
  worldHash: string;
  tick: number;
  sectors: SectorState[];
  maxQuests?: number;
}

export interface DestinyProgressInput {
  kills?: Record<string, number>;
  deliveries?: Record<string, number>;
  stabilizedSectors?: string[];
  recoveredBlueprints?: string[];
  defendedSectors?: string[];
}

export function deterministicHash(parts: Array<string | number | boolean | null | undefined>): string {
  const payload = parts.map((part) => String(part ?? '')).join('|');
  return createHash('sha256').update(payload).digest('hex');
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function hashInt(hash: string, offset: number, modulo: number): number {
  const slice = hash.slice(offset, offset + 8).padEnd(8, '0');
  const value = Number.parseInt(slice, 16);
  return modulo <= 0 ? value : value % modulo;
}

function severityFromScore(score: number): DestinySeverity {
  if (score >= 0.88) return 'critical';
  if (score >= 0.68) return 'high';
  if (score >= 0.42) return 'medium';
  return 'low';
}

function qualityFromScore(score: number, hash: string): DestinyReward['quality'] {
  const wobble = hashInt(hash, 12, 1000) / 1000;
  const combined = clamp01(score * 0.82 + wobble * 0.18);
  if (combined >= 0.94) return 'mythic';
  if (combined >= 0.78) return 'legendary';
  if (combined >= 0.55) return 'epic';
  return 'rare';
}

function sectorScore(sector: SectorState): number {
  return clamp01(
    sector.corruption * 0.32 +
      sector.threat * 0.26 +
      sector.scarcity * 0.18 +
      sector.selfHealingNeed * 0.16 +
      sector.tradePressure * 0.08,
  );
}

function sectorHash(seed: string, worldHash: string, tick: number, sector: SectorState): string {
  return deterministicHash([
    'ARE_DESTINY_SECTOR',
    seed,
    worldHash,
    tick,
    sector.sectorId,
    sector.chunkX,
    sector.chunkY,
    sector.corruption.toFixed(5),
    sector.scarcity.toFixed(5),
    sector.threat.toFixed(5),
    sector.tradePressure.toFixed(5),
    sector.selfHealingNeed.toFixed(5),
  ]);
}

function chooseKind(score: number, sector: SectorState, hash: string): DestinyKind {
  const bias = hashInt(hash, 0, 100);
  if (sector.corruption >= 0.7 || bias < 22) return 'cleanse_sector';
  if (sector.selfHealingNeed >= 0.62 || bias < 44) return 'stabilize_anomaly';
  if (sector.tradePressure >= 0.58 || bias < 62) return 'deliver_forge_goods';
  if (score >= 0.82 || bias < 80) return 'defend_core_city';
  return 'recover_blueprint';
}

function requirementsFor(kind: DestinyKind, sector: SectorState, score: number, hash: string): DestinyRequirement[] {
  const scale = 1 + Math.floor(score * 4) + hashInt(hash, 8, 3);
  switch (kind) {
    case 'cleanse_sector':
      return [{ type: 'kill', targetId: `sector:${sector.sectorId}:hostile`, required: 4 + scale, current: 0 }];
    case 'deliver_forge_goods':
      return [
        {
          type: 'deliver',
          targetId: `sector:${sector.sectorId}:core-city`,
          itemId: 'sovereign_circuit',
          required: 2 + scale,
          current: 0,
        },
      ];
    case 'stabilize_anomaly':
      return [{ type: 'stabilize', targetId: `sector:${sector.sectorId}:anomaly`, required: 1 + Math.floor(scale / 2), current: 0 }];
    case 'recover_blueprint':
      return [{ type: 'recover', targetId: `sector:${sector.sectorId}:lost-cache`, required: 1, current: 0 }];
    case 'defend_core_city':
      return [{ type: 'defend', targetId: `sector:${sector.sectorId}:approach`, required: 3 + scale, current: 0 }];
    default:
      return [{ type: 'stabilize', targetId: `sector:${sector.sectorId}:grid`, required: 1, current: 0 }];
  }
}

function rewardFor(kind: DestinyKind, score: number, hash: string): DestinyReward {
  const quality = qualityFromScore(score, hash);
  const table: Record<DestinyKind, string[]> = {
    cleanse_sector: ['bp_echo_blade_t2', 'bp_guardian_edge_t3', 'bp_sunfire_cleaver_t3'],
    deliver_forge_goods: ['bp_sovereign_circuit_t2', 'bp_trade_resonator_t3', 'bp_city_grid_core_t3'],
    stabilize_anomaly: ['bp_ouroboros_anvil_core_t4', 'bp_causality_suture_t3', 'bp_heal_matrix_key_t3'],
    recover_blueprint: ['bp_lost_oracle_schema_t3', 'bp_void_cartographer_t3', 'bp_echo_compass_t2'],
    defend_core_city: ['bp_bastion_shield_t3', 'bp_warfront_anchor_t3', 'bp_crown_wall_gate_t4'],
  };
  const choices = table[kind];
  const blueprintId = choices[hashInt(hash, 20, choices.length)];
  const blueprintName = blueprintId
    .replace(/^bp_/, 'Blueprint: ')
    .replace(/_t\d+$/, '')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return {
    blueprintId,
    blueprintName,
    quality,
    guaranteeHash: deterministicHash(['ARE_DESTINY_REWARD', blueprintId, quality, hash]),
  };
}

function titleFor(kind: DestinyKind, sectorId: string): string {
  switch (kind) {
    case 'cleanse_sector':
      return `Säuberung von Sektor ${sectorId}`;
    case 'deliver_forge_goods':
      return `Liefere Sovereign Circuit nach Sektor ${sectorId}`;
    case 'stabilize_anomaly':
      return `Stabilisiere die Anomalie in Sektor ${sectorId}`;
    case 'recover_blueprint':
      return `Bergung einer verlorenen Blaupause in Sektor ${sectorId}`;
    case 'defend_core_city':
      return `Verteidige den Kernkorridor bei Sektor ${sectorId}`;
    default:
      return `Destiny-Pfad ${sectorId}`;
  }
}

export class SovereignDestinyEngine {
  generate(context: DestinyGenerationContext): DestinyPayload[] {
    const maxQuests = Math.max(1, Math.min(context.maxQuests ?? 5, 16));
    const ranked = [...context.sectors]
      .map((sector) => {
        const score = sectorScore(sector);
        const sHash = sectorHash(context.seed, context.worldHash, context.tick, sector);
        return { sector, score, sHash };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // Bolt: Optimized tie-breaker hash sorting using fast direct relational comparison instead of slow localeCompare
        return a.sHash < b.sHash ? -1 : a.sHash > b.sHash ? 1 : 0;
      })
      .slice(0, maxQuests);

    return ranked.map(({ sector, score, sHash }, index) => {
      const kind = chooseKind(score, sector, sHash);
      const destinyHash = deterministicHash(['ARE_DESTINY_PAYLOAD', context.seed, context.worldHash, context.tick, sector.sectorId, kind, index, sHash]);
      const reward = rewardFor(kind, score, destinyHash);
      const severity = severityFromScore(score);
      const expiresAtTick = context.tick + 600 + hashInt(destinyHash, 28, 600);
      const title = titleFor(kind, sector.sectorId);
      const requirements = requirementsFor(kind, sector, score, destinyHash);
      const summary = `${title} · ${severity.toUpperCase()} · reward ${reward.quality.toUpperCase()} ${reward.blueprintName}`;

      return {
        id: `destiny_${destinyHash.slice(0, 16)}`,
        kind,
        status: 'proposed',
        title,
        summary,
        sectorId: sector.sectorId,
        severity,
        createdTick: context.tick,
        expiresAtTick,
        worldHash: context.worldHash,
        sectorHash: sHash,
        destinyHash,
        requirements,
        reward,
        emilyBriefing: `Architekt Thomas, Emily erkennt einen ${severity} Riss im Grid von Sektor ${sector.sectorId}. Schicksalspfad: ${title}. Bei Erfüllung manifestiert die Kausalität garantiert ${reward.blueprintName} (${reward.quality}).`,
      } satisfies DestinyPayload;
    });
  }

  activate(payload: DestinyPayload): DestinyPayload {
    return { ...payload, status: 'active' };
  }

  applyProgress(payload: DestinyPayload, progress: DestinyProgressInput): DestinyPayload {
    const requirements = payload.requirements.map((req) => {
      if (req.type === 'kill') {
        return { ...req, current: Math.min(req.required, progress.kills?.[req.targetId] ?? req.current) };
      }
      if (req.type === 'deliver') {
        return { ...req, current: Math.min(req.required, progress.deliveries?.[req.itemId ?? req.targetId] ?? req.current) };
      }
      if (req.type === 'stabilize') {
        return { ...req, current: progress.stabilizedSectors?.includes(payload.sectorId) ? req.required : req.current };
      }
      if (req.type === 'recover') {
        return { ...req, current: progress.recoveredBlueprints?.includes(req.targetId) ? req.required : req.current };
      }
      if (req.type === 'defend') {
        return { ...req, current: progress.defendedSectors?.includes(payload.sectorId) ? req.required : req.current };
      }
      return req;
    });
    const fulfilled = requirements.every((req) => req.current >= req.required);
    return { ...payload, requirements, status: fulfilled ? 'fulfilled' : payload.status };
  }

  claimReward(payload: DestinyPayload): DestinyReward {
    if (payload.status !== 'fulfilled') {
      throw new Error(`DestinyPayload ${payload.id} is not fulfilled`);
    }
    return payload.reward;
  }
}

export const sovereignDestinyEngine = new SovereignDestinyEngine();
