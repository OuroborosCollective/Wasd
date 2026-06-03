/**
 * TriangulationProcessor — deterministic 10Hz triangle resonance engine.
 *
 * Hard rules for ARE-style deterministic simulation:
 * - tickIndex is the only time base.
 * - 10 ticks = 1 second when driven by the server loop.
 * - No Date.now().
 * - No random source.
 * - No Math.* calls.
 * - Stable ordering for replay, rollback, anti-cheat and server validation.
 */

export interface Vector2 {
  x: number;
  y: number;
}

export interface Node {
  id: string;
  position: Vector2;
  power?: number;
  kind?: "default" | "player" | "npc" | "crystal" | "rift" | "totem" | "structure";
  factionId?: string;
}

export interface Edge {
  nodeA: string;
  nodeB: string;
  power?: number;
  kind?: "default" | "energy" | "blood" | "arcane" | "guild" | "structure";
}

export interface TriangulationExplosionEvent {
  type: "TRIANGULATION_EXPLOSION";
  tickIndex: number;
  triangleKey: string;
  center: Vector2;
  consumedNodeIds: string[];
  consumedEdgeKeys: string[];
  burstDamage: number;
  resonanceEnergy: number;
  area: number;
  perimeter: number;
  compactness: number;
  radius: number;
  chainIndex: number;
  chainMultiplier: number;
  diagnostics: {
    nodePowerAverage: number;
    edgePowerAverage: number;
    rawDamage: number;
    clampedDamage: number;
    wasDamageClamped: boolean;
  };
}

export type ExplosionCallback = (event: TriangulationExplosionEvent) => void;

export type TriangleSelectionMode =
  | "largest_area_first"
  | "highest_damage_first"
  | "lowest_key_first"
  | "compact_first";

export type NodeConsumptionMode = "none" | "once_per_process" | "once_per_cooldown_window";

export interface TriangulationProcessorOptions {
  baseBurstDamage?: number;
  triangleDamageMultiplier?: number;
  nodePowerWeight?: number;
  edgePowerWeight?: number;
  areaWeight?: number;
  compactnessWeight?: number;
  chainMultiplierStep?: number;
  maxChainMultiplier?: number;
  minTriangleArea?: number;
  maxTriangleArea?: number;
  maxExplosionsPerProcess?: number;
  maxTriangleCandidates?: number;
  selectionMode?: TriangleSelectionMode;
  nodeConsumptionMode?: NodeConsumptionMode;
  triangleCooldownTicks?: number;
  nodeCooldownTicks?: number;
  consumeEdges?: boolean;
  baseRadius?: number;
  radiusAreaScale?: number;
  minRadius?: number;
  maxRadius?: number;
  minDamage?: number;
  maxDamage?: number;
  defensiveCopy?: boolean;
  strictOptions?: boolean;
}

export interface TriangulationProcessContext {
  /** Deterministic server/simulation tick. At 10Hz: 10 ticks = 1 second. */
  tickIndex?: number;
  scopeKey?: string;
  worldEnergyMultiplier?: number;
  damageMultiplier?: number;
}

export interface TriangulationProcessResult {
  tickIndex: number;
  scopeKey: string;
  inputNodeCount: number;
  inputEdgeCount: number;
  validNodeCount: number;
  validEdgeCount: number;
  triangleCandidateCount: number;
  emittedExplosionCount: number;
  skippedByCooldown: number;
  skippedByNodeConsumption: number;
  skippedByArea: number;
  skippedByCandidateLimit: number;
  warnings: string[];
  emittedTriangleKeys: string[];
}

type NodeKind = NonNullable<Node["kind"]>;
type EdgeKind = NonNullable<Edge["kind"]>;

interface NormalizedNode extends Node {
  power: number;
  kind: NodeKind;
}

interface NormalizedEdge extends Edge {
  power: number;
  kind: EdgeKind;
  key: string;
}

interface NormalizedGraph {
  nodes: NormalizedNode[];
  nodeMap: Map<string, NormalizedNode>;
  edgeMap: Map<string, NormalizedEdge>;
  adjacency: Map<string, Set<string>>;
}

