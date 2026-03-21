import { ChunkSystem } from "./ChunkSystem.js";
import { TerrainGenerator } from "./TerrainGenerator.js";
import { WeatherSystem } from "./WeatherSystem.js";

export class WorldSystem {
  public chunkSystem: ChunkSystem;
  public terrainGenerator: TerrainGenerator;
  public weatherSystem: WeatherSystem;
  
  public worldTime: number = 8.0; // Start at 8 AM
  private timeScale: number = 0.01; // Time speed

  constructor() {
    this.chunkSystem = new ChunkSystem(64);
    this.terrainGenerator = new TerrainGenerator();
    this.weatherSystem = new WeatherSystem();
  }

  tick() {
    // Process world events
    this.worldTime = (this.worldTime + this.timeScale) % 24;
  }

  getFormattedTime(): string {
    const hours = Math.floor(this.worldTime);
    const minutes = Math.floor((this.worldTime - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}
