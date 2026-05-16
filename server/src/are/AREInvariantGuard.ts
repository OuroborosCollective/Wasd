import {
  AREInvariantGuard,
  DeterminismViolation,
  areInvariantGuard,
} from "@wasd/core-logic";

export {
  AREInvariantGuard,
  DeterminismViolation,
  areInvariantGuard,
};

export type AREGuardPayload = {
  l?: number;
  k?: number;
  kappa?: number;
  r?: number;
  tick?: number;
  seed?: string | number;
  deterministicSeed?: string | number;
};

export type AREInvariantGuardStatus = {
  ok: boolean;
  tick: number;
  lastCheckedAtTick: number;
  kappa: number | null;
  seed: string | number | null;
  violations: DeterminismViolationDetail[];
  checkedCorePaths: string[];
};

export type DeterminismViolationDetail = {
  code: string;
  message: string;
  file?: string;
  line?: number;
  token?: string;
  value?: unknown;
};

export type AREInvariantGuardOptions = {
  repoRoot?: string;
  coreLogicDirs?: string[];
  throwOnViolation?: boolean;
};

export type DeterminismViolationCode = string;