interface TriangleCandidate {
  a: NormalizedNode;
  b: NormalizedNode;
  c: NormalizedNode;
  key: string;
  edgeKeys: [string, string, string];
  area: number;
  perimeter: number;
  compactness: number;
  nodePowerAverage: number;
  edgePowerAverage: number;
  resonanceEnergy: number;
  estimatedDamage: number;
  radius: number;
}

interface NormalizedOptions {
  baseBurstDamage: number;
  triangleDamageMultiplier: number;
  nodePowerWeight: number;
  edgePowerWeight: number;
  areaWeight: number;
  compactnessWeight: number;
  chainMultiplierStep: number;
  maxChainMultiplier: number;
  minTriangleArea: number;
  maxTriangleArea: number;
  maxExplosionsPerProcess: number;
  maxTriangleCandidates: number;
  selectionMode: TriangleSelectionMode;
  nodeConsumptionMode: NodeConsumptionMode;
  triangleCooldownTicks: number;
  nodeCooldownTicks: number;
  consumeEdges: boolean;
  baseRadius: number;
  radiusAreaScale: number;
  minRadius: number;
  maxRadius: number;
  minDamage: number;
  maxDamage: number;
  defensiveCopy: boolean;
  strictOptions: boolean;
}

export class TriangulationProcessor {
  private readonly onExplosion: ExplosionCallback;
  private readonly options: NormalizedOptions;
  private readonly triangleCooldownMemory = new Map<string, number>();
  private readonly nodeCooldownMemory = new Map<string, number>();

  public constructor(explosionCallback: ExplosionCallback, options: TriangulationProcessorOptions = {}) {
    this.onExplosion = explosionCallback;
    this.options = this.normalizeOptions(options);
  }

