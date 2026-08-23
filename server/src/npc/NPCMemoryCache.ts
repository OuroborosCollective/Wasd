export type NPCMemoryEventType =
  | "PLAYER_SEEN"
  | "PLAYER_HELPED"
  | "PLAYER_ATTACKED"
  | "NPC_DIALOGUE"
  | "QUEST_PROGRESS"
  | "TRADE"
  | "DANGER"
  | "WORLD_EVENT";

export interface NPCMemoryEvent {
  readonly id: string;
  readonly tick: number;
  readonly type: NPCMemoryEventType;
  readonly actorId?: string;
  readonly targetId?: string;
  readonly locationKey?: string;
  readonly weight: number;
  readonly payload?: Readonly<Record<string, unknown>>;
}

export interface NPCMemorySnapshot {
  readonly npcId: string;
  readonly tick: number;
  readonly events: readonly NPCMemoryEvent[];
}

export class NPCMemoryCache {
  private readonly npcId: string;
  private readonly maxEvents: number;
  private events: NPCMemoryEvent[] = [];

  constructor(npcId: string, maxEvents = 128) {
    if (!npcId.trim()) {
      throw new Error("NPCMemoryCache requires a valid npcId");
    }

    this.npcId = npcId;
    this.maxEvents = Math.max(1, Math.floor(maxEvents));
  }

  public remember(event: NPCMemoryEvent): void {
    this.events.push(event);

    this.events.sort((a, b) => {
      if (a.tick !== b.tick) return a.tick - b.tick;
      // Bolt: Optimization - Direct string comparison is significantly faster than localeCompare
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(this.events.length - this.maxEvents);
    }
  }

  public getEvents(): readonly NPCMemoryEvent[] {
    return [...this.events];
  }

  public getRecentEvents(limit = 16): readonly NPCMemoryEvent[] {
    return this.events.slice(-Math.max(0, Math.floor(limit)));
  }

  public getEventsByActor(actorId: string): readonly NPCMemoryEvent[] {
    return this.events.filter((event) => event.actorId === actorId);
  }

  public getEventsByType(type: NPCMemoryEventType): readonly NPCMemoryEvent[] {
    return this.events.filter((event) => event.type === type);
  }

  public getReputationForActor(actorId: string): number {
    return this.events
      .filter((event) => event.actorId === actorId)
      .reduce((score, event) => {
        if (event.type === "PLAYER_HELPED") return score + event.weight;
        if (event.type === "PLAYER_ATTACKED") return score - event.weight;
        if (event.type === "TRADE") return score + Math.floor(event.weight / 2);
        return score;
      }, 0);
  }

  public shouldRefuseHelp(actorId: string): boolean {
    const attacks = this.events.filter(
      (event) => event.actorId === actorId && event.type === "PLAYER_ATTACKED",
    );

    return attacks.length >= 3 || this.getReputationForActor(actorId) <= -30;
  }

  public snapshot(currentTick: number): NPCMemorySnapshot {
    return {
      npcId: this.npcId,
      tick: currentTick,
      events: this.getEvents(),
    };
  }

  public restore(snapshot: NPCMemorySnapshot): void {
    if (snapshot.npcId !== this.npcId) {
      throw new Error(
        `Cannot restore memory for ${snapshot.npcId} into cache for ${this.npcId}`,
      );
    }

    this.events = [...snapshot.events].sort((a, b) => {
      if (a.tick !== b.tick) return a.tick - b.tick;
      // Bolt: Optimization - Direct string comparison is significantly faster than localeCompare
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  }

  public clear(): void {
    this.events = [];
  }
}
