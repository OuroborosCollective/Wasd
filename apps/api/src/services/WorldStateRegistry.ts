/**
 * ARELORIAN - WorldStateRegistry
 * Implementierung des deterministischen State-Managements mit Double-Buffering
 * und Kappa-Fixed-Point Arithmetik.
 */

export const KAPPA = 1000; // Fixed-Point Multiplier

export interface Entity {
  id: string;
  x: number; // Kappa-skalierter Integer
  y: number; // Kappa-skalierter Integer
  z: number; // Kappa-skalierter Integer
  hp: number;
  metadata: Record<string, any>;
}

export interface WorldState {
  tick: number;
  entities: Map<string, Entity>;
}

export interface Mutation {
  entityId: string;
  type: 'MOVE' | 'UPDATE_HP' | 'CREATE' | 'DELETE';
  payload: any;
}

export class WorldStateRegistry {
  private currentState: WorldState;
  private pendingState: WorldState;
  private currentAccessToken: string | null = null;
  private isProcessingTick: boolean = false;

  constructor() {
    this.currentState = {
      tick: 0,
      entities: new Map(),
    };
    // Initialer Klon für Double-Buffering
    this.pendingState = this.cloneState(this.currentState);
  }

  /**
   * Startet einen neuen 100ms Tick-Zyklus.
   * Erzeugt ein ATO (Atomic Tick Operation) AccessToken.
   */
  public beginTick(): string {
    if (this.isProcessingTick) {
      throw new Error("ARE_CRITICAL: Tick bereits in Bearbeitung.");
    }
    
    this.isProcessingTick = true;
    this.currentAccessToken = Buffer.from(Math.random().toString()).toString('base64');
    
    // Bereite Pending-State vor (Snapshot von Current)
    this.pendingState = this.cloneState(this.currentState);
    this.pendingState.tick++;
    
    return this.currentAccessToken;
  }

  /**
   * Wendet eine Mutation atomar auf den Pending-State an.
   * Validiert über das ATO-AccessToken.
   */
  public applyMutation(token: string, mutation: Mutation): void {
    this.validateToken(token);

    const { entityId, type, payload } = mutation;

    switch (type) {
      case 'MOVE':
        this.handleMove(entityId, payload);
        break;
      case 'UPDATE_HP':
        this.handleHpUpdate(entityId, payload);
        break;
      case 'CREATE':
        this.pendingState.entities.set(entityId, payload);
        break;
      case 'DELETE':
        this.pendingState.entities.delete(entityId);
        break;
      default:
        throw new Error(`ARE_UNKNOWN_MUTATION: ${type}`);
    }
  }

  /**
   * Schließt den Tick ab und swappt den Pending-State in den Current-State.
   * Implementiert das deterministische Double-Buffering.
   */
  public commitTick(token: string): void {
    this.validateToken(token);

    // Atomic Swap
    this.currentState = this.pendingState;
    
    // Cleanup
    this.currentAccessToken = null;
    this.isProcessingTick = false;
  }

  /**
   * Gibt den aktuellen, validierten Welt-Status zurück (Read-Only).
   */
  public getCurrentState(): Readonly<WorldState> {
    return this.currentState;
  }

  // --- Internals ---

  private validateToken(token: string): void {
    if (!this.isProcessingTick || token !== this.currentAccessToken) {
      throw new Error("ARE_ACCESS_DENIED: Ungültiges oder abgelaufenes AccessToken für State-Mutation.");
    }
  }

  private handleMove(entityId: string, payload: { dx: number; dy: number }): void {
    const entity = this.pendingState.entities.get(entityId);
    if (entity) {
      // Nutze Fixed-Point Math: (KAPPA * Wert)
      entity.x += Math.floor(payload.dx);
      entity.y += Math.floor(payload.dy);
    }
  }

  private handleHpUpdate(entityId: string, payload: { delta: number }): void {
    const entity = this.pendingState.entities.get(entityId);
    if (entity) {
      entity.hp = Math.max(0, entity.hp + payload.delta);
    }
  }

  /**
   * Bolt: Performance Optimization
   * Replacing slow, full-state serialization with a hybrid clone.
   * Maps through entities to clone them individually: shallow copies all existing fields using
   * object spread (`...entity`) and performs a targeted deep clone of `metadata` via JSON serialization
   * only if defined, preserving its original value (e.g. undefined/null) otherwise.
   * This handles any future property additions to the Entity interface and prevents state-loss bugs.
   */
  private cloneState(state: WorldState): WorldState {
    const clonedEntities = new Map<string, Entity>();
    for (const [id, entity] of state.entities) {
      clonedEntities.set(id, {
        ...entity,
        metadata: entity.metadata ? JSON.parse(JSON.stringify(entity.metadata)) : entity.metadata,
      });
    }
    return {
      tick: state.tick,
      entities: clonedEntities,
    };
  }
}

/**
 * AxiomValidationLayer Stub (Erweiterbar für die ARE-Logik)
 */
export class AxiomValidationLayer {
  public static validate(mutation: Mutation, state: WorldState): boolean {
    // Hier werden physikalische Gesetze (Kappa-basiert) geprüft
    // Beispiel: Keine Bewegung schneller als MaxSpeed * TickRate
    return true; 
  }
}