  public process(
    nodes: readonly Node[],
    edges: readonly Edge[],
    context: TriangulationProcessContext = {},
  ): TriangulationProcessResult {
    const tickIndex = this.toNonNegativeInteger(context.tickIndex ?? 0, 0);
    const scopeKey = context.scopeKey ?? "default";
    const worldEnergyMultiplier = this.toFiniteNumber(context.worldEnergyMultiplier ?? 1, 1);
    const damageMultiplier = this.toFiniteNumber(context.damageMultiplier ?? 1, 1);

    const result: TriangulationProcessResult = {
      tickIndex,
      scopeKey,
      inputNodeCount: nodes.length,
      inputEdgeCount: edges.length,
      validNodeCount: 0,
      validEdgeCount: 0,
      triangleCandidateCount: 0,
      emittedExplosionCount: 0,
      skippedByCooldown: 0,
      skippedByNodeConsumption: 0,
      skippedByArea: 0,
      skippedByCandidateLimit: 0,
      warnings: [],
      emittedTriangleKeys: [],
    };

    if (nodes.length < 3) {
      result.warnings.push("TRIANGULATION_SKIPPED_NOT_ENOUGH_NODES");
      return result;
    }

    if (edges.length < 3) {
      result.warnings.push("TRIANGULATION_SKIPPED_NOT_ENOUGH_EDGES");
      return result;
    }

    if (this.options.maxExplosionsPerProcess <= 0) {
      result.warnings.push("TRIANGULATION_SKIPPED_MAX_EXPLOSIONS_ZERO");
      return result;
    }

    const graph = this.buildNormalizedGraph(nodes, edges, result);
    result.validNodeCount = graph.nodes.length;
    result.validEdgeCount = graph.edgeMap.size;

    if (graph.nodes.length < 3 || graph.edgeMap.size < 3) {
      result.warnings.push("TRIANGULATION_SKIPPED_NORMALIZED_GRAPH_TOO_SMALL");
      return result;
    }

    const candidates = this.findTriangleCandidates(graph, worldEnergyMultiplier, damageMultiplier, result);
    result.triangleCandidateCount = candidates.length;

    if (candidates.length === 0) {
      this.pruneCooldownMemory(tickIndex);
      return result;
    }

    this.sortCandidates(candidates);

    const consumedThisProcess = new Set<string>();
    let chainIndex = 0;

    for (const candidate of candidates) {
      if (result.emittedExplosionCount >= this.options.maxExplosionsPerProcess) {
        result.warnings.push("TRIANGULATION_EMIT_LIMIT_REACHED");
        break;
      }

      if (this.isTriangleOnCooldown(candidate.key, tickIndex)) {
        result.skippedByCooldown++;
        continue;
      }

      const candidateNodeIds = [candidate.a.id, candidate.b.id, candidate.c.id];

      if (
        this.options.nodeConsumptionMode === "once_per_process" &&
        this.anyNodeInSet(candidateNodeIds, consumedThisProcess)
      ) {
        result.skippedByNodeConsumption++;
        continue;
      }

      if (
        this.options.nodeConsumptionMode === "once_per_cooldown_window" &&
        this.anyNodeOnCooldown(candidateNodeIds, tickIndex)
      ) {
        result.skippedByNodeConsumption++;
        continue;
      }

      const chainMultiplier = this.calculateChainMultiplier(chainIndex);
      const rawDamage = candidate.estimatedDamage * chainMultiplier;
      const clampedDamage = this.clamp(rawDamage, this.options.minDamage, this.options.maxDamage);
      const wasDamageClamped = rawDamage !== clampedDamage;

      this.onExplosion({
        type: "TRIANGULATION_EXPLOSION",
        tickIndex,
        triangleKey: candidate.key,
        center: this.calculateGeometricCenter([candidate.a, candidate.b, candidate.c]),
        consumedNodeIds: candidateNodeIds,
        consumedEdgeKeys: this.options.consumeEdges ? [candidate.edgeKeys[0], candidate.edgeKeys[1], candidate.edgeKeys[2]] : [],
        burstDamage: clampedDamage,
        resonanceEnergy: candidate.resonanceEnergy,
        area: candidate.area,
        perimeter: candidate.perimeter,
        compactness: candidate.compactness,
        radius: candidate.radius,
        chainIndex,
        chainMultiplier,
        diagnostics: {
          nodePowerAverage: candidate.nodePowerAverage,
          edgePowerAverage: candidate.edgePowerAverage,
          rawDamage,
          clampedDamage,
          wasDamageClamped,
        },
      });

      this.triangleCooldownMemory.set(candidate.key, tickIndex);

      for (const nodeId of candidateNodeIds) {
        consumedThisProcess.add(nodeId);
        this.nodeCooldownMemory.set(nodeId, tickIndex);
      }

      result.emittedExplosionCount++;
      result.emittedTriangleKeys.push(candidate.key);
      chainIndex++;
    }

    this.pruneCooldownMemory(tickIndex);
    return result;
  }

  public resetMemory(): void {
    this.triangleCooldownMemory.clear();
    this.nodeCooldownMemory.clear();
  }

  public getMemorySnapshot(): {
    triangleCooldowns: ReadonlyArray<readonly [string, number]>;
    nodeCooldowns: ReadonlyArray<readonly [string, number]>;
  } {
    return {
      triangleCooldowns: [...this.triangleCooldownMemory.entries()].sort((a, b) => this.compareIds(a[0], b[0])),
      nodeCooldowns: [...this.nodeCooldownMemory.entries()].sort((a, b) => this.compareIds(a[0], b[0])),
    };
  }

