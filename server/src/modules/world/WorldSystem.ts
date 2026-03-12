import { ChunkSystem } from "./ChunkSystem.js";
import { TerrainGenerator } from "./TerrainGenerator.js";
import { WeatherSystem } from "./WeatherSystem.js";

export class WorldSystem {
  public chunkSystem: ChunkSystem;
  public terrainGenerator: TerrainGenerator;
  public weatherSystem: WeatherSystem;

  constructor() {
    this.chunkSystem = new ChunkSystem(64);
    this.terrainGenerator = new TerrainGenerator();
    this.weatherSystem = new WeatherSystem();
  }

  tick() {
    // Process world events
  }
}
