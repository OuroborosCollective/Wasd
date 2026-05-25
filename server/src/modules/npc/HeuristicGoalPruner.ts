export type GoalLike = {
  id?: string;
  isCritical?: boolean;
  priority?: number;
  [key: string]: unknown;
};

export type Position2D = {
  x: number;
  y: number;
};

export class HeuristicGoalPruner {
  private readonly scanRadiusSq: number;
  private readonly echoThreshold: number;

  constructor(options: { scanRadius?: number; echoThreshold?: number } = {}) {
    const scanRadius = Number.isFinite(options.scanRadius) ? Number(options.scanRadius) : 40;
    this.scanRadiusSq = Math.trunc(scanRadius * scanRadius);
    this.echoThreshold = Number.isFinite(options.echoThreshold) ? Number(options.echoThreshold) : 0.7;
  }

  public prune<TGoal extends GoalLike>(goals: readonly TGoal[] | null | undefined, echoIntensity: number): TGoal[] {
    const source = Array.isArray(goals) ? goals : [];
    const intensity = Number.isFinite(echoIntensity) ? echoIntensity : 0;

    if (intensity >= this.echoThreshold) {
      return source.filter((goal) => goal.isCritical === true);
    }

    return [...source];
  }

  public isTargetInRange(posA: Position2D, posB: Position2D): boolean {
    const ax = Number.isFinite(posA.x) ? posA.x : 0;
    const ay = Number.isFinite(posA.y) ? posA.y : 0;
    const bx = Number.isFinite(posB.x) ? posB.x : 0;
    const by = Number.isFinite(posB.y) ? posB.y : 0;

    const dx = ax - bx;
    const dy = ay - by;

    return dx * dx + dy * dy < this.scanRadiusSq;
  }
}
