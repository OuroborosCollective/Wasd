export const CAUSAL_CATCHUP_EVENT_TYPES = [
  'resource_depleted',
  'market_price_changed',
  'npc_activity_changed',
  'quest_completed',
  'combat_result',
  'governance_action',
  'legend_recorded',
] as const;

export type CausalCatchupEventType = (typeof CAUSAL_CATCHUP_EVENT_TYPES)[number];

export interface CausalCatchupEventInput {
  readonly eventId?: string | null;
  readonly type?: string | null;
  readonly tick?: number | null;
  readonly significancePerMille?: number | null;
  readonly regionId?: string | null;
  readonly chunkKey?: string | null;
  readonly payloadHash?: string | null;
}

export interface CausalCatchupEvent {
  readonly eventId: string;
  readonly type: CausalCatchupEventType;
  readonly tick: number;
  readonly significancePerMille: number;
  readonly regionId: string;
  readonly chunkKey: string;
  readonly payloadHash: string;
  readonly eventHash: string;
}

export interface CausalCatchupSummary {
  readonly eventCount: number;
  readonly firstTick: number | null;
  readonly lastTick: number | null;
  readonly events: readonly CausalCatchupEvent[];
  readonly summaryHash: string;
}

export function isCausalCatchupEventType(value: unknown): value is CausalCatchupEventType {
  return typeof value === 'string' && CAUSAL_CATCHUP_EVENT_TYPES.includes(value as CausalCatchupEventType);
}
