import fs from "node:fs";
import path from "node:path";

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

const DEFAULT_CORE_LOGIC_DIRS = ["packages/core-logic/src"];
const FORBIDDEN_PATTERNS: Array<{ token: "Math.random" | "Date.now"; pattern: RegExp }> = [
  { token: "Math.random", pattern: /\bMath\.random\s*\(/g },
  { token: "Date.now", pattern: /\bDate\.now\s*\(/g },
];

function resolveRepoRoot(input?: string): string {
  return input ? path.resolve(input) : process.cwd();
}

function isIgnoredFile(filePath: string): boolean {
  return (
    filePath.includes(`${path.sep}dist${path.sep}`) ||
    filePath.includes(`${path.sep}node_modules${path.sep}`) ||
    filePath.endsWith(".d.ts") ||
    filePath.endsWith(".map")
  );
}

function listSourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name) && !isIgnoredFile(fullPath)) {
        files.push(fullPath);
      }
    }
  }
  return files.sort();
}

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
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
    const repoRoot = resolveRepoRoot(this.options.repoRoot);
    const coreDirs = (this.options.coreLogicDirs ?? DEFAULT_CORE_LOGIC_DIRS).map((dir) => path.resolve(repoRoot, dir));
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

    violations.push(...this.scanForbiddenNondeterminism(coreDirs));

    this.status = {
      ok: violations.length === 0,
      tick,
      lastCheckedAtTick: tick,
      kappa: Number.isFinite(kappa) ? kappa : null,
      seed: (typeof seed === "string" || typeof seed === "number") ? seed : null,
      violations,
      checkedCorePaths: coreDirs,
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

  private scanForbiddenNondeterminism(coreDirs: string[]): DeterminismViolationDetail[] {
    const violations: DeterminismViolationDetail[] = [];
    for (const dir of coreDirs) {
      for (const file of listSourceFiles(dir)) {
        const source = fs.readFileSync(file, "utf8");
        for (const item of FORBIDDEN_PATTERNS) {
          item.pattern.lastIndex = 0;
          let match: RegExpExecArray | null;
          while ((match = item.pattern.exec(source))) {
            const relative = path.relative(resolveRepoRoot(this.options.repoRoot), file);
            violations.push({
              code: "FORBIDDEN_NONDETERMINISM",
              token: item.token,
              file: relative,
              line: lineOf(source, match.index),
              message: `${item.token} is forbidden inside ARE core logic: ${relative}:${lineOf(source, match.index)}`,
            });
          }
        }
      }
    }
    return violations;
  }
}

export const areInvariantGuard = new AREInvariantGuard();
