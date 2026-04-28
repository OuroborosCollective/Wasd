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

  private static readonly TYPE_WEIGHTS: Record<string, number> = {
    player: 1.0,
    npc: 0.78,
    monster: 0.88,
  };

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
    // ⚡ Bolt: Inline calculations to reduce object allocations and call overhead in hot loop
    const kx = Math.round(entity.position.x * this.kappa);
    const ky = Math.round(entity.position.y * this.kappa);
    const kz = Math.round(entity.position.z * this.kappa);

    const logicalIndex = this.computeLogicalIndex(entity.id, entity.type, kx, ky, kz);

    const hp = typeof entity.health === 'number' && Number.isFinite(entity.health) ? entity.health : 1;
    const maxHp = typeof entity.maxHealth === 'number' && Number.isFinite(entity.maxHealth) && entity.maxHealth > 0 ? entity.maxHealth : 1;
    const healthRatio = Math.max(0, Math.min(1, hp / maxHp));

    const movementSignal = (Math.abs(kx) + Math.abs(ky) + Math.abs(kz) + tickCount) % this.kappa;
    const resonance = Math.round((movementSignal / this.kappa) * 10000) / 10000;
    const phaseShift = (logicalIndex + tickCount) % this.kappa;

    const plexity = this.computePlexity(entity.type, entity.visible ?? true, healthRatio, resonance);

    const chain = `${entity.type}|li:${logicalIndex}|ph:${phaseShift}|plx:${Math.round(plexity * this.kappa)}`;

    return {
      kappa: this.kappa,
      logicalIndex,
      phaseShift,
      resonance,
      plexity,
      chain,
      kappaPos: { x: kx, y: ky, z: kz },
    };
  }

  private computeLogicalIndex(id: string, type: string, kx: number, ky: number, kz: number): number {
    // ⚡ Bolt: Use numeric component hashing to avoid large template string allocations
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash |= 0;
    }
    for (let i = 0; i < type.length; i++) {
      hash = (hash << 5) - hash + type.charCodeAt(i);
      hash |= 0;
    }
    hash = (hash << 5) - hash + kx;
    hash |= 0;
    hash = (hash << 5) - hash + ky;
    hash |= 0;
    hash = (hash << 5) - hash + kz;
    hash |= 0;

    return Math.abs(hash) % this.kappa;
  }

  private computePlexity(type: string, visible: boolean, healthRatio: number, resonance: number): number {
    if (!visible) return 0.05;
    // ⚡ Bolt: Fast record lookup instead of ternary chain
    const typeWeight = AREStateCompiler.TYPE_WEIGHTS[type] ?? 0.64;
    const score = 0.45 * typeWeight + 0.35 * healthRatio + 0.2 * (1 - resonance);
    return Math.round(Math.max(0.05, Math.min(1, score)) * 10000) / 10000;
  }
}