  private buildNormalizedGraph(
    nodes: readonly Node[],
    edges: readonly Edge[],
    result: TriangulationProcessResult,
  ): NormalizedGraph {
    const nodeMap = new Map<string, NormalizedNode>();
    const adjacency = new Map<string, Set<string>>();
    const edgeMap = new Map<string, NormalizedEdge>();
    const sourceNodes = this.options.defensiveCopy ? [...nodes] : nodes;

    for (const node of sourceNodes) {
      if (!this.isValidNode(node)) {
        result.warnings.push("INVALID_NODE_IGNORED");
        continue;
      }

      if (nodeMap.has(node.id)) {
        result.warnings.push(`DUPLICATE_NODE_ID_IGNORED:${node.id}`);
        continue;
      }

      const normalized: NormalizedNode = {
        id: node.id,
        position: {
          x: node.position.x,
          y: node.position.y,
        },
        power: this.toFiniteNumber(node.power ?? 1, 1),
        kind: node.kind ?? "default",
        factionId: node.factionId,
      };

      nodeMap.set(normalized.id, normalized);
      adjacency.set(normalized.id, new Set<string>());
    }

    const sourceEdges = this.options.defensiveCopy ? [...edges] : edges;

    for (const edge of sourceEdges) {
      if (!this.isValidEdge(edge)) {
        result.warnings.push("INVALID_EDGE_IGNORED");
        continue;
      }

      if (edge.nodeA === edge.nodeB) {
        result.warnings.push(`SELF_EDGE_IGNORED:${edge.nodeA}`);
        continue;
      }

      if (!nodeMap.has(edge.nodeA) || !nodeMap.has(edge.nodeB)) {
        result.warnings.push(`EDGE_WITH_UNKNOWN_NODE_IGNORED:${edge.nodeA}:${edge.nodeB}`);
        continue;
      }

      const key = this.makeEdgeKey(edge.nodeA, edge.nodeB);

      if (edgeMap.has(key)) {
        result.warnings.push(`DUPLICATE_EDGE_IGNORED:${key}`);
        continue;
      }

      const normalized: NormalizedEdge = {
        nodeA: edge.nodeA,
        nodeB: edge.nodeB,
        power: this.toFiniteNumber(edge.power ?? 1, 1),
        kind: edge.kind ?? "default",
        key,
      };

      edgeMap.set(key, normalized);
      adjacency.get(edge.nodeA)!.add(edge.nodeB);
      adjacency.get(edge.nodeB)!.add(edge.nodeA);
    }

    return {
      nodes: [...nodeMap.values()].sort((a, b) => this.compareIds(a.id, b.id)),
      nodeMap,
      edgeMap,
      adjacency,
    };
  }

  private findTriangleCandidates(
    graph: NormalizedGraph,
    worldEnergyMultiplier: number,
    damageMultiplier: number,
    result: TriangulationProcessResult,
  ): TriangleCandidate[] {
    const candidates: TriangleCandidate[] = [];
    const ids = graph.nodes.map((node) => node.id).sort((a, b) => this.compareIds(a, b));

    outer: for (let i = 0; i < ids.length; i++) {
      const idA = ids[i];
      const neighborsA = graph.adjacency.get(idA);
      if (!neighborsA || neighborsA.size < 2) continue;

      for (let j = i + 1; j < ids.length; j++) {
        const idB = ids[j];
        if (!neighborsA.has(idB)) continue;

        const neighborsB = graph.adjacency.get(idB);
        if (!neighborsB || neighborsB.size < 2) continue;

        for (let k = j + 1; k < ids.length; k++) {
          const idC = ids[k];
          if (!neighborsA.has(idC)) continue;
          if (!neighborsB.has(idC)) continue;

          const a = graph.nodeMap.get(idA);
          const b = graph.nodeMap.get(idB);
          const c = graph.nodeMap.get(idC);
          if (!a || !b || !c) continue;

          const edgeAB = graph.edgeMap.get(this.makeEdgeKey(idA, idB));
          const edgeAC = graph.edgeMap.get(this.makeEdgeKey(idA, idC));
          const edgeBC = graph.edgeMap.get(this.makeEdgeKey(idB, idC));
          if (!edgeAB || !edgeAC || !edgeBC) continue;

          const area = this.calculateTriangleArea(a, b, c);

          if (area < this.options.minTriangleArea) {
            result.skippedByArea++;
            continue;
          }

          if (this.options.maxTriangleArea > 0 && area > this.options.maxTriangleArea) {
            result.skippedByArea++;
            continue;
          }

          const perimeter = this.calculateTrianglePerimeter(a, b, c);
          const compactness = this.calculateCompactness(area, perimeter);
          const nodePowerAverage = (a.power + b.power + c.power) / 3;
          const edgePowerAverage = (edgeAB.power + edgeAC.power + edgeBC.power) / 3;
          const resonanceEnergy = this.calculateResonanceEnergy({
            area,
            perimeter,
            compactness,
            nodePowerAverage,
            edgePowerAverage,
            worldEnergyMultiplier,
          });
          const estimatedDamage =
            this.options.baseBurstDamage *
            this.options.triangleDamageMultiplier *
            resonanceEnergy *
            damageMultiplier;

          candidates.push({
            a,
            b,
            c,
            key: this.makeTriangleKey(idA, idB, idC),
            edgeKeys: [edgeAB.key, edgeAC.key, edgeBC.key],
            area,
            perimeter,
            compactness,
            nodePowerAverage,
            edgePowerAverage,
            resonanceEnergy,
            estimatedDamage,
            radius: this.calculateExplosionRadius(area),
          });

          if (candidates.length >= this.options.maxTriangleCandidates) {
            result.skippedByCandidateLimit++;
            result.warnings.push("TRIANGULATION_CANDIDATE_LIMIT_REACHED");
            break outer;
          }
        }
      }
    }

    return candidates;
  }

