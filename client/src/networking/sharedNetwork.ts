/**
 * 3D Client Network Layer - Uses @arelorian/core-network
 */

import { createClient, type ServerEvent, type WorldState, type PlayerState, type AgentState } from "@arelorian/core-network";

export type { ServerEvent, WorldState, PlayerState, AgentState };

const WS_URL = import.meta.env.VITE_WS_URL || "wss://arelorian.de/ws";

export function createWorldClient() {
  return createClient({
    url: WS_URL,
    heartbeatInterval: 30000
  });
}

let worldClient: ReturnType<typeof createWorldClient> | null = null;

export function getWorldClient() {
  if (!worldClient) {
    worldClient = createWorldClient();
  }
  return worldClient;
}

export function disconnectWorldClient() {
  worldClient?.disconnect();
  worldClient = null;
}
