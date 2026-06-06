/**
 * NPC.ts
 * Deterministischer NPC-Core für 10Hz WorldTick
 */

export type NPCState =
  | "idle"
  | "walking"
  | "talking"
  | "fighting"
  | "fleeing"
  | "dead";

export interface NPCMemory {
  longTermGoals: string[];
  knownPlayers: Record<string, {
    trust: number;
    hostility: number;
    lastSeenTick: number;
  }>;
}

export interface NPCPosition {
  x: number;
  y: number;
  z?: number;
}

export interface NPCData {
  name: string;
  state: NPCState;
  stateTimer: number;
  position: NPCPosition;
  hp: number;
  maxHp: number;
  factionId?: string;
  memory: NPCMemory;
}

export class NPC {
  public readonly id: string;
  private data: NPCData;

  constructor(id: string, data: NPCData) {
    this.id = id;
    this.data = structuredClone(data);
  }

  public get snapshot(): Readonly<NPCData> {
    return this.data;
  }

  public tick(deltaTicks: number): void {
    if (this.data.state === "dead") return;

    this.data.stateTimer += deltaTicks;

    if (this.data.hp <= 0) {
      this.setState("dead");
    }
  }

  public setState(nextState: NPCState): void {
    if (this.data.state === nextState) return;

    this.data.state = nextState;
    this.data.stateTimer = 0;
  }

  public damage(amount: number): void {
    const safeAmount = Math.max(0, Math.floor(amount));
    this.data.hp = Math.max(0, this.data.hp - safeAmount);

    if (this.data.hp === 0) {
      this.setState("dead");
    }
  }

  public rememberPlayer(
    playerId: string,
    patch: Partial<{
      trust: number;
      hostility: number;
      lastSeenTick: number;
    }>
  ): void {
    const current = this.data.memory.knownPlayers[playerId] ?? {
      trust: 0,
      hostility: 0,
      lastSeenTick: 0,
    };

    this.data.memory.knownPlayers[playerId] = {
      trust: patch.trust ?? current.trust,
      hostility: patch.hostility ?? current.hostility,
      lastSeenTick: patch.lastSeenTick ?? current.lastSeenTick,
    };
  }

  public serialize(): NPCData {
    return structuredClone(this.data);
  }
}
