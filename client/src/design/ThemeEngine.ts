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

export function deriveThemeGuardState(status: AREValidationApiStatus | null, observationMode = false): ThemeGuardState {
  const violations = status?.guard?.violations ?? [];
  const fireGlitch = Boolean(status?.fireGlitch || status?.guard?.ok === false || violations.length > 0);
  const last = status?.lastViolation ?? violations.at(-1) ?? null;
  return {
    fireGlitch,
    observationMode,
    status,
    label: observationMode
      ? "Observation-Mode · deterministic replay active"
      : fireGlitch
        ? (last?.message ?? "ARE determinism violation")
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
