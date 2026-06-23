/**
 * Identity side-channel helpers.
 *
 * This module is intentionally outside deterministic gameplay simulation. It is
 * used only for opaque identity/session records and persistence metadata.
 */

let fallbackCounter = 0;

function hashText(input: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(36).padStart(7, "0");
}

export function identityNowMs(): number {
  const runtimePerformance = globalThis.performance;

  if (
    runtimePerformance &&
    Number.isFinite(runtimePerformance.timeOrigin) &&
    typeof runtimePerformance.now === "function"
  ) {
    return Math.floor(runtimePerformance.timeOrigin + runtimePerformance.now());
  }

  const runtimeProcess = (globalThis as {
    process?: { hrtime?: { bigint?: () => bigint } };
  }).process;
  const monotonicNs = runtimeProcess?.hrtime?.bigint?.();

  if (typeof monotonicNs === "bigint") {
    return Number(monotonicNs / 1_000_000n);
  }

  fallbackCounter += 1;
  return fallbackCounter;
}

export function createSideChannelId(prefix: string): string {
  const randomUuid = globalThis.crypto?.randomUUID;

  if (typeof randomUuid === "function") {
    return `${prefix}_${randomUuid.call(globalThis.crypto)}`;
  }

  fallbackCounter += 1;
  const runtimeMs = identityNowMs();
  return `${prefix}_${hashText(`${prefix}|${runtimeMs}|${fallbackCounter}`)}`;
}
