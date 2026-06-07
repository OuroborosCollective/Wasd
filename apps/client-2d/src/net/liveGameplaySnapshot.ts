/**
 * LIVE GAMEPLAY SNAPSHOT CLIENT VALIDATION
 *
 * Client-side type validation for server-authoritative snapshots.
 * The client validates before applying and may display degraded fallback UI if invalid.
 *
 * Rules:
 * - Client validates snapshots before applying
 * - Client does not invent authoritative state
 * - Client may display degraded fallback UI if snapshot invalid
 * - Client render loop may interpolate visuals, but not alter server truth
 */

export interface LiveGameplaySnapshotClient {
  readonly schemaVersion: "live-gameplay-snapshot.v2";
  readonly playerId: string;
  readonly logicalIndex: number;
  readonly tickRateHz: 10;
  readonly tickMs: 100;
  readonly inventory: readonly unknown[];
  readonly equipment: readonly unknown[];
  readonly skills: readonly unknown[];
  readonly resourceNodes: readonly unknown[];
  readonly combat: {
    readonly hp: number;
    readonly maxHp: number;
    readonly stamina: number;
    readonly maxStamina: number;
    readonly targetId: string | null;
    readonly cooldowns: readonly unknown[];
  };
  readonly crafting: {
    readonly knownRecipes: readonly unknown[];
    readonly activeCraft: unknown | null;
  };
  readonly faction: {
    readonly guildId: string | null;
    readonly factionId: string | null;
    readonly reputation: readonly unknown[];
  };
  readonly world: {
    readonly chunkId: string;
    readonly biomeId: string;
    readonly safeZone: boolean;
  };
}

export function isLiveGameplaySnapshot(value: unknown): value is LiveGameplaySnapshotClient {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<LiveGameplaySnapshotClient>;

  return (
    v.schemaVersion === "live-gameplay-snapshot.v2" &&
    typeof v.playerId === "string" &&
    typeof v.logicalIndex === "number" &&
    v.tickRateHz === 10 &&
    v.tickMs === 100 &&
    Array.isArray(v.inventory) &&
    Array.isArray(v.equipment) &&
    Array.isArray(v.skills) &&
    Array.isArray(v.resourceNodes) &&
    typeof v.combat === "object" &&
    v.combat !== null &&
    typeof v.crafting === "object" &&
    v.crafting !== null &&
    typeof v.faction === "object" &&
    v.faction !== null &&
    typeof v.world === "object" &&
    v.world !== null
  );
}