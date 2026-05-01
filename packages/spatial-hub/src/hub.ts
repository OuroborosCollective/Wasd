import { Vector3, Quaternion } from "three";

export interface SpatialEntity {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number, number];
  scale: [number, number, number];
  velocity?: [number, number, number];
  lastUpdate: number;
  ownerId: string;
}

export interface HubMessage {
  type: "SYNC_ENTITY" | "REMOVE_ENTITY" | "REQUEST_STATE" | "INIT_WORKER";
  payload: any;
  origin: string;
  timestamp: number;
}

export class SpatialHub {
  private workers: Map<string, Worker> = new Map();
  private entities: Map<string, SpatialEntity> = new Map();
  private subscribers: Set<(entities: SpatialEntity[]) => void> = new Set();
  
  constructor() {
    this.handleWorkerMessage = this.handleWorkerMessage.bind(this);
  }

  /**
   * Registers a worker thread to the hub and establishes communication.
   */
  public registerWorker(id: string, worker: Worker): void {
    if (this.workers.has(id)) {
      console.warn(`Worker with id ${id} already registered. Overwriting...`);
    }
    
    this.workers.set(id, worker);
    worker.onmessage = (event: MessageEvent<HubMessage>) => {
      this.handleWorkerMessage(id, event.data);
    };

    // Initialize worker with current state
    worker.postMessage({
      type: "INIT_WORKER",
      payload: { 
        entities: Array.from(this.entities.values()),
        workerId: id 
      },
      timestamp: Date.now(),
      origin: "hub"
    });
  }

  /**
   * Unregisters a worker.
   */
  public unregisterWorker(id: string): void {
    this.workers.delete(id);
  }

  /**
   * Handles incoming messages from workers.
   */
  private handleWorkerMessage(workerId: string, message: HubMessage): void {
    const { type, payload } = message;

    switch (type) {
      case "SYNC_ENTITY":
        this.processEntityUpdate(payload as SpatialEntity, workerId);
        break;
      case "REMOVE_ENTITY":
        this.processEntityRemoval(payload.id, workerId);
        break;
      case "REQUEST_STATE":
        this.sendFullStateToWorker(workerId);
        break;
      default:
        console.warn(`[SpatialHub] Unknown message type: ${type} from ${workerId}`);
    }
  }

  /**
   * Updates an entity's state and broadcasts to other workers.
   */
  public processEntityUpdate(entity: SpatialEntity, originId: string = "main"): void {
    const existing = this.entities.get(entity.id);
    
    // Simple timestamp-based conflict resolution
    if (existing && existing.lastUpdate > entity.lastUpdate) {
      return;
    }

    this.entities.set(entity.id, { ...entity });
    this.broadcastMessage({
      type: "SYNC_ENTITY",
      payload: entity,
      origin: originId,
      timestamp: entity.lastUpdate
    }, originId);

    this.notifySubscribers();
  }

  /**
   * Removes an entity and notifies all workers.
   */
  public processEntityRemoval(entityId: string, originId: string = "main"): void {
    if (this.entities.has(entityId)) {
      this.entities.delete(entityId);
      this.broadcastMessage({
        type: "REMOVE_ENTITY",
        payload: { id: entityId },
        origin: originId,
        timestamp: Date.now()
      }, originId);

      this.notifySubscribers();
    }
  }

  /**
   * Sends a message to all registered workers except the origin.
   */
  private broadcastMessage(message: HubMessage, excludeId?: string): void {
    this.workers.forEach((worker, id) => {
      if (id !== excludeId) {
        worker.postMessage(message);
      }
    });
  }

  /**
   * Sends the current global state to a specific worker.
   */
  private sendFullStateToWorker(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.postMessage({
        type: "INIT_WORKER",
        payload: { entities: Array.from(this.entities.values()) },
        timestamp: Date.now(),
        origin: "hub"
      });
    }
  }

  /**
   * Subscription mechanism for local UI components (React/Babylon).
   */
  public subscribe(callback: (entities: SpatialEntity[]) => void): () => void {
    this.subscribers.add(callback);
    callback(Array.from(this.entities.values()));
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    const state = Array.from(this.entities.values());
    this.subscribers.forEach(cb => cb(state));
  }

  /**
   * Returns current state snapshot.
   */
  public getSnapshot(): SpatialEntity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Clean up all workers and subscriptions.
   */
  public dispose(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers.clear();
    this.entities.clear();
    this.subscribers.clear();
  }
}

// Export singleton instance
export const spatialHub = new SpatialHub();