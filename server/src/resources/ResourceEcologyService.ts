import { deterministicPayloadHash } from "../core/watchdog-determinism.js";
import { loadResourceEcologyConfigFromGameData } from "./ResourceGameData.js";
import type {
  ResolvedResourceEcologyRule,
  ResourceEcologyConfig,
  ResourceEcologyExtractionInput,
  ResourceEcologyKindRule,
  ResourceEcologyNodeOverride,
  ResourceEcologyStatus,
  ResourceEcologyTickInput,
  ResourceNodeEcologySnapshot,
  ResourceNodeEcologyState,
} from "./ResourceEcologyTypes.js";
import type { ResourceKind, ResourceNodeDefinition } from "./ResourceTypes.js";

type ResourceEcologyNodeSeed = Pick<ResourceNodeDefinition, "id" | "kind">;

const PERMILLE = 1000;
const REGEN_DENOMINATOR = PERMILLE * PERMILLE;

function normalizeTick(value: number, fallback: number): number {
  if (!Number.isSafeInteger(value) || value < 0) return fallback;
  return value;
}

function normalizeUnits(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < 0) return fallback;
  return value;
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  const floored = Math.floor(value);
  if (floored < min) return min;
  if (floored > max) return max;
  return floored;
}

function stockPermille(currentStock: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return clampInteger(Math.floor((currentStock * PERMILLE) / capacity), 0, PERMILLE);
}

function ecologyStatus(state: ResourceNodeEcologyState): ResourceEcologyStatus {
  if (state.currentStock <= 0) return "empty";
  if (state.currentStock <= state.collapseThreshold) return "collapsed";
  if (stockPermille(state.currentStock, state.capacity) < 500 || state.extractionPressurePermille >= 500) {
    return "stressed";
  }
  return "healthy";
}

function compareNodeId(a: { nodeId: string }, b: { nodeId: string }): number {
  // Bolt: Optimization - Direct string comparison is significantly faster than localeCompare
  return a.nodeId < b.nodeId ? -1 : a.nodeId > b.nodeId ? 1 : 0;
}

function freezeState(state: ResourceNodeEcologyState): ResourceNodeEcologyState {
  return Object.freeze({ ...state });
}

export class ResourceEcologyService {
  private readonly rulesByKind = new Map<ResourceKind, ResourceEcologyKindRule>();
  private readonly overridesByNodeId = new Map<string, ResourceEcologyNodeOverride>();
  private readonly states = new Map<string, ResourceNodeEcologyState>();
  private readonly tickCadence: number;

  constructor(config: ResourceEcologyConfig = loadResourceEcologyConfigFromGameData()) {
    this.tickCadence = Math.max(1, config.tickCadence);
    for (const rule of config.kindRules) {
      this.rulesByKind.set(rule.kind, Object.freeze({ ...rule }));
    }
    for (const override of config.nodeOverrides) {
      this.overridesByNodeId.set(override.nodeId, Object.freeze({ ...override }));
    }
  }

  getTickCadence(): number {
    return this.tickCadence;
  }

  registerNode(definition: ResourceEcologyNodeSeed): ResourceNodeEcologySnapshot {
    const existing = this.states.get(definition.id);
    if (existing) return this.toSnapshot(existing);

    const rule = this.resolveRule(definition);
    const state: ResourceNodeEcologyState = freezeState({
      ...rule,
      currentStock: clampInteger(rule.initialStock ?? rule.capacity, 0, rule.capacity),
      extractionPressurePermille: 0,
      lastTick: 0,
      lastExtractionTick: null,
      extractionCount: 0,
    });
    this.states.set(definition.id, state);
    return this.toSnapshot(state);
  }

  registerNodes(definitions: readonly ResourceEcologyNodeSeed[]): readonly ResourceNodeEcologySnapshot[] {
    // Bolt: Optimization - Direct string comparison is significantly faster than localeCompare
    return Object.freeze([...definitions].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map((node) => this.registerNode(node)));
  }

  unregisterNode(nodeId: string): boolean {
    return this.states.delete(nodeId);
  }

  captureNodeState(nodeId: string): ResourceNodeEcologyState | null {
    const state = this.states.get(nodeId);
    return state ? freezeState(state) : null;
  }

  restoreNodeState(nodeId: string, state: ResourceNodeEcologyState | null): void {
    if (state) {
      this.states.set(nodeId, freezeState(state));
    } else {
      this.states.delete(nodeId);
    }
  }

  applyExtraction(input: ResourceEcologyExtractionInput): ResourceNodeEcologySnapshot | null {
    const current = this.states.get(input.nodeId);
    if (!current) return null;

    const currentTick = normalizeTick(input.currentTick, current.lastTick);
    const advanced = this.projectStateAt(current, currentTick);
    const units = normalizeUnits(input.units, advanced.extractionUnits);

    const next: ResourceNodeEcologyState = freezeState({
      ...advanced,
      currentStock: clampInteger(advanced.currentStock - units, 0, advanced.capacity),
      extractionPressurePermille: clampInteger(
        advanced.extractionPressurePermille + advanced.pressurePerExtractionPermille,
        0,
        PERMILLE,
      ),
      lastTick: currentTick,
      lastExtractionTick: currentTick,
      extractionCount: advanced.extractionCount + 1,
    });

    this.states.set(input.nodeId, next);
    return this.toSnapshot(next);
  }

