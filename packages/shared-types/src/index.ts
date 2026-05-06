export interface Entity {
  id: string;
  status?: 'active' | 'throttled';
  cpuCost?: number;
  priority?: number;
  health?: number;
  lastUpdate?: number;
  [key: string]: any;
}

export interface WorldState {
  entities: Entity[];
  performanceMetrics: {
    lastTickDurationMs: number;
    thresholdMs: number;
  };
  tick: number;
  [key: string]: any;
}
