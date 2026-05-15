export interface AREValidationApiStatus {
  ok?: boolean;
  fireGlitch?: boolean;
  guard?: {
    ok?: boolean;
    tick?: number;
    violations?: Array<{ code?: string; message?: string; file?: string; line?: number; token?: string }>;
  } | null;
  lastViolation?: { code?: string; message?: string; file?: string; line?: number; token?: string } | null;
}

export interface ThemeGuardState {
  fireGlitch: boolean;
  observationMode: boolean;
  oracleActive: boolean;
  repairActive: boolean;
  sovereignActive: boolean;
  versionDrift: boolean;
  label: string;
  status: AREValidationApiStatus | null;
}

export interface AREReplayStats { capacity: number; size: number; latestTick: number | null; oldestTick: number | null; availableTicks: number[]; }
export interface AREReplaySnapshot { ok: true; mode: "observation"; tick: number; restoredFrom: string; record: { tick: number; payload: unknown; worldHash: string | null; worldSnapshot: unknown; guard: unknown; worldState: { players: unknown[]; npcs: unknown[]; loot: unknown[]; }; }; }
export interface AREOracleProphecy { id: string; kind: string; severity: "low" | "medium" | "high"; severityScore?: number; active: boolean; sector: number; ticksUntil: number; confidence: number; statement: string; worldHash: string | null; seed: string; evidence: string[]; }
export interface AREOracleReport { ok: boolean; generatedAtTick: number | null; worldHash: string | null; seed: string | null; patterns: Array<{ kind: string; sector: number; strength: number; ticksUntil: number; evidence: string[] }>; prophecies: AREOracleProphecy[]; }
export interface AREAutoRepairPlan { id: string; cause: "determinism_violation" | "critical_oracle_prophecy"; phase: "idle" | "detecting" | "rollback" | "patching" | "healed" | "failed"; sector: number; currentTick: number; rollbackTick: number | null; rollbackWorldHash: string | null; report: string; guardViolations: unknown[]; prophecy: AREOracleProphecy | null; layoutFixes: unknown[]; }
export interface AREAutoRepairStatus { active: boolean; healed: boolean; lastPlan: AREAutoRepairPlan | null; history: AREAutoRepairPlan[]; }

export interface SdkBillingAccount { id: string; displayName: string; credits: number; lifetimeHashes: number; lifetimeCreditsCharged: number; status: "active" | "suspended"; lastUsageTick: number; lastMessage: string | null; }
export interface SdkBillingStatus { ok: boolean; usage: { hashesInWindow?: number; hashesPerMinute?: number; latestTick?: number } | null; cost: { hashes: number; credits: number; ratePerThousandHashes: number; formula: string }; billing: { suspended: boolean; message: string | null; market: SdkBillingMarket }; market: SdkBillingMarket; }
export interface SdkBillingMarket { ratePerThousandHashes: number; activeExternalReplits: number; totalCreditsGenerated: number; totalHashesMetered: number; accounts: SdkBillingAccount[]; suspendedAccounts: SdkBillingAccount[]; }

export interface SovereignTruth {
  ok: boolean;
  cluster: string;
  commitHash: string;
  shortCommitHash: string;
  branch: string;
  gamePort: number;
  nodeEnv: string;
  pm2: { name: string; id: string | null; uptimeSeconds: number; startedAt: number | null; pid: number };
  supabase: { status: string; localPort: number; localTcpReachable: boolean; [key: string]: unknown };
  are: { worldHash: string | null; worldTick: number | null; guard: unknown; replay: unknown; oracle: unknown; autoRepair: unknown };
}

export interface SovereignLaunchResult { ok: boolean; dispatched?: boolean; workflow?: string; repo?: string; ref?: string; error?: string; message?: string; detail?: unknown; }

export const LOCAL_UI_BUILD_HASH = String((import.meta as any).env?.VITE_UI_BUILD_HASH || (import.meta as any).env?.VITE_BUILD_COMMIT_SHA || "dev");

