// Event types from Arelorian Server
export interface WorldState {
  tick: number;
  players: Map<string, PlayerState>;
  agents: Map<string, AgentState>;
  chunks: Map<string, ChunkData>;
}

export interface PlayerState {
  id: string;
  name: string;
  x: number;
  z: number;
  rotation: number;
  health: number;
  mana: number;
  region: string;
}

export interface AgentState {
  id: string;
  name: string;
  x: number;
  z: number;
  rotation: number;
  type: string;
  region: string;
}

export interface ChunkData {
  x: number;
  z: number;
  entities: string[];
}

export type ServerEvent = 
  | { type: "WORLD_HEARTBEAT"; payload: WorldState }
  | { type: "PLAYER_JOINED"; payload: { playerId: string; name: string } }
  | { type: "PLAYER_LEFT"; payload: { playerId: string } }
  | { type: "PLAYER_MOVED"; payload: { playerId: string; x: number; z: number } }
  | { type: "AGENT_SPAWNED"; payload: AgentState }
  | { type: "AGENT_MOVED"; payload: { agentId: string; x: number; z: number } }
  | { type: "CHUNK_LOADED"; payload: ChunkData }
  | { type: "ERROR"; payload: { message: string } };

export interface ConnectionConfig {
  url: string;
  reconnectInterval?: number;
  heartbeatInterval?: number;
}
