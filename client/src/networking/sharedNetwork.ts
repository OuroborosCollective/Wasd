/**
 * 3D Client Network Layer - Uses @arelorian/core-network
 * This wraps the shared network client for Babylon.js 3D rendering
 */

import { createClient, type ServerEvent, type WorldState, type PlayerState, type AgentState } from "@arelorian/core-network";

// Re-export types for 3D client
export type { ServerEvent, WorldState, PlayerState, AgentState };

// Create client with environment URL
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "https://arelorian.de";
const WS_URL = import.meta.env.VITE_WS_URL || "wss://arelorian.de/ws";

export function createWorldClient() {
  return createClient({
    url: WS_URL,
    heartbeatInterval: 30000
  });
}

// Singleton instance
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
