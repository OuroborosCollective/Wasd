export interface Entity {
  id: string;
  lastUpdate?: number;
  priority?: number;
  status?: 'active' | 'throttled';
  cpuCost?: number;
  health?: number;
}

export interface WorldState {
  entities: Entity[];
  tick: number;
  performanceMetrics: {
    lastTickDurationMs: number;
    thresholdMs: number;
  };
}
