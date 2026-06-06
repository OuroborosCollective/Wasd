/**
 * IndustrialEntity.ts
 * 
 * Deterministischer Entity-Grundvertrag für 10Hz-WorldTick.
 * Keine direkte Mutation ohne Tick-Kontext.
 */

export type EntityId = string & { readonly __brand: "EntityId" };
export type LogicalIndex = number & { readonly __brand: "LogicalIndex" };
export type KappaPos = number & { readonly __brand: "KappaPos" };
export type Resonance = number & { readonly __brand: "Resonance" };
export type UnixMs = number & { readonly __brand: "UnixMs" };

export type PersistenceDriver =
  | "file"
  | "memory"
  | "redis"
  | "postgres"
  | "none";

export interface IndustrialEntity {
  /**
   * Stabile Entity-ID.
   * Darf sich niemals durch Tick-Updates ändern.
   */
  readonly id: EntityId;

  /**
   * Deterministischer Simulationsindex.
   * Muss monoton steigen.
   */
  readonly logicalIndex: LogicalIndex;

  /**
   * Positions-/Zustandsanker im ARE/Kappa-Raum.
   * Kein freier Float-Müll ohne Normalisierung.
   */
  readonly kappaPos: KappaPos;

  /**
   * Resonanzwert für Heuristik, NPC-Verhalten, Weltreaktion.
   * Sollte clampbar und deterministisch berechenbar bleiben.
   */
  readonly resonance: Resonance;

  /**
   * Letzter deterministischer Update-Zeitpunkt.
   * Besser: Tick-Zeit aus logicalIndex ableiten, nicht aus Date.now().
   */
  readonly lastUpdate: UnixMs;
}

export interface IndustrialEntitySnapshot {
  readonly tick: LogicalIndex;
  readonly entity: IndustrialEntity;
  readonly checksum: string;
}

export interface IndustrialEntityPatch {
  readonly id: EntityId;
  readonly fromLogicalIndex: LogicalIndex;
  readonly toLogicalIndex: LogicalIndex;
  readonly deltaKappaPos?: number;
  readonly deltaResonance?: number;
}

/**
 * Runtime Guards
 */

export function asEntityId(value: string): EntityId {
  if (!value || value.trim().length < 2) {
    throw new Error("Invalid EntityId");
  }

  return value as EntityId;
}

export function asLogicalIndex(value: number): LogicalIndex {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid LogicalIndex: ${value}`);
  }

  return value as LogicalIndex;
}

export function asKappaPos(value: number): KappaPos {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid KappaPos: ${value}`);
  }

  return value as KappaPos;
}

export function asResonance(value: number): Resonance {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid Resonance: ${value}`);
  }

  return value as Resonance;
}

export function asUnixMs(value: number): UnixMs {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid UnixMs: ${value}`);
  }

  return value as UnixMs;
}

/**
 * Deterministischer Tick-Update.
 * Wichtig: Kein Date.now() im Simulationskern.
 */
export function updateIndustrialEntity(
  entity: IndustrialEntity,
  patch: IndustrialEntityPatch,
): IndustrialEntity {
  if (patch.id !== entity.id) {
    throw new Error(`Patch/entity mismatch: ${patch.id} !== ${entity.id}`);
  }

  if (patch.fromLogicalIndex !== entity.logicalIndex) {
    throw new Error(
      `LogicalIndex mismatch. Entity=${entity.logicalIndex}, Patch=${patch.fromLogicalIndex}`,
    );
  }

  if (patch.toLogicalIndex <= patch.fromLogicalIndex) {
    throw new Error(
      `Invalid tick transition: ${patch.fromLogicalIndex} -> ${patch.toLogicalIndex}`,
    );
  }

  const nextKappaPos = asKappaPos(
    entity.kappaPos + (patch.deltaKappaPos ?? 0),
  );

  const nextResonance = asResonance(
    entity.resonance + (patch.deltaResonance ?? 0),
  );

  return {
    ...entity,
    logicalIndex: patch.toLogicalIndex,
    kappaPos: nextKappaPos,
    resonance: nextResonance,

    /**
     * Bei 10Hz:
     * tick 0 = 0ms
     * tick 1 = 100ms
     * tick 2 = 200ms
     */
    lastUpdate: asUnixMs(patch.toLogicalIndex * 100),
  };
}
