/**
 * PlayerSystem — in-memory store and factory for player entities.
 *
 * Maintains a `Map` of all currently loaded player objects, keyed by
 * character ID.  Players are created with sensible defaults via
 * {@link createPlayer} and can be looked up, replaced, or removed using
 * the other methods.
 *
 * {@link WorldTick} owns a single `PlayerSystem` instance.  Players are
 * loaded from the persistence store on startup (via
 * {@link PersistenceManager.load}) and injected with {@link setPlayer}.
 * New players (first login) are created on demand with {@link createPlayer}.
 *
 * ### Default player shape
 * ```ts
 * {
 *   id, name,
 *   position: { x: 0, y: 0, z: 0 },
 *   health: 100, stamina: 100, mana: 25,
 *   gold: 0, xp: 0,
 *   quests: [], skills: {}, inventory: [],
 *   equipment: { weapon: null, armor: null },
 *   faction: null, civilization: null,
 *   matrixEnergy: 0,
 *   flags: {}, reputation: {}, usedChoices: []
 * }
 * ```
 */
export class PlayerSystem {
  private players: Map<string, any> = new Map();

  /**
   * Constructs a new player object with default values and registers it in
   * the store.
   *
   * If a player with the same `id` already exists it will be **overwritten**
   * by the new default object.  To restore a persisted player without losing
   * their data, use {@link setPlayer} instead.
   *
   * @param id   - Unique character identifier (also used as the key in the
   *               store and as the character name in the persistence file).
   * @param name - Human-readable display name shown to other players.
   * @returns The newly created player object.
   */
  createPlayer(id: string, name: string) {
    const player = {
      id,
      name,
      position: { x: 0, y: 0, z: 0 },
      health: 100,
      stamina: 100,
      mana: 25,
      gold: 0,
      xp: 0,
      quests: [],
      skills: {},
      inventory: [],
      equipment: {
        weapon: null,
        armor: null
      },
      faction: null,
      civilization: null,
      matrixEnergy: 0,
      flags: {},
      reputation: {},
      usedChoices: []
    };
    this.players.set(id, player);
    return player;
  }

  /**
   * Registers (or replaces) a player object in the store directly.
   *
   * Used during server startup to load persisted player records without
   * going through the default-value factory.
   *
   * @param id     - Character identifier used as the map key.
   * @param player - The player object to store.
   */
  setPlayer(id: string, player: any) {
    this.players.set(id, player);
  }

  /**
   * Returns the player object for the given ID.
   *
   * @param id - Character identifier.
   * @returns The player object, or `undefined` if not found.
   */
  getPlayer(id: string) {
    return this.players.get(id);
  }

  /**
   * Returns all currently loaded player objects as an array.
   * Used by {@link WorldTick.tick} to build the `world_tick` broadcast
   * payload and by {@link WorldTick.saveAll} to persist player state.
   *
   * @returns Array of all player objects in insertion order.
   */
  getAllPlayers() {
    return Array.from(this.players.values());
  }

  /**
   * Removes a player from the in-memory store.
   *
   * Note: this does **not** delete the player's data from the persistence
   * file.  Call {@link WorldTick.saveAll} before or after removal if you
   * need the deletion to be reflected on disk.
   *
   * @param id - Character identifier of the player to remove.
   */
  removePlayer(id: string) {
    this.players.delete(id);
  }
}
