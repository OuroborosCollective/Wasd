export type DeterminismViolationCode =
  | "KAPPA_INVARIANT"
  | "INVALID_KAPPA_TYPE"
  | "MISSING_DETERMINISTIC_SEED"
  | "FORBIDDEN_NONDETERMINISM"
  | "INVALID_TICK_SEQUENCE";

export type ForbiddenToken = "Math.random" | "Date.now" | "performance.now()" | "crypto.randomUUID()" | "new Date()";

export interface DeterminismViolationDetail {
  code: DeterminismViolationCode;
  message: string;
  file?: string;
  line?: number;
  token?: ForbiddenToken;
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
  scannedSources: SourceScanResult[];
}

export interface SourceScanResult {
  file: string;
  violations: DeterminismViolationDetail[];
  scannedAt: number;
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

function validateKappa(rawKappa: unknown): { kappa: number; violations: DeterminismViolationDetail[] } {
  const violations: DeterminismViolationDetail[] = [];

  if (rawKappa === undefined || rawKappa === null) {
    violations.push({
      code: "KAPPA_INVARIANT",
      message: "ARE kappa is missing in payload.",
      value: rawKappa,
    });
    return { kappa: Number.NaN, violations };
  }

  if (typeof rawKappa !== "number" || !Number.isFinite(rawKappa)) {
    violations.push({
      code: "INVALID_KAPPA_TYPE",
      message: `ARE kappa must be a finite number, received type: ${typeof rawKappa}`,
      value: rawKappa,
    });
    return { kappa: Number.NaN, violations };
  }

  if (rawKappa !== 1000) {
    violations.push({
      code: "KAPPA_INVARIANT",
      message: `ARE kappa invariant violated: expected 1000, received ${rawKappa}`,
      value: rawKappa,
    });
  }

  return { kappa: rawKappa, violations };
}

function validateTickSequence(tick: number): DeterminismViolationDetail[] {
  const violations: DeterminismViolationDetail[] = [];

  if (!Number.isSafeInteger(tick)) {
    violations.push({
      code: "INVALID_TICK_SEQUENCE",
      message: `ARE tick must be a safe integer, received ${tick} (${typeof tick})`,
      value: tick,
    });
  } else if (tick < 0) {
    violations.push({
      code: "INVALID_TICK_SEQUENCE",
      message: `ARE tick must be non-negative, received ${tick}`,
      value: tick,
    });
  } else if (tick > 1e12) {
    violations.push({
      code: "INVALID_TICK_SEQUENCE",
      message: `ARE tick exceeds maximum reasonable value (1e12), received ${tick}`,
      value: tick,
    });
  }

  return violations;
}

export const FORBIDDEN_NONDETERMINISTIC_TOKENS: ForbiddenToken[] = [
  "Math.random",
  "Date.now",
  "performance.now()",
  "crypto.randomUUID()",
  "new Date()",
];

export class AREInvariantGuard {
  private status: AREInvariantGuardStatus = {
    ok: true,
    tick: 0,
    lastCheckedAtTick: 0,
    kappa: null,
    seed: null,
    violations: [],
    checkedCorePaths: [],
    scannedSources: [],
  };

  constructor(private readonly options: AREInvariantGuardOptions = {}) {}

  getStatus(): AREInvariantGuardStatus {
    return {
      ...this.status,
      violations: [...this.status.violations],
      checkedCorePaths: [...this.status.checkedCorePaths],
      scannedSources: this.status.scannedSources.map((result) => ({
        ...result,
        violations: [...result.violations],
      })),
    };
  }

  validateTick(payload: AREGuardPayload, tick = Number(payload.tick ?? 0)): AREInvariantGuardStatus {
    const violations: DeterminismViolationDetail[] = [];

    const rawKappa = payload.kappa ?? payload.k;
    const { kappa, violations: kappaViolations } = validateKappa(rawKappa);
    violations.push(...kappaViolations);

    const seed = payload.deterministicSeed ?? payload.seed ?? null;
    if (!validateSeed(seed)) {
      violations.push({
        code: "MISSING_DETERMINISTIC_SEED",
        message: "ARE deterministic seed is missing or non-deterministic.",
        value: seed,
      });
    }

    violations.push(...validateTickSequence(tick));

    this.status = {
      ok: violations.length === 0,
      tick,
      lastCheckedAtTick: tick,
      kappa: Number.isFinite(kappa) ? kappa : null,
      seed: (typeof seed === "string" || typeof seed === "number") ? seed : null,
      violations,
      checkedCorePaths: this.options.coreLogicDirs ?? [],
      scannedSources: this.status.scannedSources,
    };

    if (violations.length > 0 && this.options.throwOnViolation) {
      throw new DeterminismViolation(violations);
    }

    return this.getStatus();
  }

  validateKappa(rawKappa: unknown): { kappa: number; violations: DeterminismViolationDetail[] } {
    return validateKappa(rawKappa);
  }

  validateSeed(seed: unknown): boolean {
    return validateSeed(seed);
  }

  validateTickSequence(tick: number): DeterminismViolationDetail[] {
    return validateTickSequence(tick);
  }

  scanCoreSource(source: string, file?: string): DeterminismViolationDetail[] {
    const violations: DeterminismViolationDetail[] = [];

    for (const token of FORBIDDEN_NONDETERMINISTIC_TOKENS) {
      let searchFrom = 0;
      let tokenIndex: number;

      while ((tokenIndex = source.indexOf(token, searchFrom)) !== -1) {
        const line = source.slice(0, tokenIndex).split("\n").length;

        violations.push({
          code: "FORBIDDEN_NONDETERMINISM",
          message: `Forbidden nondeterministic token "${token}" found in ARE core logic.`,
          file,
          line,
          token,
          value: token,
        });

        searchFrom = tokenIndex + token.length;
      }
    }

    return violations;
  }

  scanAndRecord(source: string, file?: string): AREInvariantGuardStatus {
    const violations = this.scanCoreSource(source, file);
    const now = Date.now();

    if (violations.length > 0) {
      const scanResult: SourceScanResult = { file: file ?? "unknown", violations, scannedAt: now };
      this.status.scannedSources.push(scanResult);
      this.status.violations.push(...violations);
      this.status.ok = false;
    }

    return this.getStatus();
  }

  assertValidTick(payload: AREGuardPayload, tick = Number(payload.tick ?? 0)): AREInvariantGuardStatus {
    const guard = new AREInvariantGuard({ ...this.options, throwOnViolation: true });
    return guard.validateTick(payload, tick);
  }

  getGuardReport(): string {
    const status = this.getStatus();
    const lines: string[] = [
      `[AREInvariantGuard]`,
      `  OK: ${status.ok}`,
      `  Tick: ${status.tick}`,
      `  Kappa: ${status.kappa}`,
      `  Seed: ${status.seed}`,
      `  Violations: ${status.violations.length}`,
    ];

    if (status.violations.length > 0) {
      lines.push(`  Details:`);
      for (const v of status.violations) {
        lines.push(`    - [${v.code}] ${v.message}`);
        if (v.file) lines.push(`      at ${v.file}:${v.line ?? "?"}`);
        if (v.token) lines.push(`      token: ${v.token}`);
      }
    }

    if (status.scannedSources.length > 0) {
      lines.push(`  Scanned Sources: ${status.scannedSources.length}`);
      for (const scan of status.scannedSources) {
        lines.push(`    - ${scan.file}: ${scan.violations.length} violations`);
      }
    }

    return lines.join("\n");
  }
}

export const areInvariantGuard = new AREInvariantGuard();
