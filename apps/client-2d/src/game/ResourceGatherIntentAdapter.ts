// Resource Gather Intent Adapter
// Converts UI tap intent into a server-authoritative request shape.
// The adapter intentionally rejects missing player position so the client can
// no longer fake distance by sending the resource node position as self.

export interface GameplayWorldPosition {
  readonly x: number;
  readonly y: number;
}

export interface ResourceGatherIntentInput {
  readonly playerId: string;
  readonly nodeId: string;
  readonly currentTick: number;
  readonly playerPosition?: GameplayWorldPosition | null;
}

export interface ResourceGatherIntent {
  readonly playerId: string;
  readonly nodeId: string;
  readonly currentTick: number;
  readonly playerPosition: GameplayWorldPosition;
}

export type ResourceGatherIntentResult =
  | { readonly ok: true; readonly intent: ResourceGatherIntent }
  | { readonly ok: false; readonly reason: "invalid_player" | "invalid_node_id" | "missing_player_position" | "invalid_player_position" | "invalid_tick" };

function normalizeIdentifier(value: string): string | null {
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9_-]{1,96}$/.test(trimmed)) return null;
  return trimmed;
}

function normalizeTick(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.floor(value));
}

function normalizePosition(value: GameplayWorldPosition | null | undefined): GameplayWorldPosition | null {
  if (!value) return null;
  const x = Number(value.x);
  const y = Number(value.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (Math.abs(x) > 100_000 || Math.abs(y) > 100_000) return null;
  return {
    x: Math.round(x * 1000) / 1000,
    y: Math.round(y * 1000) / 1000,
  };
}

export function createResourceGatherIntent(input: ResourceGatherIntentInput): ResourceGatherIntentResult {
  const playerId = normalizeIdentifier(input.playerId);
  if (!playerId) return { ok: false, reason: "invalid_player" };

  const nodeId = normalizeIdentifier(input.nodeId);
  if (!nodeId) return { ok: false, reason: "invalid_node_id" };

  if (!input.playerPosition) return { ok: false, reason: "missing_player_position" };

  const playerPosition = normalizePosition(input.playerPosition);
  if (!playerPosition) return { ok: false, reason: "invalid_player_position" };

  const currentTick = normalizeTick(input.currentTick);
  if (currentTick === null) return { ok: false, reason: "invalid_tick" };

  return {
    ok: true,
    intent: {
      playerId,
      nodeId,
      currentTick,
      playerPosition,
    },
  };
}
