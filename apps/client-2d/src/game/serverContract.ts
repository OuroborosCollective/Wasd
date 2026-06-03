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

export function createRequestId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function isOkResult(result: ServerResultBase): boolean {
  return result.ok && result.code === "ok";
}