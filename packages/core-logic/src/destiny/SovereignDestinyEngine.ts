import { stableHash } from '../loot/ARELootEngine';

export type DestinyKind = 'cleanse_sector' | 'deliver_goods' | 'stabilize_anomaly' | 'recover_blueprint' | 'defend_city';
export type DestinyStatus = 'proposed' | 'active' | 'fulfilled';
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
}

export interface DestinyRequirement {
  type: 'kill' | 'deliver' | 'stabilize' | 'recover' | 'defend';
  targetId: string;
  required: number;
  current: number;
  itemId?: string;
}

export interface DestinyReward {
  blueprintId: string;
  blueprintName: string;
  quality: 'rare' | 'epic' | 'legendary' | 'mythic';
  guaranteeHash: string;
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

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

function hashInt(hash: string, offset: number, modulo: number): number {
  const n = Number.parseInt(hash.slice(offset, offset + 8).padEnd(8, '0'), 16);
  return modulo <= 0 ? n : n % modulo;
}

function scoreSector(sector: SectorState): number {
  return clamp01(
    sector.corruption * 0.32 +
      sector.threat * 0.26 +
      sector.scarcity * 0.18 +
      sector.selfHealingNeed * 0.16 +
      sector.tradePressure * 0.08,
  );
}

function severity(score: number): DestinySeverity {
  if (score >= 0.88) return 'critical';
  if (score >= 0.68) return 'high';
  if (score >= 0.42) return 'medium';
  return 'low';
}

function quality(score: number, hash: string): DestinyReward['quality'] {
  const mixed = clamp01(score * 0.82 + (hashInt(hash, 12, 1000) / 1000) * 0.18);
  if (mixed >= 0.94) return 'mythic';
  if (mixed >= 0.78) return 'legendary';
  if (mixed >= 0.55) return 'epic';
  return 'rare';
}

function kindFor(score: number, sector: SectorState, hash: string): DestinyKind {
  const gate = hashInt(hash, 0, 100);
  if (sector.corruption >= 0.7 || gate < 22) return 'cleanse_sector';
  if (sector.selfHealingNeed >= 0.62 || gate < 44) return 'stabilize_anomaly';
  if (sector.tradePressure >= 0.58 || gate < 62) return 'deliver_goods';
  if (score >= 0.82 || gate < 80) return 'defend_city';
  return 'recover_blueprint';
}

function titleFor(kind: DestinyKind, sectorId: string): string {
  if (kind === 'cleanse_sector') return `Cleanse sector ${sectorId}`;
  if (kind === 'deliver_goods') return `Deliver Sovereign Circuit to sector ${sectorId}`;
  if (kind === 'stabilize_anomaly') return `Stabilize anomaly in sector ${sectorId}`;
  if (kind === 'recover_blueprint') return `Recover lost blueprint in sector ${sectorId}`;
  return `Defend core corridor at sector ${sectorId}`;
}

function requirementsFor(kind: DestinyKind, sectorId: string, score: number, hash: string): DestinyRequirement[] {
  const scale = 1 + Math.floor(score * 4) + hashInt(hash, 8, 3);
  if (kind === 'cleanse_sector') return [{ type: 'kill', targetId: `sector:${sectorId}:hostile`, required: 4 + scale, current: 0 }];
  if (kind === 'deliver_goods') return [{ type: 'deliver', targetId: `sector:${sectorId}:core-city`, itemId: 'sovereign_circuit', required: 2 + scale, current: 0 }];
  if (kind === 'stabilize_anomaly') return [{ type: 'stabilize', targetId: `sector:${sectorId}:anomaly`, required: 1 + Math.floor(scale / 2), current: 0 }];
  if (kind === 'recover_blueprint') return [{ type: 'recover', targetId: `sector:${sectorId}:lost-cache`, required: 1, current: 0 }];
  return [{ type: 'defend', targetId: `sector:${sectorId}:approach`, required: 3 + scale, current: 0 }];
}

function rewardFor(kind: DestinyKind, score: number, hash: string): DestinyReward {
  const pools: Record<DestinyKind, string[]> = {
    cleanse_sector: ['bp_echo_blade_t2', 'bp_guardian_edge_t3', 'bp_sunfire_cleaver_t3'],
    deliver_goods: ['bp_sovereign_circuit_t2', 'bp_trade_resonator_t3', 'bp_city_grid_core_t3'],
    stabilize_anomaly: ['bp_ouroboros_anvil_core_t4', 'bp_causality_suture_t3', 'bp_heal_matrix_key_t3'],
    recover_blueprint: ['bp_lost_oracle_schema_t3', 'bp_void_cartographer_t3', 'bp_echo_compass_t2'],
    defend_city: ['bp_bastion_shield_t3', 'bp_warfront_anchor_t3', 'bp_crown_wall_gate_t4'],
  };
  const blueprintId = pools[kind][hashInt(hash, 20, pools[kind].length)];
  const blueprintName = blueprintId.replace(/^bp_/, 'Blueprint: ').replace(/_t\d+$/, '').replace(/_/g, ' ');
  const q = quality(score, hash);
  return {
    blueprintId,
    blueprintName,
    quality: q,
    guaranteeHash: stableHash(['ARE_DESTINY_REWARD', blueprintId, q, hash]),
  };
}

export class SovereignDestinyEngine {
  generate(context: DestinyGenerationContext): DestinyPayload[] {
    const maxQuests = Math.max(1, Math.min(context.maxQuests ?? 5, 16));
    return [...context.sectors]
      .map((sector) => {
        const score = scoreSector(sector);
        const sectorHash = stableHash(['ARE_DESTINY_SECTOR', context.seed, context.worldHash, context.tick, sector.sectorId, score.toFixed(5)]);
        return { sector, score, sectorHash };
      })
      .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.sectorHash.localeCompare(b.sectorHash)))
      .slice(0, maxQuests)
      .map(({ sector, score, sectorHash }, index) => {
        const kind = kindFor(score, sector, sectorHash);
        const destinyHash = stableHash(['ARE_DESTINY_PAYLOAD', context.seed, context.worldHash, context.tick, sector.sectorId, kind, index, sectorHash]);
        const reward = rewardFor(kind, score, destinyHash);
        const s = severity(score);
        const title = titleFor(kind, sector.sectorId);
        return {
          id: `destiny_${destinyHash.slice(0, 16)}`,
          kind,
          status: 'proposed',
          title,
          summary: `${title} · ${s.toUpperCase()} · reward ${reward.quality.toUpperCase()} ${reward.blueprintName}`,
          sectorId: sector.sectorId,
          severity: s,
          createdTick: context.tick,
          expiresAtTick: context.tick + 600 + hashInt(destinyHash, 28, 600),
          worldHash: context.worldHash,
          sectorHash,
          destinyHash,
          requirements: requirementsFor(kind, sector.sectorId, score, destinyHash),
          reward,
          emilyBriefing: `Emily identifies a ${s} grid fracture in sector ${sector.sectorId}. Path: ${title}. Fulfillment guarantees ${reward.blueprintName} (${reward.quality}).`,
        } satisfies DestinyPayload;
      });
  }

  activate(payload: DestinyPayload): DestinyPayload {
    return { ...payload, status: 'active' };
  }

  applyProgress(payload: DestinyPayload, progress: DestinyProgressInput): DestinyPayload {
    const requirements = payload.requirements.map((req) => {
      if (req.type === 'kill') return { ...req, current: Math.min(req.required, progress.kills?.[req.targetId] ?? req.current) };
      if (req.type === 'deliver') return { ...req, current: Math.min(req.required, progress.deliveries?.[req.itemId ?? req.targetId] ?? req.current) };
      if (req.type === 'stabilize') return { ...req, current: progress.stabilizedSectors?.includes(payload.sectorId) ? req.required : req.current };
      if (req.type === 'recover') return { ...req, current: progress.recoveredBlueprints?.includes(req.targetId) ? req.required : req.current };
      if (req.type === 'defend') return { ...req, current: progress.defendedSectors?.includes(payload.sectorId) ? req.required : req.current };
      return req;
    });
    return { ...payload, requirements, status: requirements.every((req) => req.current >= req.required) ? 'fulfilled' : payload.status };
  }

  claimReward(payload: DestinyPayload): DestinyReward {
    if (payload.status !== 'fulfilled') throw new Error(`DestinyPayload ${payload.id} is not fulfilled`);
    return payload.reward;
  }
}

export const sovereignDestinyEngine = new SovereignDestinyEngine();