  private sortCandidates(candidates: TriangleCandidate[]): void {
    const byKey = (a: TriangleCandidate, b: TriangleCandidate) => this.compareIds(a.key, b.key);

    candidates.sort((a, b) => {
      if (this.options.selectionMode === "largest_area_first") {
        const delta = b.area - a.area;
        return delta !== 0 ? delta : byKey(a, b);
      }

      if (this.options.selectionMode === "highest_damage_first") {
        const delta = b.estimatedDamage - a.estimatedDamage;
        return delta !== 0 ? delta : byKey(a, b);
      }

      if (this.options.selectionMode === "compact_first") {
        const delta = b.compactness - a.compactness;
        return delta !== 0 ? delta : byKey(a, b);
      }

      return byKey(a, b);
    });
  }

  private calculateResonanceEnergy(input: {
    area: number;
    perimeter: number;
    compactness: number;
    nodePowerAverage: number;
    edgePowerAverage: number;
    worldEnergyMultiplier: number;
  }): number {
    const areaRoot = this.sqrtDeterministic(this.positive(input.area));
    const areaTerm = 1 + areaRoot * this.options.areaWeight;
    const compactnessTerm = 1 + input.compactness * this.options.compactnessWeight;
    const nodePowerTerm = 1 + this.positive(input.nodePowerAverage - 1) * this.options.nodePowerWeight;
    const edgePowerTerm = 1 + this.positive(input.edgePowerAverage - 1) * this.options.edgePowerWeight;
    const perimeterPenalty = input.perimeter > 0 ? 1 / (1 + input.perimeter * 0.0025) : 1;

    return this.positive(
      areaTerm *
        compactnessTerm *
        nodePowerTerm *
        edgePowerTerm *
        perimeterPenalty *
        input.worldEnergyMultiplier,
    );
  }

  private calculateExplosionRadius(area: number): number {
    const raw = this.options.baseRadius + this.sqrtDeterministic(this.positive(area)) * this.options.radiusAreaScale;
    return this.clamp(raw, this.options.minRadius, this.options.maxRadius);
  }

  private calculateChainMultiplier(chainIndex: number): number {
    const raw = 1 + chainIndex * this.options.chainMultiplierStep;
    return this.clamp(raw, 1, this.options.maxChainMultiplier);
  }

  private calculateGeometricCenter(nodes: readonly NormalizedNode[]): Vector2 {
    let sumX = 0;
    let sumY = 0;

    for (const node of nodes) {
      sumX += node.position.x;
      sumY += node.position.y;
    }

    return {
      x: sumX / nodes.length,
      y: sumY / nodes.length,
    };
  }

  private calculateTriangleArea(a: Node, b: Node, c: Node): number {
    const doubleArea =
      a.position.x * (b.position.y - c.position.y) +
      b.position.x * (c.position.y - a.position.y) +
      c.position.x * (a.position.y - b.position.y);

    return this.abs(doubleArea) / 2;
  }

