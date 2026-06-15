/**
 * RESOURCE ECOLOGY TYPES
 *
 * Deterministic Kappa1000 resource pool contracts for server-side gathering truth.
 * All values are integer simulation values derived from tick, node id and game-data.
 */

import type { ResourceKind, ResourceNodeDefinition } from "./ResourceTypes.js";

export const RESOURCE_ECOLOGY_SCHEMA_VERSION = 1 as const;
export const RESOURCE_ECOLOGY_KAPPA = 1000 as const;

export type ResourceEcologyStatus = "healthy" | "stressed" | "collapsed" | "empty";

export interface ResourceEcologyKindRule {
  readonly kind: ResourceKind;
  /** Maximum stock in Kappa1000 units. */
  readonly capacity: number;
  /** Optional starting stock in Kappa1000 units. Defaults to capacity. */
  readonly initialStock?: number;
  /** Regeneration per 10Hz tick in Kappa1000 units before pressure/collapse modifiers. */
  readonly regenPerTick: number;
  /** Stock consumed by one successful gather in Kappa1000 units. */
  readonly extractionUnits: number;
  /** Pressure added by one successful gather, 0..1000. */
  readonly extractionPressurePermille: number;
  /** Pressure removed per tick, 0..1000. */
  readonly pressureDecayPermillePerTick: number;
  /** Stock threshold at or below which collapse regeneration applies. */
  readonly collapseThreshold: number;
  /** Regeneration multiplier while collapsed, 0..1000. */
  readonly collapseRegenPermille: number;
}

export interface ResourceEcologyNodeOverride {
  readonly nodeId: string;
  readonly capacity?: number;
  readonly initialStock?: number;
  readonly regenPerTick?: number;
  readonly extractionUnits?: number;
  readonly extractionPressurePermille?: number;
  readonly pressureDecayPermillePerTick?: number;
  readonly collapseThreshold?: number;
  readonly collapseRegenPermille?: number;
}

export interface ResourceEcologyConfig {
  readonly schemaVersion: typeof RESOURCE_ECOLOGY_SCHEMA_VERSION;
  /** Tick cadence for the resource-economy TickSystem. */
  readonly tickCadence: number;
  readonly kindRules: readonly ResourceEcologyKindRule[];
  readonly nodeOverrides: readonly ResourceEcologyNodeOverride[];
}

export interface ResolvedResourceEcologyRule extends ResourceEcologyKindRule {
  readonly nodeId: string;
}

export interface ResourceNodeEcologyState extends ResolvedResourceEcologyRule {
  readonly currentStock: number;
  readonly extractionPressurePermille: number;
  readonly lastTick: number;
  readonly lastExtractionTick: number | null;
  readonly extractionCount: number;
}

export interface ResourceNodeEcologySnapshot {
  readonly nodeId: string;
  readonly kind: ResourceKind;
  readonly capacity: number;
  readonly currentStock: number;
  readonly stockPermille: number;
  readonly regenPerTick: number;
  readonly extractionUnits: number;
  readonly extractionPressurePermille: number;
  readonly pressureDecayPermillePerTick: number;
  readonly collapseThreshold: number;
  readonly collapseRegenPermille: number;
  readonly collapseActive: boolean;
  readonly status: ResourceEcologyStatus;
  readonly lastTick: number;
  readonly lastExtractionTick: number | null;
  readonly extractionCount: number;
  readonly hash: string;
}

export interface ResourceEcologyExtractionInput {
  readonly nodeId: ResourceNodeDefinition["id"];
  readonly currentTick: number;
  readonly units?: number;
  readonly actorId?: string;
}

export interface ResourceEcologyTickInput {
  readonly currentTick: number;
}
