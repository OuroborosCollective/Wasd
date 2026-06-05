/**
 * Client-side Resource Gathering API
 *
 * HTTP fallback for resource gathering when WebSocket is not available.
 * Server-authoritative: playerId, position, skill level, XP, items.
 *
 * Rules:
 * - No Math.random()
 * - No Date.now() for gameplay state
 * - Server resolves playerId from auth/session
 */

export interface GatherResourceResult {
  ok: boolean;
  playerId: string;
  nodeId: string;
  reason?:
    | "node_not_found"
    | "node_depleted"
    | "too_far"
    | "level_too_low"
    | "invalid_player"
    | "gathered";
  skillId?: string;
  xpReward?: number;
  itemRewardId?: string;
  itemRewardName?: string;
}

/**
 * Attempt to gather from a resource node via HTTP API.
 * Server-authoritative: resolves skill level, applies XP, returns result.
 */
export async function gatherResource(
  nodeId: string,
  playerPosition: { x: number; y: number },
  currentTick: number = 0
): Promise<GatherResourceResult> {
  const response = await fetch("/api/resource/gather", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      nodeId,
      playerPosition,
      currentTick,
    }),
  });

  const json = await response.json();

  if (!response.ok && !json.result) {
    return {
      ok: false,
      playerId: "unknown",
      nodeId,
      reason: "node_not_found",
    };
  }

  return json.result as GatherResourceResult;
}

/**
 * Get list of all resource node snapshots from server.
 */
export async function fetchResourceNodes(currentTick: number = 0): Promise<{
  ok: boolean;
  nodes: Array<{
    id: string;
    kind: string;
    title: string;
    skillId: string;
    requiredLevel: number;
    xpReward: number;
    itemRewardId: string;
    itemRewardName: string;
    position: { x: number; y: number };
    radius: number;
    status: string;
    depletedUntilTick: number | null;
    remainingTicks: number;
  }>;
  count: number;
}> {
  const response = await fetch(`/api/resource/nodes?tick=${currentTick}`);
  return response.json();
}

/**
 * Send resource gather request via WebSocket command.
 * Preferred method when WebSocket is connected.
 *
 * @param nodeId - The resource node ID to gather from
 * @param playerPosition - Current player position for range check
 */
export function sendResourceGatherCommand(
  nodeId: string,
  playerPosition: { x: number; y: number }
): void {
  window.dispatchEvent(
    new CustomEvent("wasd:client-action", {
      detail: {
        action: "resource_gather",
        payload: {
          nodeId,
          playerPosition,
          timestamp: Date.now(),
        },
      },
    })
  );
}