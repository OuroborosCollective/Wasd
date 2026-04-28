export interface Vector3 {
  x: number;
  y: number;
  z: number;
}
export interface WorldAction {
  action: "place" | "remove" | "move" | "update";
  entityType?: string;
  entityId?: string;
  position?: Vector3;
  data?: any;
  timestamp: number;
}
export class WorldEditor {
  private buffer: WorldAction[] = [];
  private history: WorldAction[] = [];
  private readonly MAX_HISTORY = 500;
  // Platzieren eines neuen Objekts
  public place(entityType: string, position: Vector3): WorldAction {
    const action: WorldAction = {
      action: "place",
      entityType,
      position: { x: position.x, y: position.y, z: position.z },
      timestamp: Date.now()
    };
    this.record(action);
    return action;
  }
  // Entfernen eines Objekts per ID
  public remove(entityId: string): WorldAction {
    const action: WorldAction = {
      action: "remove",
      entityId,
      timestamp: Date.now()
    };
    this.record(action);
    return action;
  }
  // Verschieben eines existierenden Objekts
  public move(entityId: string, position: Vector3): WorldAction {
    const action: WorldAction = {
      action: "move",
      entityId,
      position: { x: position.x, y: position.y, z: position.z },
      timestamp: Date.now()
    };
    this.record(action);
    return action;
  }
  // Aktualisieren von Metadaten oder Eigenschaften
  public update(entityId: string, data: any): WorldAction {
    const action: WorldAction = {
      action: "update",
      entityId,
      data,
      timestamp: Date.now()
    };
    this.record(action);
    return action;
  }
  // Interne Aufzeichnung und Historienmanagement
  // Optimiert fuer Huawei P9 durch Begrenzung des Speicherverbrauchs (MAX_HISTORY)
  private record(action: WorldAction): void {
    this.buffer.push(action);
    this.history.push(action);
    
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }
  }
  // Gibt alle seit dem letzten Tick gesammelten Aktionen zurueck
  // Ermoeglicht Batch-Processing bei 10Hz Tickrate zur Lastreduzierung (k=1000 Support)
  public flush(): WorldAction[] {
    if (this.buffer.length === 0) return [];
    const currentBatch = this.buffer;
    this.buffer = [];
    return currentBatch;
  }
  public getHistory(): WorldAction[] {
    return this.history;
  }
  public clear(): void {
    this.buffer = [];
    this.history = [];
  }
}
