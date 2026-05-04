// @ts-nocheck
export type PlaytesterAction =
  | "idle"
  | "move_to_target"
  | "explore_nearby_chunk"
  | "find_nearest_npc"
  | "interact_with_npc"
  | "start_available_quest"
  | "progress_active_quest"
  | "collect_required_item"
  | "attack_training_target"
  | "pickup_loot"
  | "equip_best_weapon"
  | "return_to_quest_target"
  | "recover_from_stuck"
  | "respawn"
  | "report_error";

export type PlaytesterLevel = "info" | "warn" | "error";

export type Vec3 = { x: number; y: number; z: number };

export type PlaytesterEvent = {
  ts: number;
  tick: number;
  level: PlaytesterLevel;
  text: string;
};

export type PlaytesterNearbySnapshot = {
  npcs: string[];
  enemies: string[];
  loot: string[];
  interactables: string[];
};

export type PlaytesterStatus = {
  id: string;
  displayName: string;
  socketId: string;
  playerId: string | null;
  tick: number;
  connected: boolean;
  action: PlaytesterAction;
  lastAction: PlaytesterAction | null;
  goal: string;
  sceneId: string;
  chunkId: string;
  position: Vec3;
  activeQuestId: string | null;
  activeQuestStep: number | null;
  inventory: string[];
  equipment: Record<string, string | null>;
  nearby: PlaytesterNearbySnapshot;
  warnings: string[];
  errors: string[];
  lastEvents: PlaytesterEvent[];
};

export type PlaytesterMonitorEntity = {
  id: string;
  type: string;
  name?: string;
  position: Vec3;
  rotation?: Vec3;
  health?: number;
  maxHealth?: number;
  combatThreat?: boolean;
  assetId?: string | null;
  assetType?: string | null;
  glbPath?: string | null;
  scale?: Vec3 | null;
};

export type PlaytesterMonitorChunk = {
  id: string;
  chunkX: number;
  chunkY: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
};

export type PlaytesterMonitorRenderHints = {
  performanceMode: boolean;
  placeholderMode: boolean;
  radiusChunks: number;
  shadowsEnabled: boolean;
  particlesEnabled: boolean;
};

export type PlaytesterMonitorUpdatePayload = {
  type: "playtester_monitor_update";
  ts: number;
  tick: number;
  playtester: PlaytesterStatus;
  camera: {
    mode: "third_person_follow";
    offset: Vec3;
    lookAt: Vec3;
  };
  scene: {
    chunks: PlaytesterMonitorChunk[];
    entities: PlaytesterMonitorEntity[];
  };
  overlay: {
    currentChunk: string;
    action: PlaytesterAction;
    goal: string;
    questStep: number | null;
    nearbyInteractables: string[];
    warnings: string[];
    lastEvents: PlaytesterEvent[];
  };
  renderHints: PlaytesterMonitorRenderHints;
};

export type PlaytesterDebugLogEntry = {
  ts: number;
  tick: number;
  playtesterId: string;
  action: PlaytesterAction;
  result: string;
  goal: string;
  questId?: string | null;
  step?: number | null;
  position: Vec3;
  warning?: string;
  error?: string;
  targetId?: string | null;
};
