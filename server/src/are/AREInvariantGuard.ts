export type DeterminismViolationCode =
  | "KAPPA_INVARIANT"
  | "MISSING_DETERMINISTIC_SEED"
  | "FORBIDDEN_NONDETERMINISM";

export interface DeterminismViolationDetail {
  code: DeterminismViolationCode;
  message: string;
  file?: string;
  line?: number;
  token?: "Math.random" | "Date.now";
  value?: unknown;
}

export class DeterminismViolation extends Error {
  public readonly code = "DETERMINISM_VIOLATION";
  public readonly details: DeterminismViolationDetail[];

  constructor(details: DeterminismViolationDetail[]) {
    super(details.map((detail) => detail.message).join("; "));
    this.name = "DeterminismViolation";
    this.details = details;
  }
}

export interface AREGuardPayload {
  l?: number;
  k?: number;
  kappa?: number;
  r?: number;
  tick?: number;
  seed?: string | number;
  deterministicSeed?: string | number;
}

export interface AREInvariantGuardStatus {
  ok: boolean;
  tick: number;
  lastCheckedAtTick: number;
  kappa: number | null;
  seed: string | number | null;
  violations: DeterminismViolationDetail[];
  checkedCorePaths: string[];
}

export interface AREInvariantGuardOptions {
  repoRoot?: string;
  coreLogicDirs?: string[];
  throwOnViolation?: boolean;
}

function validateSeed(seed: unknown): boolean {
  if (typeof seed === "number") return Number.isFinite(seed);
  if (typeof seed !== "string") return false;
  const normalized = seed.trim();
  if (normalized.length < 8) return false;
  if (/random|date\.now|undefined|null|nan/i.test(normalized)) return false;
  return /^[a-z0-9:_./|#-]+$/i.test(normalized);
}

export class AREInvariantGuard {
  private status: AREInvariantGuardStatus = {
    ok: true,
    tick: 0,
    lastCheckedAtTick: 0,
    kappa: null,
    seed: null,
    violations: [],
    checkedCorePaths: [],
  };

  constructor(private readonly options: AREInvariantGuardOptions = {}) {}

  getStatus(): AREInvariantGuardStatus {
    return {
      ...this.status,
      violations: [...this.status.violations],
      checkedCorePaths: [...this.status.checkedCorePaths],
    };
  }

  validateTick(payload: AREGuardPayload, tick = Number(payload.tick ?? 0)): AREInvariantGuardStatus {
    const kappa = Number(payload.kappa ?? payload.k ?? Number.NaN);
    const seed = payload.deterministicSeed ?? payload.seed ?? null;
    const violations: DeterminismViolationDetail[] = [];

    if (kappa !== 1000) {
      violations.push({
        code: "KAPPA_INVARIANT",
        message: `ARE kappa invariant violated: expected 1000, received ${Number.isFinite(kappa) ? kappa : "missing"}`,
        value: kappa,
      });
    }

    if (!validateSeed(seed)) {
      violations.push({
        code: "MISSING_DETERMINISTIC_SEED",
        message: "ARE deterministic seed is missing or non-deterministic.",
        value: seed,
      });
    }

    this.status = {
      ok: violations.length === 0,
      tick,
      lastCheckedAtTick: tick,
      kappa: Number.isFinite(kappa) ? kappa : null,
      seed: (typeof seed === "string" || typeof seed === "number") ? seed : null,
      violations,
      checkedCorePaths: this.options.coreLogicDirs ?? [],
    };

    if (violations.length > 0 && this.options.throwOnViolation) {
      throw new DeterminismViolation(violations);
    }

    return this.getStatus();
  }

  assertValidTick(payload: AREGuardPayload, tick = Number(payload.tick ?? 0)): AREInvariantGuardStatus {
    const guard = new AREInvariantGuard({ ...this.options, throwOnViolation: true });
    return guard.validateTick(payload, tick);
  }
}

export const areInvariantGuard = new AREInvariantGuard();
