export const ARELORIA_GAMEPLAY_PROTOCOL_VERSION = 5 as const;

export type ServerResultCode =
  | "ok"
  | "invalid_payload"
  | "not_found"
  | "too_far"
  | "inventory_full"
  | "cooldown"
  | "not_allowed"
  | "server_error";

export interface ServerResultBase {
  requestId?: string;
  ok: boolean;
  code: ServerResultCode;
  reason?: string;
  gameplayStateVersion?: number;
}

let requestSequence = 0;

function hashRequestSeed(seed: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(36).padStart(7, "0");
}

export function createRequestId(prefix: string, tickId = 0): string {
  requestSequence += 1;
  const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 32) || "req";
  const seed = `${safePrefix}|${tickId}|${requestSequence}|${ARELORIA_GAMEPLAY_PROTOCOL_VERSION}`;

  return `${safePrefix}_${tickId}_${requestSequence}_${hashRequestSeed(seed)}`;
}

export function isOkResult(result: ServerResultBase): boolean {
  return result.ok && result.code === "ok";
}
