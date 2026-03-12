import { ChunkSystem } from "./ChunkSystem.js";
import { TerrainGenerator } from "./TerrainGenerator.js";
import { WeatherSystem } from "./WeatherSystem.js";
import { SeasonSystem } from "./SeasonSystem.js";
import { RuinEvolutionEngine } from "../history/RuinEvolutionEngine.js";

export class WorldSystem {
  public chunkSystem: ChunkSystem;
  public terrainGenerator: TerrainGenerator;
  public weatherSystem: WeatherSystem;
  public seasonSystem: SeasonSystem;
  public ruinEvolution: RuinEvolutionEngine;

  private tickCount = 0;
  private structures: any[] = [];

  constructor() {
    this.chunkSystem = new ChunkSystem(64);
    this.terrainGenerator = new TerrainGenerator();
    this.weatherSystem = new WeatherSystem();
    this.seasonSystem = new SeasonSystem();
    this.ruinEvolution = new RuinEvolutionEngine();

    this.structures.push({ id: 'ruin_1', type: 'ruin', x: 100, y: 100, isDungeon: false });
  }

  tick() {
    this.tickCount++;

    if (this.tickCount % 500 === 0) {
      this.structures = this.structures.map(s => this.ruinEvolution.evolve(s, this.tickCount));
      this.weatherSystem.nextWeather(this.tickCount + Math.floor(Math.random() * 1000));
    }
  }

  getState() {
    const season = this.seasonSystem.getSeason(this.tickCount);
    return {
      tick: this.tickCount,
      season: season,
      weather: this.weatherSystem.getCurrent(),
      modifiers: this.seasonSystem.getModifier(season),
      structures: this.structures
    };
  }

  getStructures() { return this.structures; }
}
