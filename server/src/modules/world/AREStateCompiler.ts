export type AREPayload = {
  kappa: number;
  logicalIndex: number;
  phaseShift: number;
  resonance: number;
  plexity: number;
  chain: string;
  kappaPos: { x: number; y: number; z: number };
};

export class AREStateCompiler {
  public static readonly KAPPA = 1000;
  private readonly kappa = AREStateCompiler.KAPPA;

  public compileEntity(
    entity: {
      id: string;
      type: string;
      position: { x: number; y: number; z: number };
      health?: number;
      maxHealth?: number;
      visible?: boolean;
    },
    tickCount: number
  ): AREPayload {
    const kappaPos = this.toKappaPosition(entity.position);
    const logicalIndex = this.computeLogicalIndex(entity.id, entity.type, kappaPos);
    const healthRatio = this.computeHealthRatio(entity.health, entity.maxHealth);
    const movementSignal =
      (Math.abs(kappaPos.x) + Math.abs(kappaPos.y) + Math.abs(kappaPos.z) + tickCount) % this.kappa;
    const resonance = Number((movementSignal / this.kappa).toFixed(4));
    const phaseShift = (logicalIndex + tickCount) % this.kappa;
    const plexity = this.computePlexity(entity.type, entity.visible ?? true, healthRatio, resonance);
    const chain = this.buildChain(entity.type, logicalIndex, phaseShift, plexity);

    return {
      kappa: this.kappa,
      logicalIndex,
      phaseShift,
      resonance,
      plexity,
      chain,
      kappaPos,
    };
  }

  private toKappaPosition(position: { x: number; y: number; z: number }) {
    return {
      x: Math.round(position.x * this.kappa),
      y: Math.round(position.y * this.kappa),
      z: Math.round(position.z * this.kappa),
    };
  }

  private computeLogicalIndex(id: string, type: string, kappaPos: { x: number; y: number; z: number }): number {
    const base = `${type}:${id}:${kappaPos.x}:${kappaPos.y}:${kappaPos.z}`;
    return Math.abs(this.hash(base)) % this.kappa;
  }

  private computePlexity(type: string, visible: boolean, healthRatio: number, resonance: number): number {
    if (!visible) return 0.05;
    const typeWeight = type === "player" ? 1 : type === "npc" ? 0.78 : type === "monster" ? 0.88 : 0.64;
    const score = 0.45 * typeWeight + 0.35 * healthRatio + 0.2 * (1 - resonance);
    return Number(Math.max(0.05, Math.min(1, score)).toFixed(4));
  }

  private buildChain(type: string, logicalIndex: number, phaseShift: number, plexity: number): string {
    const p = Math.round(plexity * this.kappa);
    return `${type}|li:${logicalIndex}|ph:${phaseShift}|plx:${p}`;
  }

  private computeHealthRatio(health?: number, maxHealth?: number): number {
    const hp = Number.isFinite(Number(health)) ? Number(health) : 1;
    const maxHp = Number.isFinite(Number(maxHealth)) && Number(maxHealth)! > 0 ? Number(maxHealth) : 1;
    const ratio = hp / maxHp;
    return Math.max(0, Math.min(1, ratio));
  }

  private hash(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