  tick(input: ResourceEcologyTickInput | number): readonly ResourceNodeEcologySnapshot[] {
    const currentTick = typeof input === "number" ? input : input.currentTick;
    const snapshots: ResourceNodeEcologySnapshot[] = [];

    for (const nodeId of [...this.states.keys()].sort()) {
      const state = this.states.get(nodeId);
      if (!state) continue;
      const tick = normalizeTick(currentTick, state.lastTick);
      const next = this.projectStateAt(state, tick);
      this.states.set(nodeId, next);
      snapshots.push(this.toSnapshot(next));
    }

    return Object.freeze(snapshots.sort(compareNodeId));
  }

  getNodeSnapshot(nodeId: string, currentTick: number): ResourceNodeEcologySnapshot | null {
    const state = this.states.get(nodeId);
    if (!state) return null;
    return this.toSnapshot(this.projectStateAt(state, normalizeTick(currentTick, state.lastTick)));
  }

  listSnapshots(currentTick: number): readonly ResourceNodeEcologySnapshot[] {
    return Object.freeze(
      [...this.states.values()]
        .map((state) => this.toSnapshot(this.projectStateAt(state, normalizeTick(currentTick, state.lastTick))))
        .sort(compareNodeId),
    );
  }

  clearForTests(): void {
    this.states.clear();
  }

  private resolveRule(definition: ResourceEcologyNodeSeed): ResolvedResourceEcologyRule {
    const base = this.rulesByKind.get(definition.kind);
    if (!base) {
      throw new Error(`[ResourceEcologyService] Missing ecology rule for resource kind ${definition.kind}`);
    }

    const override = this.overridesByNodeId.get(definition.id);
    const capacity = override?.capacity ?? base.capacity;
    const initialStock = override?.initialStock ?? base.initialStock ?? capacity;
    const collapseThreshold = override?.collapseThreshold ?? base.collapseThreshold;

    return Object.freeze({
      kind: definition.kind,
      nodeId: definition.id,
      capacity,
      initialStock: clampInteger(initialStock, 0, capacity),
      regenPerTick: override?.regenPerTick ?? base.regenPerTick,
      extractionUnits: override?.extractionUnits ?? base.extractionUnits,
      pressurePerExtractionPermille: override?.extractionPressurePermille ?? base.extractionPressurePermille,
      pressureDecayPermillePerTick: override?.pressureDecayPermillePerTick ?? base.pressureDecayPermillePerTick,
      collapseThreshold: clampInteger(collapseThreshold, 0, capacity),
      collapseRegenPermille: override?.collapseRegenPermille ?? base.collapseRegenPermille,
    });
  }

  private projectStateAt(state: ResourceNodeEcologyState, currentTick: number): ResourceNodeEcologyState {
    if (currentTick <= state.lastTick) return state;

    const elapsed = currentTick - state.lastTick;
    const pressure = clampInteger(
      state.extractionPressurePermille - elapsed * state.pressureDecayPermillePerTick,
      0,
      PERMILLE,
    );
    const collapseMultiplier = state.currentStock <= state.collapseThreshold
      ? state.collapseRegenPermille
      : PERMILLE;
    const pressureMultiplier = PERMILLE - pressure;
    const regen = Math.floor((elapsed * state.regenPerTick * collapseMultiplier * pressureMultiplier) / REGEN_DENOMINATOR);

    return freezeState({
      ...state,
      currentStock: clampInteger(state.currentStock + regen, 0, state.capacity),
      extractionPressurePermille: pressure,
      lastTick: currentTick,
    });
  }

  private toSnapshot(state: ResourceNodeEcologyState): ResourceNodeEcologySnapshot {
    const snapshot = {
      nodeId: state.nodeId,
      kind: state.kind,
      capacity: state.capacity,
      currentStock: state.currentStock,
      stockPermille: stockPermille(state.currentStock, state.capacity),
      regenPerTick: state.regenPerTick,
      extractionUnits: state.extractionUnits,
      pressurePerExtractionPermille: state.pressurePerExtractionPermille,
      extractionPressurePermille: state.extractionPressurePermille,
      pressureDecayPermillePerTick: state.pressureDecayPermillePerTick,
      collapseThreshold: state.collapseThreshold,
      collapseRegenPermille: state.collapseRegenPermille,
      collapseActive: state.currentStock <= state.collapseThreshold,
      status: ecologyStatus(state),
      lastTick: state.lastTick,
      lastExtractionTick: state.lastExtractionTick,
      extractionCount: state.extractionCount,
    } satisfies Omit<ResourceNodeEcologySnapshot, "hash">;

    return Object.freeze({
      ...snapshot,
      hash: deterministicPayloadHash(snapshot),
    });
  }
}

export const resourceEcologyService = new ResourceEcologyService();
