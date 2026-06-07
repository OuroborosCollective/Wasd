/**
 * SELF HEAL PATCH LOG
 *
 * Deterministic patch logging for SelfHeal repairs.
 * All entries are hashable and reproducible.
 *
 * Rules:
 * - SelfHeal may observe runtime
 * - SelfHeal must not create random gameplay outcomes
 * - Repairs must produce hashable logs
 * - Patch logs must be deterministic from signal + before + after
 * - If repair is unsafe, report degraded mode instead of mutating
 */

import { createHash } from "node:crypto";
import type { SelfHealSignal } from "./SelfHealSignals.js";

export interface HealPatchLogEntry {
  readonly id: string;
  readonly tick: number;
  readonly signal: SelfHealSignal;
  readonly subsystem: string;
  readonly action: string;
  readonly beforeHash: string;
  readonly afterHash: string;
  readonly ok: boolean;
}

export function stableHealHash(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

export function createHealPatchLogEntry(input: {
  readonly tick: number;
  readonly signal: SelfHealSignal;
  readonly subsystem: string;
  readonly action: string;
  readonly before: unknown;
  readonly after: unknown;
  readonly ok: boolean;
}): HealPatchLogEntry {
  const beforeHash = stableHealHash(input.before);
  const afterHash = stableHealHash(input.after);
  const id = stableHealHash({
    tick: input.tick,
    signal: input.signal,
    subsystem: input.subsystem,
    action: input.action,
    beforeHash,
    afterHash,
  });

  return Object.freeze({
    id,
    tick: input.tick,
    signal: input.signal,
    subsystem: input.subsystem,
    action: input.action,
    beforeHash,
    afterHash,
    ok: input.ok,
  });
}

function canonicalize(value: unknown): unknown {
  if (value === null) return null;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);

  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const key of Object.keys(input).sort()) {
    const child = input[key];
    if (typeof child === "undefined") continue;
    if (typeof child === "function") continue;
    if (typeof child === "symbol") continue;
    output[key] = canonicalize(child);
  }

  return output;
}
