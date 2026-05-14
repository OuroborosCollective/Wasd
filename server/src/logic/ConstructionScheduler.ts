/** Payload for convergence / construction jobs (kept local to avoid circular imports). */
export type ConvergenceJob = {
  targetId: string;
  intensity: number;
  resonance: number;
  plexity?: number;
  type: string;
  timestamp: number;
};

export class ConstructionScheduler {
  public async executeConvergence(_payload: ConvergenceJob | string): Promise<void> {}
}
