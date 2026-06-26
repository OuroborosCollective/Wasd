/**
 * Runtime Diagnostics – Dependency Graph, Root Cause Analysis & Fix Memory
 * Cloned from Sovereign-Studio implementation.
 */
export interface DependencyEdge { from: string; to: string; }
export interface DependencyGraph {
  addEdge(edge: DependencyEdge): void;
  getUpstream(node: string): string[];
  getDownstream(node: string): string[];
}
export function createDependencyGraph(edges: DependencyEdge[] = []): DependencyGraph {
  const up = new Map<string, Set<string>>();
  const down = new Map<string, Set<string>>();
  const ensure = (m: Map<string, Set<string>>, k: string) => (m.has(k) ? m.get(k)! : (m.set(k, new Set()), m.get(k)!));
  const addEdge = ({ from, to }: DependencyEdge) => {
    ensure(down, from).add(to);
    ensure(up, to).add(from);
    ensure(up, from);
    ensure(down, to);
  };
  edges.forEach(addEdge);
  return {
    addEdge,
    getUpstream: (n) => [...(up.get(n) ?? [])],
    getDownstream: (n) => [...(down.get(n) ?? [])],
  };
}
export interface RootCauseReport { cause: string; path: string[]; confidence: number; }
export function findRootCause(g: DependencyGraph, fail: string): RootCauseReport {
  const seen = new Set<string>(); const q: [string, string[]][] = [[fail, [fail]]];
  while (q.length) {
    const [n, p] = q.shift()!; if (seen.has(n)) continue; seen.add(n);
    const parents = g.getUpstream(n); if (!parents.length) return { cause: n, path: p, confidence: 1 - 1 / (p.length + 1) };
    parents.forEach((par) => q.push([par, [par, ...p]]));
  }
  return { cause: fail, path: [fail], confidence: 0.2 };
}
export interface FixMemoryEntry { problem: string; cause: string; patchCommitSha: string; timestamp: number; }
const mem: FixMemoryEntry[] = []; const MAX = 100;
export function rememberFix(e: FixMemoryEntry) { mem.unshift(e); if (mem.length > MAX) mem.pop(); }
export const findPreviousFix = (p: string) => mem.find((e) => e.problem === p);
export const getAllFixes = () => [...mem];
