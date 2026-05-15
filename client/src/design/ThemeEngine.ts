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
  label: string;
  status: AREValidationApiStatus | null;
}

export function deriveThemeGuardState(status: AREValidationApiStatus | null): ThemeGuardState {
  const violations = status?.guard?.violations ?? [];
  const fireGlitch = Boolean(status?.fireGlitch || status?.guard?.ok === false || violations.length > 0);
  const last = status?.lastViolation ?? violations.at(-1) ?? null;
  return {
    fireGlitch,
    status,
    label: fireGlitch ? (last?.message ?? "ARE determinism violation") : "ARE Runtime Contract stable",
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
