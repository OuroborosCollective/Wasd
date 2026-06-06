export type TraitId =
  | "brave"
  | "cowardly"
  | "greedy"
  | "loyal"
  | "aggressive"
  | "peaceful"
  | "curious"
  | "vengeful"
  | "honorable"
  | "deceptive";

export interface TraitDefinition {
  id: TraitId;
  label: string;
  description: string;

  /**
   * Wertebereich: -100 bis +100
   * Beispiel:
   * brave +80 = sehr mutig
   * cowardly +80 = sehr ängstlich
   */
  value: number;
}

export interface NPCTraitSnapshot {
  npcId: string;
  traits: Record<TraitId, number>;
  dominantTrait: TraitId | null;
  checksum: string;
}

/**
 * NPCTraits
 *
 * Deterministisches Persönlichkeitsprofil eines NPCs.
 * Keine direkte Mutation von NPC-State außerhalb dieser Klasse.
 * Geeignet für 10-Hz WorldTick, NPCBrain, Dialog, Fraktionen und Memory.
 */
export class NPCTraits {
  private readonly npcId: string;
  private readonly traits: Map<TraitId, number>;

  constructor(npcId: string, initialTraits?: Partial<Record<TraitId, number>>) {
    this.npcId = npcId;
    this.traits = new Map<TraitId, number>();

    const defaults: Record<TraitId, number> = {
      brave: 0,
      cowardly: 0,
      greedy: 0,
      loyal: 0,
      aggressive: 0,
      peaceful: 0,
      curious: 0,
      vengeful: 0,
      honorable: 0,
      deceptive: 0,
    };

    for (const [trait, value] of Object.entries(defaults) as [TraitId, number][]) {
      this.traits.set(trait, this.clamp(initialTraits?.[trait] ?? value));
    }
  }

  public get(trait: TraitId): number {
    return this.traits.get(trait) ?? 0;
  }

  public set(trait: TraitId, value: number): void {
    this.traits.set(trait, this.clamp(value));
  }

  public adjust(trait: TraitId, delta: number): void {
    const current = this.get(trait);
    this.set(trait, current + delta);
  }

  public hasStrongTrait(trait: TraitId, threshold: number = 60): boolean {
    return this.get(trait) >= threshold;
  }

  public getDominantTrait(): TraitId | null {
    let bestTrait: TraitId | null = null;
    let bestValue = -Infinity;

    for (const [trait, value] of this.traits.entries()) {
      if (value > bestValue) {
        bestTrait = trait;
        bestValue = value;
      }
    }

    return bestTrait;
  }

  public calculateDispositionTowardPlayer(input: {
    helpedNpc: boolean;
    attackedNpc: boolean;
    sameFaction: boolean;
    playerReputation: number;
  }): number {
    let score = 0;

    score += this.get("loyal") * 0.2;
    score += this.get("honorable") * 0.15;
    score -= this.get("vengeful") * 0.2;
    score -= this.get("greedy") * 0.1;
    score -= this.get("deceptive") * 0.1;

    if (input.helpedNpc) score += 25;
    if (input.attackedNpc) score -= 40;
    if (input.sameFaction) score += 20;

    score += input.playerReputation * 0.3;

    return this.clamp(score);
  }

  public chooseBehaviorBias(): "fight" | "flee" | "trade" | "talk" | "observe" {
    const brave = this.get("brave");
    const cowardly = this.get("cowardly");
    const aggressive = this.get("aggressive");
    const greedy = this.get("greedy");
    const curious = this.get("curious");
    const peaceful = this.get("peaceful");

    if (aggressive + brave > 100) return "fight";
    if (cowardly > brave + 30) return "flee";
    if (greedy > 50) return "trade";
    if (peaceful > 40) return "talk";
    if (curious > 30) return "observe";

    return "talk";
  }

  public snapshot(): NPCTraitSnapshot {
    const traits = Object.fromEntries(this.traits.entries()) as Record<TraitId, number>;

    return {
      npcId: this.npcId,
      traits,
      dominantTrait: this.getDominantTrait(),
      checksum: this.createChecksum(traits),
    };
  }

  private clamp(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(-100, Math.min(100, Math.round(value)));
  }

  private createChecksum(traits: Record<TraitId, number>): string {
    const raw = Object.entries(traits)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join("|");

    let hash = 2166136261;

    for (let i = 0; i < raw.length; i++) {
      hash ^= raw.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(16).padStart(8, "0");
  }
}
