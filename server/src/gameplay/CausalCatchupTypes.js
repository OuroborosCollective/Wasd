export const CAUSAL_CATCHUP_EVENT_TYPES = Object.freeze([
  "resource_depleted",
  "market_price_changed",
  "npc_activity_changed",
  "quest_completed",
  "combat_result",
  "governance_action",
  "legend_recorded",
]);

export function isCausalCatchupEventType(value) {
  return CAUSAL_CATCHUP_EVENT_TYPES.includes(value);
}
