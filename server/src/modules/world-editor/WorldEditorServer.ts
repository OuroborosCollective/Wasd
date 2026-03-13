export class WorldEditorServer {
  spawnEntity(type: string, position: { x: number; y: number; z: number }) {
    return { action: "spawn", type, position };
  }

  moveEntity(entityId: string, position: { x: number; y: number; z: number }) {
    return { action: "move", entityId, position };
  }

  deleteEntity(entityId: string) {
    return { action: "delete", entityId };
  }
}