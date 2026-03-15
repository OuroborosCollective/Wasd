/**
 * ChunkSystem — spatial partitioning for the game world.
 *
 * The world is divided into square chunks of a fixed size (default 64 units).
 * Each chunk tracks which entities (players, NPCs, loot) are located within
 * it and whether it is currently "active" (i.e. being observed by at least
 * one player).  The server only ticks logic for active chunks, allowing the
 * game to scale across a very large map without processing unpopulated areas.
 *
 * Chunk IDs use the format `"chunkX:chunkY"` where `chunkX` and `chunkY` are
 * integer indices derived by dividing world-space coordinates by `size`.
 *
 * @example
 * const chunks = new ChunkSystem(64);
 * chunks.addEntity("player_1", 100, 200); // → chunk "1:3"
 * chunks.setChunkActive("1:3", true);
 * console.log(chunks.getActiveChunks()); // [{ id: "1:3", ... }]
 */
export class ChunkSystem {
  private chunks = new Map<string, { id: string, x: number, y: number, size: number, entities: Set<string>, active: boolean }>();

  /**
   * @param size - Side length of each square chunk in world units.
   *               Defaults to 64.  Smaller values increase spatial precision
   *               but require more chunks to cover the same area.
   */
  constructor(public readonly size: number = 64) {}

  /**
   * Returns the chunk ID string for the chunk that contains the given
   * world-space coordinates.
   *
   * @param x - World-space X coordinate.
   * @param y - World-space Y coordinate.
   * @returns  Chunk ID in `"chunkX:chunkY"` format.
   */
  getChunkId(x: number, y: number): string {
    const chunkX = Math.floor(x / this.size);
    const chunkY = Math.floor(y / this.size);
    return `${chunkX}:${chunkY}`;
  }

  /**
   * Returns the chunk at the given chunk-grid coordinates, creating it lazily
   * if it does not yet exist.
   *
   * @param chunkX - Integer chunk column index.
   * @param chunkY - Integer chunk row index.
   * @returns The chunk object (never null).
   */
  getChunk(chunkX: number, chunkY: number) {
    const id = `${chunkX}:${chunkY}`;
    if (!this.chunks.has(id)) {
      this.chunks.set(id, {
        id,
        x: chunkX,
        y: chunkY,
        size: this.size,
        entities: new Set(),
        active: false
      });
    }
    return this.chunks.get(id)!;
  }

  /**
   * Registers an entity in the chunk that contains the given world-space
   * coordinates, creating the chunk if necessary.
   *
   * @param entityId - Unique identifier for the entity.
   * @param x        - Entity's world-space X coordinate.
   * @param y        - Entity's world-space Y coordinate.
   * @returns The chunk ID the entity was placed into.
   */
  addEntity(entityId: string, x: number, y: number) {
    const chunkId = this.getChunkId(x, y);
    const [cx, cy] = chunkId.split(':').map(Number);
    const chunk = this.getChunk(cx, cy);
    chunk.entities.add(entityId);
    return chunkId;
  }

  /**
   * Removes an entity from a specific chunk.  Call this before moving an
   * entity to a different chunk, or when the entity is destroyed.
   *
   * @param entityId - Unique identifier for the entity to remove.
   * @param chunkId  - ID of the chunk from which to remove the entity.
   */
  removeEntity(entityId: string, chunkId: string) {
    const chunk = this.chunks.get(chunkId);
    if (chunk) {
      chunk.entities.delete(entityId);
    }
  }

  /**
   * Moves an entity from its old position to a new position, updating chunk
   * membership only when the entity actually crosses a chunk boundary.
   *
   * @param entityId - Unique identifier for the entity.
   * @param oldX     - Previous world-space X coordinate.
   * @param oldY     - Previous world-space Y coordinate.
   * @param newX     - New world-space X coordinate.
   * @param newY     - New world-space Y coordinate.
   * @returns The chunk ID the entity now resides in.
   */
  moveEntity(entityId: string, oldX: number, oldY: number, newX: number, newY: number) {
    const oldChunkId = this.getChunkId(oldX, oldY);
    const newChunkId = this.getChunkId(newX, newY);

    if (oldChunkId !== newChunkId) {
      this.removeEntity(entityId, oldChunkId);
      this.addEntity(entityId, newX, newY);
    }
    return newChunkId;
  }

  /**
   * Returns all chunks that are currently marked as active.
   *
   * Active chunks are those containing at least one observer (player), as
   * determined by {@link ObserverEngine}.  Only active chunks receive per-tick
   * simulation updates.
   *
   * @returns Array of active chunk objects.
   */
  getActiveChunks() {
    return Array.from(this.chunks.values()).filter(c => c.active);
  }

  /**
   * Sets the active state of a chunk by its ID.
   *
   * @param chunkId - Chunk ID in `"chunkX:chunkY"` format.
   * @param active  - `true` to mark the chunk as active, `false` to deactivate.
   */
  setChunkActive(chunkId: string, active: boolean) {
    const chunk = this.chunks.get(chunkId);
    if (chunk) {
      chunk.active = active;
    }
  }
}