  private calculateTrianglePerimeter(a: Node, b: Node, c: Node): number {
    return (
      this.distance(a.position, b.position) +
      this.distance(b.position, c.position) +
      this.distance(c.position, a.position)
    );
  }

  private calculateCompactness(area: number, perimeter: number): number {
    if (perimeter <= 0) return 0;

    const sqrtThreeApprox = 1.7320508075688772;
    const raw = (4 * sqrtThreeApprox * area) / (perimeter * perimeter);
    return this.clamp(raw, 0, 1);
  }

  private distance(a: Vector2, b: Vector2): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return this.sqrtDeterministic(dx * dx + dy * dy);
  }

  private isTriangleOnCooldown(triangleKey: string, tickIndex: number): boolean {
    const lastTick = this.triangleCooldownMemory.get(triangleKey);
    if (lastTick === undefined) return false;

    return tickIndex - lastTick < this.options.triangleCooldownTicks;
  }

  private isNodeOnCooldown(nodeId: string, tickIndex: number): boolean {
    const lastTick = this.nodeCooldownMemory.get(nodeId);
    if (lastTick === undefined) return false;

    return tickIndex - lastTick < this.options.nodeCooldownTicks;
  }

  private anyNodeInSet(nodeIds: readonly string[], set: ReadonlySet<string>): boolean {
    for (const nodeId of nodeIds) {
      if (set.has(nodeId)) return true;
    }
    return false;
  }

  private anyNodeOnCooldown(nodeIds: readonly string[], tickIndex: number): boolean {
    for (const nodeId of nodeIds) {
      if (this.isNodeOnCooldown(nodeId, tickIndex)) return true;
    }
    return false;
  }

  private pruneCooldownMemory(tickIndex: number): void {
    const triangleKeepTicks = this.positiveInteger(this.options.triangleCooldownTicks * 4, 1);
    const nodeKeepTicks = this.positiveInteger(this.options.nodeCooldownTicks * 4, 1);

    for (const [key, lastTick] of this.triangleCooldownMemory.entries()) {
      if (tickIndex - lastTick > triangleKeepTicks) {
        this.triangleCooldownMemory.delete(key);
      }
    }

    for (const [key, lastTick] of this.nodeCooldownMemory.entries()) {
      if (tickIndex - lastTick > nodeKeepTicks) {
        this.nodeCooldownMemory.delete(key);
      }
    }
  }

  private normalizeOptions(options: TriangulationProcessorOptions): NormalizedOptions {
    const normalized: NormalizedOptions = {
      baseBurstDamage: this.toFiniteNumber(options.baseBurstDamage ?? 100, 100),
      triangleDamageMultiplier: this.toFiniteNumber(options.triangleDamageMultiplier ?? 1.5, 1.5),
      nodePowerWeight: this.toFiniteNumber(options.nodePowerWeight ?? 0.25, 0.25),
      edgePowerWeight: this.toFiniteNumber(options.edgePowerWeight ?? 0.15, 0.15),
      areaWeight: this.toFiniteNumber(options.areaWeight ?? 0.08, 0.08),
      compactnessWeight: this.toFiniteNumber(options.compactnessWeight ?? 0.35, 0.35),
      chainMultiplierStep: this.toFiniteNumber(options.chainMultiplierStep ?? 0.08, 0.08),
      maxChainMultiplier: this.toFiniteNumber(options.maxChainMultiplier ?? 2.5, 2.5),
      minTriangleArea: this.positive(this.toFiniteNumber(options.minTriangleArea ?? 0.000001, 0.000001)),
      maxTriangleArea: this.positive(this.toFiniteNumber(options.maxTriangleArea ?? 0, 0)),
      maxExplosionsPerProcess: this.toNonNegativeInteger(options.maxExplosionsPerProcess ?? 64, 64),
      maxTriangleCandidates: this.toNonNegativeInteger(options.maxTriangleCandidates ?? 2048, 2048),
      selectionMode: options.selectionMode ?? "highest_damage_first",
      nodeConsumptionMode: options.nodeConsumptionMode ?? "once_per_process",
      triangleCooldownTicks: this.toNonNegativeInteger(options.triangleCooldownTicks ?? 10, 10),
      nodeCooldownTicks: this.toNonNegativeInteger(options.nodeCooldownTicks ?? 10, 10),
      consumeEdges: options.consumeEdges ?? true,
      baseRadius: this.toFiniteNumber(options.baseRadius ?? 4, 4),
      radiusAreaScale: this.toFiniteNumber(options.radiusAreaScale ?? 0.12, 0.12),
      minRadius: this.toFiniteNumber(options.minRadius ?? 2, 2),
      maxRadius: this.toFiniteNumber(options.maxRadius ?? 24, 24),
      minDamage: this.toFiniteNumber(options.minDamage ?? 1, 1),
      maxDamage: this.toFiniteNumber(options.maxDamage ?? 100000, 100000),
      defensiveCopy: options.defensiveCopy ?? true,
      strictOptions: options.strictOptions ?? false,
    };

    if (normalized.maxRadius < normalized.minRadius) {
      const oldMin = normalized.minRadius;
      normalized.minRadius = normalized.maxRadius;
      normalized.maxRadius = oldMin;
    }

    if (normalized.maxDamage < normalized.minDamage) {
      const oldMin = normalized.minDamage;
      normalized.minDamage = normalized.maxDamage;
      normalized.maxDamage = oldMin;
    }

    if (normalized.strictOptions) {
      this.assertPositive("baseBurstDamage", normalized.baseBurstDamage);
      this.assertPositive("triangleDamageMultiplier", normalized.triangleDamageMultiplier);
      this.assertPositive("maxExplosionsPerProcess", normalized.maxExplosionsPerProcess);
      this.assertPositive("maxTriangleCandidates", normalized.maxTriangleCandidates);
    }

    return normalized;
  }

  private isValidNode(node: Node): boolean {
    return (
      !!node &&
      typeof node.id === "string" &&
      node.id.length > 0 &&
      !!node.position &&
      Number.isFinite(node.position.x) &&
      Number.isFinite(node.position.y)
    );
  }

  private isValidEdge(edge: Edge): boolean {
    return (
      !!edge &&
      typeof edge.nodeA === "string" &&
      edge.nodeA.length > 0 &&
      typeof edge.nodeB === "string" &&
      edge.nodeB.length > 0
    );
  }

  private makeEdgeKey(a: string, b: string): string {
    return [a, b].sort((left, right) => this.compareIds(left, right)).join(":");
  }

  private makeTriangleKey(a: string, b: string, c: string): string {
    return [a, b, c].sort((left, right) => this.compareIds(left, right)).join(":");
  }

  private compareIds(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  private toFiniteNumber(value: number, fallback: number): number {
    return Number.isFinite(value) ? value : fallback;
  }

  private toNonNegativeInteger(value: number, fallback: number): number {
    if (!Number.isFinite(value)) return fallback;
    const truncated = value - (value % 1);
    return truncated < 0 ? 0 : truncated;
  }

  private positiveInteger(value: number, fallback: number): number {
    const integer = this.toNonNegativeInteger(value, fallback);
    return integer <= 0 ? fallback : integer;
  }

  private positive(value: number): number {
    return value > 0 ? value : 0;
  }

  private abs(value: number): number {
    return value < 0 ? -value : value;
  }

  private clamp(value: number, min: number, max: number): number {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  /** Deterministic Newton approximation with fixed iteration count. */
  private sqrtDeterministic(value: number): number {
    if (!Number.isFinite(value) || value <= 0) return 0;

    let estimate = value >= 1 ? value : 1;

    for (let i = 0; i < 12; i++) {
      estimate = 0.5 * (estimate + value / estimate);
    }

    return estimate;
  }

  private assertPositive(name: string, value: number): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Invalid TriangulationProcessor option "${name}": expected positive finite number.`);
    }
  }
}
