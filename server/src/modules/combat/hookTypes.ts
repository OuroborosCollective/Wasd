// @ts-nocheck
/**
 * Generic combat proc hook context (legendary powers, set procs, etc.).
 */

export type HookKind = "hit" | "kill" | "taken";

export type HookCtx = {
  attackerId: string;
  targetId: string;
  dmg: number;
  crit: boolean;
  kind: HookKind;
};

export type PowerProc = (ctx: HookCtx) => { extraDmg?: number; heal?: number; fx?: unknown } | void;
