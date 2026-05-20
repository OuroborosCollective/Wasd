// @ARE-GUARD-EXEMPT: core meta path
/**
 * LiveHeal v2 - Dependency Graph
 *
 * Models inter-subsystem dependencies to enable root-cause analysis.
 * When multiple subsystems degrade simultaneously, identifies the most
 * likely upstream cause rather than blindly healing each symptom.
 */

import type { DependencyEdge, SubSystemRecord } from "./LiveHealTypes.js";

export class LiveHealDependencyGraph {
  private readonly edges: DependencyEdge[] = [];
  /** adjacency list: subsystem -> its dependents (things that depend on it) */
  private readonly dependents = new Map<string, Set<string>>();
  /** adjacency list: subsystem -> its dependencies (things it depends on) */
  private readonly dependencies = new Map<string, Set<string>>();

  /**
   * Register a dependency edge: `from` depends on `to`.
   * e.g. addEdge("CombatSystem", "WebSocketServer") means
   * CombatSystem depends on WebSocketServer.
   */
  addEdge(from: string, to: string): void {
    this.edges.push({ from, to });

    if (!this.dependents.has(to)) {
      this.dependents.set(to, new Set());
    }
    this.dependents.get(to)!.add(from);

    if (!this.dependencies.has(from)) {
      this.dependencies.set(from, new Set());
    }
    this.dependencies.get(from)!.add(to);
  }

  /**
   * Register multiple edges at once.
   */
  addEdges(edges: DependencyEdge[]): void {
    for (const edge of edges) {
      this.addEdge(edge.from, edge.to);
    }
  }

  /**
   * Get direct dependencies of a subsystem.
   */
  getDependencies(id: string): string[] {
    return Array.from(this.dependencies.get(id) ?? []);
  }

  /**
   * Get direct dependents of a subsystem (things that depend on it).
   */
  getDependents(id: string): string[] {
    return Array.from(this.dependents.get(id) ?? []);
  }

  /**
   * Get all transitive dependencies of a subsystem (BFS).
   */
  getAllDependencies(id: string): string[] {
    const visited = new Set<string>();
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      const deps = this.dependencies.get(current);
      if (deps) {
        for (const dep of deps) {
          if (!visited.has(dep)) {
            queue.push(dep);
          }
        }
      }
    }
    visited.delete(id);
    return Array.from(visited);
  }

  /**
   * Get all transitive dependents of a subsystem (BFS).
   */
  getAllDependents(id: string): string[] {
    const visited = new Set<string>();
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      const deps = this.dependents.get(current);
      if (deps) {
        for (const dep of deps) {
          if (!visited.has(dep)) {
            queue.push(dep);
          }
        }
      }
    }
    visited.delete(id);
    return Array.from(visited);
  }

  /**
   * Given a set of degraded subsystems, find the most likely root cause.
   *
   * Algorithm: Among all degraded subsystems, prefer the one that
   * is a dependency of the most other degraded subsystems (upstream cause)
   * and has the fewest degraded dependencies itself (not itself a victim).
   *
   * Returns subsystem IDs sorted by likelihood of being root cause.
   */
  rankRootCauses(degradedIds: Set<string>): string[] {
    if (degradedIds.size === 0) {
      return [];
    }
    if (degradedIds.size === 1) {
      return Array.from(degradedIds);
    }

    interface ScoredId {
      id: string;
      /** How many other degraded subsystems depend on this one */
      downstreamCount: number;
      /** How many degraded dependencies this one has */
      upstreamCount: number;
    }

    const scored: ScoredId[] = [];
    for (const id of degradedIds) {
      const deps = this.dependencies.get(id);
      const upstreamCount = deps
        ? Array.from(deps).filter((d) => degradedIds.has(d)).length
        : 0;

      const dependents = this.dependents.get(id);
      const downstreamCount = dependents
        ? Array.from(dependents).filter((d) => degradedIds.has(d)).length
        : 0;

      scored.push({ id, downstreamCount, upstreamCount });
    }

    // Sort: prefer high downstream (many depend on it), low upstream (few deps degraded)
    scored.sort((a, b) => {
      const downstreamDiff = b.downstreamCount - a.downstreamCount;
      if (downstreamDiff !== 0) return downstreamDiff;
      return a.upstreamCount - b.upstreamCount;
    });

    return scored.map((s) => s.id);
  }

  /**
   * Get the dependency depth (max chain length) for a subsystem.
   */
  getDependencyDepth(id: string): number {
    const visited = new Set<string>();
    let maxDepth = 0;

    const dfs = (current: string, depth: number): void => {
      if (visited.has(current)) return;
      visited.add(current);
      maxDepth = Math.max(maxDepth, depth);
      const deps = this.dependencies.get(current);
      if (deps) {
        for (const dep of deps) {
          dfs(dep, depth + 1);
        }
      }
      visited.delete(current);
    };

    dfs(id, 0);
    return maxDepth;
  }

  /**
   * Export all edges for introspection.
   */
  getEdges(): DependencyEdge[] {
    return [...this.edges];
  }

  /**
   * Get all registered subsystem IDs.
   */
  getAllIds(): string[] {
    const ids = new Set<string>();
    for (const edge of this.edges) {
      ids.add(edge.from);
      ids.add(edge.to);
    }
    return Array.from(ids);
  }
}
