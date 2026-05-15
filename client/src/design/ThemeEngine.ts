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
  label: string;
  status: AREValidationApiStatus | null;
}

export interface AREReplayStats {
  capacity: number;
  size: number;
  latestTick: number | null;
  oldestTick: number | null;
  availableTicks: number[];
}

export interface AREReplaySnapshot {
  ok: true;
  mode: "observation";
  tick: number;
  restoredFrom: string;
  record: {
    tick: number;
    payload: unknown;
    worldHash: string | null;
    worldSnapshot: unknown;
    guard: unknown;
    worldState: {
      players: unknown[];
      npcs: unknown[];
      loot: unknown[];
    };
  };
}

export interface AREOracleProphecy {
  id: string;
  kind: string;
  severity: "low" | "medium" | "high";
  active: boolean;
  sector: number;
  ticksUntil: number;
  confidence: number;
  statement: string;
  worldHash: string | null;
  seed: string;
  evidence: string[];
}

export interface AREOracleReport {
  ok: boolean;
  generatedAtTick: number | null;
  worldHash: string | null;
  seed: string | null;
  patterns: Array<{ kind: string; sector: number; strength: number; ticksUntil: number; evidence: string[] }>;
  prophecies: AREOracleProphecy[];
}

export function deriveThemeGuardState(status: AREValidationApiStatus | null, observationMode = false, oracleActive = false): ThemeGuardState {
  const violations = status?.guard?.violations ?? [];
  const fireGlitch = Boolean(status?.fireGlitch || status?.guard?.ok === false || violations.length > 0);
  const last = status?.lastViolation ?? violations.at(-1) ?? null;
  return {
    fireGlitch,
    observationMode,
    oracleActive,
    status,
    label: observationMode
      ? "Observation-Mode · deterministic replay active"
      : fireGlitch
        ? (last?.message ?? "ARE determinism violation")
        : oracleActive
          ? "Ouroboros Oracle · active prophecy detected"
          : "ARE Runtime Contract stable",
  };
}

export async function fetchAREValidationStatus(): Promise<AREValidationApiStatus | null> {
  try {
    const response = await fetch("/api/are/validation/status", { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as AREValidationApiStatus;
  } catch {
    return null;
  }
}

export async function fetchAREReplayStats(): Promise<AREReplayStats | null> {
  try {
    const response = await fetch("/api/are/replay/stats", { cache: "no-store" });
    if (!response.ok) return null;
    const body = await response.json();
    return body.stats ?? null;
  } catch {
    return null;
  }
}

export async function fetchAREReplaySnapshot(tick: number): Promise<AREReplaySnapshot | null> {
  try {
    const response = await fetch(`/api/are/replay/snapshot/${encodeURIComponent(String(tick))}`, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as AREReplaySnapshot;
  } catch {
    return null;
  }
}

export async function fetchAREOracleReport(): Promise<AREOracleReport | null> {
  try {
    const response = await fetch("/api/are/replay/oracle/prophecy", { cache: "no-store" });
    if (!response.ok) return null;
    const body = await response.json();
    return body.oracle ?? null;
  } catch {
    return null;
  }
}