export function hasVersionDrift(truth: SovereignTruth | null): boolean {
  if (!truth) return false;
  if (!LOCAL_UI_BUILD_HASH || LOCAL_UI_BUILD_HASH === "dev") return false;
  return truth.shortCommitHash !== LOCAL_UI_BUILD_HASH.slice(0, 12);
}

export function deriveThemeGuardState(status: AREValidationApiStatus | null, observationMode = false, oracleActive = false, repairActive = false, sovereignActive = false, versionDrift = false): ThemeGuardState {
  const violations = status?.guard?.violations ?? [];
  const fireGlitch = Boolean(status?.fireGlitch || status?.guard?.ok === false || violations.length > 0);
  const last = status?.lastViolation ?? violations.at(-1) ?? null;
  return {
    fireGlitch,
    observationMode,
    oracleActive,
    repairActive,
    sovereignActive,
    versionDrift,
    status,
    label: sovereignActive
      ? "Emily-Heraldin · sovereign deploy stable"
      : versionDrift
        ? "Version-Drift · UI build differs from server truth"
        : repairActive
          ? "Emily-Surgeon · self-healing active"
          : observationMode
            ? "Observation-Mode · deterministic replay active"
            : fireGlitch
              ? (last?.message ?? "ARE determinism violation")
              : oracleActive
                ? "Ouroboros Oracle · active prophecy detected"
                : "ARE Runtime Contract stable",
  };
}

export async function fetchAREValidationStatus(): Promise<AREValidationApiStatus | null> { try { const response = await fetch("/api/are/validation/status", { cache: "no-store" }); if (!response.ok) return null; return (await response.json()) as AREValidationApiStatus; } catch { return null; } }
export async function fetchAREReplayStats(): Promise<AREReplayStats | null> { try { const response = await fetch("/api/are/replay/stats", { cache: "no-store" }); if (!response.ok) return null; const body = await response.json(); return body.stats ?? null; } catch { return null; } }
export async function fetchAREReplaySnapshot(tick: number): Promise<AREReplaySnapshot | null> { try { const response = await fetch(`/api/are/replay/snapshot/${encodeURIComponent(String(tick))}`, { cache: "no-store" }); if (!response.ok) return null; return (await response.json()) as AREReplaySnapshot; } catch { return null; } }
export async function fetchAREOracleReport(): Promise<AREOracleReport | null> { try { const response = await fetch("/api/are/replay/oracle/prophecy", { cache: "no-store" }); if (!response.ok) return null; const body = await response.json(); return body.oracle ?? null; } catch { return null; } }
export async function fetchAREAutoRepairStatus(): Promise<AREAutoRepairStatus | null> { try { const response = await fetch("/api/are/replay/repair/status", { cache: "no-store" }); if (!response.ok) return null; const body = await response.json(); return body.autoRepair ?? null; } catch { return null; } }
export async function fetchSdkBillingStatus(): Promise<SdkBillingStatus | null> { try { const response = await fetch("/api/are/replay/billing/status", { cache: "no-store" }); if (!response.ok) return null; return (await response.json()) as SdkBillingStatus; } catch { return null; } }
export async function fetchSovereignTruth(): Promise<SovereignTruth | null> { try { const response = await fetch("/api/sovereign/deploy/truth", { cache: "no-store" }); if (!response.ok) return null; return (await response.json()) as SovereignTruth; } catch { return null; } }
export async function launchSovereignDeploy(launchKey: string, ref = "main"): Promise<SovereignLaunchResult> {
  try {
    const response = await fetch("/api/sovereign/deploy/launch", { method: "POST", headers: { "Content-Type": "application/json", "X-Sovereign-Launch-Key": launchKey }, body: JSON.stringify({ ref, reason: "Portal Sovereign Launch Button" }) });
    const body = await response.json().catch(() => ({}));
    return body as SovereignLaunchResult;
  } catch (error) {
    return { ok: false, error: "network_error", message: error instanceof Error ? error.message : String(error) };
  }
}