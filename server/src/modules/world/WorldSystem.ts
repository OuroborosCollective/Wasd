import { ChunkSystem } from "./ChunkSystem.js";
import { TerrainGenerator } from "./TerrainGenerator.js";
import { WeatherSystem } from "./WeatherSystem.js";

/**
 * WorldSystem — top-level coordinator for world-environment subsystems.
 *
 * Aggregates and exposes the three primary world-simulation components:
 * - {@link ChunkSystem}       — spatial partitioning and entity placement.
 * - {@link TerrainGenerator}  — procedural terrain height-map and biome data.
 * - {@link WeatherSystem}     — dynamic weather state transitions.
 *
 * `WorldSystem` is instantiated by {@link WorldTick} and its {@link tick}
 * method is invoked once per simulation step (10 Hz) so that each subsystem
 * can advance its internal state.
 *
 * @example
 * const world = new WorldSystem();
 * // Access sub-systems directly:
 * const chunkId = world.chunkSystem.getChunkId(100, 200);
 * const weather = world.weatherSystem; // current conditions
 */
export class WorldSystem {
  public chunkSystem: ChunkSystem;
  public terrainGenerator: TerrainGenerator;
  public weatherSystem: WeatherSystem;

  /**
   * Instantiates all world-environment subsystems with their default
   * configurations (64-unit chunk size for {@link ChunkSystem}).
   */
  constructor() {
    this.chunkSystem = new ChunkSystem(64);
    this.terrainGenerator = new TerrainGenerator();
    this.weatherSystem = new WeatherSystem();
  }

  /**
   * Advances world simulation by one tick.  Called at 10 Hz by
   * {@link WorldTick.tick}.
   *
   * Currently a stub; future implementations will delegate to subsystem
   * tick methods for weather transitions, seasonal events, and terrain-based
   * hazards.
   */
  tick() {
    // Process world events
  }
}
