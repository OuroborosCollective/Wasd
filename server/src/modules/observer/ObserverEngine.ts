/**
 * ObserverEngine — tracks which world chunks are visible to players.
 *
 * Each connected player is an "observer" with a world-space position.  The
 * engine computes the union of all chunks that fall within the view distance
 * of every registered observer.  This set is consumed by {@link WorldTick}
 * each frame to activate or deactivate chunks in the {@link ChunkSystem}.
 *
 * The view area around each observer is a square: the observer's chunk plus
 * `viewDistanceChunks` chunks in every cardinal direction, producing a
 * (2*viewDistanceChunks + 1) × (2*viewDistanceChunks + 1) grid.  With the
 * default value of `1` that yields a 3 × 3 = 9-chunk view window per player.
 *
 * @example
 * const engine = new ObserverEngine();
 * engine.register("socket_abc", { x: 128, y: 64 });
 * const chunks = engine.getObservedChunks();
 * // chunks contains the 9 chunks surrounding "2:1"
 */
export class ObserverEngine {
  private observers = new Map<string, { x: number; y: number }>();
  /** How many extra chunks to include in each direction beyond the player's own chunk. */
  private viewDistanceChunks = 1; // 1 chunk in each direction (3x3 grid)

  /**
   * Registers a new observer at the given world-space position.
   * If an observer with the same `playerId` is already registered it will be
   * replaced by the new position.
   *
   * @param playerId - Unique identifier for the player / socket connection.
   * @param position - Initial world-space position `{ x, y }`.
   */
  register(playerId: string, position: { x: number; y: number }) {
    this.observers.set(playerId, position);
  }

  /**
   * Removes an observer, typically called when a player disconnects.
   * Chunks that were only observed by this player will become inactive on the
   * next tick.
   *
   * @param playerId - Unique identifier of the observer to remove.
   */
  unregister(playerId: string) {
    this.observers.delete(playerId);
  }

  /**
   * Updates the world-space position of an existing observer.
   * Has no effect if the observer has not been registered.
   *
   * @param playerId - Unique identifier of the observer to update.
   * @param position - New world-space position `{ x, y }`.
   */
  updatePosition(playerId: string, position: { x: number; y: number }) {
    if (this.observers.has(playerId)) {
      this.observers.set(playerId, position);
    }
  }

  /**
   * Computes the deduplicated set of all chunks currently visible to at least
   * one registered observer.
   *
   * Chunk coordinates are derived by dividing the observer's world position by
   * the hard-coded chunk size of 64 units.  The surrounding
   * (2*viewDistanceChunks + 1)² square of chunk indices is then merged into a
   * single set so that chunks seen by multiple observers are not duplicated.
   *
   * @returns Array of chunk descriptors, each containing the integer chunk
   *          grid coordinates (`chunkX`, `chunkY`) and a string ID
   *          (`"chunkX:chunkY"`).
   */
  getObservedChunks() {
    const activeChunks = new Set<string>();

    for (const [, pos] of this.observers) {
      const centerChunkX = Math.floor(pos.x / 64);
      const centerChunkY = Math.floor(pos.y / 64);

      for (let dx = -this.viewDistanceChunks; dx <= this.viewDistanceChunks; dx++) {
        for (let dy = -this.viewDistanceChunks; dy <= this.viewDistanceChunks; dy++) {
          activeChunks.add(`${centerChunkX + dx}:${centerChunkY + dy}`);
        }
      }
    }

    return Array.from(activeChunks).map(id => {
      const [chunkX, chunkY] = id.split(':').map(Number);
      return { chunkX, chunkY, id };
    });
  }
}
