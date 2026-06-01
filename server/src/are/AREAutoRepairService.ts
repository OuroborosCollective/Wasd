import type { AREInvariantGuardStatus, DeterminismViolationDetail } from "./AREInvariantGuard.js";
import type { DeterministicTickRecord } from "./DeterministicTickRecorder.js";
import type { OracleReport, Prophecy } from "./OuroborosOracle.js";
import { cityLayoutCompiler } from "./CityLayoutCompiler.js";
import { canonicalize } from "./WorldHashSnapshot.js";

export type AutoRepairCause = 
  | "determinism_violation"
  | "critical_oracle_prophecy"
  | "kappa_invariant_broken"
  | "invalid_tick_sequence"
  | "forbidden_nondeterminism_found";
export type AutoRepairPhase = "idle" | "detecting" | "rollback" | "patching" | "healed" | "failed";

export interface AutoRepairPlan {
  id: string;
  cause: AutoRepairCause;
  phase: AutoRepairPhase;
  sector: number;
  currentTick: number;
  rollbackTick: number | null;
  rollbackWorldHash: string | null;
  corruptChunk?: { chunkX: number; chunkY: number; hash?: string | null } | null;
  report: string;
  guardViolations: DeterminismViolationDetail[];
  prophecy: Prophecy | null;
  layoutFixes: unknown[];
}

export interface AutoRepairStatus {
  active: boolean;
  healed: boolean;
  lastPlan: AutoRepairPlan | null;
  history: AutoRepairPlan[];
}

export interface AutoRepairContext {
  tick: number;
  guard: AREInvariantGuardStatus | null;
  oracle: OracleReport | null;
  records: DeterministicTickRecord[];
  players: any[];
  npcs: any[];
  loot: any[];
  restoreWorldState: (record: DeterministicTickRecord, sector: number) => void;
}

function detectCauseFromGuard(guard: AREInvariantGuardStatus | null): AutoRepairCause | null {
  if (!guard || guard.ok) return null;

  const firstViolation = guard.violations[0];
  if (!firstViolation) return "determinism_violation";

  switch (firstViolation.code) {
    case "KAPPA_INVARIANT":
    case "INVALID_KAPPA_TYPE":
      return "kappa_invariant_broken";
    case "INVALID_TICK_SEQUENCE":
      return "invalid_tick_sequence";
    case "FORBIDDEN_NONDETERMINISM":
      return "forbidden_nondeterminism_found";
    default:
      return "determinism_violation";
  }
}

function sectorFromViolationOrProphecy(guard: AREInvariantGuardStatus | null, prophecy: Prophecy | null): number {
  if (prophecy) return prophecy.sector;
  const token = guard?.violations?.[0]?.file ?? guard?.violations?.[0]?.code ?? "ARE";
  let hash = 0;
  for (let i = 0; i < token.length; i++) hash = (Math.imul(31, hash) + token.charCodeAt(i)) | 0;
  return Math.abs(hash % 64);
}

function hasCriticalOracle(oracle: OracleReport | null): Prophecy | null {
  const prophecies = oracle?.prophecies ?? [];
  return prophecies.find((prophecy) => prophecy.active && (prophecy.severityScore ?? prophecy.confidence ?? 0) > 0.9) ?? null;
}

function latestCleanRecord(records: DeterministicTickRecord[], currentTick: number): DeterministicTickRecord | null {
  return [...records]
    .filter((record) => record.tick < currentTick && record.guard?.ok && Boolean(record.worldHash))
    .sort((a, b) => b.tick - a.tick)[0] ?? null;
}

function planId(input: unknown): string {
  const text = JSON.stringify(canonicalize(input));
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (Math.imul(33, hash) ^ text.charCodeAt(i)) | 0;
  return `repair-${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

export class AREAutoRepairService {
  private status: AutoRepairStatus = { active: false, healed: false, lastPlan: null, history: [] };

  getStatus(): AutoRepairStatus {
    return {
      active: this.status.active,
      healed: this.status.healed,
      lastPlan: this.status.lastPlan ? canonicalize(this.status.lastPlan) as AutoRepairPlan : null,
      history: this.status.history.map((plan) => canonicalize(plan) as AutoRepairPlan),
    };
  }

  evaluate(context: AutoRepairContext): AutoRepairPlan | null {
    const guardBroken = Boolean(context.guard && !context.guard.ok);
    const criticalProphecy = hasCriticalOracle(context.oracle);
    if (!guardBroken && !criticalProphecy) return null;

    this.status.active = true;
    this.status.healed = false;

    const cause: AutoRepairCause = guardBroken 
      ? (detectCauseFromGuard(context.guard) ?? "determinism_violation")
      : "critical_oracle_prophecy";
    const sector = sectorFromViolationOrProphecy(context.guard, criticalProphecy);
    const clean = latestCleanRecord(context.records, context.tick);
    const layout = cityLayoutCompiler.compileSector([...context.players, ...context.npcs, ...context.loot], sector);
    const corruptChunk = clean?.worldSnapshot?.chunks?.find((chunk) => Math.abs((chunk.chunkX * 31 + chunk.chunkY * 17) % 64) === sector) ?? null;

    const plan: AutoRepairPlan = {
      id: planId({ cause, sector, tick: context.tick, clean: clean?.tick ?? null, prophecy: criticalProphecy?.id ?? null }),
      cause,
      phase: clean ? "rollback" : "failed",
      sector,
      currentTick: context.tick,
      rollbackTick: clean?.tick ?? null,
      rollbackWorldHash: clean?.worldHash ?? null,
      corruptChunk: corruptChunk ? { chunkX: corruptChunk.chunkX, chunkY: corruptChunk.chunkY, hash: corruptChunk.hash } : null,
      report: clean
        ? `Sektor ${sector} korrupt. Rollback zu Tick ${clean.tick} eingeleitet. Kausalität wiederhergestellt.`
        : `Sektor ${sector} korrupt. Kein sauberer WorldHash im Recorder gefunden. Heilung pausiert.`,
      guardViolations: context.guard?.violations ?? [],
      prophecy: criticalProphecy,
      layoutFixes: layout.fixes,
    };

    if (clean) {
      context.restoreWorldState(clean, sector);
      plan.phase = "healed";
      this.status.healed = true;
      this.status.active = false;
    } else {
      this.status.active = false;
      this.status.healed = false;
    }

    this.status.lastPlan = plan;
    this.status.history = [...this.status.history, plan].slice(-32);
    return plan;
  }
}

export const areAutoRepairService = new AREAutoRepairService();
